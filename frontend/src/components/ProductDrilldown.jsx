import { useState, useMemo } from "react";
import { fmtPrice, fmtRating, BRAND_COLORS } from "../utils/format";

export default function ProductDrilldown({ data }) {
  const brands = data?.brands ?? [];

  const allProducts = useMemo(
    () =>
      brands.flatMap((b, bi) => {
        const brand = (b.brand || "").trim().toLowerCase();

        return (b.products ?? []).map((p) => ({
          ...p,
          brand,
          brandColor: BRAND_COLORS[bi],
          review_count: p.reviews?.length ?? 0,
        }));
      }),
    [brands],
  );

  // ── TEMP (UI state) ─────────────────────
  const [tBrand, setTBrand] = useState("All");
  const [tMinRating, setTMinRating] = useState(0);
  const [tMaxPrice, setTMaxPrice] = useState(10000);

  // ── APPLIED (actual filters) ─────────────
  const [applied, setApplied] = useState({
    brand: "All",
    minRating: 0,
    maxPrice: 10000,
  });

  const [selected, setSelected] = useState(null);

  // APPLY BUTTON
  const applyFilters = () => {
    setApplied({
      brand: tBrand,
      minRating: tMinRating,
      maxPrice: tMaxPrice,
    });
    setSelected(null);
  };
  const normalize = (s) => (s || "").trim().toLowerCase();
  // ── FILTER LOGIC ─────────────────────────
  const filtered = useMemo(() => {
    const brandFilter = normalize(applied.brand);

    return allProducts
      .filter((p) => {
        if (brandFilter === "all") return true;
        return normalize(p.brand) === brandFilter;
      })
      .filter((p) => (p.rating ?? 0) >= applied.minRating)
      .filter((p) => (p.sale_price ?? 0) <= applied.maxPrice);
  }, [allProducts, applied]);
  console.log("APPLIED:", applied, "BRANDS:", [
    ...new Set(allProducts.map((p) => p.brand)),
  ]);
  return (
    <div className="space-y-6">
      {/* ───────── FILTER BAR ───────── */}
      <div className="card-p flex flex-wrap items-center gap-6 bg-slate-900/40 border border-slate-800 rounded-2xl px-5 py-4 text-sm">
        {/* Brand */}
        <div className="flex flex-col gap-1.5 min-w-[160px]">
          <label className="text-xs text-slate-400">Brand</label>
          <select
            value={tBrand}
            onChange={(e) => setTBrand(e.target.value)}
            className="mt-1 bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700"
          >
            <option value="All">All Brands</option>
            {brands.map((b) => (
              <option key={b.brand} value={b.brand}>
                {b.brand}
              </option>
            ))}
          </select>
        </div>

        {/* Rating */}
        <div className="flex flex-col gap-1.5 min-w-[140px]">
          <label className="text-xs text-slate-400 flex items-center justify-between gap-2">
            Min Rating: <span className="text-white">{tMinRating} ★</span>
          </label>
          <input
            type="range"
            min={0}
            max={5}
            step={0.5}
            value={tMinRating}
            onChange={(e) => setTMinRating(+e.target.value)}
            className="w-36 accent-blue-500"
          />
        </div>

        {/* Price */}
        <div className="flex flex-col gap-1.5 min-w-[140px]">
          <label className="text-xs text-slate-400 flex items-center justify-between gap-2">
            Max Price: <span className="text-white">{fmtPrice(tMaxPrice)}</span>
          </label>
          <input
            type="range"
            min={500}
            max={10000}
            step={100}
            value={tMaxPrice}
            onChange={(e) => setTMaxPrice(+e.target.value)}
            className="w-36 accent-blue-500"
          />
        </div>

        {/* Apply */}
        <button
          onClick={applyFilters}
          className="px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
        >
          Apply Filters
        </button>

        <div className="ml-auto text-xs text-slate-400">
          Showing{" "}
          <span className="text-white font-semibold">{filtered.length}</span>{" "}
          products
        </div>
      </div>

      {/* ───────── PRODUCTS GRID ───────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map((p) => (
          <div
            key={p.asin}
            onClick={() => {
              if (p.product_url) {
                window.open(p.product_url, "_blank");
              }
            }}
            className={`card p-4 cursor-pointer rounded-2xl border transition hover:border-slate-600 ${
              selected?.asin === p.asin
                ? "border-blue-500 bg-blue-900/10"
                : "border-slate-800"
            }`}
          >
            {/* Title */}
            <p className="text-sm font-medium text-white leading-snug line-clamp-2">
              {p.title}
            </p>

            {/* Brand + quick stats */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {p.brand}
              </span>

              <span className="text-xs text-amber-400 font-semibold">
                {fmtRating(p.rating)} ★
              </span>

              <span className="text-xs text-slate-400">
                {p.review_count ?? 0} reviews
              </span>
            </div>

            {/* ───────── AI SYNTHESIS PREVIEW (NEW) ───────── */}
            {p.synthesis && (
              <div className="mt-3 space-y-2">
                {/* Summary */}
                <p className="text-xs text-slate-300 leading-relaxed">
                  🤖 {p.synthesis.summary}
                </p>

                {/* Top praise */}
                <div className="flex flex-wrap gap-1">
                  {(p.synthesis.top_praise ?? []).slice(0, 2).map((item, i) => (
                    <span
                      key={`p-${i}`}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-900/30 text-emerald-300 border border-emerald-900/40"
                    >
                      ✓ {item}
                    </span>
                  ))}
                </div>

                {/* Top complaints */}
                <div className="flex flex-wrap gap-1">
                  {(p.synthesis.top_complaints ?? [])
                    .slice(0, 2)
                    .map((item, i) => (
                      <span
                        key={`c-${i}`}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-red-900/30 text-red-300 border border-red-900/40"
                      >
                        ✗ {item}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* Price block (IMPORTANT for filter verification) */}
            <div className="mt-3 flex items-end gap-3">
              <div className="text-lg font-bold text-white">
                {fmtPrice(p.sale_price)}
              </div>

              {p.list_price && (
                <div className="text-xs text-slate-500 line-through">
                  {fmtPrice(p.list_price)}
                </div>
              )}

              {p.discount_pct && (
                <div className="text-xs px-2 py-0.5 rounded bg-orange-900/40 text-orange-300">
                  -{p.discount_pct}%
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
