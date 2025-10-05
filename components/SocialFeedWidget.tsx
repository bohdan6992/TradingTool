"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";

type Source = "twitter" | "reddit";

type Item = {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  source: Source;
  tags?: string[];
};

type Props = {
  /** Початкове джерело: reddit | twitter (twitter поки заглушка) */
  initialSource?: Source;
  /** Початковий запит у полі пошуку */
  initialQuery?: string;
  /** Скільки елементів брати з API (1..100) */
  limit?: number;
  /** Автооновлення, мс. 0 або undefined — без автооновлення */
  refreshMs?: number;
};

export default function SocialFeedWidget({
  initialSource = "reddit",
  initialQuery = "AAPL OR NVDA OR SPY",
  limit = 24,
  refreshMs = 0,
}: Props) {
  const [source, setSource] = useState<Source>(initialSource);
  const [query, setQuery] = useState(initialQuery);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  // будуємо лише ВІДНОСНИЙ URL (без window.origin), щоб SSR/прод не ламались
  const url = useMemo(() => {
    const u = new URL("/api/social", "http://localhost"); // базу ігноруємо — беремо тільки searchParams
    u.searchParams.set("source", source);
    u.searchParams.set("q", query);
    u.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 100)));
    return `/api/social?${u.searchParams.toString()}`;
  }, [source, query, limit]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(url, { method: "GET", cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e: any) {
      setErr(e?.message || "Помилка завантаження");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  // перше завантаження
  useEffect(() => {
    if (mounted) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // автооновлення
  useEffect(() => {
    if (!mounted) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (refreshMs && refreshMs > 0) {
      timerRef.current = setInterval(load, refreshMs);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, url, refreshMs]);

  return (
    <section className="surface rounded-3xl p-4">
      <div className="header">
        <h3>
          Twitter / Reddit Feed <span className="badge">{items.length}</span>
        </h3>
        <div className="controls">
          <div className="seg">
            <button
              className={`seg-btn ${source === "twitter" ? "is-active" : ""}`}
              onClick={() => setSource("twitter")}
              type="button"
            >
              Twitter
            </button>
            <button
              className={`seg-btn ${source === "reddit" ? "is-active" : ""}`}
              onClick={() => setSource("reddit")}
              type="button"
            >
              Reddit
            </button>
          </div>
          <button className="apply" onClick={load} type="button">
            Застосувати
          </button>
        </div>
      </div>

      <input
        className="input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="AAPL OR NVDA OR SPY"
      />

      {loading && <div className="note">Завантаження…</div>}
      {err && <div className="note error">Помилка: {err}</div>}
      {!loading && !err && items.length === 0 && (
        <div className="note">Нічого не знайдено за цим запитом.</div>
      )}

      <div className="grid">
        {items.map((it) => (
          <a
            className="card"
            key={it.id}
            href={it.link}
            target="_blank"
            rel="noreferrer"
          >
            <div className="title">{it.title}</div>
            <div className="meta">
              <span>
                {new Date(it.pubDate).toLocaleString("uk-UA", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "2-digit",
                  month: "2-digit",
                })}
              </span>
              <span className="src">{it.source}</span>
            </div>
          </a>
        ))}
      </div>

      <style jsx>{`
        .surface {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
                    max-width:1200px;
          margin: 0 auto 14px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }
        h3 {
          font-weight: 900;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .badge {
          background: color-mix(in oklab, var(--color-primary) 70%, transparent);
          color: #fff;
          border-radius: 999px;
          padding: 2px 8px;
          font-weight: 800;
        }
        .controls {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .seg {
          display: inline-flex;
          background: color-mix(in oklab, var(--card-bg) 88%, transparent);
          border: 1px solid var(--card-border);
          border-radius: 999px;
          padding: 4px;
        }
        .seg-btn {
          height: 32px;
          padding: 0 12px;
          border-radius: 999px;
          border: none;
          background: transparent;
          color: var(--fg);
          font-weight: 700;
          cursor: pointer;
        }
        .seg-btn.is-active {
          background: color-mix(in oklab, var(--color-primary) 20%, var(--card-bg));
          color: #fff;
        }
        .apply {
          height: 36px;
          padding: 0 14px;
          border-radius: 12px;
          background: var(--color-primary);
          color: #fff;
          font-weight: 800;
          border: none;
          cursor: pointer;
        }
        .input {
          width: 100%;
          margin: 10px 0 12px;
          border: 1px solid var(--card-border);
          border-radius: 12px;
          padding: 10px;
          background: color-mix(in oklab, var(--card-bg) 92%, transparent);
          color: var(--fg);
          outline: none;
        }
        .note {
          padding: 10px;
          border-radius: 12px;
          border: 1px solid var(--card-border);
          background: color-mix(in oklab, var(--card-bg) 96%, transparent);
        }
        .note.error {
          border-color: #ff7a7a;
          color: #ff7a7a;
        }
        .grid {
          display: grid;
          gap: 10px;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          margin-top: 10px;
        }
        .card {
          display: block;
          border: 1px solid var(--card-border);
          border-radius: 12px;
          padding: 12px;
          background: color-mix(in oklab, var(--card-bg) 95%, transparent);
          text-decoration: none;
          color: var(--fg);
          transition: border-color 0.15s ease;
        }
        .card:hover {
          border-color: color-mix(in oklab, var(--color-primary) 35%, var(--card-border));
        }
        .title {
          font-weight: 700;
          margin-bottom: 6px;
        }
        .meta {
          display: flex;
          justify-content: space-between;
          opacity: 0.75;
          font-size: 0.85rem;
        }
        .src {
          text-transform: capitalize;
        }
      `}</style>
    </section>
  );
}
