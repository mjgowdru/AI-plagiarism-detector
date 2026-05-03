# PlagiaGuard — Offline Setup Guide

## Overview

PlagiaGuard runs **100% offline** using a locally cached SentenceTransformer model (`all-MiniLM-L6-v2`). No OpenAI API, no external API keys, and no internet connection is required after the one-time setup.

---

## Prerequisites

- Python 3.10+
- pip
- ~500 MB free disk space (model + dependencies)
- 8 GB RAM (CPU-only inference, no GPU needed)

---

## Folder Structure

```
ha/
├── app.py                  # Flask app (offline, CPU-only)
├── download_model.py       # One-time model download script
├── requirements.txt        # Python dependencies
├── setup_offline.md        # This file
│
├── local_model/            # ← Created by download_model.py
│   ├── config.json
│   ├── tokenizer_config.json
│   ├── tokenizer.json
│   ├── vocab.txt
│   ├── pytorch_model.bin   # (or model.safetensors)
│   └── sentence_bert_config.json
│
├── packages/               # ← Optional: pre-downloaded .whl files
│   └── *.whl               #   for fully offline pip install
│
├── static/
│   ├── css/style.css
│   └── js/main.js
│
└── templates/
    └── index.html
```

---

## Setup Steps

### Step 1 — Install Python dependencies

**Online install (standard):**
```bash
pip install -r requirements.txt
```

**CPU-only PyTorch (saves ~2 GB):**
```bash
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
```

**Fully offline install (pre-downloaded packages):**
```bash
# First, on an internet-connected machine, download all wheels:
pip download -r requirements.txt -d ./packages

# Then, on the offline machine:
pip install --no-index --find-links=./packages -r requirements.txt
```

---

### Step 2 — Download and cache the model (one-time, needs internet)

```bash
python download_model.py
```

This will:
1. Download `all-MiniLM-L6-v2` from HuggingFace (~90 MB)
2. Save it to `./local_model/`
3. Verify the model loads correctly offline
4. Cache optional NLTK data

> **After this step, no internet connection is ever needed again.**

---

### Step 3 — Run the app

```bash
python app.py
```

Open your browser at: **http://localhost:5000**

---

## Offline Environment Variables (set automatically by `app.py`)

| Variable | Value | Purpose |
|---|---|---|
| `TRANSFORMERS_OFFLINE` | `1` | Prevents HuggingFace Transformers from making network calls |
| `HF_DATASETS_OFFLINE` | `1` | Prevents HuggingFace Datasets from making network calls |
| `HF_HUB_OFFLINE` | `1` | Prevents HuggingFace Hub from checking for model updates |

---

## RAM Optimization (8 GB Systems)

The following settings are already applied in `app.py`:

- **`torch.set_num_threads(2)`** — Limits CPU threads to reduce RAM pressure
- **`batch_size=16`** — Small encoding batches to keep peak RAM low
- **CPU-only mode** — No CUDA overhead
- **Lazy model loading** — Model loads on first request, not at startup

---

## Troubleshooting

### Error: "Local model not found at './local_model'"
-> Run `python download_model.py` first.

### Error: "No module named 'sentence_transformers'"
-> Run `pip install -r requirements.txt`

### App is slow on first analysis
-> Normal. The model loads into RAM on the first request (~3-5 sec). Subsequent requests are fast.

### Port 5000 already in use
-> Change the port in the last line of `app.py`: `app.run(port=5001)`

---

## Supported File Formats

| Format | Library | Notes |
|---|---|---|
| `.pdf` | PyMuPDF (`fitz`) | Full text extraction |
| `.docx` / `.doc` | python-docx | Paragraph-level extraction |
| Plain text | — | Paste directly into textarea |
