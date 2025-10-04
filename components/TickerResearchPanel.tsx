"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useUi } from "@/components/UiProvider";

/* ===================== Теми ===================== */
const DARK_THEMES = new Set([
  "dark","neon","matrix","solaris","cyberpunk","oceanic","sakura",
  "asher","inferno","aurora","desert","midnight","forest","candy","monochrome",
]);
const isDarkTheme = (name?: string | null) => {
  const v = (name || "").toLowerCase().trim();
  if (!v) return false;
  if (v.includes("dark")) return true;
  return DARK_THEMES.has(v);
};

/* ===================== Мапа бірж ===================== */
const KNOWN_EXCH: Record<string, "NASDAQ" | "NYSE" | "AMEX"> = {
  // NASDAQ
  TSLA: "NASDAQ", AAPL: "NASDAQ", MSFT: "NASDAQ", NVDA: "NASDAQ",
  META: "NASDAQ", AMZN: "NASDAQ", GOOGL: "NASDAQ", GOOG: "NASDAQ",
  AMD: "NASDAQ", NFLX: "NASDAQ", INTC: "NASDAQ",
  // NYSE
  "BRK.B": "NYSE", "BRK.A": "NYSE", JPM: "NYSE", V: "NYSE", KO: "NYSE",
  DIS: "NYSE", BA: "NYSE", XOM: "NYSE", CVX: "NYSE",
  // ETFs (AMEX / ARCA)
  SPY: "AMEX", QQQ: "AMEX", DIA: "AMEX", IWM: "AMEX",
  XLK: "AMEX", XLF: "AMEX", XLE: "AMEX", XLY: "AMEX", XLP: "AMEX",
  XLI: "AMEX", XLV: "AMEX", XLB: "AMEX", XLU: "AMEX", XLC: "AMEX",
};
const ETF_SET = new Set([
  "SPY","QQQ","DIA","IWM","XLK","XLF","XLE","XLY","XLP","XLI","XLV","XLB","XLU","XLC"
]);

function normalizeSymbol(rawInput: string): { symbol: string; autoFixed?: string } {
  const raw = (rawInput || "").trim().toUpperCase();
  if (!raw) return { symbol: "AMEX:SPY" };

  if (raw.includes(":")) {
    const [ex, tk] = raw.split(":");
    if (KNOWN_EXCH[tk] && KNOWN_EXCH[tk] !== (ex as any)) {
      const fixed = `${KNOWN_EXCH[tk]}:${tk}`;
      return { symbol: fixed, autoFixed: `Виправлено біржу: ${ex} → ${KNOWN_EXCH[tk]}` };
    }
    return { symbol: `${ex}:${tk}` };
  }
  if (KNOWN_EXCH[raw]) return { symbol: `${KNOWN_EXCH[raw]}:${raw}` };
  if (ETF_SET.has(raw)) return { symbol: `AMEX:${raw}` };
  return { symbol: `${raw.length <= 5 ? "NASDAQ" : "NYSE"}:${raw}` };
}

/* ===================== Типи ===================== */
type TVEndpoint =
  | "mini-symbol-overview"
  | "symbol-info"
  | "technical-analysis"
  | "symbol-profile"
  | "financials"
  | "advanced-chart";

type ColorTheme = "light" | "dark";

