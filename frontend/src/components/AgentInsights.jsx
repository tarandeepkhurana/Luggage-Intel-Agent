import { BRAND_COLORS } from "../utils/format";

export default function AgentInsights({ data }) {
  const narrative = data?.competitive_narrative ?? {};
  const brands = data?.brands ?? [];
  const winner = brands.find((b) => b.brand === narrative.winner);
  const loser = brands.find((b) => b.brand === narrative.biggest_loser);
  const winnerIdx = brands.findIndex((b) => b.brand === narrative.winner);
  const loserIdx = brands.findIndex((b) => b.brand === narrative.biggest_loser);

  return (
    <div className="space-y-10">
      {/* Winner / Loser */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="card-p border-emerald-900/60 relative overflow-hidden pl-5">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 rounded-l-2xl" />
          <p className="text-xs text-emerald-400 font-semibold uppercase tracking-widest mb-3">
            🏆 Market Leader
          </p>
          <div className="flex items-center gap-3 mb-3">
            {winner && (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
                style={{ background: BRAND_COLORS[winnerIdx] ?? "#3b82f6" }}
              >
                {narrative.winner?.[0]}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-white">
                {narrative.winner ?? "—"}
              </h2>
              {winner && (
                <div className="flex gap-3 text-xs text-slate-400 mt-0.5">
                  <span>★ {winner.avg_rating}</span>
                  <span>
                    {(winner.sentiment_score * 10).toFixed(1)}/10 sentiment
                  </span>
                  <span>{winner.price_band}</span>
                </div>
              )}
            </div>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            {narrative.winner_reason}
          </p>
        </div>

        <div className="card-p border-emerald-900/60 relative overflow-hidden pl-5">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500 rounded-l-2xl" />
          <p className="text-xs text-red-400 font-semibold uppercase tracking-widest mb-3">
            ⚠ Most At Risk
          </p>
          <div className="flex items-center gap-3 mb-3">
            {loser && (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
                style={{ background: BRAND_COLORS[loserIdx] ?? "#ef4444" }}
              >
                {narrative.biggest_loser?.[0]}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-white">
                {narrative.biggest_loser ?? "—"}
              </h2>
              {loser && (
                <div className="flex gap-3 text-xs text-slate-400 mt-0.5">
                  <span>★ {loser.avg_rating}</span>
                  <span>
                    {(loser.sentiment_score * 10).toFixed(1)}/10 sentiment
                  </span>
                  <span>{loser.price_band}</span>
                </div>
              )}
            </div>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            {narrative.loser_reason}
          </p>
        </div>
      </div>
      {/* Market overview */}
      <div className="mt-10">
        <div className="card-p space-y-3">
          {/* Header */}
          <div>
            <p className="text-xl font-bold text-white flex items-center gap-2">
              📈 Market Overview
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Competitive landscape insights across brands
            </p>
          </div>

          {/* Main content */}
          <p className="text-sm text-slate-300 leading-relaxed">
            {narrative.market_overview}
          </p>

          {/* Secondary insight */}
          {narrative.price_vs_sentiment_note && (
            <div className="pt-2 border-t border-slate-800">
              <p className="text-xs text-slate-500 italic leading-relaxed">
                {narrative.price_vs_sentiment_note}
              </p>
            </div>
          )}
        </div>
      </div>
      {/* 5 Agent Insights */}
      <div className="card-p space-y-4">
        {/* Header */}
        <div>
          <p className="text-xl font-bold text-white">🤖 Agent Insights</p>
          <p className="text-xs text-slate-500">
            5 non-obvious conclusions extracted from review + pricing data
          </p>
        </div>

        {/* Insights */}
        <div className="space-y-3">
          {(narrative.agent_insights ?? []).map((insight, i) => (
            <div
              key={i}
              className="flex gap-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700/40 hover:border-slate-600/60 transition-all"
            >
              {/* Number badge */}
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </div>

              {/* Text */}
              <p className="text-sm text-slate-300 leading-relaxed">
                {insight}
              </p>
            </div>
          ))}
        </div>
      </div>
      {/* Value-for-money ranking */}
      <div className="card-p space-y-4">
        {/* Header */}
        <div>
          <p className="text-xl font-bold text-white">
            💰 Value-for-Money Ranking
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Score = (sentiment × 10) × (1 − normalized price). Higher = better
            value
          </p>
        </div>

        {/* Ranking list */}
        <div className="space-y-3">
          {[...brands]
            .sort((a, b) => b.value_score - a.value_score)
            .map((b, i) => {
              const ci = brands.findIndex((bb) => bb.brand === b.brand);
              const pct = (b.value_score / 10) * 100;

              return (
                <div key={b.brand} className="flex items-center gap-4">
                  {/* Rank */}
                  <span className="text-slate-500 text-sm w-5 text-center">
                    {i + 1}
                  </span>

                  {/* Brand */}
                  <span className="w-32 text-sm text-slate-300 font-medium">
                    {b.brand}
                  </span>

                  {/* Bar */}
                  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: BRAND_COLORS[ci],
                      }}
                    />
                  </div>

                  {/* Score */}
                  <span className="text-sm font-bold text-white w-12 text-right">
                    {b.value_score}
                  </span>
                </div>
              );
            })}
        </div>
      </div>
      {/* Brand scorecard grid */}
      <div className="space-y-5">
        {/* Section header */}
        <div>
          <p className="text-xl font-bold text-white flex items-center gap-2">
            🧾 Brand Scorecards
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Compact comparison of key performance metrics across brands
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-5">
          {brands.map((b, i) => (
            <div
              key={b.brand}
              className="card-p border border-slate-800/60 hover:border-slate-600/70 transition-all rounded-xl shadow-md hover:shadow-lg hover:scale-[1.01] duration-200"
            >
              {/* Header */}
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800/50">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm"
                  style={{ background: BRAND_COLORS[i] }}
                >
                  {b.brand[0]}
                </div>

                <div className="min-w-0">
                  <p className="font-semibold text-white text-sm truncate">
                    {b.brand}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Performance scorecard
                  </p>
                </div>
              </div>

              {/* Body */}
              <div className="pt-3 px-2 space-y-2.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Rating</span>
                  <span className="font-semibold text-amber-400">
                    {b.avg_rating} ★
                  </span>
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Sentiment</span>
                  <span className="font-semibold text-blue-400">
                    {(b.sentiment_score * 10).toFixed(1)}/10
                  </span>
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Value</span>
                  <span className="font-semibold text-emerald-400">
                    {b.value_score}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
