"""
agents/scraper_agent.py — FINAL
Reviews fix: scroll down to trigger lazy-load AJAX, then wait for [data-hook="review"] to appear.
"""

import asyncio
import re
import sys
from pathlib import Path
from urllib.parse import unquote

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from playwright.async_api import async_playwright, Page, TimeoutError as PWTimeout

from backend.config import (
    TARGET_BRANDS, AMAZON_SEARCH_URL, MAX_PRODUCTS_PER_BRAND,
    MAX_REVIEWS_PER_PRODUCT, HEADLESS, RAW_DIR,
)
from backend.utils.helpers import (
    clean_text, parse_price, parse_rating, parse_review_count,
    polite_delay, save_json, timestamp,
)


def extract_asin(href: str) -> str:
    decoded = unquote(href or "")
    m = re.search(r'/dp/([A-Z0-9]{10})', decoded)
    return m.group(1) if m else ""


async def scrape_search_results(page: Page, brand: str) -> list[dict]:
    products = []
    url = AMAZON_SEARCH_URL.format(brand=brand.replace(" ", "+"), page=1)
    print(f"[scraper] Fetching: {url}")
    try:
        await page.goto(url, timeout=60_000, wait_until="domcontentloaded")
        await asyncio.sleep(4)
    except PWTimeout:
        print(f"[scraper] Timeout for {brand}")
        return products

    cards = await page.query_selector_all('[data-component-type="s-search-result"]')
    print(f"[scraper] Found {len(cards)} cards for {brand}")

    seen = set()
    for card in cards:
        try:
            p = await _extract_card(card, brand)
            if p and p["asin"] and p["asin"] not in seen:
                seen.add(p["asin"])
                products.append(p)
                if len(products) >= MAX_PRODUCTS_PER_BRAND:
                    break
        except Exception as e:
            print(f"[scraper] Card error: {e}")
    return products


async def _extract_card(card, brand: str) -> dict | None:
    asin = await card.get_attribute("data-asin") or ""
    if not asin:
        link = await card.query_selector("a[href]")
        if link:
            asin = extract_asin(await link.get_attribute("href") or "")
    if not asin:
        return None

    title = ""
    for sel in ["h2.a-size-base-plus span", ".a-size-base-plus.a-color-base.a-text-normal"]:
        el = await card.query_selector(sel)
        if el:
            t = clean_text(await el.inner_text())
            if t and t.lower() != "sponsored":
                title = t
                break
    if not title:
        h2 = await card.query_selector("h2[aria-label]")
        if h2:
            title = (await h2.get_attribute("aria-label") or "").replace("Sponsored Ad - ", "").strip()

    price_el = await card.query_selector(".a-price .a-offscreen")
    sale_price = parse_price(await price_el.inner_text() if price_el else "")
    list_el = await card.query_selector(".a-text-price .a-offscreen")
    list_price = parse_price(await list_el.inner_text() if list_el else "")
    rating_el = await card.query_selector(".a-icon-alt")
    rating = parse_rating(await rating_el.inner_text() if rating_el else "")
    rc_el = await card.query_selector(".a-size-base.s-underline-text")
    review_count = parse_review_count(await rc_el.inner_text() if rc_el else "")

    discount_pct = None
    if list_price and sale_price and list_price > sale_price:
        discount_pct = round(((list_price - sale_price) / list_price) * 100, 1)

    return {
        "asin": asin, "brand": brand, "title": title,
        "product_url": f"https://www.amazon.in/dp/{asin}",
        "sale_price": sale_price, "list_price": list_price,
        "discount_pct": discount_pct, "rating": rating,
        "review_count": review_count, "reviews": [],
        "scraped_at": timestamp(),
    }


