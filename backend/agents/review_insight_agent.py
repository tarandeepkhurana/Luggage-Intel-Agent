"""
agents/review_insight_agent.py
--------------------------------
Review Insight Agent — uses GPT-4o-mini to extract structured insights
from raw customer reviews for each brand.

Run directly:
    python -m backend.agents.review_insight_agent

Input:  backend/data/raw/{brand}.json
Output: backend/data/processed/{brand}_insights.json

What this agent produces per brand:
  - Overall sentiment score (0.0 - 1.0)
  - Top 5 positive themes
  - Top 5 negative themes
  - Recurring praise phrases
  - Recurring complaint phrases
  - Aspect-level sentiment (wheels, handle, zipper, material, size, durability)

Design notes:
  - All reviews per brand are batched into ONE LLM call to minimize API costs
  - Reviews are truncated to 200 chars each to stay within token limits
  - Prompt is structured to return valid JSON — we validate before saving
  - If LLM fails, falls back to a rule-based sentiment score so pipeline doesn't break
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from openai import OpenAI

from backend.config import (
    OPENAI_API_KEY,
    LLM_MODEL,
    LLM_MAX_TOKENS,
    TARGET_BRANDS,
    RAW_DIR,
    PROCESSED_DIR,
)
from backend.utils.helpers import load_json, save_json, timestamp


# Initialise OpenAI client once (reused across all brands)
client = OpenAI(api_key=OPENAI_API_KEY)


# ── Review preparation ─────────────────────────────────────────────────────

def collect_reviews_for_brand(brand_data: dict) -> list[dict]:
    """
    Flatten all reviews across all products for a brand into a single list.
    Each review gets tagged with its parent product title for context.
    """
    all_reviews = []
    for product in brand_data.get("products", []):
        product_title = product.get("title", "Unknown product")[:60]
        for review in product.get("reviews", []):
            if review.get("body"):   # Only include reviews that have text
                all_reviews.append({
                    "product": product_title,
                    "rating": review.get("rating"),
                    "body": review["body"][:250],   # Truncate to save tokens
                })
    return all_reviews


def format_reviews_for_prompt(reviews: list[dict]) -> str:
    """
    Serialize reviews into a compact string block for the LLM prompt.
    Format: [RATING/5] BODY TEXT
    """
    lines = []
    for r in reviews[:80]:   # Hard cap: max 80 reviews per brand to control cost
        rating_str = f"{r['rating']}/5" if r.get("rating") else "?/5"
        lines.append(f"[{rating_str}] {r['body']}")
    return "\n".join(lines)


# ── LLM call ──────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a product review analyst for an e-commerce competitive intelligence tool.
Analyze customer reviews and return ONLY a valid JSON object — no markdown, no explanation, no extra text.
Your JSON must exactly match the schema provided in the user message."""


def build_analysis_prompt(brand: str, reviews_text: str) -> str:
    """
    Build the user message that instructs GPT-4o-mini exactly what to return.
    The strict JSON schema in the prompt makes parsing reliable.
    """
    return f"""Analyze these Amazon India customer reviews for the luggage brand "{brand}".

REVIEWS:
{reviews_text}

Return ONLY this JSON structure (no markdown, no extra text):
{{
  "sentiment_score": <float 0.0-1.0, where 0=very negative, 1=very positive>,
  "sentiment_label": <"Excellent" | "Good" | "Average" | "Poor">,
  "positive_themes": [<top 5 positive themes as short phrases, most common first>],
  "negative_themes": [<top 5 negative themes as short phrases, most common first>],
  "recurring_praise": [<3-5 specific things customers repeatedly praise>],
  "recurring_complaints": [<3-5 specific things customers repeatedly complain about>],
  "aspect_sentiment": {{
    "wheels": <"positive" | "negative" | "mixed" | "not_mentioned">,
    "handle": <"positive" | "negative" | "mixed" | "not_mentioned">,
    "zipper": <"positive" | "negative" | "mixed" | "not_mentioned">,
    "material": <"positive" | "negative" | "mixed" | "not_mentioned">,
    "size": <"positive" | "negative" | "mixed" | "not_mentioned">,
    "durability": <"positive" | "negative" | "mixed" | "not_mentioned">
  }},
  "one_line_summary": <one sentence capturing the overall brand perception>
}}"""


def call_llm(brand: str, reviews_text: str) -> dict | None:
    """
    Call GPT-4o-mini with the review analysis prompt.
    Returns parsed dict or None if the call/parsing fails.
    """
    prompt = build_analysis_prompt(brand, reviews_text)

    try:
        response = client.chat.completions.create(
            model=LLM_MODEL,
            max_tokens=LLM_MAX_TOKENS,
            temperature=0.2,      # Low temp for consistent structured output
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
        )
        raw_text = response.choices[0].message.content.strip()

        # Strip any accidental markdown fences GPT adds despite instructions
        raw_text = raw_text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()

        return json.loads(raw_text)

    except json.JSONDecodeError as e:
        print(f"[review_agent] JSON parse error for {brand}: {e}")
        return None
    except Exception as e:
        print(f"[review_agent] LLM call failed for {brand}: {e}")
        return None


# ── Fallback (if LLM fails) ────────────────────────────────────────────────

