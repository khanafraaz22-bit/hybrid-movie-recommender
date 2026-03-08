import joblib, os

print("Loading BPR model (this may take a minute)...")
bpr = joblib.load("data/models/bpr_model.pkl")

bpr_slim = {
    "u_factors": bpr.u_factors,
    "i_factors": bpr.i_factors,
    "uid_map": dict(bpr.train_set.uid_map),
    "iid_map": dict(bpr.train_set.iid_map),
}

joblib.dump(bpr_slim, "data/models/bpr_slim.pkl")
size = round(os.path.getsize("data/models/bpr_slim.pkl") / 1e6, 2)
print(f"Done! bpr_slim.pkl size: {size} MB")
