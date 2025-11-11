// components/signals/LiveStrategyTiles.tsx
"use client";
import Link from "next/link";
import { useMemo } from "react";

type Tile = {
  key: string;
  title: string;
  icon: string;            // emoji або іконка
  hint?: string;
  hot?: boolean;
  score: number;           // скільки сетапів
  maxScore: number;        // умовна “стеля” для прогрес-шкали
  tickers: { t: string; s: number }[];
  accent?: [string, string]; // кастомні кольори прогреса (опційно)
  spark?: number[];        // 0..100 — міні-динаміка
};

const mock: Tile[] = [
  {
    key: "breakout",
    title: "Breakout",
    icon: "📈",
    score: 18,
    maxScore: 20,
    tickers: [{ t: "META", s: 88 }, { t: "AAPL", s: 78 }, { t: "PLTR", s: 61 }],
    spark: [12, 18, 25, 40, 55, 62, 70, 78, 82, 90],
  },
  {
    key: "pumpAndDump",
    title: "Pump & Dump",
    icon: "🚀",
    score: 14,
    maxScore: 24,
    tickers: [{ t: "NFLX", s: 72 }, { t: "META", s: 66 }, { t: "AMZN", s: 63 }],
    spark: [8, 14, 14, 22, 18, 28, 34, 31, 36, 42],
  },
  {
    key: "reversal",
    title: "Reversal",
    icon: "🧭",
    score: 14,
    maxScore: 16,
    tickers: [{ t: "AMD", s: 93 }, { t: "SPY", s: 70 }, { t: "AAPL", s: 69 }],
    spark: [10, 8, 9, 12, 18, 22, 24, 26, 24, 28],
  },
  {
    key: "earnings",
    title: "Earnings",
    icon: "🧳",
    score: 12,
    maxScore: 12,
    tickers: [{ t: "COIN", s: 80 }, { t: "INTC", s: 77 }, { t: "ARKK", s: 68 }],
    spark: [60, 62, 61, 64, 66, 72, 75, 80, 86, 90],
  },
  {
    key: "gap",
    title: "Gap Play",
    icon: "⛳️",
    score: 10,
    maxScore: 18,
    tickers: [{ t: "SPY", s: 91 }, { t: "AVGO", s: 86 }, { t: "SMCI", s: 79 }],
    spark: [20, 26, 32, 40, 44, 50, 52, 48, 55, 61],
  },
  {
    key: "pullback",
    title: "Pullback",
    icon: "🪝",
    score: 8,
    maxScore: 14,
    tickers: [{ t: "XLE", s: 90 }, { t: "AMD", s: 77 }, { t: "GOOGL", s: 76 }],
    spark: [18, 15, 16, 14, 12, 16, 18, 22, 20, 26],
  },
  {
    key: "vwapBounce",
    title: "VWAP Bounce",
    icon: "〰️",
    score: 6,
    maxScore: 15,
    tickers: [{ t: "TSLA", s: 98 }, { t: "COIN", s: 77 }, { t: "NVDA", s: 63 }],
    spark: [8, 12, 10, 11, 16, 14, 18, 20, 22, 24],
  },
];

function Sparkline({ data, className }: { data?: number[]; className?: string }) {
  if (!data?.length) return null;
  const w = 120, h = 28;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (w - 2) + 1;
    const y = h - 1 - (v / 100) * (h - 2);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className}>
      <polyline
        points={points}
        fill="none"
        stroke="var(--tile-spark)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
}

export default function LiveStrategyTiles() {
  const data = useMemo(() => mock, []);

  return (
    <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 auto-rows-fr">
      {data.map((s) => {
        const pct = Math.max(0, Math.min(100, Math.round((s.score / s.maxScore) * 100)));
        const bg = s.accent
          ? `linear-gradient(90deg, ${s.accent[0]}, ${s.accent[1]})`
          : `linear-gradient(90deg, var(--tile-fill-start), var(--tile-fill-end))`;
        return (
          <Link
            href={`/signals/${s.key}`}
            key={s.key}
            className="group relative isolate rounded-2xl border px-4 py-4 md:px-5 md:py-5 flex flex-col gap-3
                       shadow-[0_12px_40px_-20px_var(--tile-shadow)]
                       ring-1 ring-inset ring-[var(--tile-border)] 
                       bg-[var(--tile-bg)] backdrop-blur-xl
                       hover:shadow-[0_18px_55px_-18px_var(--tile-glow)]
                       transition-[transform,box-shadow,background] duration-300 will-change-transform
                       hover:-translate-y-0.5"
            style={{}}
          >
            {/* Світловий відблиск зверху */}
            <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                 style={{ background: "radial-gradient(600px 160px at 30% -40px, var(--tile-glow), transparent 70%)" }} />

            {/* Заголовок */}
            <div className="flex items-center gap-3">
              <span className="text-xl md:text-2xl leading-none select-none drop-shadow-sm">{s.icon}</span>
              <h3 className="text-[1.05rem] md:text-[1.15rem] font-bold tracking-wide">
                {s.title}
              </h3>

              {/* info pill на правому краю */}
              <div className="ml-auto flex items-center gap-2">
                {s.hot && (
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold
                                   bg-[var(--chip-hot-bg)] text-[var(--chip-hot-fg)] shadow-sm">
                    HOT
                  </span>
                )}
                <span className="rounded-full border px-2 py-1 text-xs opacity-70
                                 border-[var(--tile-border)] bg-[var(--tile-bg)]">
                  {s.score} / {s.maxScore}
                </span>
              </div>
            </div>

            {/* Прогрес-бар */}
            <div className="mt-1">
              <div className="h-2.5 w-full rounded-full bg-[var(--tile-track)] overflow-hidden ring-1 ring-inset ring-[color-mix(in_oklab,var(--tile-track) 55%,transparent)]">
                <div
                  className="h-full rounded-full transition-[width] duration-600 ease-out will-change-[width]"
                  style={{
                    width: `${pct}%`,
                    background: bg,
                    boxShadow: "0 0 0 1px color-mix(in oklab, var(--tile-fill-end) 40%, transparent)",
                  }}
                />
              </div>
            </div>

            {/* Тікери */}
            <div className="flex flex-wrap gap-2">
              {s.tickers.map((t) => (
                <span key={t.t} className="chip">
                  <b className="opacity-90">{t.t}</b>&nbsp;<i className="opacity-70">{t.s}</i>
                </span>
              ))}
            </div>

            {/* Низ: ліва — кількість, права — спарклайн */}
            <div className="mt-auto flex items-end justify-between">
              <div className="leading-none">
                <div className="text-3xl md:text-4xl font-extrabold tracking-tight">{s.score}</div>
                <div className="text-[11px] opacity-60 mt-1">із {s.maxScore}</div>
              </div>
              <Sparkline data={s.spark} className="w-[120px] h-[28px] opacity-90" />
            </div>

            {/* subtle hover border */}
            <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-[color-mix(in_oklab,var(--tile-glow) 18%,transparent)] opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        );
      })}
    </section>
  );
}
