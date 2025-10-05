"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MessageSquare, Twitter } from "lucide-react";
import { SiReddit } from "react-icons/si";

type Source = "twitter" | "reddit";

type Post = {
  id: string;
  author: string;
  text: string;
  time: string;
  upvotes?: number;
  context?: "positive" | "negative" | "neutral";
};

type Props = {
  initialSource?: Source;
  initialQuery?: string;
  limit?: number;
  refreshMs?: number;
  /** опційний прапорець – примусово показувати демо-пости */
  demoMode?: boolean;
};

function makeFallback(source: Source, query: string): Post[] {
  const q = (query || "AAPL").split(/\s+/)[0];
  const now = Date.now();
  const t = (ms: number) =>
    new Date(now - ms).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" });

  return [
    {
      id: "fb-1",
      author: source === "twitter" ? "@FinTwitUser" : "r/StocksUser",
      text:
        source === "twitter"
          ? `${q} виглядає сильно сьогодні. Обʼєм вище середнього.`
          : `Обговорення ${q} на сабреддіті. Ідеї та ринки.`,
      time: t(2 * 60 * 1000),
      upvotes: 18,
      context: "positive",
    },
    {
      id: "fb-2",
      author: source === "twitter" ? "@TapeReader" : "r/TradingUser",
      text:
        source === "twitter"
          ? `По ${q} можливий відкат до підтримки — стежимо за обсягом.`
          : `Ймовірний pullback у ${q}, ділимось кейсами.`,
      time: t(8 * 60 * 1000),
      upvotes: 7,
      context: "neutral",
    },
    {
      id: "fb-3",
      author: source === "twitter" ? "@MacroFlow" : "r/OptionsUser",
      text:
        source === "twitter"
          ? `Опціони по ${q}: кол-ск’ю зростає, відкритий інтерес росте.`
          : `Опціони по ${q}: обговорення ск’ю та IV.`,
      time: t(15 * 60 * 1000),
      upvotes: 11,
      context: "positive",
    },
  ];
}

