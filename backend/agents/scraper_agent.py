"""
agents/scraper_agent.py
------------------------
Scraper Agent — collects product listings and customer reviews from Amazon India.

Run directly:
    python -m backend.agents.scraper_agent

Output:
    backend/data/raw/{brand_name}.json   — one file per brand

Design notes:
  - Uses Playwright (async) for reliability with JS-heavy Amazon pages
  - Intentionally conservative: limited products + randomized delays
  - Saves incrementally so partial runs aren't wasted
  - All parsing is defensive — missing fields become None, never crash
"""

import asyncio
import sys
from pathlib import Path

# Make sure we can import from the backend package when running directly
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from playwright.async_api import async_playwright, Page, TimeoutError as PWTimeout

from backend.config import (
    TARGET_BRANDS,
    AMAZON_SEARCH_URL,
    MAX_PRODUCTS_PER_BRAND,
    MAX_REVIEWS_PER_PRODUCT,
    HEADLESS,
    SLOW_MO_MS,
    REQUEST_TIMEOUT_MS,
    RAW_DIR,
)
from backend.utils.helpers import (
    clean_text,
    parse_price,
    parse_rating,
    parse_review_count,
    polite_delay,
    save_json,
    timestamp,
)


# ── Product listing scraper ────────────────────────────────────────────────

async def scrape_search_results(page: Page, brand: str) -> list[dict]:
    """
    Scrape product cards from Amazon search results page for a brand.
    Returns a list of basic product dicts (title, ASIN, price, rating, URL).
    """
    products = []
    url = AMAZON_SEARCH_URL.format(brand=brand.replace(" ", "+"), page=1)

    print(f"[scraper] Fetching search results for: {brand}")
    try:
        await page.goto(url, timeout=REQUEST_TIMEOUT_MS)
        await page.wait_for_selector('[data-component-type="s-search-result"]', timeout=15_000)
    except PWTimeout:
        print(f"[scraper] Timeout loading search page for {brand}, skipping")
        return products

    # Each result card has this attribute
    cards = await page.query_selector_all('[data-component-type="s-search-result"]')
    print(f"[scraper] Found {len(cards)} cards for {brand}")

    for card in cards[:MAX_PRODUCTS_PER_BRAND]:
        try:
            product = await _extract_card_data(card, brand)
            if product and product.get("asin"):
                products.append(product)
        except Exception as e:
            # Defensive: log but don't crash the whole run
            print(f"[scraper] Card extraction error: {e}")
            continue

    return products


async def _extract_card_data(card, brand: str) -> dict | None:
    """Extract structured data from a single Amazon search result card."""

    # ASIN is the unique Amazon product ID — used to build review URLs
    asin = await card.get_attribute("data-asin") or ""
    if not asin:
        return None

    # Product title
    title_el = await card.query_selector("h2 a span")
    title = clean_text(await title_el.inner_text()) if title_el else ""

    # Sale price (the current price shown in red/bold)
    price_el = await card.query_selector(".a-price .a-offscreen")
    sale_price_str = await price_el.inner_text() if price_el else ""

    # Original / list price (struck-through MRP)
    list_price_el = await card.query_selector(".a-text-price .a-offscreen")
    list_price_str = await list_price_el.inner_text() if list_price_el else ""

    # Star rating
    rating_el = await card.query_selector(".a-icon-alt")
    rating_str = await rating_el.inner_text() if rating_el else ""

    # Review count
    review_el = await card.query_selector('[aria-label*="ratings"]')
    if not review_el:
        review_el = await card.query_selector(".a-size-base.s-underline-text")
    review_count_str = await review_el.inner_text() if review_el else ""

    # Product page URL
    link_el = await card.query_selector("h2 a")
    href = await link_el.get_attribute("href") if link_el else ""
    product_url = f"https://www.amazon.in{href}" if href and href.startswith("/") else href

    sale_price = parse_price(sale_price_str)
    list_price = parse_price(list_price_str)

    # Compute discount inline (also done again in competitive agent for consistency)
    discount_pct = None
    if list_price and sale_price and list_price > sale_price:
        discount_pct = round(((list_price - sale_price) / list_price) * 100, 1)

    return {
        "asin": asin,
        "brand": brand,
        "title": title,
        "product_url": product_url,
        "sale_price": sale_price,
        "list_price": list_price,
        "discount_pct": discount_pct,
        "rating": parse_rating(rating_str),
        "review_count": parse_review_count(review_count_str),
        "reviews": [],           # filled in by scrape_reviews()
        "scraped_at": timestamp(),
    }


# ── Review scraper ─────────────────────────────────────────────────────────

