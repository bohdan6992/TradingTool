// components/BridgeArbitrageSignals.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useUi } from "@/components/UiProvider";

/* ===== Теми ===== */
const DARK_THEMES = new Set([
  "dark",
  "neon",
  "matrix",
  "solaris",
  "cyberpunk",
  "oceanic",
  "sakura",
  "asher",
  "inferno",
  "aurora",
  "desert",
  "midnight",
  "forest",
  "candy",
  "monochrome",
]);

const isDarkTheme = (name?: string | null) => {
  if (!name) return false;
  const v = name.toLowerCase().trim();
  return v.includes("dark") || DARK_THEMES.has(v);
};

/* ===== Типи ===== */
export type ArbitrageSignal = {
  strategy: string;
  ticker: string;
  benchmark: string;
  betaBucket?: string | null;
  direction: "up" | "down" | "none";
  sig?: number | null;
  zapS?: number | null;
  zapSsigma?: number | null;
  zapL?: number | null;
  zapLsigma?: number | null;
  shortCandidate?: boolean;
  longCandidate?: boolean;
};

type Mode = "top" | "all";

type BetaKey = "lt1" | "b1_1_5" | "b1_5_2" | "gt2" | "unknown";

type RowPair = {
  short?: ArbitrageSignal;
  long?: ArbitrageSignal;
};

type BucketGroup = {
  id: string;
  benchmark: string;
  betaKey: BetaKey;
  rows: RowPair[];
};

type BenchBlock = {
  benchmark: string;
  buckets: BucketGroup[];
};

/* ===== Допоміжні ===== */

const betaLabels: Record<BetaKey, string> = {
  lt1: "β < 1.0",
  b1_1_5: "β 1.0–1.5",
  b1_5_2: "β 1.5–2.0",
  gt2: "β > 2.0",
  unknown: "β н/д",
};

const benchmarkOrder = ["QQQ", "SPY", "IWM"];

const BENCH_COLORS: Record<string, string> = {
  QQQ: "#a855f7",
  SPY: "#22c55e",
  IWM: "#f97316",
  DEFAULT: "#9ca3af",
};

const parseBetaKey = (raw?: string | null): BetaKey => {
  if (!raw) return "unknown";
  const b = Number(String(raw).replace(",", "."));
  if (Number.isNaN(b)) return "unknown";
  if (b < 1) return "lt1";
  if (b < 1.5) return "b1_1_5";
  if (b < 2) return "b1_5_2";
  return "gt2";
};

const sortBenchmarks = (a: string, b: string) => {
  const ua = a.toUpperCase();
  const ub = b.toUpperCase();
  const ia = benchmarkOrder.indexOf(ua);
  const ib = benchmarkOrder.indexOf(ub);
  const ra = ia === -1 ? 999 : ia;
  const rb = ib === -1 ? 999 : ib;
  if (ra !== rb) return ra - rb;
  return ua.localeCompare(ub);
};

const betaOrder: BetaKey[] = ["lt1", "b1_1_5", "b1_5_2", "gt2", "unknown"];

const fmtNum = (v: number | null | undefined, digits = 2) =>
  v == null || Number.isNaN(v)
    ? "—"
    : v.toLocaleString(undefined, {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      });

const BRIDGE_BASE =
  process.env.NEXT_PUBLIC_TRADING_BRIDGE_URL ?? "http://localhost:5197";

/* ================= КОМПОНЕНТ ================= */

