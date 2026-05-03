#!/usr/bin/env bash
set -e

echo "============================================================"
echo "  PlagiaGuard -- Local Setup Script (Linux / macOS)"
echo "============================================================"
echo

# ── Step 1: Check Python ─────────────────────────────────────
if ! command -v python3 &>/dev/null; then
    echo "[ERR] Python 3 is not installed."
    echo "      Ubuntu/Debian: sudo apt install python3 python3-pip python3-venv"
    echo "      macOS:         brew install python"
    exit 1
fi
echo "[OK]  Python 3 found: $(python3 --version)"

# ── Step 2: Check Git ────────────────────────────────────────
if ! command -v git &>/dev/null; then
    echo "[ERR] Git is not installed."
    echo "      Ubuntu/Debian: sudo apt install git"
    echo "      macOS:         brew install git"
    exit 1
fi
echo "[OK]  Git found: $(git --version)"

# ── Step 3: Clone the repo ───────────────────────────────────
echo
echo "[1/5] Cloning repository from GitHub..."
if [ -d "AI-plagiarism-detector" ]; then
    echo "      Folder already exists -- pulling latest changes..."
    cd AI-plagiarism-detector
    git pull origin main
else
    git clone https://github.com/mjgowdru/AI-plagiarism-detector.git
    cd AI-plagiarism-detector
fi
echo "[OK]  Repository ready."

# ── Step 4: Create virtual environment ──────────────────────
echo
echo "[2/5] Setting up Python virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "[OK]  Virtual environment created."
else
    echo "      Virtual environment already exists, skipping."
fi

# Activate
source venv/bin/activate
echo "[OK]  Virtual environment activated."

# ── Step 5: Install dependencies ─────────────────────────────
echo
echo "[3/5] Installing dependencies (this may take a few minutes)..."
echo "      Installing CPU-only PyTorch first (saves ~2 GB vs full GPU install)..."
pip install torch --index-url https://download.pytorch.org/whl/cpu --quiet
pip install -r requirements.txt --quiet
echo "[OK]  All packages installed."

# ── Step 6: Download the AI model ────────────────────────────
echo
echo "[4/5] Downloading AI model (all-MiniLM-L6-v2, ~90 MB)..."
echo "      Internet required for this step only. App runs offline after this."
python download_model.py

# ── Step 7: Launch the app ───────────────────────────────────
echo
echo "[5/5] Starting PlagiaGuard server..."
echo
echo "============================================================"
echo "  App is running at:  http://127.0.0.1:5000"
echo "  Press Ctrl+C to stop the server."
echo "============================================================"
echo
python app.py