async def scrape_reviews(page: Page, asin: str) -> list[dict]:
    """
    Scrape customer reviews for a product by ASIN.
    Goes to the "all reviews" page directly — more reliable than product page.
    """
    reviews = []
    # Amazon all-reviews URL pattern
    reviews_url = f"https://www.amazon.in/product-reviews/{asin}/?pageNumber=1&sortBy=recent"

    try:
        await page.goto(reviews_url, timeout=REQUEST_TIMEOUT_MS)
        # Wait for review content OR the "no reviews" message
        await page.wait_for_selector(
            '[data-hook="review"], [data-hook="no-reviews-found"]',
            timeout=12_000
        )
    except PWTimeout:
        print(f"[scraper] Timeout on reviews for ASIN {asin}")
        return reviews

    review_cards = await page.query_selector_all('[data-hook="review"]')

    for card in review_cards[:MAX_REVIEWS_PER_PRODUCT]:
        try:
            review = await _extract_review_data(card)
            if review:
                reviews.append(review)
        except Exception as e:
            print(f"[scraper] Review extraction error: {e}")
            continue

    return reviews


async def _extract_review_data(card) -> dict | None:
    """Extract structured data from a single review card."""

    # Review title
    title_el = await card.query_selector('[data-hook="review-title"] span:not(.a-icon-alt)')
    title = clean_text(await title_el.inner_text()) if title_el else ""

    # Star rating for this review
    rating_el = await card.query_selector('[data-hook="review-star-rating"] .a-icon-alt')
    if not rating_el:
        rating_el = await card.query_selector('[data-hook="cmps-review-star-rating"] .a-icon-alt')
    rating_str = await rating_el.inner_text() if rating_el else ""

    # Review body text — this is what we feed to the LLM
    body_el = await card.query_selector('[data-hook="review-body"] span')
    body = clean_text(await body_el.inner_text()) if body_el else ""

    # Review date
    date_el = await card.query_selector('[data-hook="review-date"]')
    date_str = clean_text(await date_el.inner_text()) if date_el else ""

    # Verified purchase indicator
    verified_el = await card.query_selector('[data-hook="avp-badge"]')
    is_verified = verified_el is not None

    if not body:
        return None   # Skip reviews with no text — useless for LLM

    return {
        "title": title,
        "rating": parse_rating(rating_str),
        "body": body,
        "date": date_str,
        "verified": is_verified,
    }


# ── Main orchestration ─────────────────────────────────────────────────────

async def run_scraper(brands: list[str] | None = None):
    """
    Main entry point: scrapes all brands sequentially.
    Pass a brands list to override TARGET_BRANDS (useful for partial re-runs).
    """
    brands = brands or TARGET_BRANDS

    async with async_playwright() as pw:
        # Launch browser once and reuse across all brands
        browser = await pw.chromium.launch(
            headless=HEADLESS,
            slow_mo=SLOW_MO_MS,
        )
        # Use a single persistent context — shares cookies/session
        context = await browser.new_context(
            # Pretend to be a normal user
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
        )
        page = await context.new_page()

        for brand in brands:
            print(f"\n{'='*50}")
            print(f"[scraper] Starting brand: {brand}")
            print(f"{'='*50}")

            # Step 1: Get product listings for this brand
            products = await scrape_search_results(page, brand)
            print(f"[scraper] Collected {len(products)} products for {brand}")

            if not products:
                print(f"[scraper] No products found for {brand}, skipping reviews")
                continue

            # Step 2: For each product, scrape its reviews
            for i, product in enumerate(products):
                asin = product["asin"]
                print(f"[scraper] Reviews for product {i+1}/{len(products)}: {asin}")

                reviews = await scrape_reviews(page, asin)
                product["reviews"] = reviews
                print(f"[scraper]   → {len(reviews)} reviews collected")

                # Be polite between product review pages
                polite_delay(2.0, 4.0)

            # Step 3: Save brand data to disk immediately
            # (so partial runs aren't lost if something crashes later)
            output_path = RAW_DIR / f"{brand.lower().replace(' ', '_')}.json"
            save_json(
                {
                    "brand": brand,
                    "scraped_at": timestamp(),
                    "product_count": len(products),
                    "products": products,
                },
                output_path,
            )
            print(f"[scraper] ✓ Saved {brand} → {output_path}")

            # Longer delay between brands
            polite_delay(3.0, 6.0)

        await browser.close()

    print("\n[scraper] ✓ All brands scraped successfully.")


# ── CLI entry point ────────────────────────────────────────────────────────

if __name__ == "__main__":
    # Allow passing brand names as CLI args for partial runs:
    #   python -m backend.agents.scraper_agent "Safari" "VIP"
    import sys

    brands_arg = sys.argv[1:] if len(sys.argv) > 1 else None
    asyncio.run(run_scraper(brands_arg))