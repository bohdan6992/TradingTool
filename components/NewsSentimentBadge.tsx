"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useUi } from "@/components/UiProvider";

/* =========================================================
   Типи
   ========================================================= */
type NewsItem = {
  id: string;
  title: string;
  link: string;
  pubDate: string; // ISO
  source?: string;
};

/* =========================================================
   Словники (EN + UA). Можеш вільно доповнювати.
   Вага ~ інтенсивність (чим більше — тим сильніший вплив)
   ========================================================= */
const POS: Record<string, number> = {
  beat: 2.2, beats: 2.2, "beats-estimates": 2.4, top: 1.2, tops: 1.2,
  surge: 2.6, surges: 2.6, soar: 2.8, soars: 2.8, rally: 2.2, rallies: 2.2,
  jump: 1.8, jumps: 1.8, gain: 1.6, gains: 1.6, upgrade: 1.9, upgrades: 1.9,
  bullish: 2.2, record: 1.9, "all-time-high": 2.6, expand: 1.2, expansion: 1.2,
  outperform: 2.0, outperforms: 2.0, strong: 1.2, robust: 1.2, accelerate: 1.4,

  // UA
  зростання: 1.9, зростає: 1.9, злет: 2.5, рекорд: 1.9, "оновив-рекорд": 2.6,
  підвищив: 1.6, підвищення: 1.6, "краще-очікувань": 2.2, бичачий: 2.0,
  перевищив: 1.8, прискорення: 1.4,
};

const NEG: Record<string, number> = {
  miss: -2.2, misses: -2.2, plunge: -2.8, plunges: -2.8, slump: -2.4, slumps: -2.4,
  drop: -1.7, drops: -1.7, fall: -1.6, falls: -1.6, cut: -1.7, cuts: -1.7,
  downgrade: -2.1, downgrades: -2.1, bearish: -2.2, warn: -1.8, warns: -1.8,
  bankruptcy: -3.2, default: -2.6, fear: -1.8, recession: -2.3, probe: -1.3,
  investigation: -1.6, lawsuit: -1.7,

  // UA
  падає: -1.8, падіння: -1.8, обвал: -2.8, обвалився: -2.8, зниження: -1.6, знизив: -1.6,
  гірше: -1.7, гірший: -1.7, ведмежий: -2.0, дефолт: -2.6, рецесія: -2.3,
  штраф: -1.7, розслідування: -1.6,
};

// заперечення інвертують найближчий сигнал (вікно N слів)
const NEGATIONS = new Set(["no", "not", "без", "ні", "не", "notwithstanding"]);

// слова, що зменшують впевненість (чутки/можливо)
const DAMPEN = new Set(["rumor", "rumors", "reportedly", "may", "might", "можливо", "чутки"]);

// n-грамки (2-/3-слова), що мають спеціальні ваги
const PHRASES: Record<string, number> = {
  "beats estimates": 2.4,
  "misses estimates": -2.4,
  "all time high": 2.6,
  "guidance raised": 2.2,
  "guidance cut": -2.2,
  "share buyback": 1.6,
  "stock split": 1.4,
  "sec investigation": -1.9,
  "antitrust probe": -2.0,
  // UA
  "краще очікувань": 2.2,
  "гірше очікувань": -2.2,
  "підвищив прогноз": 2.0,
  "знизив прогноз": -2.0,
};

const TICKER_RE = /\$?[A-Z]{1,5}\b/g;

/* =========================================================
   Утиліти
   ========================================================= */
function tokenize(s: string): string[] {
  // зберігаємо слова/цифри/знак $; забираємо діакритику
  return (s.toLowerCase().normalize("NFKD").match(/[a-zа-яіїє$][a-z0-9а-яіїє$\-]+/gi) ?? [])
    .map(w => w.replace(/[^\p{L}\p{N}$-]/gu, ""));
}

