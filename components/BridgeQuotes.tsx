"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useUi } from "@/components/UiProvider";
import { getTrapQuotes, TrapError } from "@/lib/trapClient";

/* ===== Теми ===== */
const DARK_THEMES = new Set([
  "dark","neon","matrix","solaris","cyberpunk","oceanic","sakura",
  "asher","inferno","aurora","desert","midnight","forest","candy","monochrome",
]);
const isDarkTheme = (name?: string | null) => {
  const v = (name || "").toLowerCase().trim();
  return !!v && (v.includes("dark") || DARK_THEMES.has(v));
};

/* ===== Типи ===== */
type Quotes = Record<string, Record<string, string | number | null>>;

/* ===== Приховані поля з бекенду ===== */
const HIDE_FIELDS = new Set(["VWAP", "Exchange", "ImbExch"]);

/* ===== Додаткові (обчислювані) поля ===== */
const PCT_FIELDS = new Set(["Bid%", "Ask%"]);

/* ===== Форматування чисел ===== */
const normNum = (v: any) => {
  if (v == null) return null;
  let s = String(v);
  s = s.replace(/[\s\u00A0\u202F]/g, "");
  s = s.replace(/[^0-9,.\-]/g, "");
  s = s.replace(",", ".");
  if (s === "" || s === "-" || s === "." || s === "-.") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const fmtNumber = (n: number, digits = 2) =>
  n.toLocaleString(undefined, {
    maximumFractionDigits: Math.abs(n) >= 1000 ? 2 : digits,
    minimumFractionDigits: n % 1 === 0 ? 0 : Math.min(digits, 2),
  });

const fmt = (field: string, v: any) => {
  const n = typeof v === "number" ? v : normNum(v);
  if (n == null) return "—";
  if (PCT_FIELDS.has(field)) {
    const sign = n > 0 ? "+" : n < 0 ? "" : "";
    return `${sign}${n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}%`;
  }
  return fmtNumber(n);
};

const EXCH_BADGE: Record<string, string> = {
  NSDQ: "NSDQ",
  NASDAQ: "NSDQ",
  NYSE: "NYSE",
  AMEX: "AMEX",
  ARCA: "ARCA",
};

export default function BridgeQuotes({
  refreshMs = 2500,
  fadeMs = 1200,
  numColWidth = 96,
}: {
  refreshMs?: number;
  fadeMs?: number;
  numColWidth?: number;
}) {
  const { theme } = useUi();
  const isDark = useMemo(
    () =>
      typeof document !== "undefined"
        ? isDarkTheme(document.documentElement.getAttribute("data-theme")) ||
          isDarkTheme(theme)
        : isDarkTheme(theme),
    [theme]
  );

  const [rows, setRows] = useState<any[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [errDetails, setErrDetails] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  const prevRef = useRef<Map<string, Map<string, number | null>>>(new Map());
  const flashRef = useRef<Set<string>>(new Set());
  const dirRef = useRef<Map<string, "up" | "down">>(new Map());
  const [, force] = useState(0);

  useEffect(() => {
    let timer: any, stop = false;

    const load = async () => {
      try {
        // 🔹 тепер беремо дані напряму з TRAP (локальний http-сервер)
        const data: Quotes = await getTrapQuotes();

        const tickers = Object.keys(data).sort();

        // Вихідні поля від бекенда
        const baseFields = tickers.length ? Object.keys(data[tickers[0]]) : [];

        // Видимі поля (без прихованих)
        let visible = baseFields.filter((f) => !HIDE_FIELDS.has(f));

        // Вставляємо обчислювані після Bid та Ask (якщо є LstCls)
        const hasLstCls =
          visible.includes("LstCls") || baseFields.includes("LstCls");
        if (hasLstCls) {
          const insertAfter = (arr: string[], after: string, what: string) => {
            const idx = arr.indexOf(after);
            if (idx >= 0 && !arr.includes(what)) arr.splice(idx + 1, 0, what);
          };
          if (visible.includes("Bid")) insertAfter(visible, "Bid", "Bid%");
          if (visible.includes("Ask")) insertAfter(visible, "Ask", "Ask%");
        }

        // Формуємо рядки + обчислюємо Bid%/Ask%
        const next = tickers.map((t) => {
          const d = data[t] || {};
          const obj: any = { ticker: t, __raw: d };

          const lc = normNum(d["LstCls"]);
          const bid = normNum(d["Bid"]);
          const ask = normNum(d["Ask"]);

          for (const f of visible) {
            if (f === "Bid%") {
              obj[f] =
                lc && lc !== 0 && bid != null ? ((bid - lc) / lc) * 100 : null;
            } else if (f === "Ask%") {
              obj[f] =
                lc && lc !== 0 && ask != null ? ((ask - lc) / lc) * 100 : null;
            } else {
              obj[f] = d[f] ?? null;
            }
          }
          return obj;
        });

        // diff + підсвітка по всіх видимих (включаючи нові %)
        const pMap = prevRef.current;
        const newPrev = new Map<string, Map<string, number | null>>();

        for (const r of next) {
          const key = r.ticker;
          const oldRow = pMap.get(key) || new Map<string, number | null>();
          const rowStore = new Map<string, number | null>();

          for (const f of visible) {
            const nv =
              typeof r[f] === "number" ? (r[f] as number) : normNum(r[f]);
            const ov = oldRow.get(f) ?? null;
            rowStore.set(f, nv);

            const changed =
              nv !== null && ov !== null && Math.abs(nv - ov) > 1e-12;

            if (changed) {
              const flashKey = `${key}::${f}`;
              dirRef.current.set(flashKey, nv! > ov! ? "up" : "down");
              flashRef.current.add(flashKey);
              setTimeout(() => {
                flashRef.current.delete(flashKey);
                dirRef.current.delete(flashKey);
                force((x) => x + 1);
              }, fadeMs);
            }
          }
          newPrev.set(key, rowStore);
        }

        prevRef.current = newPrev;

        if (stop) return;
        setFields(visible);
        setRows(next);
        setErr(null);
        setErrDetails(null);
      } catch (e: any) {
        if (stop) return;

        const te = e as TrapError;

        // 🔹 Людські повідомлення про стани TRAP
        if (te?.type === "NOT_RUNNING") {
          setErr("TRAP не запущений на цьому пристрої");
          setErrDetails({
            error: te.message,
            diag: { type: te.type },
            stderr: "",
            stdout: "",
          });
        } else if (te?.type === "HTTP_ERROR") {
          setErr(`Помилка TRAP (HTTP ${te.status ?? "?"})`);
          setErrDetails({
            error: te.message,
            diag: { type: te.type, status: te.status },
            stderr: "",
            stdout: "",
          });
        } else if (te?.type === "BAD_JSON") {
          setErr("Некоректні дані від TRAP");
          setErrDetails({
            error: te.message,
            diag: { type: te.type },
            stderr: "",
            stdout: "",
          });
        } else {
          setErr(e?.message || "Помилка зʼєднання з TRAP");
          setErrDetails({
            error: e?.message || "unknown",
            diag: { type: "UNKNOWN" },
            stderr: "",
            stdout: "",
          });
        }

        // при помилці чистимо рядки, щоб не показувати застарілі
        setRows([]);
        setFields([]);
      }
    };

    load();
    timer = setInterval(load, refreshMs);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [refreshMs, fadeMs]);

  const cellChangeClass = (ticker: string, field: string) => {
    const k = `${ticker}::${field}`;
    if (!flashRef.current.has(k)) return "";
    const dir = dirRef.current.get(k);
    return dir ? `chg ${dir}` : "";
  };

  return (
    <section className="wrap" data-theme={isDark ? "dark" : "light"}>
      <div className="head">
        <div className="title">
          <span className="dot" />
          Котирування (live)
        </div>
        {err && (
          <div className="alert">
            {err}
            {errDetails?.error && <> — {errDetails.error}</>}
            <button
              className="linkBtn"
              onClick={() => setShowDetails((s) => !s)}
            >
              {showDetails ? "Сховати" : "Деталі"}
            </button>
          </div>
        )}
      </div>

      {showDetails && errDetails && (
        <pre className="diag">
{(errDetails.stderr || "").slice(0, 4000)}
{"\n--- STDOUT ---\n"}
{(errDetails.stdout || "").slice(0, 4000)}
{"\n--- DIAG ---\n"}
{JSON.stringify(errDetails.diag || {}, null, 2)}
        </pre>
      )}

      <div className="tableScroll">
        <table
          className="qt"
          style={{ ["--numw" as any]: `${numColWidth}px` }}
        >
          <thead>
            <tr>
              <th className="sticky first">Тікер</th>
              {fields.map((f) => (
                <th key={f} className="sticky numH">
                  {f}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.ticker} className={i % 2 ? "odd" : ""}>
                <td className="ticker first">
                  <span className="tk">{r.ticker}</span>
                  {r.__raw?.Exchange ? (
                    <span className="exch">
                      {EXCH_BADGE[String(r.__raw.Exchange)] ||
                        String(r.__raw.Exchange)}
                    </span>
                  ) : null}
                </td>
                {fields.map((f) => (
                  <td
                    key={f}
                    className={`num ${cellChangeClass(r.ticker, f)}`}
                  >
                    <span className="val">{fmt(f, r[f])}</span>
                    <span className="caret" aria-hidden />
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && !err && (
              <tr>
                <td className="empty" colSpan={1 + fields.length}>
                  Завантаження…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .wrap {
          border: 1px solid var(--card-border);
          border-radius: 16px;
          padding: 12px;
          background:
            linear-gradient(
              to bottom,
              color-mix(in oklab, var(--card-bg) 70%, transparent) 0%,
              color-mix(in oklab, var(--card-bg) 30%, transparent) 20%,
              transparent 40%
            ),
            var(--card-bg);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
        }
        .head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .title {
          display: flex;
          gap: 8px;
          align-items: center;
          font-weight: 800;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: var(--color-primary);
          box-shadow: 0 0 0 4px
            color-mix(in oklab, var(--color-primary) 22%, transparent);
          animation: pulse 1.8s ease-in-out infinite;
        }
        .alert {
          color: #ef4444;
          font-weight: 700;
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .linkBtn {
          border: 0;
          background: transparent;
          color: var(--color-primary);
          font-weight: 800;
          cursor: pointer;
        }
        .diag {
          margin: 8px 0;
          padding: 10px;
          border-radius: 10px;
          font-size: 12px;
          background: rgba(0, 0, 0, 0.18);
          white-space: pre-wrap;
          font-family: ui-monospace, Menlo, Consolas, monospace;
        }

        .tableScroll {
          overflow: auto;
          border: 1px solid var(--card-border);
          border-radius: 12px;
        }
        table.qt {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-variant-numeric: tabular-nums;
        }
        thead th {
          position: sticky;
          top: 0;
          z-index: 2;
          padding: 10px 12px;
          text-align: left;
          font-weight: 800;
          background: color-mix(
            in oklab,
            var(--card-bg) 92%,
            transparent
          );
          border-bottom: 1px solid var(--card-border);
          white-space: nowrap;
        }
        th.first,
        td.first {
          position: sticky;
          left: 0;
          z-index: 3;
          background: color-mix(
            in oklab,
            var(--card-bg) 96%,
            transparent
          );
        }

        thead th.numH {
          width: var(--numw);
          text-align: right;
        }
        tbody td {
          border-bottom: 1px solid
            color-mix(in oklab, var(--card-border) 72%, transparent);
        }
        td.num {
          width: var(--numw);
          min-width: var(--numw);
          max-width: var(--numw);
          position: relative;
          padding: 10px 20px 10px 12px;
          text-align: right;
          white-space: nowrap;
        }
        .num .val {
          display: inline-block;
          width: calc(var(--numw) - 28px);
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .num .caret {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          width: 0;
          height: 0;
        }

        tbody tr:hover {
          background: color-mix(
            in oklab,
            var(--color-primary) 6%,
            var(--card-bg)
          );
        }
        tbody tr.odd {
          background: color-mix(
            in oklab,
            var(--card-bg) 92%,
            transparent
          );
        }

        .ticker {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 800;
          white-space: nowrap;
          padding: 10px 12px;
        }
        .exch {
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.3px;
          padding: 2px 6px;
          border-radius: 999px;
          border: 1px solid
            color-mix(in oklab, var(--card-border) 70%, transparent);
          background: color-mix(
            in oklab,
            var(--card-bg) 80%,
            transparent
          );
          opacity: 0.9;
        }

        .chg.up {
          background-image: linear-gradient(
            90deg,
            color-mix(in oklab, #10b981 22%, transparent),
            transparent
          );
          animation: fadeUp ${Math.max(300, fadeMs)}ms ease-out forwards;
        }
        .chg.down {
          background-image: linear-gradient(
            90deg,
            color-mix(in oklab, #ef4444 22%, transparent),
            transparent
          );
          animation: fadeDown ${Math.max(300, fadeMs)}ms ease-out forwards;
        }
        .chg.up .val {
          color: #10b981;
        }
        .chg.down .val {
          color: #ef4444;
        }
        .chg.up .caret {
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-bottom: 7px solid #10b981;
        }
        .chg.down .caret {
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 7px solid #ef4444;
        }

        .empty {
          text-align: center;
          opacity: 0.7;
          padding: 16px;
        }

        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.65;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
        }
        @keyframes fadeUp {
          0% {
            background-size: 100% 100%;
          }
          100% {
            background-size: 0% 100%;
          }
        }
        @keyframes fadeDown {
          0% {
            background-size: 100% 100%;
          }
          100% {
            background-size: 0% 100%;
          }
        }
      `}</style>
    </section>
  );
}
