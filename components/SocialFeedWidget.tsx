"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Source = "twitter" | "reddit";
type Sentiment = "pos" | "neu" | "neg";

type SocialItem = {
  id: string;
  source: Source;
  author?: string;
  handle?: string;
  avatar?: string;
  text: string;
  url: string;
  createdAt: string;
  score?: number;
  sentiment?: Sentiment;
  tickers?: string[];
};

type Props = {
  initialSource?: Source;
  initialQuery?: string;
  limit?: number;
  refreshMs?: number;
  fetchUrlBuilder?: (src: Source, q: string, limit: number) => string;
};

export default function SocialFeedWidget({
  initialSource = "twitter",
  initialQuery = "AAPL OR NVDA OR SPY",
  limit = 20,
  refreshMs = 90000,
  fetchUrlBuilder,
}: Props) {
  const [source, setSource] = useState<Source>(initialSource);
  const [query, setQuery] = useState(initialQuery);
  const [appliedQuery, setAppliedQuery] = useState(initialQuery);
  const [items, setItems] = useState<SocialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // ✅ Будуємо рядок URL без window / document
  const url = useMemo(() => {
    if (fetchUrlBuilder) return fetchUrlBuilder(source, appliedQuery, limit);
    const qs = new URLSearchParams({
      source,
      q: appliedQuery,
      limit: String(limit),
    }).toString();
    return `/api/social?${qs}`;
  }, [source, appliedQuery, limit, fetchUrlBuilder]);

  const timerRef = useRef<number | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const list: SocialItem[] = Array.isArray(data) ? data : data?.items || [];
      setItems(list);
    } catch (e: any) {
      setErr(e?.message || "Помилка завантаження");
    } finally {
      setLoading(false);
    }
  };

  // запускаємо завантаження тільки на клієнті
  useEffect(() => {
    let mounted = true;
    (async () => {
      await load();
      if (!mounted) return;
      if (refreshMs > 0) {
        timerRef.current = window.setInterval(load, refreshMs) as any;
      }
    })();
    return () => {
      mounted = false;
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, refreshMs]);

  const sentimentToColor = (s?: Sentiment) => {
    switch (s) {
      case "pos": return "var(--sent-pos, #22c55e)";
      case "neg": return "var(--sent-neg, #ef4444)";
      default:    return "var(--sent-neu, #9ca3af)";
    }
  };

  return (
    <section className="sfw surface">
      <header className="sfw-head">
        <div className="sfw-title">
          <span className="emoji" aria-hidden>💬</span>
          <h2 className="h2">Twitter / Reddit Feed</h2>
          <span className="badge">{items.length}</span>
        </div>

        <div className="tabs" role="tablist" aria-label="джерело">
          <button
            className={`pill ${source === "twitter" ? "is-active" : ""}`}
            role="tab" aria-selected={source === "twitter"}
            onClick={() => setSource("twitter")}
          >
            Twitter
          </button>
          <button
            className={`pill ${source === "reddit" ? "is-active" : ""}`}
            role="tab" aria-selected={source === "reddit"}
            onClick={() => setSource("reddit")}
          >
            Reddit
          </button>
        </div>
      </header>

      <div className="sfw-search">
        <input
          type="text"
          value={query}
          placeholder='Пошук… (напр. "NVDA OR AAPL")'
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") setAppliedQuery(query.trim()); }}
          className="q"
          aria-label="Пошук по соціальних мережах"
        />
        <button className="btn primary" onClick={() => setAppliedQuery(query.trim())}>
          Застосувати
        </button>
      </div>

      {loading && <div className="note">Завантаження стрічки…</div>}
      {!loading && err && <div className="note error">Сталася помилка: {err}</div>}
      {!loading && !err && items.length === 0 && <div className="note">Нічого не знайдено за цим запитом.</div>}

      {!loading && !err && items.length > 0 && (
        <ul className="list">
          {items.map((it) => (
            <li key={`${it.source}-${it.id}`} className="card">
              <div className="meta">
                <div className="who">
                  {it.avatar ? (
                    <img className="avatar" src={it.avatar} alt={it.author || it.handle || "avatar"} />
                  ) : (
                    <div className="avatar placeholder" aria-hidden>👤</div>
                  )}
                  <div className="names">
                    <span className="author">{it.author || it.handle || (it.source === "twitter" ? "Tweet" : "Redditor")}</span>
                    {it.handle && <span className="handle">{it.handle}</span>}
                  </div>
                </div>

                <div className="right">
                  {typeof it.score === "number" && (
                    <span className="score" title="Оцінка / лайки / апвоути">★ {it.score}</span>
                  )}
                  <span
                    className="sent"
                    style={{ background: sentimentToColor(it.sentiment) }}
                    title={`Сентимент: ${it.sentiment || "neu"}`}
                  />
                </div>
              </div>

              <a className="text" href={it.url} target="_blank" rel="noreferrer" title="Відкрити оригінал">
                {highlightTickers(it.text, it.tickers)}
              </a>

              <div className="footer">
                <time className="date">
                  {new Date(it.createdAt).toLocaleString("uk-UA", {
                    hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit",
                  })}
                </time>
                <div className="chips">
                  {it.tickers?.slice(0, 6).map((t) => (
                    <span key={t} className="chip" title="Тікер">{t}</span>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <style jsx>{`
        .surface { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 24px; box-shadow: 0 10px 28px rgba(0,0,0,.08);           max-width: 1200px;
          margin: 0 auto 14px;}
        .sfw { padding: 16px; position: relative; overflow: hidden; }
        .sfw::before { content: ""; position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(900px 360px at 8% -10%, color-mix(in oklab, var(--color-primary) 14%, transparent) 0%, transparent 60%); opacity: .6; }

        .sfw-head { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
        .sfw-title { display: inline-flex; align-items: center; gap: 8px; }
        .emoji { font-size: 1.2rem; }
        .h2 { margin: 0; font-size: 1.15rem; font-weight: 900; letter-spacing: .2px; }
        .badge { display: inline-flex; align-items: center; justify-content: center; height: 26px; min-width: 26px; padding: 0 10px; font-size: .82rem; font-weight: 800; color: #fff;
          background: color-mix(in oklab, var(--color-primary) 85%, #0000); border: 1px solid color-mix(in oklab, var(--color-primary) 94%, var(--card-border)); border-radius: 999px;
          box-shadow: 0 8px 22px color-mix(in oklab, var(--color-primary) 30%, transparent); }

        .tabs { display: inline-flex; gap: 6px; }
        .pill { height: 34px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--card-border); background: color-mix(in oklab, var(--card-bg) 92%, transparent);
          color: var(--fg); font-weight: 800; cursor: pointer; transition: background .15s, border-color .15s, transform .15s; }
        .pill:hover { background: color-mix(in oklab, var(--color-primary) 10%, var(--card-bg)); border-color: color-mix(in oklab, var(--color-primary) 30%, var(--card-border)); transform: translateY(-1px); }
        .pill.is-active { background: color-mix(in oklab, var(--color-primary) 22%, var(--card-bg)); border-color: var(--color-primary); color: white; }

        .sfw-search { position: relative; z-index: 1; display: flex; gap: 8px; align-items: center; margin-bottom: 10px; }
        .q { flex: 1; height: 40px; border-radius: 12px; border: 1px solid var(--card-border); background: color-mix(in oklab, var(--card-bg) 94%, transparent);
          padding: 0 12px; outline: none; color: var(--fg); font-weight: 700; letter-spacing: .2px; }
        .q::placeholder { opacity: .6; font-weight: 600; }
        .btn.primary { height: 40px; padding: 0 14px; border-radius: 12px; font-weight: 800; border: 1px solid color-mix(in oklab, var(--color-primary) 70%, var(--card-border));
          background: var(--color-primary); color: #fff; box-shadow: 0 8px 18px color-mix(in oklab, var(--color-primary) 35%, transparent); cursor: pointer; transition: transform .12s, filter .12s; }
        .btn.primary:hover { filter: brightness(1.03); transform: translateY(-1px); }

        .note { position: relative; z-index: 1; background: color-mix(in oklab, var(--card-bg) 96%, transparent); border: 1px solid var(--card-border); border-radius: 14px; padding: 12px; }
        .note.error { color: #ff6b6b; border-color: color-mix(in oklab, #ff6b6b 35%, var(--card-border));
          background: linear-gradient(180deg, color-mix(in oklab, #ff6b6b 8%, var(--card-bg)) 0%, var(--card-bg) 100%); }

        .list { position: relative; z-index: 1; display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }

        .card { border-radius: 16px; border: 1px solid var(--card-border); background: color-mix(in oklab, var(--card-bg) 96%, transparent);
          box-shadow: 0 6px 18px rgba(0,0,0,.06); padding: 12px; transition: border-color .18s, box-shadow .18s, transform .18s; }
        .card:hover { border-color: color-mix(in oklab, var(--color-primary) 26%, var(--card-border)); box-shadow: 0 14px 30px rgba(0,0,0,.14); transform: translateY(-2px); }

        .meta { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
        .who { display: inline-flex; align-items: center; gap: 8px; }
        .avatar { width: 32px; height: 32px; border-radius: 999px; object-fit: cover; border: 1px solid var(--card-border); }
        .avatar.placeholder { display: grid; place-items: center; background: color-mix(in oklab, var(--card-bg) 88%, transparent); font-size: 16px; }
        .names { display: grid; line-height: 1; }
        .author { font-weight: 800; }
        .handle { font-size: .8rem; opacity: .7; }

        .right { display: inline-flex; align-items: center; gap: 8px; }
        .score { font-size: .8rem; font-weight: 800; padding: 2px 8px; border-radius: 999px; background: color-mix(in oklab, var(--card-bg) 92%, transparent);
          border: 1px solid color-mix(in oklab, var(--card-border) 86%, transparent); }
        .sent { width: 14px; height: 14px; border-radius: 999px; border: 1px solid color-mix(in oklab, #000 14%, var(--card-border));
          box-shadow: 0 0 0 3px color-mix(in oklab, var(--card-bg) 90%, transparent) inset; }

        .text { display: block; text-decoration: none; color: var(--fg); margin-bottom: 10px; line-height: 1.3rem; }
        .text:hover { text-decoration: underline; }

        .footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .date { font-size: .78rem; opacity: .7; padding: 2px 8px; border-radius: 999px; background: color-mix(in oklab, var(--card-bg) 92%, transparent);
          border: 1px solid color-mix(in oklab, var(--card-border) 86%, transparent); }
        .chips { display: inline-flex; gap: 6px; flex-wrap: wrap; }
        .chip { height: 22px; padding: 0 10px; border-radius: 999px; border: 1px solid var(--card-border); background: color-mix(in oklab, var(--card-bg) 90%, transparent);
          font-size: .75rem; font-weight: 800; opacity: .95; }

        :global(html[data-theme*="dark"]) .sfw:hover { box-shadow: 0 18px 42px rgba(0,0,0,.35); }
      `}</style>
    </section>
  );
}

function highlightTickers(text: string, tickers?: string[]) {
  if (!tickers || tickers.length === 0) return text;
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b(?:${tickers.map(esc).join("|")})\\b`, "g");
  const parts: Array<string | JSX.Element> = [];
  let lastIdx = 0;
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > lastIdx) parts.push(text.slice(lastIdx, idx));
    parts.push(
      <mark key={`${m[0]}-${idx}`} style={{
        background: "color-mix(in oklab, var(--color-primary) 30%, transparent)",
        color: "inherit",
        borderRadius: 6,
        padding: "0 4px",
      }}>
        {m[0]}
      </mark>
    );
    lastIdx = idx + m[0].length;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return <>{parts}</>;
}
