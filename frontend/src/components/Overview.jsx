import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  Legend,
} from "recharts";
import {
  fmtPrice,
  fmtPct,
  fmtRating,
  BRAND_COLORS,
  sentimentColor,
} from "../utils/format";

const TT = ({ active, payload, label, fmt }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold text-slate-100">
          {p.name}: {fmt ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="stat-card relative overflow-hidden pl-4">
      {/* Accent line */}
      {accent && (
        <div
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full opacity-80"
          style={{ background: accent }}
        />
      )}

      {/* Content */}
      <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function Overview({ data }) {
  const ov = data?.overview ?? {};
  const brands = data?.brands ?? [];

  const priceData = brands.map((b) => ({ name: b.brand, price: b.avg_price }));
  const sentData = brands.map((b) => ({
    name: b.brand,
    sentiment: +(b.sentiment_score * 10).toFixed(1),
    rating: +(b.avg_rating * 2).toFixed(1),
  }));
  const maxPrice = Math.max(...brands.map((b) => b.avg_price), 1);

  const radarData = [
    {
      m: "Rating",
      ...Object.fromEntries(
        brands.map((b) => [b.brand, +(b.avg_rating * 2).toFixed(1)]),
      ),
    },
    {
      m: "Sentiment",
      ...Object.fromEntries(
        brands.map((b) => [b.brand, +(b.sentiment_score * 10).toFixed(1)]),
      ),
    },
    {
      m: "Value",
      ...Object.fromEntries(brands.map((b) => [b.brand, b.value_score])),
    },
    {
      m: "Reviews",
      ...Object.fromEntries(
        brands.map((b) => [
          b.brand,
          Math.min(b.total_reviews / 100, 10).toFixed(1),
        ]),
      ),
    },
    {
      m: "Discount",
      ...Object.fromEntries(
        brands.map((b) => [b.brand, +(b.avg_discount_pct / 5).toFixed(1)]),
      ),
    },
  ];

  const priceSpread = brands.length
    ? Math.max(...brands.map((b) => b.avg_price)) -
      Math.min(...brands.map((b) => b.avg_price))
    : 0;

  return (
    <div className="space-y-10">
      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Brands Tracked"
          value={ov.brands_tracked ?? "—"}
          sub="luggage brands"
          accent="#3b82f6"
        />
        <StatCard
          label="Products Analyzed"
          value={ov.total_products ?? "—"}
          sub="listings scraped"
          accent="#10b981"
        />
        <StatCard
          label="Reviews Analyzed"
          value={(ov.total_reviews ?? 0).toLocaleString()}
          sub="customer reviews"
          accent="#f59e0b"
        />
        <StatCard
          label="Avg Sentiment"
          value={
            ov.avg_sentiment ? (ov.avg_sentiment * 10).toFixed(1) + "/10" : "—"
          }
          sub="across all brands"
          accent="#8b5cf6"
        />
        <StatCard
          label="Avg Sale Price"
          value={fmtPrice(ov.avg_price)}
          sub="across brands"
          accent="#3b82f6"
        />
        <StatCard
          label="Avg Rating"
          value={(ov.avg_rating ?? 0).toFixed(1) + " ★"}
          sub="star rating"
          accent="#f59e0b"
        />
        <StatCard
          label="Avg Discount"
          value={fmtPct(ov.avg_discount_pct)}
          sub="off list price"
          accent="#10b981"
        />
        <StatCard
          label="Price Spread"
          value={fmtPrice(priceSpread)}
          sub="premium vs budget"
          accent="#ef4444"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="card-p">
          <div className="mb-3">
            <p className="text-xl font-bold text-white flex items-center gap-2">
              Average Sale Price by Brand
            </p>
            <p className="text-xs text-slate-500">
              Shows how premium each brand is priced in the market
            </p>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={priceData} barSize={32}>
              <XAxis
                dataKey="name"
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 11 }}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(1)}k`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<TT fmt={fmtPrice} />}
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
                wrapperStyle={{
                  zIndex: 50,
                }}
                position={{ y: 0 }}
                allowEscapeViewBox={{ x: true, y: true }}
              />
              <Bar dataKey="price" radius={[6, 6, 0, 0]}>
                {priceData.map((_, i) => (
                  <Cell key={i} fill={BRAND_COLORS[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card-p overflow-visible">
          <div className="mb-3">
            <p className="text-xl font-bold text-white flex items-center gap-2">
              Sentiment vs Rating Comparison
            </p>
            <p className="text-xs text-slate-500">
              Rating is scaled to 10 for direct comparison with sentiment score
            </p>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={sentData} barSize={20}>
              <XAxis
                dataKey="name"
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 11 }}
                domain={[0, 10]}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<TT />}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
              <Bar
                dataKey="sentiment"
                name="Sentiment /10"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="rating"
                name="Rating ×2"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Competitive Overview (Radar Replacement) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
        {/* LEFT: Competitive Score Comparison */}
        <div className="card-p">
          <div className="mb-3">
            <p className="text-xl font-bold text-white flex items-center gap-2">
              Competitive Benchmark Overview
            </p>
            <p className="text-xs text-slate-500">
              Key metrics normalized to show brand strength comparison
            </p>
          </div>

          <div className="space-y-4">
            {brands.map((b, i) => {
              const metrics = [
                {
                  label: "Rating",
                  value: (b.avg_rating * 2).toFixed(1),
                  max: 10,
                },
                {
                  label: "Sentiment",
                  value: (b.sentiment_score * 10).toFixed(1),
                  max: 10,
                },
                {
                  label: "Value-for-Money",
                  value: b.value_score,
                  max: 10,
                },
                {
                  label: "Discount",
                  value: (b.avg_discount_pct / 10).toFixed(1),
                  max: 10,
                },
              ];

              return (
                <div key={b.brand} className="space-y-2">
                  {/* Brand header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: BRAND_COLORS[i] }}
                      />
                      <span className="text-sm font-semibold text-white">
                        {b.brand}
                      </span>
                    </div>

                    <span className="text-xs text-slate-500">
                      {b.price_band}
                    </span>
                  </div>

                  {/* Metrics bars */}
                  <div className="space-y-1">
                    {metrics.map((m) => (
                      <div key={m.label} className="flex items-center gap-3">
                        <span className="w-20 text-xs text-slate-400">
                          {m.label}
                        </span>

                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(m.value / m.max) * 100}%`,
                              background: BRAND_COLORS[i],
                            }}
                          />
                        </div>

                        <span className="text-xs text-slate-300 w-10 text-right">
                          {m.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Brand Snapshot (kept but improved) */}
        <div className="space-y-3">
          <div>
            <p className="text-xl font-bold text-white flex items-center gap-2">
              Brand Snapshot
            </p>
            <p className="text-xs text-slate-500">
              Quick qualitative summary of each brand
            </p>
          </div>

          {brands.map((b, i) => (
            <div
              key={b.brand}
              className="card-p flex items-center gap-4 hover:border-slate-600 transition-colors"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white"
                style={{ background: BRAND_COLORS[i] }}
              >
                {b.brand[0]}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <p className="font-semibold text-white text-sm">{b.brand}</p>
                <p className="text-xs text-slate-500 leading-relaxed whitespace-normal break-words">
                  {b.one_line_summary}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm font-bold text-amber-400">
                  {b.avg_rating} ★
                </p>
                <p
                  className={`text-xs font-semibold ${sentimentColor(b.sentiment_score)}`}
                >
                  {(b.sentiment_score * 10).toFixed(1)}/10
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
