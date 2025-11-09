"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useUi } from "@/components/UiProvider";

type HostPref = "main" | "widget";

// Явно позначаємо кастомні темні схеми
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

function themeIsDark(name?: string | null) {
  if (!name) return false;
  const v = name.toLowerCase().trim();
  if (v.includes("dark")) return true;
  return DARK_THEMES.has(v);
}

export default function BenchmarksStrip({
  height = 52,
  locale = "uk",
  preferHost = "widget", // якщо main блокується — "widget" стабільніший
}: {
  height?: number;
  locale?: string;
  preferHost?: HostPref;
}) {
  const { theme } = useUi();

  // Початкове визначення теми
  const initialDark = themeIsDark(
    typeof document !== "undefined"
      ? document.documentElement.getAttribute("data-theme")
      : theme
  );
  const [isDark, setIsDark] = useState<boolean>(initialDark);

  // Слідкуємо за реальною зміною <html data-theme="...">
  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;

    const apply = () =>
      setIsDark(themeIsDark(el.getAttribute("data-theme")) || themeIsDark(theme));

    apply();

    const obs = new MutationObserver(() => apply());
    obs.observe(el, { attributes: true, attributeFilter: ["data-theme"] });

    return () => obs.disconnect();
  }, [theme]);

  const host =
    preferHost === "main"
      ? "https://www.tradingview.com"
      : "https://www.tradingview-widget.com";

  const src = useMemo(() => {
    // Розширений набір ключових бенчмарків
    const symbols = [
      // Commodities
      { proName: "TVC:USOIL", title: "WTI" },
      { proName: "TVC:UKOIL", title: "Brent" },
      { proName: "TVC:GOLD", title: "Gold" },
      { proName: "TVC:SILVER", title: "Silver" },

      // FX Majors
      { proName: "FX:EURUSD", title: "EUR/USD" },
      { proName: "FX:USDJPY", title: "USD/JPY" },
      { proName: "FX:GBPUSD", title: "GBP/USD" },
      { proName: "FX:USDCAD", title: "USD/CAD" },

      // Crypto
      { proName: "BINANCE:BTCUSDT", title: "BTC" },
      { proName: "BINANCE:ETHUSDT", title: "ETH" },
    ];

    const payload = {
      symbols,
      showSymbolLogo: true,
      colorTheme: isDark ? "dark" : "light",
      isTransparent: true,
      displayMode: "adaptive",
      autosize: true,
      locale,
    };

    // cache-buster & примусовий ремоунт при зміні теми
    const v = isDark ? "d" : "l";
    const base = `${host}/embed-widget/ticker-tape/?locale=${encodeURIComponent(
      locale
    )}&v=${v}`;

    return `${base}#${encodeURIComponent(JSON.stringify(payload))}`;
  }, [isDark, locale, host]);

  // ключ залежить від теми → iframe гарантовано перемонтується
  const iframeKey = isDark ? "tape-dark" : "tape-light";

  return (
    <div className="bench-wrap" style={{ height }}>
      <iframe
        key={iframeKey}
        title="Benchmarks"
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

        /* Наш зовнішній контейнер (поза iframe) у темних темах має світлий текст */
        :global(html[data-theme*="dark"]) .bench-wrap {
          color: #e6eaf2;
        }
      `}</style>
    </div>
  );
}
