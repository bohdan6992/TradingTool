"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type LiveQuote = {
  ticker: string;
  bid: number | null;
  ask: number | null;
  bidSize?: number | null;
  askSize?: number | null;
  exchange?: string | null;
  ts?: number | null; // epoch ms
};

type Props = {
  tickers?: string[];
  refreshMs?: number;
  compact?: boolean;
};

function fmt(v: number | null | undefined) {
  if (v == null) return "—";
  return v >= 1000 ? v.toFixed(2) : v.toFixed(3);
}
function fmtSize(v: number | null | undefined) {
  if (v == null) return "—";
  return v >= 1000 ? (v / 1000).toFixed(1) + "k" : String(v);
}
function fmtTime(ts?: number | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour12: false });
}

export default function LiveQuoteBoard({
  tickers = ["TSLA", "NVDA", "AAPL", "QQQ"],
  refreshMs = 1000,
  compact = false,
}: Props) {
  const [quotes, setQuotes] = useState<Record<string, LiveQuote>>({});
  const prevRef = useRef<Record<string, LiveQuote>>({});

  const spreadByT = useMemo(() => {
    const out: Record<string, number | null> = {};
    for (const t of Object.keys(quotes)) {
      const q = quotes[t];
      out[t] =
        q?.bid != null && q?.ask != null ? +(q.ask - q.bid).toFixed(4) : null;
    }
    return out;
  }, [quotes]);

  useEffect(() => {
    let alive = true;

    async function pull() {
      try {
        const url = `/api/quotes?tickers=${encodeURIComponent(
          tickers.join(",")
        )}`;
        const res = await fetch(url, { cache: "no-store" });
        const json = await res.json();
        if (!alive) return;
        const data = (json?.data ?? {}) as Record<string, LiveQuote>;
        prevRef.current = quotes;
        setQuotes(data);
      } catch (e) {
        // тихо ігноруємо, наступний цикл забере
      }
    }

    pull(); // перше завантаження
    const id = setInterval(pull, Math.max(300, refreshMs));
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [tickers.join(","), refreshMs]); // eslint-disable-line react-hooks/exhaustive-deps

  const [flash, setFlash] = useState<Record<string, "up" | "down" | null>>({});
  useEffect(() => {
    const next: Record<string, "up" | "down" | null> = {};
    for (const t of Object.keys(quotes)) {
      const cur = quotes[t];
      const prev = prevRef.current[t];
      if (cur && prev) {
        const midCur =
          cur.bid != null && cur.ask != null ? (cur.bid + cur.ask) / 2 : null;
        const midPrev =
          prev.bid != null && prev.ask != null ? (prev.bid + prev.ask) / 2 : null;
        if (midCur != null && midPrev != null) {
          next[t] = midCur > midPrev ? "up" : midCur < midPrev ? "down" : null;
        } else next[t] = null;
      } else next[t] = null;
    }
    setFlash(next);
    const to = setTimeout(() => setFlash({}), 400);
    return () => clearTimeout(to);
  }, [quotes]);

  return (
    <div className={`grid ${compact ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"} gap-3`}>
      {tickers.map((t) => {
        const q = quotes[t];
        const upDown = flash[t];
        const spread = spreadByT[t];

        return (
          <div
            key={t}
            className={[
              "rounded-2xl p-4 shadow-md border",
              "bg-neutral-900/60 border-neutral-800",
              "backdrop-blur supports-[backdrop-filter]:bg-neutral-900/40",
            ].join(" ")}
          >
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-xl font-semibold tracking-wide">{t}</div>
              <div className="text-xs text-neutral-400">
                {q?.exchange ?? "—"} • {fmtTime(q?.ts)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div
                className={[
                  "rounded-xl px-3 py-2 border",
                  "border-neutral-800 bg-neutral-900",
                  upDown === "down" ? "ring-2 ring-red-500/40" : "",
                ].join(" ")}
              >
                <div className="text-xs uppercase text-neutral-400">Bid</div>
                <div className="text-lg font-bold tabular-nums">{fmt(q?.bid)}</div>
                <div className="text-[11px] text-neutral-400">
                  Size: {fmtSize(q?.bidSize)}
                </div>
              </div>

              <div
                className={[
                  "rounded-xl px-3 py-2 border",
                  "border-neutral-800 bg-neutral-900",
                  upDown === "up" ? "ring-2 ring-emerald-500/40" : "",
                ].join(" ")}
              >
                <div className="text-xs uppercase text-neutral-400">Ask</div>
                <div className="text-lg font-bold tabular-nums">{fmt(q?.ask)}</div>
                <div className="text-[11px] text-neutral-400">
                  Size: {fmtSize(q?.askSize)}
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-neutral-400">Spread</span>
              <span className="tabular-nums">
                {spread == null ? "—" : spread.toFixed(4)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
