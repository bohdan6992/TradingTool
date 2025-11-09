"use client";

import React, { useEffect, useMemo, useState } from "react";

/* -------- helpers: NY close -------- */

/** Date in target TZ (America/New_York) as *real* JS Date (той самий epoch),
 * де getHours()/getFullYear() тощо відповідають «настінному часу» цієї TZ. */
function inTimeZone(date: Date, timeZone: string) {
  const inv = new Date(date.toLocaleString("en-US", { timeZone }));
  const diff = date.getTime() - inv.getTime();
  return new Date(date.getTime() - diff);
}

/** попередній робочий день (без свят, лише викл. зб/нд) */
function prevBusinessDayNY(d: Date) {
  const x = new Date(d);
  do {
    x.setDate(x.getDate() - 1);
  } while (x.getDay() === 0 || x.getDay() === 6);
  return x;
}

/** скільки хвилин минуло з останнього 16:00 America/New_York */
function minutesSinceLastCloseNY(now = new Date()): number {
  const nyNow = inTimeZone(now, "America/New_York"); // «настінний» NY час
  let lastClose = new Date(nyNow);
  lastClose.setHours(16, 0, 0, 0); // 16:00 NY

  const isWeekend = nyNow.getDay() === 0 || nyNow.getDay() === 6;
  if (isWeekend || nyNow < lastClose) {
    const prev = prevBusinessDayNY(nyNow);
    lastClose = new Date(prev);
    lastClose.setHours(16, 0, 0, 0);
  }
  // обидві дати живуть в одній «NY-лінії» часу, різниця коректна
  const diffMs = nyNow.getTime() - lastClose.getTime();
  return Math.max(1, Math.round(diffMs / 60000));
}

/* -------- types -------- */
type NewsItem = {
  id: string;
  title: string;
  link: string;
  pubDate: string; // ISO
  source: string;
  tickers?: string[];
  sentiment?: number; // -1..1
};

