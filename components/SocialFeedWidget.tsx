"use client";

import React, { useEffect, useMemo, useState } from "react";

type Item = {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  source: "reddit" | "twitter";
  tags?: string[];
};

export default function SocialFeedWidget() {
  const [source, setSource] = useState<"reddit" | "twitter">("reddit");
  const [query, setQuery] = useState("AAPL OR NVDA OR SPY");
  const [limit, setLimit] = useState(24);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const url = useMemo(() => {
    // ВАЖЛИВО: лише відносний шлях, без window.location
    const u = new URL("/api/social", typeof window === "undefined" ? "http://localhost" : window.location.origin);
    u.searchParams.set("source", source);
    u.searchParams.set("q", query);
    u.searchParams.set("limit", String(limit));
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

  useEffect(() => {
    if (!mounted) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  return (
    <section className="surface rounded-3xl p-4">
      <div className="header">
        <h3>Twitter / Reddit Feed <span className="badge">{items.length}</span></h3>
        <div className="controls">
          <div className="seg">
            <button
              className={`seg-btn ${source === "twitter" ? "is-active" : ""}`}
              onClick={() => setSource("twitter")}
            >
              Twitter
            </button>
            <button
              className={`seg-btn ${source === "reddit" ? "is-active" : ""}`}
              onClick={() => setSource("reddit")}
            >
              Reddit
            </button>
          </div>
          <button className="apply" onClick={load}>Застосувати</button>
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
      {!loading && !err && items.length === 0 && <div className="note">Нічого не знайдено за цим запитом.</div>}

      <div className="grid">
        {items.map((it) => (
          <a className="card" key={it.id} href={it.link} target="_blank" rel="noreferrer">
            <div className="title">{it.title}</div>
            <div className="meta">
              <span>{new Date(it.pubDate).toLocaleString("uk-UA")}</span>
              <span className="src">{it.source}</span>
            </div>
          </a>
        ))}
      </div>

      <style jsx>{`
        .surface{background:var(--card-bg);border:1px solid var(--card-border)}
        .header{display:flex;justify-content:space-between;align-items:center;gap:12px}
        .badge{margin-left:6px;background:color-mix(in oklab,var(--color-primary) 70%, transparent);color:#fff;border-radius:999px;padding:2px 8px;font-weight:800}
        .controls{display:flex;gap:8px;align-items:center}
        .seg{display:inline-flex;background:color-mix(in oklab,var(--card-bg) 88%, transparent);border:1px solid var(--card-border);border-radius:999px;padding:4px}
        .seg-btn{height:32px;padding:0 12px;border-radius:999px;border:none;background:transparent;color:var(--fg);font-weight:700}
        .seg-btn.is-active{background:color-mix(in oklab,var(--color-primary) 20%, var(--card-bg));color:#fff}
        .apply{height:36px;padding:0 14px;border-radius:12px;background:var(--color-primary);color:#fff;font-weight:800;border:none}
        .input{width:100%;margin:10px 0 12px;border:1px solid var(--card-border);border-radius:12px;padding:10px;background:color-mix(in oklab,var(--card-bg) 92%, transparent);color:var(--fg)}
        .note{padding:10px;border-radius:12px;border:1px solid var(--card-border);background:color-mix(in oklab,var(--card-bg) 96%, transparent)}
        .note.error{border-color:#ff7a7a;color:#ff7a7a}
        .grid{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));margin-top:10px}
        .card{display:block;border:1px solid var(--card-border);border-radius:12px;padding:12px;background:color-mix(in oklab,var(--card-bg) 95%, transparent);text-decoration:none;color:var(--fg)}
        .card:hover{border-color:color-mix(in oklab,var(--color-primary) 35%, var(--card-border))}
        .title{font-weight:700;margin-bottom:6px}
        .meta{display:flex;justify-content:space-between;opacity:.7;font-size:.85rem}
        .src{text-transform:capitalize}
      `}</style>
    </section>
  );
}
