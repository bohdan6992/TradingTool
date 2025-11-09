"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useUi } from "@/components/UiProvider";

type HostPref = "main" | "widget";

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
// те, що не в цьому списку, вважатимемо світлим (наприклад: "light", "pastel", "sakura", "uk" тощо)

function themeIsDark(name: string | undefined | null) {
  if (!name) return false;
  const v = name.toLowerCase().trim();
  // швидкі матчі
  if (v.includes("dark")) return true;
  // явні кастомні “темні” назви
  return DARK_THEMES.has(v);
}

export default function BenchmarksTable({
  height = 440,
  locale = "uk",
  preferHost = "widget",
}: {
  height?: number;
  locale?: string;
  preferHost?: HostPref;
}) {
  const { theme } = useUi();

  // 1) Початкове визначення теми
  const initialDark = themeIsDark(
    typeof document !== "undefined"
      ? document.documentElement.getAttribute("data-theme")
      : theme
  );
  const [isDark, setIsDark] = useState<boolean>(initialDark);

  // 2) Слідкуємо за зміною data-theme та оновлюємо isDark
  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;

    const apply = () =>
      setIsDark(themeIsDark(el.getAttribute("data-theme")) || themeIsDark(theme));

    // оновлюємо при зміні контекстної теми
    apply();

    const obs = new MutationObserver(() => apply());
    obs.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, [theme]);

  const [loaded, setLoaded] = useState(false);

  const host =
    preferHost === "main"
      ? "https://www.tradingview.com"
      : "https://www.tradingview-widget.com";

  const src = useMemo(() => {
    const symbolsGroups = [
      {
        name: "US Indices & ETFs",
        symbols: [
          { name: "AMEX:SPY", displayName: "SPY" },
          { name: "NASDAQ:QQQ", displayName: "QQQ" },
          { name: "AMEX:IWM", displayName: "IWM" },
          { name: "AMEX:DIA", displayName: "DIA" },
          { name: "AMEX:XLK", displayName: "XLK Tech" },
          { name: "AMEX:XLF", displayName: "XLF Financials" },
          { name: "AMEX:XLE", displayName: "XLE Energy" },
          { name: "AMEX:XLY", displayName: "XLY Cons. Disc." },
          { name: "AMEX:XLP", displayName: "XLP Cons. Stap." },
          { name: "AMEX:XLI", displayName: "XLI Industrials" },
          { name: "AMEX:XLV", displayName: "XLV Health Care" },
          { name: "AMEX:XLB", displayName: "XLB Materials" },
          { name: "AMEX:XLU", displayName: "XLU Utilities" },
          { name: "AMEX:XLC", displayName: "XLC Comm." },
          { name: "AMEX:XBI", displayName: "XBI Biotech" },
        ],
      },
      {
        name: "Commodities & FX",
        symbols: [
          { name: "TVC:GOLD", displayName: "Gold" },
          { name: "TVC:SILVER", displayName: "Silver" },
          { name: "TVC:USOIL", displayName: "WTI" },
          { name: "FX:EURUSD", displayName: "EUR/USD" },
          { name: "FX:USDJPY", displayName: "USD/JPY" },
        ],
      },
      {
        name: "Crypto",
        symbols: [
          { name: "BINANCE:BTCUSDT", displayName: "BTC" },
          { name: "BINANCE:ETHUSDT", displayName: "ETH" },
        ],
      },
    ];

    const payload = {
      colorTheme: isDark ? "dark" : "light",
      isTransparent: true,
      showSymbolLogo: true,
      width: "100%",
      height,
      locale,
      symbolsGroups,
    };

    // анти-кеш, щоб точно злетів перерендер у браузера
    const v = isDark ? "d" : "l";
    const base = `${host}/embed-widget/market-quotes/?locale=${encodeURIComponent(
      locale
    )}&v=${v}`;
    return `${base}#${encodeURIComponent(JSON.stringify(payload))}`;
  }, [isDark, locale, host, height]);

  // 3) Ключ залежить від isDark → повний ремоунт iframe
  const iframeKey = isDark ? "tv-dark" : "tv-light";

  return (
    <div className="bench-wrap" style={{ height }}>
      {!loaded && <div className="skeleton" aria-hidden />}
      <iframe
        key={iframeKey}
        title="Market overview"
        src={src}
        style={{
          width: "100%",
          height: "100%",
          border: 0,
          background: "transparent",
          display: "block",
        }}
        loading="eager"
        referrerPolicy="origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-popups"
        onLoad={() => setLoaded(true)}
      />
      <style jsx>{`
        .bench-wrap {
          position: relative;
          overflow: hidden;
          border-radius: 1.5rem;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
          display:grid;
          gap:16px;
          margin: 0 auto 14px;
                  }
        .skeleton {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.04) 0%,
            rgba(255, 255, 255, 0.12) 50%,
            rgba(255, 255, 255, 0.04) 100%
          );
          background-size: 200% 100%;
          animation: shimmer 1.2s linear infinite;
          pointer-events: none;
        }
        @keyframes shimmer {
          from {
            background-position: -200% 0;
          }
          to {
            background-position: 200% 0;
          }
        }

        /* наш (поза iframe) текст лишається світлим у темних схемах */
        :global(html[data-theme]) .bench-wrap {
          color: var(--fg);
        }
        :global(html[data-theme*="dark"]) .bench-wrap {
          color: #e6eaf2;
        }
      `}</style>
    </div>
  );
}
