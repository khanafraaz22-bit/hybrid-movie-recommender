"""
Extract neural model weights from Keras to NumPy .npz
Run once locally: python extract_neural_weights.py
"""
import numpy as np
import tensorflow as tf
from pathlib import Path

MODEL_DIR = Path("data/models")

print("Loading Keras model...")
model = tf.keras.models.load_model(MODEL_DIR / "neural_model.keras")

print("Model layers:")
for i, layer in enumerate(model.layers):
    weights = layer.get_weights()
    if weights:
        print(f"  [{i}] {layer.name}: {[w.shape for w in weights]}")

# Extract all weights as a flat dict
weights_dict = {}
for layer in model.layers:
    layer_weights = layer.get_weights()
    if layer_weights:
        for j, w in enumerate(layer_weights):
            key = f"{layer.name}_{j}"
            weights_dict[key] = w
            print(f"Saved: {key} {w.shape}")

np.savez(MODEL_DIR / "neural_weights.npz", **weights_dict)
print(f"\nDone! Saved to data/models/neural_weights.npz")
print(f"Size: {round((MODEL_DIR / 'neural_weights.npz').stat().st_size / 1e6, 2)} MB")