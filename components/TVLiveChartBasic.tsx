// components/TVLiveChartBasic.tsx
"use client";

type Props = {
  symbol?: string;
  interval?: string;
  height?: number;
};

export default function TVLiveChartBasic({
  symbol = "AMEX:SPY",
  interval = "1",
  height = 420,
}: Props) {
  return (
    <div className="surface rounded-3xl p-3">
      <div className="flex items-center justify-between mb-2 px-1">
        <h2 className="text-lg font-semibold">SPY — Intraday ({interval}m)</h2>
        <span className="text-xs tt-muted">placeholder</span>
      </div>
      <div style={{ height, width: "100%", background: "rgba(255,255,255,.06)", borderRadius: 12 }} />
      <style jsx>{`
        .surface { background: var(--card-bg); border: 1px solid var(--card-border); }
        .tt-muted { color: color-mix(in oklab, var(--fg) 70%, transparent); }
      `}</style>
    </div>
  );
}
