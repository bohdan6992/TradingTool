// components/TVEmbed.tsx
"use client";
import React, { useEffect, useMemo, useRef } from "react";

function isDarkTheme(): boolean {
  if (typeof document === "undefined") return false;
  const t = document.documentElement.getAttribute("data-theme") || "";
  return t.toLowerCase().includes("dark");
}

export default function TVEmbed({
  endpoint,        // напр. "technical-analysis", "market-overview", "forex-heat-map"
  payload,
  height = 420,
  host = "https://www.tradingview-widget.com",
  locale = "uk",
}: {
  endpoint: string;
  payload: Record<string, any>;
  height?: number;
  host?: string;
  locale?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const src = useMemo(() => {
    const data = {
      ...payload,
      colorTheme: isDarkTheme() ? "dark" : "light",
      isTransparent: true,
      width: "100%",
      height,
      locale,
    };
    return `${host}/embed-widget/${endpoint}/?locale=${encodeURIComponent(locale)}#${encodeURIComponent(
      JSON.stringify(data)
    )}`;
  }, [endpoint, payload, height, host, locale]);

  useEffect(() => {
    return () => {
      if (box.current) box.current.innerHTML = "";
    };
  }, []);

  return (
    <div className="surface rounded-3xl overflow-hidden" style={{ height }}>
      <iframe
        title={`tv-${endpoint}`}
        src={src}
        style={{ border: 0, width: "100%", height: "100%", display: "block", background: "transparent" }}
        referrerPolicy="origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    </div>
  );
}