export default function NewsBoard({
  title = "Важливі новини",
  limit = 300,
  defaultTickers = "",
  auto = true,
  className = "",
}: {
  title?: string;
  limit?: number;
  defaultTickers?: string;
  auto?: boolean;
  className?: string;
}) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [q, setQ] = useState("");
  const [tickersStr, setTickersStr] = useState(defaultTickers);
  const [onlyWithTickers, setOnlyWithTickers] = useState(false);

  // «від учорашнього клозу» за замовчуванням
  const [useLastClose, setUseLastClose] = useState(true);
  const [sinceMinutesManual, setSinceMinutesManual] = useState(360);
  const sinceMinutes = useLastClose ? minutesSinceLastCloseNY() : sinceMinutesManual;

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [isAuto, setIsAuto] = useState(auto);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    p.set("limit", String(limit));
    p.set("sinceMinutes", String(sinceMinutes));
    if (q.trim()) p.set("q", q.trim());

    const cleaned = tickersStr
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    if (cleaned.length) p.set("tickers", cleaned.join(","));
    if (onlyWithTickers) p.set("requireTickers", "1");

    return p.toString();
  }, [limit, sinceMinutes, q, tickersStr, onlyWithTickers]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/news?${params}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      const data = await r.json();
      if (!data || !Array.isArray(data.items)) throw new Error("Invalid API shape");
      setItems(data.items);
    } catch (e: any) {
      setErr(e?.message || String(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [params]);

  useEffect(() => {
    if (!isAuto) return;
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [isAuto, params]);

  const sinceLabel = useLastClose ? "від учорашнього клозу" : `${sinceMinutes} хв`;

  return (
    <section className={`news-card ${className}`}>
      <header className="head">
        <h3>{title}</h3>
        <div className="tools">
          <input
            placeholder="Пошук в заголовках…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="inp"
          />
          <input
            placeholder="Тікери (через кому)… напр. SPY,QQQ"
            value={tickersStr}
            onChange={(e) => setTickersStr(e.target.value)}
            className="inp"
          />
          <label className="chk">
            <input
              type="checkbox"
              checked={onlyWithTickers}
              onChange={(e) => setOnlyWithTickers(e.target.checked)}
            />
            Лише з тікерами
          </label>

          <label className="chk">
            <input
              type="checkbox"
              checked={useLastClose}
              onChange={(e) => setUseLastClose(e.target.checked)}
            />
            Від клозу (NYSE)
          </label>
          {!useLastClose && (
            <input
              type="number"
              min={1}
              step={10}
              value={sinceMinutesManual}
              onChange={(e) => setSinceMinutesManual(Math.max(1, Number(e.target.value || 1)))}
              className="inp small"
              title="Хвилин від зараз"
            />
          )}

          <button className={`btn ${isAuto ? "on" : ""}`} onClick={() => setIsAuto((v) => !v)}>
            Авто: {isAuto ? "On" : "Off"}
          </button>
          <button className="btn" onClick={load} disabled={loading}>
            Оновити
          </button>
        </div>
      </header>

      <div className="since">Показано {sinceLabel}</div>

      {err && <div className="error">⚠️ {err}</div>}

      <div className="list">
        {!loading && !items.length && !err && (
          <div className="empty">Нічого не знайдено під ці фільтри.</div>
        )}

        {items.map((n) => (
          <a key={n.id} href={n.link} target="_blank" rel="noreferrer" className="row">
            <div className="firstcol">
              <span className={`sent ${tone(n.sentiment)}`}>{sentLabel(n.sentiment)}</span>
              <span className="src">{n.source}</span>
              <time dateTime={n.pubDate}>{timeAgo(n.pubDate)}</time>
            </div>
            <div className="title">{n.title}</div>
            {n.tickers?.length ? (
              <div className="tickers">
                {n.tickers.slice(0, 6).map((t) => (
                  <span key={t} className="tag">{t}</span>
                ))}
              </div>
            ) : <div className="tickers" />}
          </a>
        ))}
      </div>

      <style jsx>{`
        .news-card {
          border-radius: 16px;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          color: var(--fg);
          padding: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,.18);
          margin: 0 auto 14px;
        }
        .head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 4px;
        }
        h3 { margin: 0; font-size: 18px; }
        .tools { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .inp {
          height: 32px; padding: 0 10px; border-radius: 10px;
          border: 1px solid var(--card-border);
          background: color-mix(in oklab, var(--card-bg) 85%, transparent);
          color: var(--fg);
          min-width: 220px;
        }
        .inp.small { min-width: 120px; width: 120px; }
        .chk {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; opacity: .85;
        }
        .btn {
          height: 32px; padding: 0 10px; border-radius: 10px;
          border: 1px solid var(--card-border);
          background: color-mix(in oklab, var(--card-bg) 85%, transparent);
          color: var(--fg); font-weight: 600;
        }
        .btn.on {
          background: color-mix(in oklab, var(--color-primary) 12%, var(--card-bg));
          border-color: color-mix(in oklab, var(--color-primary) 30%, var(--card-border));
        }
        .since { opacity: .7; font-size: 12px; margin: 0 0 8px 2px; }

        .error {
          background: #3a1f22; border: 1px solid #6e373d; color: #ffd7d7;
          border-radius: 10px; padding: 10px 12px; margin: 6px 0 10px;
        }

        .list { display: grid; gap: 6px; }
        .row {
          display: grid; gap: 12px;
          grid-template-columns: 220px 1fr auto;
          align-items: center;
          padding: 10px 12px;
          border-radius: 12px;
          text-decoration: none; color: inherit;
          background: color-mix(in oklab, var(--card-bg) 92%, transparent);
          border: 1px solid color-mix(in oklab, var(--card-border) 85%, transparent);
        }
        .row:hover {
          background: color-mix(in oklab, var(--color-primary) 8%, var(--card-bg));
          border-color: color-mix(in oklab, var(--color-primary) 22%, var(--card-border));
        }

        .firstcol { display: flex; align-items: center; gap: 8px; white-space: nowrap; }
        .src {
          font-size: 12px; opacity: .75;
          border: 1px solid var(--card-border); border-radius: 999px;
          padding: 2px 6px;
        }
        time { font-size: 12px; opacity: .7; }

        .title { font-weight: 600; }
        .tickers { display: flex; gap: 6px; }
        .tag {
          font-size: 12px; border-radius: 999px; padding: 2px 8px;
          border: 1px solid var(--card-border);
          background: color-mix(in oklab, var(--card-bg) 85%, transparent);
        }

        .sent {
          font-size: 12px; font-weight: 700; border-radius: 8px;
          padding: 2px 8px; border: 1px solid var(--card-border);
        }
        .sent.pos { color: #0bb07b; border-color: #0bb07b66; }
        .sent.neg { color: #ff6b6b; border-color: #ff6b6b66; }
        .sent.neu { color: color-mix(in oklab, var(--fg) 80%, transparent); }

        .empty { opacity: .7; text-align: center; padding: 28px 0; }
      `}</style>
    </section>
  );
}

/* ===== little helpers ===== */

function tone(s?: number) {
  if (typeof s !== "number") return "neu";
  if (s > 0.15) return "pos";
  if (s < -0.15) return "neg";
  return "neu";
}
function sentLabel(s?: number) {
  if (typeof s !== "number") return "0";
  const v = Math.round(s * 100) / 100;
  const sign = v > 0 ? "+" : "";
  return `${sign}${v}`;
}
function timeAgo(iso: string) {
  const dt = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - dt);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "щойно";
  if (m < 60) return `${m} хв тому`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} год тому`;
  const d = Math.floor(h / 24);
  return `${d} дн. тому`;
}
