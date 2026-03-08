"""
AK's Hybrid Movie Recommender — FastAPI Backend
Run: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
import json, joblib, numpy as np, pandas as pd
import scipy.sparse as sp
from pathlib import Path
import sqlite3, hashlib, secrets, time, random
from contextlib import contextmanager
import tensorflow as tf

# ── Paths ──────────────────────────────────────────────────────────
BASE        = Path(__file__).parent.parent
MODEL_DIR   = BASE / "data" / "models"
PROC_DIR    = BASE / "data" / "processed"
DB_PATH     = Path(__file__).parent / "users.db"

# ── Auto-download models from Hugging Face if not present ──────────
HF_DATASET  = "afraazkhan22/hybrid-movie-recommender-models"

def _ensure_data():
    try:
        from huggingface_hub import hf_hub_download
    except ImportError:
        print("huggingface_hub not installed, skipping auto-download")
        return

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    PROC_DIR.mkdir(parents=True, exist_ok=True)

    model_files = [
        "bpr_slim.pkl", "mf_model.pkl", "neural_model.keras",
        "rating_scaler.pkl", "tfidf_vectorizer.pkl", "content_matrix.npz",
        "hybrid_weights.json", "bpr_norm.json", "cq_norm.json", "content_index.parquet"
    ]
    proc_files = [
        "encoders.json", "content_docs.parquet", "movie_features.parquet",
        "ratings_clean.parquet"
    ]

    for fname in model_files:
        dest = MODEL_DIR / fname
        if not dest.exists():
            print(f"Downloading {fname}...")
            path = hf_hub_download(repo_id=HF_DATASET, filename=fname, repo_type="dataset")
            import shutil; shutil.copy(path, dest)

    for fname in proc_files:
        dest = PROC_DIR / fname
        if not dest.exists():
            print(f"Downloading {fname}...")
            hf_fname = f"processed/{fname}"
            path = hf_hub_download(repo_id=HF_DATASET, filename=hf_fname, repo_type="dataset")
            import shutil; shutil.copy(path, dest)

_ensure_data()

app = FastAPI(title="AK Movie Recommender API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)

# ── Database ───────────────────────────────────────────────────────
def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                name     TEXT    NOT NULL,
                email    TEXT    UNIQUE NOT NULL,
                password TEXT    NOT NULL,
                created  INTEGER NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                token    TEXT PRIMARY KEY,
                user_id  INTEGER NOT NULL,
                created  INTEGER NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS watchlist (
                user_id  INTEGER NOT NULL,
                movie_id INTEGER NOT NULL,
                added    INTEGER NOT NULL,
                PRIMARY KEY (user_id, movie_id)
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS ratings (
                user_id  INTEGER NOT NULL,
                movie_id INTEGER NOT NULL,
                rating   REAL    NOT NULL,
                rated_at INTEGER NOT NULL,
                PRIMARY KEY (user_id, movie_id)
            )
        """)
        conn.commit()

