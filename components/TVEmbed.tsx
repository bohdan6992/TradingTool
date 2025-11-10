// components/TVEmbed.tsx
"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";

type TVEmbedProps = {
  endpoint: string;                 // "market-overview" | "screener" | "forex-heat-map" | ...
  payload: Record<string, any>;     // те, що йде у body хеша
  height?: number;
  host?: string;
  locale?: string;
};

const DARK_THEMES = new Set([
  "dark","neon","cyberpunk","solaris","sakura","oceanic",
  "matrix","asher","inferno","aurora","desert","midnight",
  "forest","candy","monochrome",
]);
const isDark = (t: string) => DARK_THEMES.has(t?.toLowerCase());

function getTheme(): "dark" | "light" {
  if (typeof document === "undefined") return "dark";
  const t = document.documentElement.getAttribute("data-theme") || "dark";
  return isDark(t) ? "dark" : "light";
}

export default function TVEmbed({
  endpoint,
  payload,
  height = 420,
  host = "https://www.tradingview-widget.com",
  locale = "uk",
}: TVEmbedProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<"dark" | "light">(getTheme());

  // перерахунок src щоразу коли змінюється тема або пропси
  const src = useMemo(() => {
    const data = {
      ...payload,
      colorTheme: theme,          // <- КЛЮЧОВО
      isTransparent: true,
      width: "100%",
      height,
      locale,
    };
    const hash = encodeURIComponent(JSON.stringify(data));
    return `${host}/embed-widget/${endpoint}/?locale=${encodeURIComponent(locale)}#${hash}`;
  }, [endpoint, payload, height, host, locale, theme]);

  // слухаємо зміни data-theme і міняємо theme локально
  useEffect(() => {
    let raf = 0;
    const root = document.documentElement;
    const apply = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setTheme(getTheme()));
    };
    apply();
    const mo = new MutationObserver(apply);
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      mo.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  // прибираємо попередній iframe при unmount
  useEffect(() => {
    return () => {
      if (boxRef.current) boxRef.current.innerHTML = "";
    };
  }, []);

  return (
    <div className="surface rounded-3xl overflow-hidden" style={{ height }}>
      <iframe
        ref={boxRef as any}
        title={`tv-${endpoint}`}
        src={src}
        style={{ border: 0, width: "100%", height: "100%", display: "block", background: "transparent" }}
        referrerPolicy="origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    </div>
  );
}