/* ===================== Побудова URL для Advanced Chart (виправлено) ===================== */
function buildAdvancedChartSrc(params: {
  symbol: string;
  interval?: string;
  range?: string;
  theme: ColorTheme;
  locale?: string;
  withDateRanges?: boolean;
  hideTopToolbar?: boolean;
  hideSideToolbar?: boolean;
  studies?: string[];
  frameElementId: string;               // ⬅️ КРИТИЧНО
}) {
  const {
    symbol,
    interval = "60",
    range = "12M",
    theme,
    locale = "uk",
    withDateRanges = true,
    hideTopToolbar = false,
    hideSideToolbar = false,
    studies = ["MASimple@tv-basicstudies","RSI@tv-basicstudies"],
    frameElementId,
  } = params;

  const u = new URL("https://s.tradingview.com/widgetembed/");

  // обов’язкові
  u.searchParams.set("frameElementId", frameElementId);
  u.searchParams.set("symbol", symbol);
  u.searchParams.set("interval", interval);
  u.searchParams.set("range", range);
  u.searchParams.set("theme", theme);

  // рекомендовані
  u.searchParams.set("style", "1");
  u.searchParams.set("timezone", "Etc/UTC");
  u.searchParams.set("locale", locale);
  u.searchParams.set("withdateranges", withDateRanges ? "1" : "0");

  // правильні прапорці з підкресленнями
  u.searchParams.set("hide_side_toolbar", hideSideToolbar ? "true" : "false");
  u.searchParams.set("hide_top_toolbar", hideTopToolbar ? "true" : "false");

  u.searchParams.set("allow_symbol_change", "true");
  u.searchParams.set("save_image", "false");
  u.searchParams.set("details", "true");
  u.searchParams.set("calendar", "false");
  u.searchParams.set("hotlist", "false");

  // studies
  u.searchParams.set("studies", JSON.stringify(studies));

  // utm-теги (безпечні)
  u.searchParams.set("utm_source", "localhost");
  u.searchParams.set("utm_medium", "widget");
  u.searchParams.set("utm_campaign", "chart");

  return u.toString();
}

