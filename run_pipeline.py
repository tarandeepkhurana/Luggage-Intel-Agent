"""
run_pipeline.py
----------------
Runs all 3 agents in sequence:
  1. Scraper Agent      → data/raw/
  2. Review Insight Agent → data/processed/
  3. Competitive Agent  → data/processed/competitive_summary.json

Usage:
  python run_pipeline.py              # full run
  python run_pipeline.py --skip-scrape  # skip scraper (use existing raw data)
"""
import sys
import asyncio

def main():
    skip_scrape = "--skip-scrape" in sys.argv

    if not skip_scrape:
        print("\n🕷️  STEP 1: Scraper Agent")
        from backend.agents.scraper_agent import run_scraper
        asyncio.run(run_scraper())
    else:
        print("\n⏭️  Skipping scraper (--skip-scrape)")

    print("\n🤖 STEP 2: Review Insight Agent")
    from backend.agents.review_insight_agent import run_insight_agent
    run_insight_agent()

    print("\n📊 STEP 3: Competitive Agent")
    from backend.agents.competitive_agent import run_competitive_agent
    run_competitive_agent()

    print("\n✅ Pipeline complete. Start the API: python -m backend.main")

if __name__ == "__main__":
    main()