def rule_based_sentiment(reviews: list[dict]) -> float:
    """
    Simple average-rating-based sentiment score as a fallback.
    Maps 1-5 star average → 0.0-1.0 range.
    """
    ratings = [r["rating"] for r in reviews if r.get("rating") is not None]
    if not ratings:
        return 0.5   # neutral default
    avg = sum(ratings) / len(ratings)
    return round((avg - 1) / 4, 3)   # 1→0.0, 5→1.0


def build_fallback_insights(brand: str, reviews: list[dict]) -> dict:
    """Return a minimal insights dict when LLM is unavailable."""
    score = rule_based_sentiment(reviews)
    label = "Good" if score >= 0.6 else "Average" if score >= 0.4 else "Poor"
    return {
        "sentiment_score": score,
        "sentiment_label": label,
        "positive_themes": ["Quality build", "Value for money", "Good wheels"],
        "negative_themes": ["Zipper issues", "Limited color options"],
        "recurring_praise": ["Spacious", "Easy to carry"],
        "recurring_complaints": ["Zipper quality", "Weight"],
        "aspect_sentiment": {
            "wheels": "not_mentioned",
            "handle": "not_mentioned",
            "zipper": "not_mentioned",
            "material": "not_mentioned",
            "size": "not_mentioned",
            "durability": "not_mentioned",
        },
        "one_line_summary": f"{brand} receives generally {label.lower()} feedback from customers.",
        "fallback": True,   # Flag so we know LLM was not used
    }


# ── Per-product review synthesis ───────────────────────────────────────────

def summarize_product_reviews(product: dict) -> dict:
    """
    Generate a short synthesis for an individual product's reviews.
    This is used in the Product Drilldown view.
    Uses a separate lighter LLM call per product.
    """
    reviews = product.get("reviews", [])
    if not reviews:
        return {"summary": "No reviews available.", "top_praise": [], "top_complaints": []}

    reviews_text = "\n".join(
        f"[{r.get('rating', '?')}/5] {r['body'][:150]}"
        for r in reviews[:20]
        if r.get("body")
    )

    prompt = f"""Summarize these reviews for the product: "{product.get('title', '')[:80]}"

REVIEWS:
{reviews_text}

Return ONLY this JSON (no markdown):
{{
  "summary": <2-3 sentence synthesis of what customers think>,
  "top_praise": [<3 things customers like most>],
  "top_complaints": [<3 things customers dislike most>]
}}"""

    try:
        response = client.chat.completions.create(
            model=LLM_MODEL,
            max_tokens=400,
            temperature=0.2,
            messages=[
                {"role": "system", "content": "Return only valid JSON, no markdown."},
                {"role": "user", "content": prompt},
            ],
        )
        raw = response.choices[0].message.content.strip()
        raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        return json.loads(raw)
    except Exception as e:
        print(f"[review_agent] Product synthesis failed: {e}")
        return {"summary": "Review synthesis unavailable.", "top_praise": [], "top_complaints": []}


# ── Main orchestration ─────────────────────────────────────────────────────

def run_insight_agent(brands: list[str] | None = None):
    """
    Process all brands: load raw data, call LLM, save enriched insights.
    """
    brands = brands or TARGET_BRANDS

    for brand in brands:
        print(f"\n[review_agent] Processing: {brand}")

        # Load raw scraped data
        raw_path = RAW_DIR / f"{brand.lower().replace(' ', '_')}.json"
        brand_data = load_json(raw_path)

        if not brand_data:
            print(f"[review_agent] No raw data for {brand}, skipping")
            continue

        # Collect all reviews across products
        all_reviews = collect_reviews_for_brand(brand_data)
        print(f"[review_agent] {len(all_reviews)} total reviews for {brand}")

        if not all_reviews:
            print(f"[review_agent] No reviews found, using fallback")
            insights = build_fallback_insights(brand, all_reviews)
        else:
            reviews_text = format_reviews_for_prompt(all_reviews)
            # Call LLM for brand-level insights
            insights = call_llm(brand, reviews_text)
            if not insights:
                print(f"[review_agent] LLM failed, using fallback")
                insights = build_fallback_insights(brand, all_reviews)

        # Also run per-product synthesis for the drilldown view
        products_with_synthesis = []
        for product in brand_data.get("products", []):
            print(f"[review_agent]   → Synthesizing: {product.get('title', '')[:50]}")
            synthesis = summarize_product_reviews(product)
            products_with_synthesis.append({**product, "synthesis": synthesis})

        # Combine everything into the processed output file
        output = {
            "brand": brand,
            "processed_at": timestamp(),
            "review_count": len(all_reviews),
            "insights": insights,
            "products": products_with_synthesis,
        }

        out_path = PROCESSED_DIR / f"{brand.lower().replace(' ', '_')}_insights.json"
        save_json(output, out_path)
        print(f"[review_agent] ✓ Saved insights → {out_path}")

    print("\n[review_agent] ✓ All brands processed.")


# ── CLI entry point ────────────────────────────────────────────────────────

if __name__ == "__main__":
    brands_arg = sys.argv[1:] if len(sys.argv) > 1 else None
    run_insight_agent(brands_arg)