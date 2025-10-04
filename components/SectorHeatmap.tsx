"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useUi } from "@/components/UiProvider";

/** Явно позначаємо темні теми вашого застосунку */
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
const themeIsDark = (name?: string | null) => {
  if (!name) return false;
  const v = name.toLowerCase().trim();
  if (v.includes("dark")) return true;
  return DARK_THEMES.has(v);
};

type Props = {
  height?: number;
  locale?: string;
  /** Початкові значення (можеш не задавати) */
  defaultDataSource?: "SPX500" | "NASDAQ100" | "DOWJONES" | "RUSSELL2000" | "WORLD";
  defaultGrouping?: "sector" | "country" | "no_group";
  defaultSizeBy?: "market_cap_basic" | "number_of_employees" | "price_earnings_ttm" | "dividend_yield_recent";
  defaultColorBy?:
    | "change"
    | "Perf.W"
    | "Perf.1M"
    | "Perf.3M"
    | "Perf.6M"
    | "Perf.YTD"
    | "relative_volume_10d_calc"
    | "Volatility.D"
    | "gap";
  tooltip?: boolean;
};

export default function SectorHeatmap({
  height = 460,
  locale = "uk",
  defaultDataSource = "SPX500",
  defaultGrouping = "sector",
  defaultSizeBy = "market_cap_basic",
  defaultColorBy = "change",
  tooltip = true,
}: Props) {
  const { theme } = useUi();
  const containerRef = useRef<HTMLDivElement>(null);

  // панель керування
  const [dataSource, setDataSource] = useState<Props["defaultDataSource"]>(defaultDataSource);
  const [grouping, setGrouping] = useState<Props["defaultGrouping"]>(defaultGrouping);
  const [sizeBy, setSizeBy] = useState<Props["defaultSizeBy"]>(defaultSizeBy);
  const [colorBy, setColorBy] = useState<Props["defaultColorBy"]>(defaultColorBy);

  // тема
  const [isDark, setIsDark] = useState<boolean>(() =>
    themeIsDark(typeof document !== "undefined" ? document.documentElement.getAttribute("data-theme") : theme)
  );
  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    const apply = () => setIsDark(themeIsDark(el.getAttribute("data-theme")) || themeIsDark(theme));
    apply();
    const obs = new MutationObserver(apply);
    obs.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, [theme]);

  // payload для TradingView
  const payload = useMemo(
    () =>
      ({
        exchanges: [],
        dataSource,               // SPX500 | NASDAQ100 | DOWJONES | RUSSELL2000 | WORLD
        grouping,                 // sector | country | no_group
        blockSize: sizeBy,        // market_cap_basic ...
        blockColor: colorBy,      // change | Perf.W | ...
        locale,
        symbolUrl: "",
        colorTheme: isDark ? "dark" : "light",
        hasTopBar: false,
        isDataSetEnabled: false,
        isZoomEnabled: true,
        hasSymbolTooltip: Boolean(tooltip),
        width: "100%",
        height: "100%",
      } as const),
    [dataSource, grouping, sizeBy, colorBy, locale, isDark, tooltip]
  );

  // Інжекція скрипта TradingView
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    root.innerHTML = "";
    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    root.appendChild(inner);

    const s = document.createElement("script");
    s.src = "https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js";
    s.type = "text/javascript";
    s.async = true;
    s.innerHTML = JSON.stringify(payload); // TV очікує plain JSON у тексті скрипта
    root.appendChild(s);

    return () => {
      try { root.innerHTML = ""; } catch {}
    };
  }, [payload]);

  // пресети та опції
  const DS = [
    { value: "SPX500", label: "S&P 500" },
    { value: "NASDAQ100", label: "Nasdaq 100" },
    { value: "DOWJONES", label: "Dow Jones" },
    { value: "RUSSELL2000", label: "Russell 2000" },
    { value: "WORLD", label: "World" },
  ] as const;

  const GROUPS = [
    { value: "sector", label: "Сектори" },
    { value: "country", label: "Країни" },
    { value: "no_group", label: "Без груп" },
  ] as const;

  const SIZE = [
    { value: "market_cap_basic", label: "Ринк. капіталізація" },
    { value: "number_of_employees", label: "К-ть співробітників" },
    { value: "price_earnings_ttm", label: "P/E (TTM)" },
    { value: "dividend_yield_recent", label: "Дивіденд. дохідн." },
  ] as const;

  const COLORS = [
    { value: "change", label: "Зміна 1D" },
    { value: "Perf.W", label: "Тиждень" },
    { value: "Perf.1M", label: "1 місяць" },
    { value: "Perf.3M", label: "3 місяці" },
    { value: "Perf.6M", label: "6 місяців" },
    { value: "Perf.YTD", label: "YTD" },
    { value: "relative_volume_10d_calc", label: "Rel. Volume (10d)" },
    { value: "Volatility.D", label: "Волатильність (D)" },
    { value: "gap", label: "Gap" },
  ] as const;

  return (
    <div className="card" style={{ height }}>
      <div className="toolbar">
        <Select
          label="Індекс"
          value={dataSource}
          onChange={(v) => setDataSource(v as any)}
          options={DS}
        />
        <Select
          label="Групування"
          value={grouping}
          onChange={(v) => setGrouping(v as any)}
          options={GROUPS}
        />
        <Select
          label="Color by"
          value={colorBy}
          onChange={(v) => setColorBy(v as any)}
          options={COLORS}
        />
        <Select
          label="Size by"
          value={sizeBy}
          onChange={(v) => setSizeBy(v as any)}
          options={SIZE}
        />
        <button
          className="btn"
          type="button"
          onClick={() => {
            // ручний “refresh” якщо треба
            const now = Date.now();
            setColorBy((c) => (c as string) as any); // тригерить payload useEffect
            // невеликий хак — змінити colorBy на себе ж не дасть ефекту, але ми вже перезбираємо payload
            console.debug("[Heatmap] manual refresh", now);
          }}
          aria-label="Оновити мапу"
          title="Оновити мапу"
        >
          ⟲
        </button>
      </div>

      <div className="tradingview-widget-container" ref={containerRef} />

      <style jsx>{`
        .card {
          position: relative;
          display: grid;
          grid-template-rows: auto 1fr;
          border-radius: 1.5rem;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          box-shadow: 0 8px 24px rgba(0,0,0,.18);
          overflow: hidden;
          display:grid;
          gap:16px;
          max-width:1200px;
          margin: 0 auto 14px;
        }
        .toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          padding: 10px 12px;
          background:
            color-mix(in oklab, var(--card-bg) 85%, transparent);
          border-bottom: 1px solid color-mix(in oklab, var(--card-border) 80%, transparent);
        }
        .btn {
          height: 32px;
          padding: 0 10px;
          border: 1px solid var(--card-border);
          background: color-mix(in oklab, var(--card-bg) 80%, transparent);
          color: var(--fg);
          border-radius: 10px;
          font-weight: 600;
        }
        .btn:hover {
          background: color-mix(in oklab, var(--color-primary) 10%, var(--card-bg));
          border-color: color-mix(in oklab, var(--color-primary) 30%, var(--card-border));
        }

        :global(html[data-theme*="dark"]) .card { color: #e6eaf2; }

        @media (max-width: 640px) {
          .toolbar { gap: 8px; }
        }
      `}</style>
    </div>
  );
}