@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def hash_password(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)):
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    with get_db() as db:
        row = db.execute(
            "SELECT user_id FROM sessions WHERE token=?", (creds.credentials,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = db.execute(
            "SELECT * FROM users WHERE id=?", (row["user_id"],)
        ).fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return dict(user)

# ── FunkSVD class — register as funksvd_module so joblib can unpickle mf_model.pkl ──
import types as _types, sys as _sys
class FunkSVD:
    """Biased Matrix Factorization via vectorised SGD — matches notebook definition."""
    def __init__(self, n_factors=150, n_epochs=20, lr=0.005, reg=0.02,
                 random_state=42, rmse_sample=50_000, chunk=65536):
        self.n_factors   = n_factors
        self.n_epochs    = n_epochs
        self.lr          = lr
        self.reg         = reg
        self.rs          = random_state
        self.rmse_sample = rmse_sample
        self.chunk       = chunk
        self.history     = {'train_rmse': [], 'val_rmse': []}

    def _predict_chunk(self, u, m):
        return np.clip(
            self.mu + self.bu[u] + self.bi[m] + (self.P[u] * self.Q[m]).sum(1),
            0.5, 5.0
        ).astype('float32')

    def _rmse_chunked(self, u, m, r):
        se, n = 0.0, 0
        for s in range(0, len(r), self.chunk):
            p   = self._predict_chunk(u[s:s+self.chunk], m[s:s+self.chunk])
            se += float(np.sum((r[s:s+self.chunk] - p) ** 2))
            n  += len(p)
        return float(np.sqrt(se / n))

    def predict(self, user_id, movie_id):
        u = self._u2i.get(user_id)
        m = self._m2i.get(movie_id)
        if u is None or m is None:
            return float(self.mu)
        return float(np.clip(
            self.mu + self.bu[u] + self.bi[m] + np.dot(self.P[u], self.Q[m]),
            0.5, 5.0
        ))

    def predict_batch_idx(self, u_arr, m_arr):
        out = np.empty(len(u_arr), dtype='float32')
        for s in range(0, len(u_arr), self.chunk):
            out[s:s+self.chunk] = self._predict_chunk(
                u_arr[s:s+self.chunk], m_arr[s:s+self.chunk]
            )
        return out

# Register FunkSVD under funksvd_module — matches how retrain_mf.py saved the pkl
_mod = _types.ModuleType('funksvd_module')
_mod.FunkSVD = FunkSVD
_sys.modules['funksvd_module'] = _mod

# ── Model loading ──────────────────────────────────────────────────
print("Loading models...")

mf_model    = joblib.load(MODEL_DIR / "mf_model.pkl")
bpr_slim    = joblib.load(MODEL_DIR / "bpr_slim.pkl")
neural_model= tf.keras.models.load_model(MODEL_DIR / "neural_model.keras")
scaler      = joblib.load(MODEL_DIR / "rating_scaler.pkl")
tfidf       = joblib.load(MODEL_DIR / "tfidf_vectorizer.pkl")
cm          = sp.load_npz(MODEL_DIR / "content_matrix.npz")

with open(MODEL_DIR / "hybrid_weights.json")  as f: W    = json.load(f)
with open(MODEL_DIR / "bpr_norm.json")         as f: BN   = json.load(f)
with open(MODEL_DIR / "cq_norm.json")          as f: CQN  = json.load(f)
with open(PROC_DIR   / "encoders.json")        as f: enc  = json.load(f)

user2idx  = {int(k): v for k, v in enc["user2idx"].items()}
movie2idx = {int(k): v for k, v in enc["movie2idx"].items()}
N_USERS, N_MOVIES = enc["n_users"], enc["n_movies"]

content_df  = pd.read_parquet(PROC_DIR / "content_docs.parquet")
movie_feats = pd.read_parquet(PROC_DIR / "movie_features.parquet")

# Load only userId+movieId columns to save memory
_ratings_path = PROC_DIR / "ratings_clean.parquet"
ratings_df  = pd.read_parquet(_ratings_path, columns=["userId", "movieId"])

movie_quality = dict(zip(movie_feats["movieId"], movie_feats["bayesian_avg"]))
ALL_MOVIES    = list(movie2idx.keys())
BPR_UID_MAP   = bpr_slim["uid_map"]
BPR_IID_MAP   = bpr_slim["iid_map"]
U_FAC = bpr_slim["u_factors"]
I_FAC = bpr_slim["i_factors"]

print("✅ All models loaded.")
init_db()
print("✅ Database initialised.")

# ── Helpers ────────────────────────────────────────────────────────
def _cq(mid):
    raw = movie_quality.get(mid, CQN["cq_mean"])
    return float(0.5 + (raw - CQN["cq_min"]) / (CQN["cq_max"] - CQN["cq_min"] + 1e-8) * 4.5)

def _movie_meta(movie_id: int) -> dict:
    row = movie_feats[movie_feats["movieId"] == movie_id]
    if row.empty:
        return {"movieId": movie_id, "title": "Unknown", "genres": "", "year": None}
    r = row.iloc[0]
    # Try to get title from content_df
    ct = content_df[content_df["movieId"] == movie_id]
    title = ct.iloc[0]["title_clean"] if not ct.empty else str(r.get("movieId", ""))
    return {
        "movieId":      int(movie_id),
        "title":        title,
        "genres":       str(r.get("genres", "")),
        "year":         int(r["year"]) if pd.notna(r.get("year")) else None,
        "avgRating":    round(float(r.get("mean_rating", 3.0)), 2),
        "nRatings":     int(r.get("n_ratings", 0)),
        "bayesianAvg":  round(float(r.get("bayesian_avg", 3.0)), 2),
        # TMDB poster will be fetched client-side using title + year
        "poster":       None,
    }

def get_recommendations(user_id: int, n: int = 20) -> list:
    if user_id not in user2idx:
        top = movie_feats.nlargest(n, "bayesian_avg")
        return [_movie_meta(int(mid)) for mid in top["movieId"]]

    seen      = set(ratings_df[ratings_df["userId"] == user_id]["movieId"].tolist())
    candidates= [mid for mid in ALL_MOVIES if mid not in seen]
    uid_idx   = user2idx[user_id]
    m_idx_arr = np.array([movie2idx[mid] for mid in candidates], dtype="int32")
    u_arr     = np.full(len(candidates), uid_idx, dtype="int32")
    CHUNK     = 65536

    # MF scores
    mf_sc = mf_model.predict_batch_idx(u_arr, m_idx_arr)

    # BPR scores
    uid_bpr = BPR_UID_MAP.get(str(user_id))
    if uid_bpr is not None:
        i_idxs = np.array([BPR_IID_MAP.get(str(mid), -1) for mid in candidates])
        valid  = i_idxs >= 0
        bpr_raw = np.zeros(len(candidates), dtype="float32")
        bpr_raw[valid] = (U_FAC[uid_bpr] * I_FAC[i_idxs[valid]]).sum(1)
    else:
        bpr_raw = np.zeros(len(candidates), dtype="float32")
    bpr_sc = np.clip(0.5 + (bpr_raw - BN["lo"]) / (BN["hi"] - BN["lo"] + 1e-8) * 4.5, 0.5, 5.0)

    # Neural scores
    nr_parts = []
    for s in range(0, len(candidates), CHUNK):
        nr_parts.append(neural_model.predict(
            {"user": u_arr[s:s+CHUNK], "movie": m_idx_arr[s:s+CHUNK]},
            batch_size=2048, verbose=0
        ).flatten())
    neural_raw = np.concatenate(nr_parts)
    neural_sc  = np.clip(scaler.inverse_transform(neural_raw.reshape(-1,1)).flatten(), 0.5, 5.0)

    # Content quality
    cq_sc = np.array([_cq(mid) for mid in candidates], dtype="float32")

    blend = np.clip(W["mf"]*mf_sc + W["bpr"]*bpr_sc +
                    W["neural"]*neural_sc + W["content"]*cq_sc, 0.5, 5.0)

    # ── User ratings boost ─────────────────────────────────────────
    # Fetch user ratings from DB and use highly-rated genres to boost similar candidates
    try:
        with get_db() as db:
            user_ratings = db.execute(
                "SELECT movie_id, rating FROM ratings WHERE user_id=? AND rating >= 4.0",
                (user_id,)
            ).fetchall()
        if user_ratings:
            # Get genres of highly-rated movies
            liked_genres: dict = {}
            for row in user_ratings:
                mrow = movie_feats[movie_feats["movieId"] == row["movie_id"]]
                if not mrow.empty:
                    genres = str(mrow.iloc[0].get("genres", "")).split("|")
                    for g in genres:
                        liked_genres[g] = liked_genres.get(g, 0) + 1
            # Normalise
            total = sum(liked_genres.values()) or 1
            liked_genres = {g: v/total for g, v in liked_genres.items()}
            # Boost candidates whose genres match
            cand_df = movie_feats[movie_feats["movieId"].isin(candidates)].set_index("movieId")
            boost = np.zeros(len(candidates), dtype="float32")
            for j, mid in enumerate(candidates):
                if mid in cand_df.index:
                    cg = str(cand_df.loc[mid].get("genres", "")).split("|")
                    boost[j] = sum(liked_genres.get(g, 0) for g in cg) * 0.3
            blend = np.clip(blend + boost, 0.5, 5.0)
    except Exception:
        pass  # ratings boost is optional, never break recommendations

    top_idx = np.argsort(blend)[::-1][:n]

    # Fetch user's top-rated movies for "why" explanation
    why_movies: list = []
    try:
        with get_db() as db:
            top_rated = db.execute(
                "SELECT movie_id, rating FROM ratings WHERE user_id=? ORDER BY rating DESC LIMIT 5",
                (user_id,)
            ).fetchall()
            why_movies = [(r["movie_id"], r["rating"]) for r in top_rated]
    except Exception:
        pass

    results = []
    for i in top_idx:
        meta = _movie_meta(candidates[i])
        meta["score"]         = round(float(blend[i]), 4)
        meta["mf_score"]      = round(float(mf_sc[i]),     4)
        meta["bpr_score"]     = round(float(bpr_sc[i]),    4)
        meta["neural_score"]  = round(float(neural_sc[i]), 4)
        meta["content_score"] = round(float(cq_sc[i]),     4)

        # Build "why" explanation using content_df for reliable genre/title lookup
        reason = ""
        try:
            if why_movies:
                cand_row = content_df[content_df["movieId"] == candidates[i]]
                cand_genres = set(str(cand_row.iloc[0].get("genres", "")).split("|")) if not cand_row.empty else set()
                best_match_title, best_match_rating, best_overlap = None, 0, 0
                for wid, wrating in why_movies:
                    wrow = content_df[content_df["movieId"] == wid]
                    if wrow.empty:
                        wrow2 = movie_feats[movie_feats["movieId"] == wid]
                        if wrow2.empty: continue
                        wgenres = set(str(wrow2.iloc[0].get("genres", "")).split("|"))
                        wtitle_raw = str(wid)
                    else:
                        wgenres = set(str(wrow.iloc[0].get("genres", "")).split("|"))
                        wtitle_raw = str(wrow.iloc[0].get("title_clean", str(wid)))
                    overlap = len(cand_genres & wgenres)
                    if overlap > best_overlap or (overlap == best_overlap and wrating > best_match_rating):
                        best_overlap = overlap
                        best_match_rating = wrating
                        best_match_title = wtitle_raw[:35] + ("..." if len(wtitle_raw) > 35 else "")
                if best_match_title and best_overlap > 0:
                    reason = f"Because you rated {best_match_title} {best_match_rating:.1f}*"
                else:
                    wid0, wr0 = why_movies[0]
                    wrow0 = content_df[content_df["movieId"] == wid0]
                    if not wrow0.empty:
                        t = str(wrow0.iloc[0].get("title_clean", ""))[:30]
                        reason = f"Matches your taste from {t}"
        except Exception:
            pass
        if not reason:
            dominant = max([("FunkSVD", float(mf_sc[i])), ("BPR", float(bpr_sc[i])), ("NeuMF", float(neural_sc[i]))], key=lambda x: x[1])
            reason = f"Top pick by {dominant[0]} model"
        meta["why_reason"] = reason
        results.append(meta)
    return results

# ── Auth Routes ────────────────────────────────────────────────────
class SignupRequest(BaseModel):
    name:     str
    email:    str
    password: str

class LoginRequest(BaseModel):
    email:    str
    password: str

@app.post("/auth/signup")
def signup(req: SignupRequest):
    with get_db() as db:
        exists = db.execute("SELECT id FROM users WHERE email=?", (req.email,)).fetchone()
        if exists:
            raise HTTPException(400, "Email already registered")
        db.execute(
            "INSERT INTO users (name, email, password, created) VALUES (?,?,?,?)",
            (req.name, req.email, hash_password(req.password), int(time.time()))
        )
        db.commit()
        user_id = db.execute("SELECT id FROM users WHERE email=?", (req.email,)).fetchone()["id"]
        token   = secrets.token_hex(32)
        db.execute("INSERT INTO sessions VALUES (?,?,?)", (token, user_id, int(time.time())))
        db.commit()
    return {"token": token, "name": req.name, "email": req.email, "userId": user_id}

@app.post("/auth/login")
def login(req: LoginRequest):
    with get_db() as db:
        user = db.execute(
            "SELECT * FROM users WHERE email=? AND password=?",
            (req.email, hash_password(req.password))
        ).fetchone()
        if not user:
            raise HTTPException(401, "Invalid email or password")
        token = secrets.token_hex(32)
        db.execute("INSERT OR REPLACE INTO sessions VALUES (?,?,?)",
                   (token, user["id"], int(time.time())))
        db.commit()
    return {"token": token, "name": user["name"], "email": user["email"], "userId": user["id"]}

@app.post("/auth/logout")
def logout(user=Depends(get_current_user), creds: HTTPAuthorizationCredentials = Depends(security)):
    with get_db() as db:
        db.execute("DELETE FROM sessions WHERE token=?", (creds.credentials,))
        db.commit()
    return {"message": "Logged out"}

@app.delete("/auth/account")
def delete_account(user=Depends(get_current_user)):
    with get_db() as db:
        db.execute("DELETE FROM watchlist WHERE user_id=?", (user["id"],))
        db.execute("DELETE FROM sessions WHERE user_id=?",  (user["id"],))
        db.execute("DELETE FROM users WHERE id=?",          (user["id"],))
        db.commit()
    return {"message": "Account deleted"}

@app.get("/auth/me")
def me(user=Depends(get_current_user)):
    return {"name": user["name"], "email": user["email"], "userId": user["id"]}

# ── Movie Routes ───────────────────────────────────────────────────
@app.get("/movies/random")
def random_movies(n: int = 20):
    sample = random.sample(ALL_MOVIES, min(n * 3, len(ALL_MOVIES)))
    # Filter to movies with enough ratings
    good = [mid for mid in sample
            if movie_quality.get(mid, 0) >= 3.5][:n]
    if len(good) < n:
        good = sample[:n]
    return [_movie_meta(mid) for mid in good]

@app.get("/movies/search")
def search_movies(q: str, limit: int = 30):
    if not q.strip():
        return []
    q_lower = q.lower()
    matches = content_df[
        content_df["title_clean"].str.lower().str.contains(q_lower, na=False)
    ].head(limit)
    results = []
    for _, row in matches.iterrows():
        meta = _movie_meta(int(row["movieId"]))
        results.append(meta)
    return results

@app.get("/movies/{movie_id}")
def get_movie(movie_id: int):
    return _movie_meta(movie_id)

@app.get("/movies/{movie_id}/similar")
def similar_movies(movie_id: int, n: int = 10):
    from sklearn.metrics.pairwise import cosine_similarity
    idx_map = dict(zip(content_df["movieId"], range(len(content_df))))
    if movie_id not in idx_map:
        return []
    idx  = idx_map[movie_id]
    sims = cosine_similarity(cm[idx], cm).flatten()
    top  = np.argsort(sims)[::-1][1:n+1]
    results = []
    for i in top:
        mid  = int(content_df.iloc[i]["movieId"])
        meta = _movie_meta(mid)
        meta["similarity"] = round(float(sims[i]), 4)
        results.append(meta)
    return results

# ── Recommendation Routes ──────────────────────────────────────────
@app.get("/recommendations")
def recommendations(movie_id: Optional[int] = None, user=Depends(get_current_user)):
    # User-based hybrid recommendations
    recs = get_recommendations(user["id"], n=20)
    return {"recommendations": recs, "userId": user["id"]}

@app.get("/recommendations/similar/{movie_id}")
def similar_recs(movie_id: int):
    return similar_movies(movie_id, n=12)

# ── Watchlist Routes ───────────────────────────────────────────────
@app.get("/watchlist")
def get_watchlist(user=Depends(get_current_user)):
    with get_db() as db:
        rows = db.execute(
            "SELECT movie_id FROM watchlist WHERE user_id=? ORDER BY added DESC",
            (user["id"],)
        ).fetchall()
    return [_movie_meta(row["movie_id"]) for row in rows]

@app.post("/watchlist/{movie_id}")
def add_watchlist(movie_id: int, user=Depends(get_current_user)):
    with get_db() as db:
        db.execute(
            "INSERT OR IGNORE INTO watchlist VALUES (?,?,?)",
            (user["id"], movie_id, int(time.time()))
        )
        db.commit()
    return {"message": "Added to watchlist"}

@app.delete("/watchlist/{movie_id}")
def remove_watchlist(movie_id: int, user=Depends(get_current_user)):
    with get_db() as db:
        db.execute(
            "DELETE FROM watchlist WHERE user_id=? AND movie_id=?",
            (user["id"], movie_id)
        )
        db.commit()
    return {"message": "Removed from watchlist"}

# ── Rating Routes ─────────────────────────────────────────────────
class RatingRequest(BaseModel):
    rating: float

@app.post("/ratings/{movie_id}")
def rate_movie(movie_id: int, req: RatingRequest, user=Depends(get_current_user)):
    if not 0.5 <= req.rating <= 5.0:
        raise HTTPException(400, "Rating must be between 0.5 and 5.0")
    with get_db() as db:
        db.execute(
            "INSERT OR REPLACE INTO ratings (user_id, movie_id, rating, rated_at) VALUES (?,?,?,?)",
            (user["id"], movie_id, req.rating, int(time.time()))
        )
        db.commit()
    return {"message": "Rating saved", "rating": req.rating}

@app.get("/ratings/{movie_id}")
def get_rating(movie_id: int, user=Depends(get_current_user)):
    with get_db() as db:
        row = db.execute(
            "SELECT rating FROM ratings WHERE user_id=? AND movie_id=?",
            (user["id"], movie_id)
        ).fetchone()
    return {"rating": row["rating"] if row else None}

@app.get("/ratings")
def get_all_ratings(user=Depends(get_current_user)):
    with get_db() as db:
        rows = db.execute(
            "SELECT movie_id, rating FROM ratings WHERE user_id=? ORDER BY rated_at DESC",
            (user["id"],)
        ).fetchall()
    return [{"movieId": r["movie_id"], "rating": r["rating"]} for r in rows]

@app.get("/recommendations/per-model")
def per_model_recommendations(user=Depends(get_current_user)):
    """Return top 10 recs from each model independently for A/B comparison."""
    user_id = user["id"]
    n = 10

    if user_id not in user2idx:
        top = movie_feats.nlargest(n, "bayesian_avg")
        fallback = [_movie_meta(int(mid)) for mid in top["movieId"]]
        return {"mf": fallback, "bpr": fallback, "neural": fallback, "hybrid": fallback}

    seen       = set(ratings_df[ratings_df["userId"] == user_id]["movieId"])
    candidates = [mid for mid in ALL_MOVIES if mid not in seen]
    uid_idx    = user2idx[user_id]
    m_idx_arr  = np.array([movie2idx[mid] for mid in candidates], dtype="int32")
    u_arr      = np.full(len(candidates), uid_idx, dtype="int32")
    CHUNK      = 65536

    mf_sc = mf_model.predict_batch_idx(u_arr, m_idx_arr)

    uid_bpr = BPR_UID_MAP.get(str(user_id))
    if uid_bpr is not None:
        i_idxs  = np.array([BPR_IID_MAP.get(str(mid), -1) for mid in candidates])
        valid   = i_idxs >= 0
        bpr_raw = np.zeros(len(candidates), dtype="float32")
        bpr_raw[valid] = (U_FAC[uid_bpr] * I_FAC[i_idxs[valid]]).sum(1)
    else:
        bpr_raw = np.zeros(len(candidates), dtype="float32")
    bpr_sc = np.clip(0.5 + (bpr_raw - BN["lo"]) / (BN["hi"] - BN["lo"] + 1e-8) * 4.5, 0.5, 5.0)

    nr_parts = []
    for s in range(0, len(candidates), CHUNK):
        nr_parts.append(neural_model.predict(
            {"user": u_arr[s:s+CHUNK], "movie": m_idx_arr[s:s+CHUNK]},
            batch_size=2048, verbose=0
        ).flatten())
    neural_raw = np.concatenate(nr_parts)
    neural_sc  = np.clip(scaler.inverse_transform(neural_raw.reshape(-1,1)).flatten(), 0.5, 5.0)
    cq_sc      = np.array([_cq(mid) for mid in candidates], dtype="float32")
    blend      = np.clip(W["mf"]*mf_sc + W["bpr"]*bpr_sc + W["neural"]*neural_sc + W["content"]*cq_sc, 0.5, 5.0)

    def top_n(scores, label):
        idx = np.argsort(scores)[::-1][:n]
        out = []
        for i in idx:
            m = _movie_meta(candidates[i])
            m["model_score"] = round(float(scores[i]), 4)
            m["model_label"] = label
            out.append(m)
        return out

    return {
        "mf":     top_n(mf_sc,     "FunkSVD"),
        "bpr":    top_n(bpr_sc,    "BPR"),
        "neural": top_n(neural_sc, "NeuMF"),
        "hybrid": top_n(blend,     "Hybrid"),
    }

@app.get("/health")
def health():
    return {"status": "ok", "models_loaded": True}