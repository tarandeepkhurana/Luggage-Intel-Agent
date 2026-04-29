"""
api/routes.py
--------------
FastAPI route handlers. All endpoints read from pre-processed JSON files.
No live scraping or LLM calls happen during API requests — those run offline.

Endpoints:
  GET /api/overview           → dashboard header stats
  GET /api/brands             → list of all brand metrics (comparison table)
  GET /api/brands/{name}      → single brand detail + products
  GET /api/products           → flat list of all products (with optional filters)
  GET /api/competitive        → narrative + agent insights
  GET /api/summary            → full payload in one call (used by dashboard)
"""

from fastapi import APIRouter, HTTPException, Query
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.config import PROCESSED_DIR, MOCK_DIR
from backend.utils.helpers import load_json

router = APIRouter(prefix="/api")


# ── Helper: load the competitive summary (main data file) ──────────────────

def _get_summary() -> dict:
    """
    Load competitive_summary.json. Falls back to mock data if not found.
    This lets the frontend work during development without running the scraper.
    """
    live_path = PROCESSED_DIR / "competitive_summary.json"
    mock_path = MOCK_DIR / "competitive_summary.json"

    data = load_json(live_path)
    if data:
        return data

    # Fallback to mock data (for frontend dev)
    data = load_json(mock_path)
    if data:
        print("[routes] Using mock data (live data not found)")
        return data

    raise HTTPException(
        status_code=503,
        detail="Dashboard data not available. Run the data pipeline first: python run_pipeline.py"
    )


# ── Routes ─────────────────────────────────────────────────────────────────

@router.get("/summary")
def get_full_summary():
    """
    Return the complete data payload in one API call.
    The frontend calls this once on load and caches it in state.
    Avoids multiple round-trips — simple and fast for a local dashboard.
    """
    return _get_summary()


@router.get("/overview")
def get_overview():
    """Top-level stats for the dashboard header / overview cards."""
    summary = _get_summary()
    return summary.get("overview", {})


@router.get("/brands")
def get_brands(
    price_band: str | None = Query(None, description="Filter by: Premium, Mid-range, Budget"),
    min_rating: float | None = Query(None, description="Minimum average rating"),
    min_sentiment: float | None = Query(None, description="Minimum sentiment score 0-1"),
):
    """
    Return all brand metrics. Supports optional query-param filters.
    Used by the Brand Comparison view and comparison table.
    """
    summary = _get_summary()
    brands = summary.get("brands", [])

    # Apply filters if provided
    if price_band:
        brands = [b for b in brands if b.get("price_band") == price_band]
    if min_rating is not None:
        brands = [b for b in brands if (b.get("avg_rating") or 0) >= min_rating]
    if min_sentiment is not None:
        brands = [b for b in brands if (b.get("sentiment_score") or 0) >= min_sentiment]

    # Strip product details from list view (keep response lightweight)
    return [
        {k: v for k, v in b.items() if k != "products"}
        for b in brands
    ]


@router.get("/brands/{brand_name}")
def get_brand_detail(brand_name: str):
    """
    Return full detail for a single brand including its products.
    Used by the Product Drilldown view when a brand is selected.
    """
    summary = _get_summary()
    brands = summary.get("brands", [])

    # Case-insensitive match to handle URL encoding differences
    match = next(
        (b for b in brands if b["brand"].lower() == brand_name.lower()),
        None
    )
    if not match:
        raise HTTPException(status_code=404, detail=f"Brand '{brand_name}' not found")

    return match


@router.get("/products")
def get_products(
    brand: str | None = Query(None, description="Filter by brand name"),
    min_price: float | None = Query(None),
    max_price: float | None = Query(None),
    min_rating: float | None = Query(None),
    sort_by: str | None = Query("rating", description="Sort by: rating, price, discount, review_count"),
    sort_order: str | None = Query("desc", description="asc or desc"),
):
    """
    Flat list of all products across all brands, with filters.
    Used by the Product Drilldown view filters.
    """
    summary = _get_summary()
    all_products = []

    for brand_data in summary.get("brands", []):
        brand_name = brand_data["brand"]
        for product in brand_data.get("products", []):
            # Enrich product with brand name for display
            all_products.append({**product, "brand": brand_name})

    # Apply filters
    if brand:
        all_products = [p for p in all_products if p.get("brand", "").lower() == brand.lower()]
    if min_price is not None:
        all_products = [p for p in all_products if (p.get("sale_price") or 0) >= min_price]
    if max_price is not None:
        all_products = [p for p in all_products if (p.get("sale_price") or float("inf")) <= max_price]
    if min_rating is not None:
        all_products = [p for p in all_products if (p.get("rating") or 0) >= min_rating]

    # Sort
    reverse = sort_order != "asc"
    sort_key_map = {
        "rating": "rating",
        "price": "sale_price",
        "discount": "discount_pct",
        "review_count": "review_count",
    }
    key = sort_key_map.get(sort_by, "rating")
    all_products.sort(key=lambda p: p.get(key) or 0, reverse=reverse)

    return all_products


@router.get("/competitive")
def get_competitive():
    """
    Return the competitive narrative and agent insights.
    This powers the Agent Insights section and the 'who is winning' panel.
    """
    summary = _get_summary()
    return summary.get("competitive_narrative", {})


@router.get("/health")
def health():
    """Simple health check — used by the frontend to detect if backend is running."""
    return {"status": "ok", "message": "Luggage Intel Agent API is running"}