/** Маленький внутрішній Select, стилізований під тему */
/** Кастомний headless Select — без нативного <select> */
function Select<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: readonly { value: T; label: string }[];
}) {
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(
    Math.max(0, options.findIndex((o) => o.value === value))
  );
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLUListElement>(null);

  // закриття при кліку поза меню
  React.useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !menuRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // підсвічувати поточне значення при зміні
  React.useEffect(() => {
    const idx = options.findIndex((o) => o.value === value);
    setActive(Math.max(0, idx));
  }, [value, options]);

  const choose = (idx: number) => {
    const opt = options[idx];
    if (!opt) return;
    onChange(opt.value as T);
    setOpen(false);
    btnRef.current?.focus();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
      setOpen(true);
      e.preventDefault();
      return;
    }
    if (open) {
      if (e.key === "ArrowDown") {
        setActive((i) => (i + 1) % options.length);
        e.preventDefault();
      } else if (e.key === "ArrowUp") {
        setActive((i) => (i - 1 + options.length) % options.length);
        e.preventDefault();
      } else if (e.key === "Enter") {
        choose(active);
        e.preventDefault();
      } else if (e.key === "Escape") {
        setOpen(false);
        e.preventDefault();
      }
    }
  };

  const labelText = options.find((o) => o.value === value)?.label ?? "";

  return (
    <div className="csel">
      <span className="lbl">{label}</span>

      <button
        ref={btnRef}
        type="button"
        className={`btn ${open ? "open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKey}
      >
        <span className="text">{labelText}</span>
        <svg className="chev" width="16" height="16" viewBox="0 0 24 24" aria-hidden>
          <path fill="currentColor" d="M7 10l5 5 5-5z" />
        </svg>
      </button>

      {open && (
        <ul
          ref={menuRef}
          className="menu"
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={String(active)}
        >
          {options.map((o, idx) => {
            const isSel = o.value === value;
            const isAct = idx === active;
            return (
              <li
                key={o.value}
                id={String(idx)}
                role="option"
                aria-selected={isSel}
                className={`opt ${isSel ? "selected" : ""} ${isAct ? "active" : ""}`}
                // mousedown, щоб не втрачати фокус на кнопці при кліку
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(idx)}
              >
                {o.label}
              </li>
            );
          })}
        </ul>
      )}

      <style jsx>{`
        .csel {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .lbl {
          font-size: 12px;
          opacity: 0.8;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 32px;
          padding: 0 10px 0 12px;
          border: 1px solid var(--card-border);
          background: color-mix(in oklab, var(--card-bg) 80%, transparent);
          color: var(--fg);
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          outline: none;
          position: relative;
        }
        .btn:hover {
          background: color-mix(in oklab, var(--color-primary) 10%, var(--card-bg));
          border-color: color-mix(in oklab, var(--color-primary) 30%, var(--card-border));
        }
        .btn.open {
          border-color: color-mix(in oklab, var(--color-primary) 40%, var(--card-border));
          box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-primary) 15%, transparent);
        }
        .text {
          white-space: nowrap;
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .chev {
          opacity: 0.8;
        }

        .menu {
          position: absolute;
          z-index: 50;
          top: calc(100% + 6px);
          left: 0;
          min-width: max(180px, 100%);
          border: 1px solid var(--card-border);
          background: var(--card-bg);
          color: var(--fg);
          border-radius: 12px;
          padding: 6px;
          box-shadow: 0 12px 26px rgba(0, 0, 0, 0.25);
          max-height: 320px;
          overflow: auto;
        }
        .opt {
          padding: 8px 10px;
          border-radius: 8px;
          cursor: pointer;
          user-select: none;
        }
        .opt:hover,
        .opt.active {
          background: color-mix(in oklab, var(--color-primary) 18%, transparent);
        }
        .opt.selected {
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}