export default function SocialFeedWidget({
  initialSource = "twitter",
  initialQuery = "AAPL OR NVDA OR SPY",
  limit = 24,
  refreshMs = 120000,
  demoMode = false,
}: Props) {
  const [source, setSource] = useState<Source>(initialSource);
  const [query, setQuery] = useState(initialQuery);
  const [inputValue, setInputValue] = useState(initialQuery);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchData() {
    setLoading(true);
    try {
      if (demoMode) {
        setPosts(makeFallback(source, query));
        return;
      }

      const url = `/api/social?source=${source}&q=${encodeURIComponent(query)}&limit=${limit}`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();

      const items = Array.isArray(data?.items) ? (data.items as Post[]) : [];
      // ⬇️ якщо бек повернув порожньо/не масив – показуємо демо
      if (items.length === 0) {
        setPosts(makeFallback(source, query));
      } else {
        setPosts(items);
      }
    } catch {
      setPosts(makeFallback(source, query));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, refreshMs);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, query, demoMode]);

  const icon = useMemo(
    () => (source === "twitter" ? <Twitter size={18} className="tw" /> : <SiReddit size={18} className="rd" />),
    [source]
  );

  const applyQuery = () => {
    const v = inputValue.trim();
    if (!v) return;
    setQuery(v);
  };

  const ctxClass = (c?: string) =>
    c === "positive" ? "ctx ctx-pos" : c === "negative" ? "ctx ctx-neg" : "ctx ctx-neu";

  return (
    <div className="box">
      <div className="head">
        <h2 className="title">
          <MessageSquare size={18} />
          {icon}
          <span>Twitter / Reddit Feed</span>
          <span className="badge">{posts.length}</span>
        </h2>

        <div className="switch">
          <button
            type="button"
            onClick={() => setSource("twitter")}
            className={`pill ${source === "twitter" ? "is-active tw" : ""}`}
          >
            Twitter
          </button>
          <button
            type="button"
            onClick={() => setSource("reddit")}
            className={`pill ${source === "reddit" ? "is-active rd" : ""}`}
          >
            Reddit
          </button>
        </div>
      </div>

      <div className="controls">
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="input"
          placeholder="AAPL OR NVDA OR SPY"
        />
        <button className="apply" onClick={applyQuery}>
          Застосувати
        </button>
      </div>

      {loading ? (
        <div className="grid skeleton">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="card sk" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="note">Нічого не знайдено за цим запитом.</div>
      ) : (
        <div className="grid">
          {posts.map((p) => (
            <div key={p.id} className="card">
              <div className="row">
                <div className="author">{p.author}</div>
                <div className="time">{p.time}</div>
              </div>
              <div className={ctxClass(p.context)}>{p.text}</div>
              {typeof p.upvotes === "number" && <div className="votes">★ {p.upvotes}</div>}
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .box {
          border: 1px solid var(--card-border);
          background: color-mix(in oklab, var(--card-bg) 94%, transparent);
          border-radius: 20px;
          padding: 16px;
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.15);
          backdrop-filter: blur(6px);
                    max-width: 1200px;
          margin: 0 auto 14px;
        }

        .head {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 12px;
          margin-bottom: 10px;
        }
        .title {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-weight: 800;
          font-size: 1.05rem;
          margin: 0;
        }
        .badge {
          margin-left: 6px;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
          color: white;
          background: color-mix(in oklab, var(--color-primary) 75%, transparent);
          border: 1px solid
            color-mix(in oklab, var(--color-primary) 95%, var(--card-border));
        }

        .switch {
          display: inline-flex;
          gap: 8px;
        }
        .pill {
          height: 32px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid var(--card-border);
          background: color-mix(in oklab, var(--card-bg) 88%, transparent);
          color: var(--fg);
          font-weight: 700;
          cursor: pointer;
          transition: 0.15s ease;
        }
        .pill:hover {
          border-color: color-mix(in oklab, var(--color-primary) 40%, var(--card-border));
          background: color-mix(in oklab, var(--color-primary) 12%, var(--card-bg));
        }
        .pill.is-active.tw {
          background: #0ea5e9;
          color: #fff;
          border-color: #0ea5e9;
        }
        .pill.is-active.rd {
          background: #ff4500;
          color: #fff;
          border-color: #ff4500;
        }
        .tw {
          color: #0ea5e9;
        }
        .rd {
          color: #ff4500;
        }

        .controls {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          margin: 10px 0 14px 0;
        }
        .input {
          height: 38px;
          border-radius: 12px;
          border: 1px solid var(--card-border);
          background: color-mix(in oklab, var(--card-bg) 96%, transparent);
          padding: 0 12px;
          color: var(--fg);
          outline: none;
        }
        .input:focus {
          border-color: color-mix(in oklab, var(--color-primary) 40%, var(--card-border));
        }
        .apply {
          height: 38px;
          padding: 0 14px;
          border-radius: 12px;
          background: var(--color-primary);
          color: #fff;
          border: 1px solid
            color-mix(in oklab, var(--color-primary) 90%, var(--card-border));
          font-weight: 800;
          cursor: pointer;
          transition: 0.15s ease;
        }
        .apply:hover {
          filter: brightness(1.05);
        }

        .grid {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        }
        .card {
          border: 1px solid var(--card-border);
          background: color-mix(in oklab, var(--card-bg) 92%, transparent);
          border-radius: 14px;
          padding: 12px;
          transition: 0.15s ease;
        }
        .card:hover {
          border-color: color-mix(in oklab, var(--color-primary) 35%, var(--card-border));
          transform: translateY(-2px);
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.15);
        }
        .row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 6px;
          gap: 8px;
        }
        .author {
          font-weight: 700;
          opacity: 0.95;
        }
        .time {
          font-size: 12px;
          opacity: 0.65;
        }
        .votes {
          margin-top: 6px;
          font-size: 12px;
          opacity: 0.7;
        }

        .ctx {
          font-size: 0.95rem;
          line-height: 1.35rem;
        }
        .ctx-pos {
          color: #38d878;
        }
        .ctx-neu {
          color: #aab0b7;
        }
        .ctx-neg {
          color: #ff6b6b;
        }

        .note {
          border: 1px solid var(--card-border);
          background: color-mix(in oklab, var(--card-bg) 95%, transparent);
          border-radius: 14px;
          padding: 10px 12px;
          opacity: 0.85;
        }

        /* скелетон */
        .skeleton .card.sk {
          height: 86px;
          border-radius: 14px;
          background: linear-gradient(
            90deg,
            color-mix(in oklab, var(--card-bg) 90%, transparent) 0%,
            color-mix(in oklab, var(--card-bg) 80%, transparent) 50%,
            color-mix(in oklab, var(--card-bg) 90%, transparent) 100%
          );
          background-size: 200% 100%;
          animation: shimmer 1.2s linear infinite;
        }
        @keyframes shimmer {
          from {
            background-position: 200% 0;
          }
          to {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
}
