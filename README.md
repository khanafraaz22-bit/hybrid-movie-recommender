# 🎬 AK's Cinema — Hybrid Movie Recommender System

> *Four models. One perfect recommendation.*

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20App-gold?style=for-the-badge)](https://hybrid-movie-recommender-puce.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Railway-blueviolet?style=for-the-badge)](https://hybrid-movie-recommender-production.up.railway.app/health)
[![Models](https://img.shields.io/badge/Models-Hugging%20Face-yellow?style=for-the-badge)](https://huggingface.co/datasets/afraazkhan22/hybrid-movie-recommender-models)

A full-stack, production-grade movie recommendation engine built on the **MovieLens 20M** dataset. Combines collaborative filtering, Bayesian Personalized Ranking, neural matrix factorization, and TF-IDF content similarity into a single hybrid blend — served through a sleek React frontend with a warm cinematic UI.

---

## ✨ Live Features

| Feature | Description |
|---|---|
| 🤖 **Hybrid Recommendations** | FunkSVD + BPR + NeuMF + TF-IDF blended with learned weights |
| 💡 **"Why this rec?"** | Per-card explanations based on your rating history and genre overlap |
| 🔬 **A/B Model Comparison** | Side-by-side top-10 picks from each model — see how they differ |
| ⭐ **10-Star Rating System** | Rate movies; ratings boost recommendations for matching genres |
| 🎞️ **YouTube Trailers** | Inline trailers embedded on every movie detail page |
| 🧑 **Profile Page** | Rating distribution chart, top-rated movies, watchlist overview |
| 🎭 **Mood Filter** | Filter discover page by Drama, Comedy, Action, Thriller, etc. |
| 🌗 **Dark / Light Theme** | Warm amber dark mode + full light mode toggle |
| ✨ **Cursor Trail** | Gold particle cursor trail with spark effects |

---

## 🧠 The Models

```
MovieLens 20M (27,000 movies · 20M ratings · 138,000 users)
        │
        ├── FunkSVD (Matrix Factorization)
        │     Biased SGD · 150 latent factors · 20 epochs
        │
        ├── BPR (Bayesian Personalized Ranking)
        │     Implicit feedback · pairwise ranking loss
        │
        ├── NeuMF (Neural Matrix Factorization)
        │     GMF + MLP tower · Keras · learned embeddings
        │
        └── TF-IDF Content Similarity
              Genre + tag vectors · cosine similarity
                    │
                    ▼
             Hybrid Blend (learned weights)
             w_mf·FunkSVD + w_bpr·BPR + w_neural·NeuMF + w_content·TF-IDF
             + Bayesian quality prior + user rating boost
```

---

## 🗂️ Project Structure

```
MovieRecommender/
├── data/
│   ├── raw/                  ← MovieLens CSV files (not tracked)
│   ├── processed/            ← Parquet features, encoders (not tracked)
│   └── models/               ← Trained model files (not tracked)
│
├── notebooks/
│   ├── 01_data_cleaning.ipynb
│   └── 02_model_training.ipynb
│
├── backend/
│   ├── main.py               ← FastAPI server (all routes)
│   ├── retrain_mf.py         ← FunkSVD retraining script
│   └── requirements.txt
│
└── frontend/
    └── src/
        ├── pages/
        │   ├── LandingPage.tsx
        │   ├── DiscoverPage.tsx
        │   ├── MovieDetailPage.tsx
        │   ├── RecommendationsPage.tsx
        │   ├── ProfilePage.tsx
        │   └── WatchlistPage.tsx
        ├── components/
        │   ├── MovieCard.tsx
        │   ├── Navbar.tsx
        │   ├── CursorTrail.tsx
        │   └── TrendingMarquee.tsx
        └── api/index.ts
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- MovieLens 20M dataset → place CSVs in `data/raw/`
- TMDB API key (free at [themoviedb.org](https://www.themoviedb.org/))
- YouTube Data API key (free at [console.cloud.google.com](https://console.cloud.google.com/))

### 1. Install & Train

```bash
# Install Python deps
cd backend
pip install -r requirements.txt

# Run notebooks in order
# 01_data_cleaning.ipynb  → generates data/processed/
# 02_model_training.ipynb → generates data/models/
```

### 2. Start the Backend

```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

### 3. Start the Frontend

```bash
cd frontend
npm install

# Create .env file
echo "VITE_TMDB_API_KEY=your_tmdb_key" > .env
echo "VITE_YOUTUBE_API_KEY=your_youtube_key" >> .env

npm run dev
# Open http://localhost:5173
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/signup` | Register new user |
| POST | `/auth/login` | Login, returns session token |
| GET | `/movies/random?n=` | Random movie sample |
| GET | `/movies/search?q=` | Search by title |
| GET | `/movies/{id}/similar` | Content-based similar movies |
| GET | `/recommendations` | Personalised hybrid recs with `why_reason` |
| GET | `/recommendations/per-model` | Top 10 per model for A/B comparison |
| GET/POST | `/watchlist` | Get or add watchlist items |
| GET/POST | `/ratings/{id}` | Get or submit a star rating |


## 🛠️ Tech Stack

**Backend:** Python · FastAPI · SQLite · NumPy · Pandas · TensorFlow · Cornac · Scikit-learn · Joblib

**Frontend:** React 18 · TypeScript · Vite · Zustand · Tailwind CSS · Framer Motion

**Data:** MovieLens 20M · TMDB API · YouTube Data API v3

---

## 📄 License

MIT © [khanafraaz22-bit](https://github.com/khanafraaz22-bit)
