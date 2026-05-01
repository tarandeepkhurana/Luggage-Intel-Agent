export const fmtPrice = (n) =>
  n ? `₹${Number(n).toLocaleString("en-IN")}` : "—";
export const fmtPct = (n) => (n != null ? `${Number(n).toFixed(1)}%` : "—");
export const fmtRating = (n) => (n ? Number(n).toFixed(1) : "—");
export const fmtScore = (n) => (n != null ? Number(n).toFixed(2) : "—");

export const sentimentColor = (s) =>
  s >= 0.75
    ? "text-emerald-400"
    : s >= 0.55
      ? "text-amber-400"
      : "text-red-400";

export const aspectColor = (val) => {
  const m = {
    positive: "pill-positive",
    negative: "pill-negative",
    mixed: "pill-mixed",
    not_mentioned: "pill-neutral",
  };
  return m[val] ?? m.not_mentioned;
};

export const BRAND_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];
