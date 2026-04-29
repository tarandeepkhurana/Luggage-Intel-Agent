"""
config.py
---------
Central configuration. Reads from environment variables (set via .env file).
All magic strings and constants live here — never scattered across files.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root (two levels up from this file)
load_dotenv()

# ── Paths ──────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
MOCK_DIR = DATA_DIR / "mock"

# ── OpenAI ─────────────────────────────────────────────────────────────────
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
LLM_MODEL = "gpt-4o-mini"          # cheap, fast, good enough for theme extraction
LLM_MAX_TOKENS = 1200

# ── Scraping ───────────────────────────────────────────────────────────────
# Brands to scrape. Exactly 4 as required by assignment.
TARGET_BRANDS = ["Safari", "Skybags", "American Tourister", "VIP"]

# Amazon India search URL template — fill {brand} and {page}
AMAZON_SEARCH_URL = (
    "https://www.amazon.in/s?k={brand}+luggage+trolley&page={page}"
)

# Max products to collect per brand (assignment says 10+; we use 10 for speed)
MAX_PRODUCTS_PER_BRAND = 10

# Max reviews to collect per product (keeps scraping time reasonable)
MAX_REVIEWS_PER_PRODUCT = 15

# Playwright browser config
HEADLESS = True                     # Set False to watch browser during debug
SLOW_MO_MS = 150                    # Adds slight delay between actions (polite)
REQUEST_TIMEOUT_MS = 30_000         # 30s page load timeout

# ── API ────────────────────────────────────────────────────────────────────
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", 8000))
CORS_ORIGINS = ["http://localhost:5173", "http://localhost:3000"]