function scoreText(text: string) {
  const w = tokenize(text);
  let score = 0;

  // підсилювачі: ВЕСЬ КАПС або "!" наприкінці заголовка
  const emphasis = /[A-Z]{3,}/.test(text) ? 1.1 : 1.0;
  const exclam = /!+/.test(text) ? 1.05 : 1.0;

  // фрази (біґрами/тріґрами)
  const grams: string[] = [];
  for (let i = 0; i < w.length; i++) {
    const bi = [w[i], w[i + 1]].filter(Boolean).join(" ");
    const tri = [w[i], w[i + 1], w[i + 2]].filter(Boolean).join(" ");
    if (PHRASES[tri]) grams.push(tri);
    if (PHRASES[bi]) grams.push(bi);
  }
  for (const g of grams) score += PHRASES[g];

  // уніграми + інверсія/заглушка
  for (let i = 0; i < w.length; i++) {
    const t = w[i];
    let val = POS[t] ?? NEG[t] ?? 0;
    if (val !== 0) {
      const prev = w.slice(Math.max(0, i - 2), i);
      if (prev.some(p => NEGATIONS.has(p))) val = -val;
      if (prev.some(p => DAMPEN.has(p))) val *= 0.8;
      score += val;
    }
    if (DAMPEN.has(t)) score *= 0.9;
  }

  // підсилення
  score *= emphasis * exclam;

  return score;
}

function normalizeScore(x: number) {
  // м’який tanh-кліппінг (стабільніший за лінійне)
  return Math.tanh(x / 4.0);
}

function labelFor(score: number) {
  if (score >= 0.2) return { label: "Bullish", key: "bull" as const };
  if (score <= -0.2) return { label: "Bearish", key: "bear" as const };
  return { label: "Neutral", key: "neutral" as const };
}

// експоненційна вага свіжості (напіврозпад ~6 год)
function recencyWeight(date: Date, now = Date.now()) {
  const minutes = (now - date.getTime()) / 60000;
  const tau = (6 * 60) / Math.log(2);
  return Math.exp(-minutes / tau);
}

/* маленький хук для стабільного auto-refresh з AbortController */
function useAutoFetch<T>(url: string, refreshMs: number, deps: any[] = []) {
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean; ts: number }>({
    data: null, error: null, loading: true, ts: Date.now(),
  });

  useEffect(() => {
    let dead = false;
    let ctrl: AbortController | null = null;

    const load = async () => {
      try {
        ctrl = new AbortController();
        setState(s => ({ ...s, loading: true, error: null }));
        const r = await fetch(url, { cache: "no-store", signal: ctrl.signal });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (dead) return;
        setState({ data, error: null, loading: false, ts: Date.now() });
      } catch (e: any) {
        if (dead) return;
        if (e?.name === "AbortError") return;
        setState(s => ({ ...s, error: e?.message || "Network error", loading: false }));
      }
    };

    load();
    const t = setInterval(load, refreshMs);

    return () => { dead = true; ctrl?.abort(); clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, refreshMs, ...deps]);

  return state;
}

/* =========================================================
   Компонент
   ========================================================= */