/* ===================== Універсальний Embed (script | iframe) ===================== */
function TVEmbed({
  endpoint,
  payload,
  theme,
  style,
  title,
  minHeight,
}: {
  endpoint: TVEndpoint;
  payload: any;
  theme: ColorTheme;
  style?: React.CSSProperties;
  title?: string;
  minHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const iframeIdRef = useRef(`tv_iframe_${Math.random().toString(36).slice(2)}`); // ⬅️ стабільний id для зв’язки
  const [ready, setReady] = useState(endpoint === "advanced-chart");

  // Script-based widgets
  useEffect(() => {
    if (endpoint === "advanced-chart") return;
    const host = ref.current;
    if (!host) return;
    host.innerHTML = "";

    const container = document.createElement("div");
    container.className = "tradingview-widget-container__widget";
    host.appendChild(container);

    const script = document.createElement("script");
    script.src = `https://s3.tradingview.com/external-embedding/embed-widget-${endpoint}.js`;
    script.async = true;
    script.innerHTML = JSON.stringify(payload);
    host.appendChild(script);

    setReady(true);
    return () => { try { host.innerHTML = ""; } catch {} };
  }, [endpoint, JSON.stringify(payload), theme]);

  // Lazy-load для iframe
  const [isInView, setIsInView] = useState(endpoint !== "advanced-chart");
  useEffect(() => {
    if (endpoint !== "advanced-chart") return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setIsInView(true); io.disconnect(); }
    }, { rootMargin: "200px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [endpoint]);

  const iframeSrc =
    endpoint === "advanced-chart"
      ? buildAdvancedChartSrc({
          symbol: payload?.symbol,
          interval: payload?.interval || "60",
          range: payload?.range || "12M",
          theme,
          locale: payload?.locale || "uk",
          withDateRanges: payload?.withdateranges ?? true,
          hideTopToolbar: payload?.hide_top_toolbar ?? false,
          hideSideToolbar: payload?.hide_side_toolbar ?? false,
          studies: payload?.studies,
          frameElementId: iframeIdRef.current, // ⬅️ важливо
        })
      : "";

  return (
    <div className="pane">
      {title && <div className="paneTitle">{title}</div>}
      <div
        ref={ref}
        className="tradingview-widget-container"
        style={{ ...(style || {}), minHeight: minHeight ?? 180 }}
      >
        {endpoint === "advanced-chart" && isInView && (
          <iframe
            id={iframeIdRef.current}
            title="TradingView Advanced Chart"
            src={iframeSrc}
            style={{
              width: "100%",
              height: "100%",
              minHeight: minHeight ?? 480,
              border: "0",
              borderRadius: 14,
              background: "transparent"
            }}
            loading="lazy"
            allowFullScreen
            allowTransparency
          />
        )}
      </div>

      <style jsx>{`
        .pane {
          position: relative;
          border-radius: 14px;
          background:
            linear-gradient(to bottom,
              color-mix(in oklab, var(--card-bg) 60%, transparent) 0%,
              color-mix(in oklab, var(--card-bg) 20%, transparent) 14%,
              transparent 28%),
            var(--card-bg);
          border: 1px solid var(--card-border);
          overflow: hidden;
        }
        .pane::before {
          content: "";
          position: absolute; inset: 0;
          pointer-events: none;
          background:
            radial-gradient(1200px 400px at 8% 6%,
              color-mix(in oklab, var(--color-primary) 8%, transparent) 0%,
              transparent 60%);
          opacity: .9;
        }
        .pane + .pane {
          margin-top: 2px;
          box-shadow:
            0 -1px 0 color-mix(in oklab, var(--card-border) 70%, transparent) inset,
            0 -20px 40px -28px color-mix(in oklab, var(--color-primary) 12%, transparent) inset;
        }
        .paneTitle {
          font-weight: 700;
          padding: 10px 12px 8px;
          border-bottom: 1px solid color-mix(in oklab, var(--card-border) 80%, transparent);
          backdrop-filter: blur(2px);
        }
      `}</style>
    </div>
  );
}

/* ===================== Основний компонент ===================== */
export default function TickerResearchPanel({
  initial = "TSLA",
  locale = "uk",
}: {
  initial?: string;
  locale?: string;
}) {
  const { theme } = useUi();

  const isDark = useMemo(
    () =>
      typeof document !== "undefined"
        ? isDarkTheme(document.documentElement.getAttribute("data-theme")) || isDarkTheme(theme)
        : isDarkTheme(theme),
    [theme]
  );
  const colorTheme: ColorTheme = isDark ? "dark" : "light";

  const [input, setInput] = useState(initial);
  const [hint, setHint] = useState("");
  const { symbol: normalizedInitial } = normalizeSymbol(initial);
  const [symbol, setSymbol] = useState(normalizedInitial);

  useEffect(() => {
    const { autoFixed } = normalizeSymbol(input);
    setHint(autoFixed || "");
  }, [input]);

  const commitSymbol = (val?: string) => {
    const { symbol: ns, autoFixed } = normalizeSymbol(val ?? input);
    setSymbol(ns);
    setHint(autoFixed || "");
  };

  const quick = ["SPY","QQQ","AAPL","NVDA","TSLA","DIA","IWM"];

  /* ===== Payloads ===== */
  const miniOverviewPayload = useMemo(
    () => ({
      symbol,
      dateRange: "12M",
      chartType: "area",
      colorTheme,
      isTransparent: true,
      autosize: true,
      locale,
    }),
    [symbol, colorTheme, locale]
  );

  const symbolInfoPayload = useMemo(
    () => ({ symbol, colorTheme, isTransparent: true, locale }),
    [symbol, colorTheme, locale]
  );

  const profilePayload = useMemo(
    () => ({ symbol, colorTheme, isTransparent: true, autosize: true, width: "100%", height: "100%", locale }),
    [symbol, colorTheme, locale]
  );

  const financialsPayload = useMemo(
    () => ({ symbol, colorTheme, isTransparent: true, displayMode: "regular", width: "100%", height: "100%", locale }),
    [symbol, colorTheme, locale]
  );

  const advancedChartPayload = useMemo(
    () => ({
      autosize: true,
      symbol,
      interval: "60",           // 1h
      range: "12M",
      timezone: "Europe/Kyiv",
      theme: colorTheme,        // "light" | "dark"
      style: "1",               // свічки
      locale,
      withdateranges: true,
      hide_top_toolbar: false,
      hide_side_toolbar: false,
      allow_symbol_change: true,
      details: true,
      calendar: false,
      studies: ["MASimple@tv-basicstudies", "RSI@tv-basicstudies"],
    }),
    [symbol, colorTheme, locale]
  );

  return (
    <section className="card">
      <div className="head">
        <div className="title">
          <span className="dot" aria-hidden />
          Дослідження тікера
        </div>

        <div className="controls">
          <div className="tickerBox">
            <input
              className="tickerInput"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commitSymbol()}
              placeholder="Напр. TSLA або NASDAQ:TSLA"
              spellCheck={false}
            />
            <button className="goBtn" onClick={() => commitSymbol()} title="Застосувати">⏎</button>
          </div>

          <div className="chips">
            {quick.map((t) => (
              <button key={t} className="chip" onClick={() => { setInput(t); commitSymbol(t); }}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {hint && <div className="hintRow">{hint}</div>}

      {/* === Повний графік (iframe) — тепер працює стабільно === */}
      <TVEmbed
        endpoint="advanced-chart"
        payload={advancedChartPayload}
        theme={colorTheme}
        title="Повний графік"
        minHeight={600}
        style={{ width: "100%", height: 600 }}
      />

      {/* === Ключові показники === */}
      <TVEmbed
        endpoint="symbol-info"
        payload={symbolInfoPayload}
        theme={colorTheme}
        title="Ключові показники"
        minHeight={96}
        style={{ width: "100%", height: 96 }}
      />

      {/* === Профіль === */}
      <TVEmbed
        endpoint="symbol-profile"
        payload={profilePayload}
        theme={colorTheme}
        title="Профіль компанії"
        minHeight={320}
        style={{ width: "100%", height: 320 }}
      />

      {/* === Міні-огляд === */}
      <TVEmbed
        endpoint="mini-symbol-overview"
        payload={miniOverviewPayload}
        theme={colorTheme}
        title="Міні-огляд"
        minHeight={220}
        style={{ width: "100%", height: 320 }}
      />

      {/* === Фінанси (за бажанням) === */}
      {/* <TVEmbed
        endpoint="financials"
        payload={financialsPayload}
        theme={colorTheme}
        title="Фінансова звітність"
        minHeight={420}
        style={{ width: "100%", height: 420 }}
      /> */}

      <style jsx>{`
        .card {
          display: grid;
          grid-template-rows: auto auto auto auto auto;
          gap: 14px;
          border-radius: 18px;
          background:
            linear-gradient(to bottom,
              color-mix(in oklab, var(--card-bg) 60%, transparent) 0%,
              color-mix(in oklab, var(--card-bg) 30%, transparent) 12%,
              transparent 24%),
            var(--card-bg);
          border: 1px solid var(--card-border);
          box-shadow: 0 8px 24px rgba(0,0,0,.18);
          padding: 12px;
          max-width: 1200px;
          margin: 0 auto 14px;
          overflow: hidden;
        }
        .head {
          display: flex; align-items: center; gap: 12px;
          justify-content: space-between; flex-wrap: wrap;
        }
        .title { display: inline-flex; align-items: center; gap: 8px; font-weight: 800; font-size: 18px; }
        .dot {
          width: 8px; height: 8px; border-radius: 999px; background: var(--color-primary);
          box-shadow: 0 0 0 4px color-mix(in oklab, var(--color-primary) 20%, transparent);
          animation: pulse 1.8s ease-in-out infinite;
        }
        .controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .tickerBox {
          display: inline-flex; align-items: center; gap: 6px;
          background: color-mix(in oklab, var(--card-bg) 85%, transparent);
          border: 1px solid var(--card-border);
          padding: 4px 6px; border-radius: 10px;
        }
        .tickerInput {
          border: none; outline: none; background: transparent;
          color: var(--fg); min-width: 240px; font-weight: 700; letter-spacing: .5px;
        }
        .goBtn {
          height: 28px; padding: 0 8px; border-radius: 8px;
          border: 1px solid var(--card-border);
          background: color-mix(in oklab, var(--card-bg) 80%, transparent);
          color: var(--fg); font-weight: 800;
        }
        .goBtn:hover {
          background: color-mix(in oklab, var(--color-primary) 10%, var(--card-bg));
          border-color: color-mix(in oklab, var(--color-primary) 30%, var(--card-border));
        }
        .chips { display: inline-flex; gap: 6px; flex-wrap: wrap; }
        .chip {
          height: 28px; padding: 0 10px; border-radius: 999px;
          border: 1px solid var(--card-border);
          background: color-mix(in oklab, var(--card-bg) 80%, transparent);
          color: var(--fg); font-weight: 700; opacity: .95;
        }
        .chip:hover {
          background: color-mix(in oklab, var(--color-primary) 8%, var(--card-bg));
          border-color: color-mix(in oklab, var(--color-primary) 28%, var(--card-border));
        }
        .hintRow {
          font-size: 12px; opacity: .85;
          color: color-mix(in oklab, var(--color-primary) 80%, var(--fg));
          padding-left: 2px;
        }
        :global(html[data-theme*="dark"]) .card { color: #e6eaf2; }

        @keyframes pulse { 0%,100% { transform: scale(1); opacity: .65 } 50% { transform: scale(1.2); opacity: 1 } }
      `}</style>
    </section>
  );
}
