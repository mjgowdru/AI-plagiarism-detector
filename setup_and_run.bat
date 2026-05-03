@echo off
setlocal EnableDelayedExpansion

echo ============================================================
echo   PlagiaGuard -- Local Setup Script (Windows)
echo ============================================================
echo.

:: ── Step 1: Check Python ─────────────────────────────────────
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERR] Python is not installed or not in PATH.
    echo       Download from: https://www.python.org/downloads/
    pause
    exit /b 1
)
echo [OK]  Python found.

:: ── Step 2: Check Git ────────────────────────────────────────
git --version >nul 2>&1
if errorlevel 1 (
    echo [ERR] Git is not installed or not in PATH.
    echo       Download from: https://git-scm.com/downloads
    pause
    exit /b 1
)
echo [OK]  Git found.

:: ── Step 3: Clone the repo ───────────────────────────────────
echo.
echo [1/5] Cloning repository from GitHub...
if exist "AI-plagiarism-detector\" (
    echo       Folder already exists -- pulling latest changes...
    cd AI-plagiarism-detector
    git pull origin main
) else (
    git clone https://github.com/mjgowdru/AI-plagiarism-detector.git
    cd AI-plagiarism-detector
)
echo [OK]  Repository ready.

:: ── Step 4: Create virtual environment ──────────────────────
echo.
echo [2/5] Setting up Python virtual environment...
if not exist "venv\" (
    python -m venv venv
    echo [OK]  Virtual environment created.
) else (
    echo       Virtual environment already exists, skipping.
)

:: Activate virtual environment
call venv\Scripts\activate.bat
echo [OK]  Virtual environment activated.

:: ── Step 5: Install dependencies ─────────────────────────────
echo.
echo [3/5] Installing dependencies (this may take a few minutes)...
echo       Installing CPU-only PyTorch first (saves ~2 GB vs full GPU install)...
pip install torch --index-url https://download.pytorch.org/whl/cpu --quiet
pip install -r requirements.txt --quiet
echo [OK]  All packages installed.

:: ── Step 6: Download the AI model ────────────────────────────
echo.
echo [4/5] Downloading AI model (all-MiniLM-L6-v2, ~90 MB)...
echo       Internet required for this step only. App runs offline after this.
python download_model.py
if errorlevel 1 (
    echo [ERR] Model download failed. Check your internet connection.
    pause
    exit /b 1
)

:: ── Step 7: Launch the app ───────────────────────────────────
echo.
echo [5/5] Starting PlagiaGuard server...
echo.
echo ============================================================
echo   App is running at:  http://127.0.0.1:5000
echo   Press Ctrl+C to stop the server.
echo ============================================================
echo.
python app.py

pause
