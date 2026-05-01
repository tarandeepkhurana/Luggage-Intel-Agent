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
TARGET_BRANDS = ["Safari", "Skybags", "American Tourister", "VIP", "Aristocrat", "Nasher Miles"]

# Amazon India search URL template — fill {brand} and {page}
AMAZON_SEARCH_URL = (
    "https://www.amazon.in/s?k={brand}+luggage+trolley&page={page}"
)

# Max products to collect per brand (assignment says 10+; we use 10 for speed)
MAX_PRODUCTS_PER_BRAND = 10

# Max reviews to collect per product (keeps scraping time reasonable)
MAX_REVIEWS_PER_PRODUCT = 15

# Playwright browser config
HEADLESS = False                     # Set False to watch browser during debug
SLOW_MO_MS = 150                    # Adds slight delay between actions (polite)
REQUEST_TIMEOUT_MS = 30_000         # 30s page load timeout

# ── API ────────────────────────────────────────────────────────────────────
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", 8000))
CORS_ORIGINS = ["http://localhost:5173", "http://localhost:3000"]



# config.py

"""
Configuration file for Amazon Scraper.
Modify these settings based on your requirements.
"""

# Amazon domain settings
DEFAULT_COUNTRY = "amazon.com"  # Options: amazon.com, amazon.co.uk, amazon.de, etc.

# Scraping parameters
DEFAULT_MAX_PAGES = 2  # Maximum number of search result pages to scrape
DEFAULT_HEADLESS = False  # Run browser in headless mode (False = visible)

# Output settings
OUTPUT_DIR = "output"  # Directory to save output files

# Timeout settings (milliseconds)
REQUEST_TIMEOUT = 30000  # 30 seconds
PAGE_LOAD_TIMEOUT = 60000  # 60 seconds

# Request delays (seconds) - to avoid overwhelming the server
MIN_DELAY = 1.5
MAX_DELAY = 3.0

# User agent rotation for diversity
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
]