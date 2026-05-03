# -*- coding: utf-8 -*-
"""
download_model.py -- Run this ONCE (with internet) to cache everything locally.

Usage:
    python download_model.py

What it does:
  1. Downloads all-MiniLM-L6-v2 from HuggingFace and saves it to ./local_model/
  2. Pre-downloads required NLTK data packages to the local NLTK data folder
  3. Verifies the model works with a quick test sentence

After this script completes, the app runs 100% offline.
"""

import os
import sys

# Fix Windows console encoding so ASCII symbols print correctly
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

OK  = "[OK] "
ERR = "[ERR]"
WARN= "[!]  "

print("=" * 60)
print("  PlagiaGuard -- Offline Model Setup")
print("=" * 60)

# -- Step 1: Download & save SBERT model ----------------------------------
print("\n[1/3] Downloading SentenceTransformer model (all-MiniLM-L6-v2)...")
print("      This may take a few minutes on first run (~90 MB).\n")

try:
    from sentence_transformers import SentenceTransformer

    model = SentenceTransformer("all-MiniLM-L6-v2")
    save_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "local_model")
    model.save(save_path)
    print(f"    {OK} Model saved to: {save_path}")
except Exception as e:
    print(f"    {ERR} Failed to download model: {e}")
    sys.exit(1)

# -- Step 2: Verify model loads from local path ---------------------------
print("\n[2/3] Verifying model loads from local directory...")
try:
    # Force offline flags before reload to simulate production environment
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    os.environ["HF_HUB_OFFLINE"] = "1"

    from sentence_transformers import SentenceTransformer as ST
    local_model = ST(save_path)
    test_emb = local_model.encode(["This is a verification test."], convert_to_numpy=True)
    assert test_emb.shape == (1, 384), f"Unexpected embedding shape: {test_emb.shape}"
    print(f"    {OK} Model verified (embedding dim: {test_emb.shape[1]})")
except Exception as e:
    print(f"    {ERR} Verification failed: {e}")
    sys.exit(1)

# -- Step 3: Download NLTK data (optional) --------------------------------
print("\n[3/3] Downloading NLTK data (optional -- used as fallback)...")
try:
    import nltk
    nltk_packages = ["punkt", "punkt_tab", "stopwords"]
    for pkg in nltk_packages:
        nltk.download(pkg, quiet=True)
    print(f"    {OK} NLTK packages cached.")
except Exception as e:
    print(f"    {WARN} NLTK download skipped (not critical): {e}")

# -- Done -----------------------------------------------------------------
print("\n" + "=" * 60)
print("  Setup complete! The app is now ready to run offline.")
print("     Start the server:  python app.py")
print("=" * 60 + "\n")
