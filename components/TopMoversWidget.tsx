// components/TopMoversWidget.tsx
"use client";
import React, { useEffect, useState } from "react";

type Row = {
  ticker: string;
  last: number;
  prev: number;
  volume?: number;
  chgPct: number;
};

type ApiResp = {
  ts: string;
  universe: string;
  limit: number;
  gainers: Row[];
  losers: Row[];
  err?: string | null;
};

export default function TopMoversWidget({
  universe = "AAPL,MSFT,TSLA,NVDA,QQQ,SPY,AMD,META,NFLX,GOOGL",
  limit = 5,
  refreshMs = 60_000,
}: {
  universe?: string;
  limit?: number;
  refreshMs?: number;
}) {
  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const url = `/api/top-movers?universe=${encodeURIComponent(universe)}&limit=${limit}`;
      const r = await fetch(url);
      const j = (await r.json()) as ApiResp;
      setData(j);
    } catch (e) {
      setData({
        ts: new Date().toISOString(),
        universe,
        limit,
        gainers: [],
        losers: [],
        err: (e as any)?.message || "Fetch error",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, refreshMs);
    return () => clearInterval(id);
  }, [universe, limit, refreshMs]);

  const gainers = Array.isArray(data?.gainers) ? data!.gainers : [];
  const losers  = Array.isArray(data?.losers)  ? data!.losers  : [];
  const err     = data?.err || null;

  return (
    <section className="pane">
      <div className="paneHead">
        <span className="title">🚀 Топ-рухи дня</span>
        <span className="meta">{new Date(data?.ts || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
      </div>

      {loading ? (
        <div className="cols">
          <div className="col"><SkeletonRows /></div>
          <div className="col"><SkeletonRows /></div>
        </div>
      ) : err ? (
        <div className="error">Помилка: {err}</div>
      ) : (
        <div className="cols">
          <div className="col">
            <h4 className="colTitle">Gainers</h4>
            <ul className="list">
              {gainers.map((r) => (
                <li key={r.ticker} className="row up">
                  <span className="tk">{r.ticker}</span>
                  <span className="px">{r.last.toFixed(2)}</span>
                  <span className="chg up">+{r.chgPct.toFixed(2)}%</span>
                </li>
              ))}
              {gainers.length === 0 && <li className="empty">Немає даних</li>}
            </ul>
          </div>
          <div className="col">
            <h4 className="colTitle">Losers</h4>
            <ul className="list">
              {losers.map((r) => (
                <li key={r.ticker} className="row dn">
                  <span className="tk">{r.ticker}</span>
                  <span className="px">{r.last.toFixed(2)}</span>
                  <span className="chg dn">{r.chgPct.toFixed(2)}%</span>
                </li>
              ))}
              {losers.length === 0 && <li className="empty">Немає даних</li>}
            </ul>
          </div>
        </div>
      )}

      <style jsx>{`
        .pane {
          border: 1px solid var(--card-border);
          border-radius: 18px;
          background: var(--card-bg);
          padding: 12px;
                    max-width: 1200px;
          margin: 0 auto 14px;
        }
        .paneHead {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 8px;
        }
        .title { font-weight: 800; }
        .meta { font-size: .8rem; opacity: .7; }

        .cols { display: grid; gap: 12px; grid-template-columns: 1fr 1fr; }
        @media (max-width: 720px) { .cols { grid-template-columns: 1fr; } }

        .colTitle { margin: 6px 0 8px; opacity: .8; }
        .list { display: grid; gap: 8px; }

        .row {
          display: grid; grid-template-columns: auto 1fr auto; gap: 8px;
          align-items: center;
          border: 1px solid var(--card-border);
          border-radius: 12px;
          padding: 8px 10px;
          background: color-mix(in oklab, var(--card-bg) 94%, transparent);
        }
        .row.up { border-color: color-mix(in oklab, var(--color-primary) 40%, var(--card-border)); }
        .row.dn { border-color: color-mix(in oklab, #ff6b6b 40%, var(--card-border)); }

        .tk { font-weight: 900; letter-spacing: .3px; }
        .px { justify-self: end; opacity: .9; }
        .chg { min-width: 78px; text-align: right; font-weight: 800; }
        .chg.up { color: color-mix(in oklab, var(--color-primary) 90%, white); }
        .chg.dn { color: #ff7676; }

        .error {
          border: 1px solid color-mix(in oklab, #ff6b6b 40%, var(--card-border));
          background: color-mix(in oklab, #ff6b6b 12%, var(--card-bg));
          padding: 10px; border-radius: 12px; color: #ffbdbd;
        }
        .empty { opacity: .6; padding: 8px; }
      `}</style>
    </section>
  );
}

function SkeletonRows() {
  return (
    <ul className="list">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="skel" />
      ))}
      <style jsx>{`
        .list { display: grid; gap: 8px; }
        .skel {
          height: 36px; border-radius: 12px;
          background: linear-gradient(
            90deg,
            color-mix(in oklab, var(--card-bg) 90%, transparent) 0%,
            color-mix(in oklab, var(--card-bg) 82%, transparent) 50%,
            color-mix(in oklab, var(--card-bg) 90%, transparent) 100%
          );
          background-size: 200% 100%;
          animation: shimmer 1.2s linear infinite;
          border: 1px solid var(--card-border);
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </ul>
  );
}
