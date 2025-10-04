"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useUi } from "@/components/UiProvider";

type Props = {
  height?: number;
  locale?: string;
  importance?: Array<0 | 1 | 2>;  // 0 low, 1 medium, 2 high
  transparent?: boolean;
};

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

function themeIsDark(name: string | undefined | null) {
  if (!name) return false;
  const v = name.toLowerCase().trim();
  if (v.includes("dark")) return true;
  return DARK_THEMES.has(v);
}

export default function EconomicCalendarUS({
  height = 20,
  locale = "uk",
  importance = [1, 2],      // за замовчуванням: середня + висока
  transparent = true,
}: Props) {
  const { theme } = useUi();
  const boxRef = useRef<HTMLDivElement>(null);

  const [dark, setDark] = useState<boolean>(() => {
    if (typeof document === "undefined") return themeIsDark(theme);
    return themeIsDark(document.documentElement.getAttribute("data-theme"));
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    const apply = () => setDark(themeIsDark(el.getAttribute("data-theme")) || themeIsDark(theme));
    apply();
    const obs = new MutationObserver(apply);
    obs.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, [theme]);

  const payload = useMemo(() => ({
    colorTheme: dark ? "dark" : "light",
    isTransparent: transparent,
    width: "100%",
    height: "100%",
    locale,
    country: "us",                               // ✅ тільки США
    importanceFilter: importance.sort().join(","), // "1,2" або "2"
  }), [dark, transparent, locale, importance]);

  useEffect(() => {
    const root = boxRef.current;
    if (!root) return;
    root.innerHTML = "";
    const slot = document.createElement("div");
    slot.className = "tradingview-widget-container__widget";
    root.appendChild(slot);

    const s = document.createElement("script");
    s.async = true;
    s.type = "text/javascript";
    s.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
    s.innerHTML = JSON.stringify(payload);
    root.appendChild(s);

    return () => { try { root.innerHTML = ""; } catch {} };
  }, [payload]);

  return (
    <div className="card" style={{ height }}>
      <div className="tradingview-widget-container" ref={boxRef} />
      <style jsx>{`
        .card{
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 1.5rem;
          box-shadow: 0 8px 24px rgba(0,0,0,.18);
          overflow: hidden;
          color: var(--fg);
          max-width: 1200px;
          margin: 0 auto 14px;
        }
        :global(html[data-theme*="dark"]) .card { color: #e6eaf2; }
      `}</style>
    </div>
  );
}
