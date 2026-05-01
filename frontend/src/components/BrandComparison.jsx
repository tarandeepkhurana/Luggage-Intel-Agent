import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ScatterChart,
  Scatter,
  CartesianGrid,
} from "recharts";
import {
  fmtPrice,
  fmtPct,
  fmtRating,
  fmtScore,
  BRAND_COLORS,
  sentimentColor,
  aspectColor,
} from "../utils/format";

const ASPECTS = [
  "wheels",
  "handle",
  "zipper",
  "material",
  "size",
  "durability",
];

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold text-white">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export default function BrandComparison({ data }) {
  const brands = data?.brands ?? [];
  const [sortKey, setSortKey] = useState("avg_rating");
  const [sortDir, setSortDir] = useState(-1);
  const [selected, setSelected] = useState(brands.map((b) => b.brand));

  const toggle = (name) =>
    setSelected((p) =>
      p.includes(name) ? p.filter((b) => b !== name) : [...p, name],
    );
  const handleSort = (k) => {
    if (sortKey === k) setSortDir((d) => d * -1);
    else {
      setSortKey(k);
      setSortDir(-1);
    }
  };

  const sorted = [...brands]
    .filter((b) => selected.includes(b.brand))
    .sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;

      if (typeof av === "string") return sortDir * av.localeCompare(bv);
      return sortDir * (av - bv);
    });
  const scatterData = [...sorted]
    .sort((a, b) => a.avg_price - b.avg_price)
    .map((b) => ({
      brand: b.brand,
      x: b.avg_price,
      y: +(b.sentiment_score * 10).toFixed(1),
      color: BRAND_COLORS[brands.findIndex((bb) => bb.brand === b.brand)],
    }));
  const ScatterTT = ({ active, payload }) => {
    if (!active || !payload?.length) return null;

    const d = payload[0]?.payload;

    return (
      <div
        className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs"
        style={{ borderColor: d.color }}
      >
        <p className="font-semibold flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: d.color }}
          />
          <span style={{ color: d.color }}>{d.brand}</span>
        </p>

        <p className="text-slate-300">Price: ₹{d.x.toLocaleString()}</p>
        <p className="text-slate-300">Sentiment: {d.y}/10</p>
      </div>
    );
  };
  const SortTh = ({ k, label }) => (
    <th
      className="px-4 py-3 text-center cursor-pointer select-none"
      onClick={() => handleSort(k)}
    >
      <span
        className={`text-xs font-semibold uppercase tracking-wide transition-colors ${sortKey === k ? "text-blue-400" : "text-slate-500 hover:text-slate-300"}`}
      >
        {label} {sortKey === k ? (sortDir === -1 ? "↓" : "↑") : ""}
      </span>
    </th>
  );

  const discountData = sorted.map((b) => ({
    name: b.brand,
    discount: b.avg_discount_pct,
  }));
  const normAspect = (obj = {}) =>
    Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k.toLowerCase().trim(), v]),
    );
  return (
    <div className="space-y-6">
      {/* Brand toggles */}
      <div className="flex gap-2 flex-wrap">
        {brands.map((b, i) => (
          <button
            key={b.brand}
            onClick={() => toggle(b.brand)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              selected.includes(b.brand)
                ? "border-transparent text-white shadow-lg"
                : "border-slate-700 text-slate-500 bg-transparent hover:border-slate-500"
            }`}
            style={
              selected.includes(b.brand) ? { background: BRAND_COLORS[i] } : {}
            }
          >
            {b.brand}
          </button>
        ))}
      </div>

      {/* Comparison table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/40">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Brand
                </th>
                <SortTh k="avg_price" label="Avg Price" />
                <SortTh k="avg_discount_pct" label="Discount" />
                <SortTh k="avg_rating" label="Rating" />
                <SortTh k="total_reviews" label="Reviews" />
                <SortTh k="sentiment_score" label="Sentiment" />
                <SortTh k="value_score" label="Value-for-Money" />
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Band
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((b) => {
                const ci = brands.findIndex((bb) => bb.brand === b.brand);
                return (
                  <tr
                    key={b.brand}
                    className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: BRAND_COLORS[ci] }}
                        />
                        <span className="font-semibold text-white">
                          {b.brand}
                        </span>
                        {b.rank_by_rating === 1 && (
                          <span className="badge bg-amber-900/50 text-amber-400">
                            🏆 Top Rated
                          </span>
                        )}
                        {b.rank_by_value === 1 && (
                          <span className="badge bg-emerald-900/50 text-emerald-400">
                            💰 Best Value
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center font-semibold text-white">
                      {fmtPrice(b.avg_price)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="font-semibold text-orange-400">
                        {fmtPct(b.avg_discount_pct)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="font-bold text-amber-400">
                        {fmtRating(b.avg_rating)} ★
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center text-slate-300">
                      {(b.total_reviews ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`font-bold ${sentimentColor(b.sentiment_score)}`}
                      >
                        {(b.sentiment_score * 10).toFixed(1)}/10
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center font-semibold text-blue-400">
                      {fmtScore(b.value_score)}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`badge ${b.price_band === "Premium" ? "bg-purple-900/50 text-purple-400" : b.price_band === "Mid-range" ? "bg-blue-900/50 text-blue-400" : "bg-slate-800 text-slate-400"}`}
                      >
                        {b.price_band}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="card-p">
          <div className="mb-3">
            <p className="text-xl font-bold text-white flex items-center gap-2">
              Average Discount by Brand
            </p>
            <p className="text-xs text-slate-500">
              Higher bar = deeper discounts offered to customers
            </p>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={discountData} barSize={36}>
              <XAxis
                dataKey="name"
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 11 }}
                tickFormatter={(v) => v + "%"}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<TT />}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
              />
              <Bar dataKey="discount" name="Discount %" radius={[6, 6, 0, 0]}>
                {discountData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={
                      BRAND_COLORS[
                        brands.findIndex((b) => b.brand === sorted[i]?.brand)
                      ]
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card-p">
          <div className="mb-3">
            <p className="text-xl font-bold text-white flex items-center gap-2">
              Price vs Sentiment
            </p>
            <p className="text-xs text-slate-500">
              Higher right = expensive but loved
            </p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <ScatterChart margin={{ left: 10, right: 10 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />

              <XAxis
                dataKey="x"
                name="Price"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickCount={5}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(1)}k`}
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                dataKey="y"
                name="Sentiment"
                domain={[0, 10]}
                tick={{ fill: "#64748b", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip content={<ScatterTT />} />

              <Scatter name="Brands" data={scatterData}>
                {scatterData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex gap-4 justify-center mt-2">
            {sorted.map((b, i) => (
              <span
                key={b.brand}
                className="flex items-center gap-1.5 text-xs text-slate-400"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    background:
                      BRAND_COLORS[
                        brands.findIndex((bb) => bb.brand === b.brand)
                      ],
                  }}
                />
                {b.brand}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Aspect sentiment */}
      <div className="card-p">
        <div className="mb-3">
          <p className="text-xl font-bold text-white flex items-center gap-2">
            Aspect-Level Sentiment Analysis
          </p>
          <p className="text-xs text-slate-500">
            How users feel about key product components across brands
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-y-2">
            <thead>
              <tr>
                <th className="text-left px-3 py-2 text-slate-500 text-xs font-semibold uppercase">
                  Aspect
                </th>

                {sorted.map((b) => (
                  <th
                    key={b.brand}
                    className="text-center px-3 py-2 text-slate-400 text-xs font-semibold"
                  >
                    {b.brand}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {ASPECTS.map((aspect) => (
                <tr key={aspect} className="hover:bg-slate-800/20 transition">
                  <td className="px-3 py-2.5 text-slate-300 capitalize text-xs font-medium whitespace-nowrap">
                    {aspect}
                  </td>

                  {sorted.map((b) => {
                    const val =
                      normAspect(b.aspect_sentiment)?.[aspect] ??
                      "not_mentioned";

                    return (
                      <td key={b.brand} className="px-3 py-2.5 text-center">
                        <div
                          className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium border ${
                            val === "positive"
                              ? "bg-emerald-900/40 text-emerald-300 border-emerald-800"
                              : val === "negative"
                                ? "bg-red-900/40 text-red-300 border-red-800"
                                : val === "mixed"
                                  ? "bg-yellow-900/40 text-yellow-300 border-yellow-800"
                                  : "bg-slate-800 text-slate-400 border-slate-700"
                          }`}
                        >
                          {val.replace("_", " ")}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pros/cons */}
      {/* Pros/cons */}
      <div className="space-y-6">
        {/* Section Header */}
        <div className="space-y-1">
          <p className="text-xl font-bold text-white flex items-center gap-2">
            Brand-Level Sentiment Breakdown
          </p>
          <p className="text-xs text-slate-500">
            Recurring praise vs recurring complaints extracted from reviews
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {sorted.map((b) => {
            const ci = brands.findIndex((bb) => bb.brand === b.brand);

            return (
              <div
                key={b.brand}
                className="card-p border border-slate-800/60 rounded-2xl p-5 hover:border-slate-600/60 transition"
              >
                {/* Brand Header */}
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-800/40">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{ background: BRAND_COLORS[ci] }}
                  >
                    {b.brand[0]}
                  </div>

                  <div className="min-w-0">
                    <p className="font-semibold text-white text-sm truncate">
                      {b.brand}
                    </p>
                    <p className="text-xs text-slate-500">
                      {Number(b.sentiment_score * 10).toFixed(1)}/10 sentiment
                    </p>
                  </div>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* PRAISE */}
                  <div className="bg-emerald-900/10 border border-emerald-900/30 rounded-xl p-4">
                    <p className="text-xs text-emerald-400 font-semibold mb-3 uppercase tracking-wide">
                      ✓ Praise
                    </p>

                    <div className="space-y-2">
                      {(b.recurring_praise ?? []).map((p, j) => (
                        <p
                          key={j}
                          className="text-xs text-slate-300 flex gap-2"
                        >
                          <span className="text-emerald-500 mt-0.5">•</span>
                          <span className="leading-relaxed">{p}</span>
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* ISSUES */}
                  <div className="bg-red-900/10 border border-red-900/30 rounded-xl p-4">
                    <p className="text-xs text-red-400 font-semibold mb-3 uppercase tracking-wide">
                      ✗ Issues
                    </p>

                    <div className="space-y-2">
                      {(b.recurring_complaints ?? []).map((c, j) => (
                        <p
                          key={j}
                          className="text-xs text-slate-300 flex gap-2"
                        >
                          <span className="text-red-500 mt-0.5">•</span>
                          <span className="leading-relaxed">{c}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
