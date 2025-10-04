// components/TVLiveChart.tsx
"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useUi } from "@/components/UiProvider";

declare global {
  interface Window { TradingView?: any }
}

type Props = {
  symbol?: string;
  interval?: string;
  height?: number;
  timezone?: string;
  locale?: string;
};

const loadTV = () =>
  new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    if (window.TradingView) return resolve();
    const id = "tradingview-tvjs";
    if (document.getElementById(id)) return resolve();
    const s = document.createElement("script");
    s.id = id;
    s.src = "https://s3.tradingview.com/tv.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load tv.js"));
    document.head.appendChild(s);
  });

export default function TVLiveChart({
  symbol = "AMEX:SPY",
  interval = "1",
  height = 420,
  timezone = "America/New_York",
  locale = "uk",
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [status, setStatus] = useState("init");
  const [useWidgetHost, setUseWidgetHost] = useState(false);
  const { theme } = useUi();

  // 🔒 Безпечне для SSR обчислення теми
  const tvTheme = useMemo<"dark" | "light">(() => {
    // На сервері document нема — повертаємо fallback з контексту
    if (typeof window === "undefined") {
      return theme.toLowerCase().includes("dark") ? "dark" : "light";
    }
    const attr = document.documentElement.getAttribute("data-theme") || "";
    const isDark =
      attr.toLowerCase().includes("dark") ||
      theme.toLowerCase().includes("dark");
    return isDark ? "dark" : "light";
  }, [theme]);

  const clean = () => {
    try { widgetRef.current?.remove?.(); } catch {}
    widgetRef.current = null;
    try { iframeRef.current?.remove(); } catch {}
    iframeRef.current = null;
    if (wrapRef.current) wrapRef.current.innerHTML = "";
  };

  function buildEmbedUrl(host: "main" | "widget") {
    const base =
      host === "widget"
        ? "https://www.tradingview-widget.com"
        : "https://www.tradingview.com";
    const cfg: Record<string, any> = {
      symbol,
      interval,
      timezone,
      theme: tvTheme,
      style: "1",
      locale,
      hide_top_toolbar: true,
      hide_legend: true,
      save_image: false,
      allow_symbol_change: false,
      withdateranges: false,
      backgroundColor: "transparent",
    };
    const u = new URL(base + "/widgetembed/");
    u.searchParams.set("locale", locale);
    u.hash = encodeURIComponent(JSON.stringify(cfg));
    return u.toString();
  }

  function mountIframe(host: "main" | "widget") {
    if (!wrapRef.current) return;
    clean();
    const ifr = document.createElement("iframe");
    ifr.title = `TradingView ${symbol}`;
    ifr.src = buildEmbedUrl(host);
    ifr.width = "100%";
    ifr.height = String(height);
    ifr.frameBorder = "0";
    ifr.allow = "fullscreen";
    ifr.referrerPolicy = "origin-when-cross-origin";
    ifr.style.display = "block";
    wrapRef.current.appendChild(ifr);
    iframeRef.current = ifr;
    setStatus(`iframe mounted → ${host}`);
  }

  function mountWidget(host: "main" | "widget") {
    if (!wrapRef.current || !window.TradingView) return;
    clean();
    const containerId = "tv-adv-" + Math.random().toString(36).slice(2);
    const container = document.createElement("div");
    container.id = containerId;
    container.style.width = "100%";
    container.style.height = height + "px";
    wrapRef.current.appendChild(container);

    try {
      widgetRef.current = new window.TradingView.widget({
        container_id: containerId,
        symbol,
        interval,
        timezone,
        locale,
        autosize: true,
        height,
        theme: tvTheme,
        backgroundColor: "transparent",
        hide_top_toolbar: true,
        hide_legend: true,
        allow_symbol_change: false,
        save_image: false,
        withdateranges: false,
        useWidgetHost: host === "widget",
        studies: [],
      });
      setStatus(`widget created → ${host}`);

      // Якщо за 12 c немає iframe — фолбек на прямий iframe
      const start = Date.now();
      const tm = setInterval(() => {
        const ifr = wrapRef.current?.querySelector("iframe");
        if (ifr) {
          clearInterval(tm);
          setStatus(`widget ready (iframe) → ${host}`);
        } else if (Date.now() - start > 12000) {
          clearInterval(tm);
          setStatus("widget stuck → fallback iframe");
          mountIframe(host);
        }
      }, 300);
    } catch (e) {
      console.error("[TV] widget error", e);
      setStatus("widget error → fallback iframe");
      mountIframe(host);
    }
  }

  useEffect(() => {
    let dead = false;
    (async () => {
      setStatus("loading tv.js…");
      try {
        await loadTV();
        if (dead) return;
        setStatus("creating widget… " + (useWidgetHost ? "(widget host)" : "(main host)"));
        mountWidget(useWidgetHost ? "widget" : "main");
      } catch {
        setStatus("tv.js fail → iframe");
        mountIframe(useWidgetHost ? "widget" : "main");
      }
    })();
    return () => { dead = true; clean(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, interval, height, timezone, locale, tvTheme, useWidgetHost]);

  return (
    <div className="surface rounded-3xl p-3">
      <div className="flex items-center justify-between mb-2 px-1">
        <h2 className="text-lg font-semibold">SPY — Intraday (1m)</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs tt-muted">{status}</span>
          <button
            className="text-xs px-2 py-1 rounded-lg"
            style={{ border: "1px solid var(--card-border)", background: "transparent", color: "var(--fg)" }}
            onClick={() => setUseWidgetHost(v => !v)}
          >
            Switch host
          </button>
        </div>
      </div>
      <div ref={wrapRef} style={{ width: "100%", height, minHeight: height }} />
      <style jsx>{`
        .surface { background: var(--card-bg); border: 1px solid var(--card-border); }
        .tt-muted { color: color-mix(in oklab, var(--fg) 70%, transparent); }
      `}</style>
    </div>
  );
}