export default function BridgeArbitrageSignals() {
  const { theme } = useUi();
  const isDark =
    typeof document !== "undefined"
      ? isDarkTheme(
          document.documentElement.getAttribute("data-theme")
        ) || isDarkTheme(theme)
      : isDarkTheme(theme);

  const [mode, setMode] = useState<Mode>("top");
  const [items, setItems] = useState<ArbitrageSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  /* ===== flash при зміні значень ===== */
  const prevRef = useRef<Map<string, number | null>>(new Map());
  const flashRef = useRef<Map<string, "up" | "down">>(new Map());
  const [, force] = useState(0);

  useEffect(() => {
    const prev = prevRef.current;
    const next = new Map<string, number | null>();
    const EPS = 1e-6;

    for (const s of items || []) {
      if (s.direction === "none") continue;

      const side = s.direction === "down" ? "short" : "long";
      const key = `${side}::${s.ticker}`;

      const metric =
        s.direction === "down"
          ? s.zapSsigma ?? s.sig ?? null
          : s.zapLsigma ?? s.sig ?? null;

      next.set(key, metric);

      const old = prev.get(key);
      if (metric != null && old != null && Math.abs(metric - old) > EPS) {
        const dir: "up" | "down" = metric > old ? "up" : "down";
        flashRef.current.set(key, dir);
        setTimeout(() => {
          if (flashRef.current.get(key) === dir) {
            flashRef.current.delete(key);
            force((x) => x + 1);
          }
        }, 900);
      }
    }

    prevRef.current = next;
    force((x) => x + 1);
  }, [items]);

  const flashClass = (ticker: string, side: "short" | "long") => {
    const f = flashRef.current.get(`${side}::${ticker}`);
    return f === "up" ? "flashUp" : f === "down" ? "flashDown" : "";
  };

  /* ===== Фетч із моста ===== */

  const fetchSignals = async () => {
    try {
      setLoading(true);
      setError(null);

      const endpoint =
        mode === "top"
          ? `${BRIDGE_BASE}/api/strategy/arbitrage/signals`
          : `${BRIDGE_BASE}/api/strategy/arbitrage/signals-debug`;

      const res = await fetch(endpoint);

      if (!res.ok) {
        setItems([]);
        setError(`HTTP ${res.status}`);
        return;
      }

      const json = await res.json();
      setItems((json?.items ?? []) as ArbitrageSignal[]);
      setUpdatedAt(Date.now());
    } catch (e: any) {
      setItems([]);
      setError(e?.message || "Помилка завантаження");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (cancelled) return;
      await fetchSignals();
    };

    load();
    const timer = setInterval(load, 2500);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  /* ===== Групування: benchmark → beta → ПАРИ ЗА ІНДЕКСОМ ===== */
  const benchBlocks: BenchBlock[] = useMemo(() => {
    type BucketInternal = {
      benchmark: string;
      betaKey: BetaKey;
      shorts: ArbitrageSignal[];
      longs: ArbitrageSignal[];
    };

    const bucketMap = new Map<string, BucketInternal>();

    for (const s of items || []) {
      if (s.direction === "none") continue;

      const benchmark = (s.benchmark || "UNKNOWN").toUpperCase();
      const betaKey = parseBetaKey(s.betaBucket);
      const bucketId = `${benchmark}__${betaKey}`;

      if (!bucketMap.has(bucketId)) {
        bucketMap.set(bucketId, {
          benchmark,
          betaKey,
          shorts: [],
          longs: [],
        });
      }

      const bucket = bucketMap.get(bucketId)!;
      if (s.direction === "down") bucket.shorts.push(s);
      else if (s.direction === "up") bucket.longs.push(s);
    }

    const benchMap = new Map<string, BucketGroup[]>();

    for (const [, b] of bucketMap.entries()) {
      b.shorts.sort((a, c) => a.ticker.localeCompare(c.ticker));
      b.longs.sort((a, c) => a.ticker.localeCompare(c.ticker));

      const n = Math.max(b.shorts.length, b.longs.length);
      const rows: RowPair[] = [];
      for (let i = 0; i < n; i++) {
        rows.push({
          short: b.shorts[i],
          long: b.longs[i],
        });
      }

      const group: BucketGroup = {
        id: `${b.benchmark}__${b.betaKey}`,
        benchmark: b.benchmark,
        betaKey: b.betaKey,
        rows,
      };

      const list = benchMap.get(b.benchmark) ?? [];
      list.push(group);
      benchMap.set(b.benchmark, list);
    }

    const result: BenchBlock[] = Array.from(benchMap.entries())
      .sort(([a], [b]) => sortBenchmarks(a, b))
      .map(([benchmark, groups]) => ({
        benchmark,
        buckets: groups.sort(
          (a, b) => betaOrder.indexOf(a.betaKey) - betaOrder.indexOf(b.betaKey)
        ),
      }));

    return result;
  }, [items]);

  const hasAny = benchBlocks.some((b) =>
    b.buckets.some((g) => g.rows.length > 0)
  );

  /* ===== Розгортання по бакетах (10 рядків за замовчуванням) ===== */
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  const toggleBucket = (id: string) => {
    setExpandedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const updatedLabel =
    updatedAt != null
      ? new Date(updatedAt).toLocaleTimeString("uk-UA", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : null;

  return (
    <section className="wrap" data-theme={isDark ? "dark" : "light"}>
      <div className="head">
        <div className="title">
          <span className="dot" />
          ARBITRAGE сигнали
          {updatedLabel && (
            <span className="updated">оновлено о {updatedLabel}</span>
          )}
          {loading && <span className="loadingDot">●</span>}
        </div>

        <div className="modeToggle">
          <span className="modeLabel">Режим:</span>
          <div className="modePill">
            <button
              type="button"
              className={`modeBtn ${mode === "top" ? "active" : ""}`}
              onClick={() => setMode("top")}
            >
              Топові
            </button>
            <button
              type="button"
              className={`modeBtn ${mode === "all" ? "active" : ""}`}
              onClick={() => setMode("all")}
            >
              Усі{" "}
              <span className="modeCount">
                {items.length ? items.length : "0"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="error">
          Помилка: <span>{error}</span>
        </div>
      )}

      {!error && !hasAny && (
        <div className="empty">
          {loading ? "Завантаження…" : "Немає активних сигналів"}
        </div>
      )}

      {!error && hasAny && (
        <div className="benchContainer">
          {benchBlocks.map((bench) => {
            const color =
              BENCH_COLORS[bench.benchmark] ?? BENCH_COLORS.DEFAULT;

            return (
              <section
                key={bench.benchmark}
                className="benchBlock"
                style={
                  { "--bench-color": color } as React.CSSProperties
                }
              >
                <header className="benchHeader">
                  <span className="benchDot" />
                  <span className="benchLabel">Benchmark</span>
                  <span className="benchName">{bench.benchmark}</span>
                </header>

                <div className="bucketGrid">
                  {bench.buckets.map((g) => {
                    const isExpanded = !!expandedMap[g.id];
                    const total = g.rows.length;
                    const rowsToShow = isExpanded
                      ? total
                      : Math.min(10, total);

                    return (
                      <div key={g.id} className="bucket">
                        <div className="bucketTitle">
                          {betaLabels[g.betaKey]}
                        </div>

                        <div className="rows">
                          {g.rows.slice(0, rowsToShow).map((row, idx) => {
                            const s = row.short;
                            const l = row.long;

                            return (
                              <div className="rowOne" key={idx}>
                                {/* SHORT left */}
                                {s ? (
                                  <div
                                    className={`cell short ${flashClass(
                                      s.ticker,
                                      "short"
                                    )}`}
                                  >
                                    <span className="arrowDown">↓</span>
                                    <span className="tk">{s.ticker}</span>
                                    <span className="sig">
                                      sig {fmtNum(s.sig)}
                                    </span>
                                    {s.shortCandidate ? (
                                      <span className="zInfo">
                                        zS {fmtNum(s.zapS)} | σ
                                        {fmtNum(s.zapSsigma)}
                                      </span>
                                    ) : (
                                      <span className="zMuted">—</span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="cell short emptyCell">
                                    <span className="zMuted">—</span>
                                  </div>
                                )}

                                {/* LONG right */}
                                {l ? (
                                  <div
                                    className={`cell long ${flashClass(
                                      l.ticker,
                                      "long"
                                    )}`}
                                  >
                                    <span className="arrowUp">↑</span>
                                    <span className="tk">{l.ticker}</span>
                                    <span className="sig">
                                      sig {fmtNum(l.sig)}
                                    </span>
                                    {l.longCandidate ? (
                                      <span className="zInfo">
                                        zL {fmtNum(l.zapL)} | σ
                                        {fmtNum(l.zapLsigma)}
                                      </span>
                                    ) : (
                                      <span className="zMuted">—</span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="cell long emptyCell">
                                    <span className="zMuted">—</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {total > 10 && (
                          <div className="bucketFooter">
                            <button
                              type="button"
                              className="toggleBtn"
                              onClick={() => toggleBucket(g.id)}
                            >
                              {isExpanded
                                ? "Згорнути"
                                : `Показати всі ${total}`}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .wrap {
          border-radius: 14px;
          border: 1px solid var(--card-border);
          padding: 12px;
          background: var(--card-bg);
        }

        .head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .title {
          display: flex;
          gap: 8px;
          align-items: center;
          font-weight: 900;
          letter-spacing: 0.04em;
        }

        .dot {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: var(--color-primary);
          box-shadow: 0 0 5px var(--color-primary);
        }

        .updated {
          font-size: 11px;
          opacity: 0.6;
        }

        .loadingDot {
          margin-left: 6px;
          font-size: 10px;
          color: var(--color-primary);
          animation: pulse 1.2s infinite ease-in-out;
        }

        .modeToggle {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
        }

        .modeLabel {
          text-transform: uppercase;
          letter-spacing: 0.14em;
          opacity: 0.6;
        }

        .modePill {
          display: inline-flex;
          padding: 2px;
          border-radius: 999px;
          background: color-mix(
            in oklab,
            var(--card-bg-soft, rgba(15, 23, 42, 0.9)) 85%,
            transparent
          );
          border: 1px solid
            color-mix(in oklab, var(--card-border) 75%, transparent);
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.02);
        }

        .modeBtn {
          border: none;
          background: transparent;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          color: var(--fg-muted, #e5e7eb);
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: background 0.15s ease, color 0.15s ease,
            transform 0.12s ease;
        }

        .modeBtn:hover {
          transform: translateY(-0.5px);
        }

        .modeBtn.active {
          background: radial-gradient(
            circle at 10% 0%,
            var(--color-primary) 0%,
            transparent 55%
          );
          color: #111827;
        }

        .modeBtn.active:nth-child(1) {
          background: radial-gradient(
            circle at 10% 0%,
            #fb7185 0%,
            transparent 55%
          );
          color: #111827;
        }

        .modeBtn.active:nth-child(2) {
          background: radial-gradient(
            circle at 10% 0%,
            #38bdf8 0%,
            transparent 55%
          );
          color: #0b1120;
        }

        .modeCount {
          padding: 1px 6px;
          border-radius: 999px;
          font-size: 10px;
          background: rgba(15, 23, 42, 0.2);
        }

        .error {
          margin-bottom: 8px;
          padding: 8px 10px;
          border-radius: 10px;
          font-size: 12px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #fecaca;
        }

        .empty {
          padding: 12px;
          text-align: center;
          opacity: 0.7;
        }

        .benchContainer {
          display: flex;
          flex-direction: column;
          gap: 14px;
          max-height: 1080px;
          overflow: auto;
          padding-right: 2px;
        }

        .benchBlock {
          border-radius: 12px;
          padding: 10px 10px 12px;
          background: color-mix(
            in oklab,
            var(--card-bg) 96%,
            transparent
          );
          border: 1px solid
            color-mix(
              in oklab,
              var(--bench-color, var(--card-border)) 65%,
              transparent
            );
        }

        .benchHeader {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 12px;
          font-weight: 800;
          color: var(--bench-color, #e5e7eb);
        }

        .benchDot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: var(--bench-color, #9ca3af);
          box-shadow: 0 0 8px
            color-mix(
              in oklab,
              var(--bench-color, #9ca3af) 70%,
              transparent
            );
        }

        .benchLabel {
          text-transform: uppercase;
          font-size: 9px;
          letter-spacing: 0.14em;
          opacity: 0.75;
        }

        .benchName {
          font-size: 14px;
          font-weight: 900;
        }

        .bucketGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .bucket {
          border-radius: 10px;
          padding: 6px 6px 8px;
          background: color-mix(
            in oklab,
            var(--card-bg) 98%,
            transparent
          );
          border: 1px solid
            color-mix(in oklab, var(--card-border) 70%, transparent);
        }

        .bucketTitle {
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 4px;
          opacity: 0.9;
        }

        .rows {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .rowOne {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          padding: 3px 0;
          border-bottom: 1px dashed
            color-mix(in oklab, var(--card-border) 55%, transparent);
        }

        .cell {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          white-space: nowrap;
        }

        .rowOne .short {
          border-right: 1px solid
            color-mix(in oklab, var(--card-border) 80%, transparent);
          padding-right: 8px;
        }

        .rowOne .long {
          padding-left: 8px;
        }

        .emptyCell {
          opacity: 0.2;
        }

        .tk {
          font-family: ui-monospace, Menlo, Consolas, monospace;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.03em;
        }

        .sig {
          opacity: 0.9;
          font-weight: 600;
        }

        .zInfo {
          opacity: 0.9;
          font-size: 11px;
          font-weight: 600;
        }

        .zMuted {
          opacity: 0.35;
          font-size: 11px;
        }

        .arrowDown,
        .arrowUp {
          font-size: 16px;
          font-weight: 900;
        }

        .arrowDown {
          color: #ef4444;
          text-shadow: 0 0 6px rgba(239, 68, 68, 0.8);
        }

        .arrowUp {
          color: #22c55e;
          text-shadow: 0 0 6px rgba(34, 197, 94, 0.8);
        }

        .bucketFooter {
          margin-top: 4px;
          display: flex;
          justify-content: flex-end;
        }

        .toggleBtn {
          font-size: 11px;
          border-radius: 999px;
          padding: 3px 10px;
          border: 1px solid
            color-mix(in oklab, var(--card-border) 80%, transparent);
          background: color-mix(
            in oklab,
            var(--card-bg) 90%,
            transparent
          );
          cursor: pointer;
          font-weight: 700;
        }

        .flashUp {
          background-image: linear-gradient(
            90deg,
            color-mix(in oklab, #10b981 26%, transparent),
            transparent
          );
          animation: flashUpAnim 900ms ease-out forwards;
        }

        .flashDown {
          background-image: linear-gradient(
            90deg,
            color-mix(in oklab, #ef4444 26%, transparent),
            transparent
          );
          animation: flashDownAnim 900ms ease-out forwards;
        }

        @keyframes flashUpAnim {
          0% {
            background-size: 100% 100%;
          }
          100% {
            background-size: 0% 100%;
          }
        }

        @keyframes flashDownAnim {
          0% {
            background-size: 100% 100%;
          }
          100% {
            background-size: 0% 100%;
          }
        }

        @keyframes pulse {
          0% {
            opacity: 0.2;
            transform: scale(0.9);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0.2;
            transform: scale(0.9);
          }
        }

        @media (max-width: 900px) {
          .bucketGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .head {
            flex-direction: column;
            align-items: flex-start;
          }
          .bucketGrid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </section>
  );
}
