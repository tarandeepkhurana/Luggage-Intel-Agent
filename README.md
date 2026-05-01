# 🧳 Luggage Intel Agent

An **AI-powered competitive intelligence dashboard** for luggage brands on Amazon India.

Built for the Munshot AI Agent Internship Assignment.

---

## What It Does

Three lightweight AI agents scrape, analyze, and compare luggage brands:

| Agent                    | Role                                                                        |
| ------------------------ | --------------------------------------------------------------------------- |
| **Scraper Agent**        | Collects product listings + reviews from Amazon India via Playwright        |
| **Review Insight Agent** | Uses GPT-4o-mini to extract sentiment, themes, praise, complaints per brand |
| **Competitive Agent**    | Computes cross-brand metrics + generates "who is winning and why" narrative |

The React dashboard surfaces:

- **Overview** — stat cards, price chart, radar chart
- **Brand Comparison** — sortable table, discount chart, aspect-level sentiment grid
- **Product Drilldown** — filterable product list with AI review synthesis per product
- **Agent Insights** — winner/loser analysis, 5 non-obvious conclusions, value-for-money ranking

---

## Brands Covered

Safari · Skybags · American Tourister · VIP · Aristocrat

---

## Tech Stack

- **Backend**: Python, FastAPI, Playwright, OpenAI (GPT-4o-mini), Pandas
- **Frontend**: React (Vite), Tailwind CSS, Recharts
- **Storage**: JSON files (no database needed)

---

## Setup

### 1. Clone & configure

```bash
git clone https://github.com/yourusername/luggage-intel-agent
cd luggage-intel-agent
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### 2. Install backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
cd ..
```

### 3. Install frontend

```bash
cd frontend
npm install
cd ..
```

---

## Quick Start (Recommended)

⚡ You can directly run the application without executing the pipeline.
The repository already includes pre-scraped real data, so the dashboard will automatically load it instead of mock data.

```bash
# Terminal 1: backend
cd backend
source venv/bin/activate        # Windows: venv\Scripts\activate
python -m uvicorn main:app --reload

# Terminal 2: frontend
cd frontend && npm install && npm run dev
# → http://localhost:5173
```
---

## Running the Pipeline

### Option A — Use mock data (frontend only, no scraping)

The dashboard works immediately with mock data:

```bash
# Start backend (reads from data/mock/ automatically)
cd backend && python -m uvicorn main:app --reload 

# Start frontend
cd frontend && npm run dev
```

Open **http://localhost:5173**

### Option B — Full pipeline with live data

```bash
# Run all 3 agents in sequence
python run_pipeline.py

# Or skip scraping if you already have raw data:
python run_pipeline.py --skip-scrape

# Then start the servers
# Terminal 1: backend
cd backend
source venv/bin/activate        # Windows: venv\Scripts\activate
python -m uvicorn main:app --reload

# Terminal 2: frontend
cd frontend && npm install && npm run dev
# → http://localhost:5173
```

---

## Pipeline Steps

```
python run_pipeline.py
```

1. **Scraper Agent** → `backend/data/raw/{brand}.json`
2. **Review Insight Agent** → `backend/data/processed/{brand}_insights.json`
3. **Competitive Agent** → `backend/data/processed/competitive_summary.json`

The API automatically falls back to `data/mock/` if processed data isn't found.

---

## API Endpoints

| Method | Endpoint             | Description                           |
| ------ | -------------------- | ------------------------------------- |
| GET    | `/api/summary`       | Full data payload (used by dashboard) |
| GET    | `/api/overview`      | Stat card data                        |
| GET    | `/api/brands`        | All brand metrics (filterable)        |
| GET    | `/api/brands/{name}` | Single brand detail + products        |
| GET    | `/api/products`      | All products (filterable, sortable)   |
| GET    | `/api/competitive`   | Narrative + agent insights            |
| GET    | `/api/health`        | Health check                          |

---

## Data Schema

See `backend/data/mock/competitive_summary.json` for the full schema.

Key fields per brand:

```json
{
  "brand": "Safari",
  "avg_price": 3200.0,
  "avg_discount_pct": 38.5,
  "avg_rating": 4.3,
  "sentiment_score": 0.78,
  "value_score": 5.8,
  "price_band": "Mid-range",
  "aspect_sentiment": { "wheels": "positive", "zipper": "positive", ... },
  "recurring_praise": [...],
  "recurring_complaints": [...],
  "products": [{ "title": "...", "synthesis": { "summary": "...", ... } }]
}
```

---

## Sentiment Methodology

1. All reviews for a brand are collected and truncated to 200 chars each
2. A single GPT-4o-mini call receives up to 80 reviews and returns structured JSON
3. Output includes: sentiment score (0–1), label, themes, aspect-level sentiment
4. If LLM call fails, fallback = average star rating mapped to 0–1 scale
5. Value-for-money score = `sentiment_score × (1 - normalized_price) × 10`

---

## Limitations

- Amazon scraping may hit bot detection — run during off-peak hours
- Reviews capped at 15/product and 80/brand for cost control
- LLM theme extraction reflects review sample quality, not full review population
- Prices are point-in-time snapshots (Amazon prices change frequently)

---

## Project Structure

```
luggage-intel-agent/
├── backend/
│   ├── agents/
│   │   ├── scraper_agent.py        # Playwright Amazon scraper
│   │   ├── review_insight_agent.py # GPT-4o-mini sentiment + themes
│   │   └── competitive_agent.py    # Metrics + narrative generation
│   ├── api/routes.py               # FastAPI endpoints
│   ├── data/
│   │   ├── raw/                    # Scraped JSON per brand
│   │   ├── processed/              # LLM-enriched data
│   │   └── mock/                   # Mock data for dev
│   ├── utils/helpers.py
│   ├── config.py
│   └── main.py
├── frontend/src/
│   ├── components/
│   │   ├── Overview.jsx
│   │   ├── BrandComparison.jsx
│   │   ├── ProductDrilldown.jsx
│   │   └── AgentInsights.jsx
│   ├── hooks/useData.js
│   └── App.jsx
├── run_pipeline.py
└── .env.example
```