async def scrape_reviews(page: Page, asin: str) -> list[dict]:
    """
    Reviews on the product page load via AJAX when user scrolls down.
    Fix: goto product page → scroll to bottom → wait for [data-hook='review'] to appear.
    """
    url = f"https://www.amazon.in/dp/{asin}"
    try:
        await page.goto(url, timeout=60_000, wait_until="domcontentloaded")
        await asyncio.sleep(2)

        # Scroll down in steps to trigger lazy-load of review section
        for _ in range(5):
            await page.evaluate("window.scrollBy(0, window.innerHeight)")
            await asyncio.sleep(0.8)

        # Wait for reviews to appear (up to 10s)
        try:
            await page.wait_for_selector('[data-hook="review"]', timeout=10_000)
        except PWTimeout:
            pass  # might still have found some, check below

        cards = await page.query_selector_all('[data-hook="review"]')

        if not cards:
            # Last resort: try the all-reviews page
            try:
                rev_url = f"https://www.amazon.in/product-reviews/{asin}?reviewerType=all_reviews"
                await page.goto(rev_url, timeout=60_000, wait_until="domcontentloaded")
                await asyncio.sleep(3)
                if "sign" not in (await page.title()).lower():
                    cards = await page.query_selector_all('[data-hook="review"]')
            except Exception:
                pass

    except PWTimeout:
        print(f"[scraper]   Timeout on {asin}")
        return []

    reviews = []
    for card in cards[:MAX_REVIEWS_PER_PRODUCT]:
        try:
            r = await _parse_review(card)
            if r:
                reviews.append(r)
        except Exception:
            continue
    return reviews


async def _parse_review(card) -> dict | None:
    # Rating
    rating_el = (
        await card.query_selector('[data-hook="review-star-rating"] .a-icon-alt') or
        await card.query_selector('.a-icon-star .a-icon-alt')
    )
    rating = parse_rating(await rating_el.inner_text() if rating_el else "")

    # Title
    title_el = await card.query_selector('[data-hook="review-title"] span:not(.a-icon-alt)')
    title = clean_text(await title_el.inner_text()) if title_el else ""

    # Body — the actual text is inside [data-hook="review-collapsed"] span
    # per the confirmed HTML: review-body > div > div[data-hook="review-collapsed"] > span
    body = ""
    for sel in [
        '[data-hook="review-collapsed"] span',
        '[data-hook="review-body"] span',
        '[data-hook="review-body"]',
    ]:
        el = await card.query_selector(sel)
        if el:
            t = clean_text(await el.inner_text())
            if t and len(t) > 3:
                body = t
                break

    date_el = await card.query_selector('[data-hook="review-date"]')
    date = clean_text(await date_el.inner_text()) if date_el else ""

    if not body or len(body) < 4:
        return None

    return {"title": title, "rating": rating, "body": body, "date": date, "verified": True}


async def run_scraper(brands: list[str] | None = None):
    brands = brands or TARGET_BRANDS

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=HEADLESS, slow_mo=80)
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
        )
        page = await context.new_page()

        for brand in brands:
            print(f"\n{'='*50}\n[scraper] Brand: {brand}\n{'='*50}")
            products = await scrape_search_results(page, brand)
            print(f"[scraper] {len(products)} products collected")
            if not products:
                continue

            for i, p in enumerate(products):
                print(f"[scraper] [{i+1}/{len(products)}] {p['asin']} — {p['title'][:50]}")
                reviews = await scrape_reviews(page, p["asin"])
                p["reviews"] = reviews
                print(f"[scraper]   → {len(reviews)} reviews")
                polite_delay(1.5, 3.0)

            out = RAW_DIR / f"{brand.lower().replace(' ', '_')}.json"
            save_json({"brand": brand, "scraped_at": timestamp(),
                       "product_count": len(products), "products": products}, out)
            print(f"[scraper] ✓ Saved → {out}")
            polite_delay(2.0, 3.0)

        await browser.close()
    print("\n[scraper] ✓ Done.")


if __name__ == "__main__":
    brands_arg = sys.argv[1:] if len(sys.argv) > 1 else None
    asyncio.run(run_scraper(brands_arg))