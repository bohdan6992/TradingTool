"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type EarningItem = {
  ticker: string;
  company?: string;
  // ISO string (UTC) або локальний формат, головне щоб new Date(date) коректно парсився
  datetime: string;
  // опційно:
  period?: string;     // Q2 FY25, FY2024, etc
  when?: "bmo" | "amc" | "tbc"; // before market open / after market close / to be confirmed
};

type Props = {
  /** Якщо є готовий ендпоінт — використовуй його.
   * Очікуваний JSON: { items: EarningItem[] } або просто EarningItem[] */
  fetchUrl?: string;

  /** Якщо fetchUrl не задано — компонент викличе /api/earnings/next?tickers=AAPL,MSFT&limit=... */
  tickers?: string[];

  /** Скільки записів показувати */
  limit?: number;

  /** Як часто оновлювати дані з бекенда (мс) */
  refreshMs?: number;
};

/** Допоміжне: формат різниці часу для каунтдауну */
function formatDiff(ms: number) {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return d > 0 ? `${d}d ${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`;
}

/** Кастомний інтервал, що не створює витоків */
function useInterval(cb: () => void, delay: number | null) {
  const saved = useRef(cb);
  useEffect(() => { saved.current = cb; }, [cb]);
  useEffect(() => {
    if (delay == null) return;
    const id = setInterval(() => saved.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

export default function EarningsCountdown({
  fetchUrl,
  tickers = ["AAPL", "MSFT", "NVDA", "META", "AMZN", "TSLA"],
  limit = 8,
  refreshMs = 5 * 60 * 1000,
}: Props) {
  const [items, setItems] = useState<EarningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  // тикаємо щосекунди для live-каунтдауну
  useInterval(() => setNow(Date.now()), 1000);

  // періодично перезавантажуємо дані
  const doFetch = async () => {
    try {
      setErr(null);
      let url = fetchUrl;
      if (!url) {
        const qs = new URLSearchParams();
        if (tickers.length) qs.set("tickers", tickers.join(","));
        qs.set("limit", String(limit));
        url = `/api/earnings/next?${qs.toString()}`;
      }
      const r = await fetch(url!, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();

      const arr: EarningItem[] = Array.isArray(data) ? data : (data?.items || []);
      // нормалізуємо
      const normalized = arr
        .filter(Boolean)
        .map((x) => ({
          ticker: x.ticker,
          company: x.company ?? "",
          datetime: x.datetime,
          period: x.period,
          when: x.when,
        }))
        .filter((x) => !!x.ticker && !!x.datetime);

      // відсортуємо за найближчою датою
      normalized.sort((a, b) => +new Date(a.datetime) - +new Date(b.datetime));
      setItems(normalized.slice(0, limit));
    } catch (e: any) {
      setErr(e?.message || "Помилка завантаження");
      // Демо-дані як фолбек (щоб було що побачити)
      setItems([
        { ticker: "AAPL", company: "Apple Inc.",  datetime: new Date(Date.now() + 36e5 * 12).toISOString(), when: "amc", period: "Q2" },
        { ticker: "NVDA", company: "NVIDIA",     datetime: new Date(Date.now() + 36e5 * 30).toISOString(),  when: "amc", period: "Q2" },
        { ticker: "MSFT", company: "Microsoft",  datetime: new Date(Date.now() + 36e5 * 48).toISOString(),  when: "bmo", period: "Q2" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    doFetch();
    const id = setInterval(doFetch, refreshMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchUrl, JSON.stringify(tickers), limit, refreshMs]);

  const enriched = useMemo(() => {
    const n = now;
    return items.map((it) => {
      const ts = +new Date(it.datetime);
      const diff = ts - n;
      return {
        ...it,
        diff,
        // прогрес до дедлайну: чим ближче, тим більша смужка (візуальний акцент)
        urgency: Math.max(0, Math.min(1, 1 - diff / (1000 * 60 * 60 * 72))), // 72 год вікно
      };
    });
  }, [items, now]);

  return (
    <section className="earnings surface">
      <div className="head">
        <div className="titleWrap">
          <span className="emoji" aria-hidden>⏳</span>
          <h3 className="title">Найближчі звіти (earnings)</h3>
          {!loading && !err && <span className="badge">{enriched.length}</span>}
        </div>
        <button className="miniBtn" onClick={doFetch} title="Оновити">↻</button>
      </div>

      {loading ? (
        <div className="skeletonGrid">
          {Array.from({ length: 4 }).map((_, i) => <div className="sk" key={i} />)}
        </div>
      ) : err ? (
        <div className="note error">Сталася помилка: {err}</div>
      ) : enriched.length === 0 ? (
        <div className="note">Найближчих звітів не знайдено.</div>
      ) : (
        <ul className="list">
          {enriched.map((it) => {
            const left = formatDiff(it.diff);
            const soon = it.diff <= 0;
            return (
              <li key={`${it.ticker}-${it.datetime}`} className={`row ${soon ? "due" : ""}`}>
                <div className="col ticker">
                  <span className="tk">{it.ticker}</span>
                  {it.company && <span className="cmp">{it.company}</span>}
                </div>

                <div className="col dt">
                  <span className="time">
                    {new Date(it.datetime).toLocaleString("uk-UA", {
                      weekday: "short", month: "short", day: "2-digit",
                      hour: "2-digit", minute: "2-digit"
                    })}
                  </span>
                  {it.when && <span className={`tag ${it.when}`}>{it.when.toUpperCase()}</span>}
                  {it.period && <span className="tag period">{it.period}</span>}
                </div>

                <div className="col countdown">
                  <div className="barWrap" aria-label="urgency">
                    <div className="bar" style={{ width: `${(it.urgency * 100).toFixed(0)}%` }} />
                  </div>
                  <span className={`left ${soon ? "hot" : ""}`}>
                    {soon ? "already" : left}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <style jsx>{`
        .surface {
          border: 1px solid var(--card-border);
          border-radius: 18px;
          background:
            linear-gradient(
              180deg,
              color-mix(in oklab, var(--card-bg) 94%, transparent) 0%,
              color-mix(in oklab, var(--card-bg) 88%, transparent) 100%
            );
          padding: 12px;
          margin: 0 auto 14px;
        }
        .head{
          display:flex; align-items:center; justify-content:space-between; gap:12px;
          margin-bottom: 8px;
        }
        .titleWrap{ display:flex; align-items:center; gap:10px; }
        .emoji{ font-size: 1.1rem; }
        .title{ margin:0; font-weight:900; font-size:1.05rem; }
        .badge{
          display:inline-flex; min-width:26px; height:26px; padding:0 8px; align-items:center; justify-content:center;
          border-radius:999px; font-weight:800; font-size:.85rem; color:#fff;
          background: color-mix(in oklab, var(--color-primary) 70%, #0000);
          border: 1px solid color-mix(in oklab, var(--color-primary) 90%, var(--card-border));
          box-shadow: 0 6px 16px color-mix(in oklab, var(--color-primary) 35%, transparent);
        }
        .miniBtn{
          height:32px; padding:0 10px; border-radius:10px; border:1px solid var(--card-border);
          background: color-mix(in oklab, var(--card-bg) 92%, transparent);
          color: var(--fg); font-weight:800;
        }
        .miniBtn:hover{
          background: color-mix(in oklab, var(--color-primary) 10%, var(--card-bg));
          border-color: color-mix(in oklab, var(--color-primary) 35%, var(--card-border));
        }

        .list{ display:grid; gap:8px; margin:0; padding:0; list-style:none; }
        .row{
          display:grid; grid-template-columns: 1.1fr .9fr .9fr; gap:10px; align-items:center;
          padding:10px; border-radius:14px; border:1px solid var(--card-border);
          background: color-mix(in oklab, var(--card-bg) 96%, transparent);
        }
        .row:hover{
          border-color: color-mix(in oklab, var(--color-primary) 35%, var(--card-border));
          box-shadow: 0 10px 22px rgba(0,0,0,.12);
        }

        .col{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; }

        .ticker .tk{ font-weight:900; letter-spacing:.2px; }
        .ticker .cmp{ opacity:.7; font-size:.9rem; }

        .dt{ gap:8px; }
        .time{ font-weight:700; }
        .tag{
          padding:2px 8px; border-radius:999px; font-size:.72rem; font-weight:800;
          border:1px solid var(--card-border);
          background: color-mix(in oklab, var(--card-bg) 92%, transparent);
          opacity:.9;
        }
        .tag.bmo{ color: #1d9b6c; border-color: color-mix(in oklab, #1d9b6c 35%, var(--card-border)); }
        .tag.amc{ color: #c45dd6; border-color: color-mix(in oklab, #c45dd6 35%, var(--card-border)); }
        .tag.tbc{ color: #a2a2a2; border-color: color-mix(in oklab, #a2a2a2 35%, var(--card-border)); }
        .tag.period{ color: color-mix(in oklab, var(--fg) 70%, transparent); }

        .countdown{ gap:10px; justify-content:flex-end; }
        .barWrap{
          position:relative; width:100%; max-width:190px; height:8px;
          background: color-mix(in oklab, var(--card-bg) 85%, transparent);
          border-radius:999px; border: 1px solid var(--card-border);
          overflow:hidden;
        }
        .bar{
          position:absolute; inset:0 auto 0 0;
          width:0; height:100%;
          background: color-mix(in oklab, var(--color-primary) 60%, transparent);
        }
        .left{ font-weight:900; letter-spacing:.2px; opacity:.9; }
        .left.hot{ color: #ff6b6b; }

        .note{
          padding:10px; border-radius:12px; border:1px solid var(--card-border);
          background: color-mix(in oklab, var(--card-bg) 96%, transparent);
          opacity:.95;
        }
        .error{
          color:#ff6b6b;
          border-color: color-mix(in oklab, #ff6b6b 35%, var(--card-border));
          background: linear-gradient(180deg, color-mix(in oklab, #ff6b6b 8%, var(--card-bg)) 0%, var(--card-bg) 100%);
        }

        .skeletonGrid{ display:grid; gap:8px; }
        .sk{
          height:54px; border:1px solid var(--card-border); border-radius:14px;
          background: linear-gradient(90deg,
            color-mix(in oklab, var(--card-bg) 90%, transparent) 0%,
            color-mix(in oklab, var(--card-bg) 84%, transparent) 50%,
            color-mix(in oklab, var(--card-bg) 90%, transparent) 100%);
          background-size: 200% 100%;
          animation: shimmer 1.2s linear infinite;
        }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

        @media (max-width: 760px){
          .row{ grid-template-columns: 1fr; align-items:flex-start; }
          .countdown{ justify-content:flex-start; }
        }
      `}</style>
    </section>
  );
}