export default function NewsSentimentBadge({
  fetchUrl = "/api/news/investing?limit=60",
  refreshMs = 120_000,
}: {
  fetchUrl?: string;
  refreshMs?: number;
}) {
  const { theme } = useUi();
  const { data, error, loading, ts } = useAutoFetch<{ items: NewsItem[] }>(fetchUrl, refreshMs, [theme]);
  const items = Array.isArray(data?.items) ? data!.items : [];

  // підрахунок метрик
  const stats = useMemo(() => {
    const now = Date.now();
    let wSum = 0, sSum = 0;
    const spark: number[] = [];
    const posBag: Record<string, number> = {};
    const negBag: Record<string, number> = {};
    const tickers: Record<string, number> = {};

    const recent = items.slice(0, 40); // беремо свіжіші 30–40 заголовків

    for (const it of recent) {
      const title = it?.title || "";
      const t = new Date(it?.pubDate || Date.now());
      const w = recencyWeight(t, now);
      const raw = scoreText(title);
      const n = normalizeScore(raw);
      sSum += n * w;
      wSum += w;
      spark.unshift(n);

      // «водії» позитиву/негативу
      const tokens = tokenize(title);
      for (const tk of tokens) {
        if (POS[tk]) posBag[tk] = (posBag[tk] || 0) + 1;
        if (NEG[tk]) negBag[tk] = (negBag[tk] || 0) + 1;
      }
      // тикери
      const possible = (title.match(TICKER_RE) || []).map(s => s.replace("$", ""));
      for (const tk of possible) {
        if (tk.length < 2) continue;
        tickers[tk] = (tickers[tk] || 0) + 1;
      }
    }

    const score = wSum > 0 ? sSum / wSum : 0;
    const { label, key } = labelFor(score);

    const top = (bag: Record<string, number>, k = 3) =>
      Object.entries(bag).sort((a, b) => b[1] - a[1]).slice(0, k).map(([w]) => w.toUpperCase());

    const topPos = top(posBag);
    const topNeg = top(negBag);
    const topTix = Object.entries(tickers)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([t]) => t.replace(/[^A-Z]/g, "").slice(0, 6));

    return { score, label, key, spark, topPos, topNeg, topTix, count: recent.length };
  }, [items, ts]);

  const pct = Math.round(((stats.score + 1) / 2) * 100); // 0..100

  // градієнт фону залежно від ключа
  const bgGrad =
    stats.key === "bull"
      ? "linear-gradient(135deg, color-mix(in oklab, #16a34a 48%, transparent), transparent)"
      : stats.key === "bear"
      ? "linear-gradient(135deg, color-mix(in oklab, #b91c1c 48%, transparent), transparent)"
      : "linear-gradient(135deg, color-mix(in oklab, #2563eb 42%, transparent), transparent)";

  // формат часу оновлення
  const lastUpdate = useMemo(() => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [ts]);

  // доступність: опис шкали
  const meterLabel = `${stats.label}, ${pct}%`;

  return (
    <div className="badge" role="group" aria-label="News sentiment widget">
      <div className="row">
        <div className={`dot ${stats.key}`} aria-hidden />
        <div className="title">Market mood</div>
        <div className={`tag ${stats.key}`} title={`Based on ${stats.count} headlines`}>{stats.label}</div>

        <div className="spacer" />
        <div className="meter" title={meterLabel} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <div className={`fill ${stats.key}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="score" title="Normalized score (−1…+1)">{stats.score.toFixed(2)}</div>

        <button className="btn" onClick={() => window.location.reload()} title="Перезавантажити">⟲</button>
      </div>

      <div className="row2">
        <div className="chips">
          <span className="lbl" title="Top positive drivers">Top +</span>
          {stats.topPos.length ? stats.topPos.map(w => <span key={w} className="chip plus">{w}</span>) : <span className="muted">—</span>}
        </div>
        <div className="chips">
          <span className="lbl" title="Top negative drivers">Top −</span>
          {stats.topNeg.length ? stats.topNeg.map(w => <span key={w} className="chip minus">{w}</span>) : <span className="muted">—</span>}
        </div>
        <div className="chips hide-on-narrow">
          <span className="lbl">Tickers</span>
          {stats.topTix.length ? stats.topTix.map(t => <span key={t} className="chip">{t}</span>) : <span className="muted">—</span>}
        </div>

        {/* Sparkline по останніх заголовках (згладжений) */}
        <svg className="spark" viewBox="0 0 120 28" preserveAspectRatio="none" aria-hidden>
          {(() => {
            const src = stats.spark.slice(0, 36);
            if (!src.length) return null;
            // просте згладжування (moving average window=3)
            const arr = src.map((v, i) => {
              const a = src[i - 1] ?? v, b = v, c = src[i + 1] ?? v;
              return (a + b + c) / 3;
            });
            const toXY = (v: number, i: number) => {
              const x = (i / Math.max(1, arr.length - 1)) * 120;
              const y = 14 - v * 10; // v∈[-1..1] → y≈[24..4]
              return `${x.toFixed(2)},${y.toFixed(2)}`;
            };
            const d = arr.map(toXY).join(" ");
            return <polyline points={d} className={`pl ${stats.key}`} />;
          })()}
        </svg>
      </div>

      <div className="foot">
        <span className="muted">Last update: {lastUpdate}</span>
        {loading && <span className="spinner" aria-live="polite">Updating…</span>}
        {error && <span className="err" title={error}>⚠ {error}</span>}
      </div>

      <style jsx>{`
        .badge {
          position: relative;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 1.25rem;
          padding: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,.18);
          color: var(--fg);
          overflow: hidden;
          isolation: isolate;
          color: var(--fg);
          max-width: 1200px;
          margin: 0 auto 14px;
        }
        .badge::before {
          content: "";
          position: absolute; inset: 0;
          background: ${bgGrad};
          opacity: .35;
          pointer-events: none;
          border-radius: inherit;
        }

        .row {
          display: grid;
          grid-template-columns: max-content max-content max-content 1fr auto auto auto;
          align-items: center;
          gap: 10px;
        }
        .row2 {
          display: grid;
          grid-template-columns: 1fr 1fr auto auto;
          gap: 10px; align-items: center; margin-top: 8px;
        }
        @media (max-width: 760px) {
          .row { grid-template-columns: max-content 1fr auto; }
          .spacer, .meter, .score { display: none; }
          .row2 { grid-template-columns: 1fr; gap: 6px; }
          .hide-on-narrow { display: none; }
        }

        .title { font-weight: 800; letter-spacing: .2px; }
        .dot { width: 10px; height: 10px; border-radius: 999px; box-shadow: 0 0 0 4px rgba(255,255,255,.06); }
        .dot.bull { background: #22c55e; box-shadow: 0 0 0 4px rgba(34,197,94,.18); }
        .dot.bear { background: #ef4444; box-shadow: 0 0 0 4px rgba(239,68,68,.18); }
        .dot.neutral { background: #60a5fa; box-shadow: 0 0 0 4px rgba(96,165,250,.18); }

        .tag {
          font-size: 12px; font-weight: 800; padding: 2px 8px; border-radius: 999px;
          border: 1px solid var(--card-border);
          background: color-mix(in oklab, var(--card-bg) 85%, transparent);
        }
        .tag.bull { border-color: color-mix(in oklab, #22c55e 50%, var(--card-border)); }
        .tag.bear { border-color: color-mix(in oklab, #ef4444 50%, var(--card-border)); }
        .tag.neutral { border-color: color-mix(in oklab, #60a5fa 50%, var(--card-border)); }

        .spacer { flex: 1; }

        .meter {
          position: relative; width: 160px; height: 10px;
          border-radius: 999px;
          background: color-mix(in oklab, var(--card-bg) 92%, transparent);
          border: 1px solid var(--card-border);
          overflow: hidden;
        }
        .fill { height: 100%; transition: width .5s cubic-bezier(.22,.7,.25,1); }
        .fill.bull { background: linear-gradient(90deg,#16a34a,#22c55e); }
        .fill.bear { background: linear-gradient(90deg,#b91c1c,#ef4444); }
        .fill.neutral { background: linear-gradient(90deg,#2563eb,#60a5fa); }

        .score { font-variant-numeric: tabular-nums; opacity: .9; min-width: 46px; text-align: right; }

        .btn {
          height: 28px; padding: 0 10px; border-radius: 8px;
          border: 1px solid var(--card-border);
          background: color-mix(in oklab, var(--card-bg) 86%, transparent);
          color: var(--fg); font-weight: 800;
        }
        .btn:hover {
          background: color-mix(in oklab, var(--color-primary) 10%, var(--card-bg));
          border-color: color-mix(in oklab, var(--color-primary) 28%, var(--card-border));
        }

        .chips { display: inline-flex; flex-wrap: wrap; gap: 6px; align-items: center; }
        .lbl { font-size: 12px; opacity: .7; margin-right: 2px; }
        .chip {
          font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 999px;
          background: color-mix(in oklab, var(--card-bg) 85%, transparent);
          border: 1px solid var(--card-border);
          opacity: .95;
        }
        .chip.plus { border-color: color-mix(in oklab, #22c55e 50%, var(--card-border)); }
        .chip.minus { border-color: color-mix(in oklab, #ef4444 50%, var(--card-border)); }

        .spark { width: 160px; height: 28px; }
        .pl { fill: none; stroke-width: 1.8; stroke-linejoin: round; stroke-linecap: round; opacity: .95; }
        .pl.bull { stroke: #22c55e; }
        .pl.bear { stroke: #ef4444; }
        .pl.neutral { stroke: #60a5fa; }

        .foot { display: flex; align-items: center; gap: 10px; margin-top: 6px; min-height: 18px; }
        .muted { opacity: .75; font-size: 12px; }
        .spinner { font-size: 12px; opacity: .9; }
        .err { color: #fca5a5; font-size: 12px; }

        :global(html[data-theme*="dark"]) .badge { color: #e6eaf2; }
      `}</style>

      {/* Skeleton поверх у стані loading */}
      <style jsx>{`
        .badge:after {
          content: ${loading ? "' '" : "none"};
          position: absolute; inset: 0;
          background: linear-gradient(90deg,
            transparent, color-mix(in oklab, var(--fg) 6%, transparent), transparent);
          animation: ${loading ? "shimmer 1.2s infinite" : "none"};
          border-radius: inherit; opacity: .35;
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
