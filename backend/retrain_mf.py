"""
Standalone FunkSVD retraining script.
Run from the backend folder:
    python retrain_mf.py
Takes ~45-90 min. Saves mf_model.pkl correctly so the backend can load it.
"""
import numpy as np
import pandas as pd
import joblib
import json
import types, sys
from pathlib import Path
from sklearn.metrics import mean_squared_error, mean_absolute_error
import scipy.sparse as sp_local

BASE      = Path(__file__).parent.parent
PROC_DIR  = BASE / "data" / "processed"
MODEL_DIR = BASE / "data" / "models"

# ── FunkSVD ────────────────────────────────────────────────────────
class FunkSVD:
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

    def fit(self, u_idx, m_idx, ratings, val_u=None, val_m=None, val_r=None):
        rng  = np.random.default_rng(self.rs)
        n_u  = int(u_idx.max()) + 1
        n_m  = int(m_idx.max()) + 1
        k    = self.n_factors
        lr   = np.float32(self.lr)
        reg  = np.float32(self.reg)

        self.P  = rng.normal(0, 0.01, (n_u, k)).astype('float32')
        self.Q  = rng.normal(0, 0.01, (n_m, k)).astype('float32')
        self.bu = np.zeros(n_u, dtype='float32')
        self.bi = np.zeros(n_m, dtype='float32')
        self.mu = np.float32(ratings.mean())

        si      = rng.choice(len(ratings), size=min(self.rmse_sample, len(ratings)), replace=False)
        u_s, m_s, r_s = u_idx[si], m_idx[si], ratings[si]
        C = self.chunk

        for epoch in range(self.n_epochs):
            perm = rng.permutation(len(ratings))
            u_ep, m_ep, r_ep = u_idx[perm], m_idx[perm], ratings[perm]

            for s in range(0, len(r_ep), C):
                u = u_ep[s:s+C]; m = m_ep[s:s+C]; r = r_ep[s:s+C]
                Pu  = self.P[u]; Qm = self.Q[m]
                pred = self.mu + self.bu[u] + self.bi[m] + (Pu * Qm).sum(1)
                err  = (r - pred).astype('float32')
                self.bu[u] += lr * (err - reg * self.bu[u])
                self.bi[m] += lr * (err - reg * self.bi[m])
                batch   = len(u)
                W_u = sp_local.csr_matrix((err, (u, np.arange(batch))), shape=(n_u, batch))
                W_m = sp_local.csr_matrix((err, (m, np.arange(batch))), shape=(n_m, batch))
                count_u = np.bincount(u, minlength=n_u).astype('float32')
                count_m = np.bincount(m, minlength=n_m).astype('float32')
                self.P += lr * (W_u @ Qm - reg * count_u[:, None] * self.P)
                self.Q += lr * (W_m @ Pu - reg * count_m[:, None] * self.Q)

            tr = self._rmse_chunked(u_s, m_s, r_s)
            self.history['train_rmse'].append(tr)
            if val_r is not None:
                vr = self._rmse_chunked(val_u, val_m, val_r)
                self.history['val_rmse'].append(vr)
                print(f'Epoch {epoch+1:>2}/{self.n_epochs}  train={tr:.4f}  val={vr:.4f}')
            else:
                print(f'Epoch {epoch+1:>2}/{self.n_epochs}  train={tr:.4f}')
        return self

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

    def predict_batch_idx(self, u_arr, m_arr):
        out = np.empty(len(u_arr), dtype='float32')
        for s in range(0, len(u_arr), self.chunk):
            out[s:s+self.chunk] = self._predict_chunk(
                u_arr[s:s+self.chunk], m_arr[s:s+self.chunk]
            )
        return out

# ── Register module so joblib saves with correct path ──────────────
FunkSVD.__module__ = 'funksvd_module'
mod = types.ModuleType('funksvd_module')
mod.FunkSVD = FunkSVD
sys.modules['funksvd_module'] = mod

# ── Load data ──────────────────────────────────────────────────────
print("Loading data...")
train_df = pd.read_parquet(PROC_DIR / 'train.parquet')
val_df   = pd.read_parquet(PROC_DIR / 'val.parquet')
test_df  = pd.read_parquet(PROC_DIR / 'test.parquet')

u_tr = train_df['user_idx'].values.astype('int32')
m_tr = train_df['movie_idx'].values.astype('int32')
r_tr = train_df['rating'].values.astype('float32')
u_vl = val_df['user_idx'].values.astype('int32')
m_vl = val_df['movie_idx'].values.astype('int32')
r_vl = val_df['rating'].values.astype('float32')
u_te = test_df['user_idx'].values.astype('int32')
m_te = test_df['movie_idx'].values.astype('int32')
r_te = test_df['rating'].values.astype('float32')
print(f"Train={len(train_df):,}  Val={len(val_df):,}  Test={len(test_df):,}")

# ── Grid search ────────────────────────────────────────────────────
param_grid = [
    {'n_factors': 100, 'n_epochs': 15, 'lr': 0.005, 'reg': 0.02},
    {'n_factors': 150, 'n_epochs': 20, 'lr': 0.005, 'reg': 0.02},
    {'n_factors': 150, 'n_epochs': 20, 'lr': 0.005, 'reg': 0.05},
]

best_val_rmse, best_params, best_mf = np.inf, None, None
for params in param_grid:
    print(f'\n=== {params} ===')
    mf = FunkSVD(**params, random_state=42)
    mf.fit(u_tr, m_tr, r_tr, u_vl, m_vl, r_vl)
    vr = mf.history['val_rmse'][-1]
    if vr < best_val_rmse:
        best_val_rmse, best_params, best_mf = vr, params, mf

print(f'\nBest params: {best_params}  val_rmse={best_val_rmse:.4f}')

# ── Retrain on train+val ───────────────────────────────────────────
print('\nRetraining on train+val...')
tv = pd.concat([train_df, val_df]).reset_index(drop=True)
mf_final = FunkSVD(**best_params, random_state=42)
mf_final.fit(
    tv['user_idx'].values.astype('int32'),
    tv['movie_idx'].values.astype('int32'),
    tv['rating'].values.astype('float32')
)

mf_preds = mf_final.predict_batch_idx(u_te, m_te)
rmse = float(np.sqrt(mean_squared_error(r_te, mf_preds)))
mae  = float(mean_absolute_error(r_te, mf_preds))
print(f'Test  RMSE={rmse:.4f}  MAE={mae:.4f}')

# ── Save ───────────────────────────────────────────────────────────
joblib.dump(mf_final, MODEL_DIR / 'mf_model.pkl')
print('\n✅ mf_model.pkl saved correctly — backend is ready!')
