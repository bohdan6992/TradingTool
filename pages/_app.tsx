// pages/_app.tsx
import type { AppProps, AppContext } from "next/app";
import App from "next/app";
import Script from "next/script";
import Head from "next/head";
import { useEffect } from "react";

import "@/styles/themes.css";
import "@/styles/topbar.css";
import "@/styles/layout.css";
import "@/styles/globals.css";

import { useAutoScale } from "@/hooks/useAutoScale";

import UiProvider from "@/components/UiProvider";
import TopBarMaybe from "@/components/TopBar";

const SafeTopBar: React.FC = (TopBarMaybe as any) || (() => null);

type ThemeKey =
  | "light" | "dark" | "neon" | "pastel"
  | "solaris" | "cyberpunk" | "oceanic" | "sakura" | "matrix" | "asher" | "inferno"
  | "aurora" | "desert" | "midnight" | "forest" | "candy" | "monochrome";
type LangKey = "UA" | "EN" | "UK";

type MyAppProps = AppProps & {
  initialTheme?: ThemeKey;
  initialLang?: LangKey;
};

export default function MyApp({
  Component,
  pageProps,
  initialTheme = "light",
  initialLang = "UA",
}: MyAppProps) {
  useAutoScale({
    baseWidth: 1920,
    targetId: "app-scale",
    headerSelector: ".tt-topbar",
  });

  useEffect(() => {
    document.body.classList.add("zoom-mode");
    return () => document.body.classList.remove("zoom-mode");
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const darkThemes = new Set(["dark", "midnight", "matrix", "cyberpunk", "monochrome"]);
    const apply = () => {
      const t = root.getAttribute("data-theme") || String(initialTheme);
      root.classList.toggle("dark", darkThemes.has(t));
    };
    apply();
    const obs = new MutationObserver(apply);
    obs.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, [initialTheme]);

  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <meta name="color-scheme" content="dark light" />
      </Head>

      <Script id="tt-theme-init" strategy="beforeInteractive">
        {`
(function(){
  try{
    var m = document.cookie.match(/(?:^|; )tt-theme=([^;]+)/);
    var cookieTheme = m ? decodeURIComponent(m[1]) : "";
    var lsTheme = "";
    try { lsTheme = localStorage.getItem("tt-theme") || ""; } catch {}
    var theme = cookieTheme || lsTheme || ${JSON.stringify(initialTheme)};
    var darkSet = new Set(["dark","midnight","matrix","cyberpunk","monochrome"]);
    var root = document.documentElement;
    if(!theme){
      var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      theme = prefersDark ? "dark" : "light";
    }
    root.setAttribute("data-theme", theme);
    root.classList.toggle("dark", darkSet.has(theme));
  }catch(e){}
})();
        `}
      </Script>

      <Script
        id="tv-js"
        src="https://s3.tradingview.com/tv.js"
        strategy="afterInteractive"
        crossOrigin="anonymous"
      />

      <UiProvider initialTheme={initialTheme} initialLang={initialLang}>
        {/* Фіксований топбар */}
        <SafeTopBar />

        {/* ПРОКЛАДКА: резервує місце під fixed-баром */}
        <div className="tt-offset" aria-hidden />

        {/* Масштабоване полотно */}
        <div id="app-scale">
          <Component {...pageProps} />
        </div>
      </UiProvider>
    </>
  );
}

import { parse as parseCookie } from "cookie";
export async function getInitialProps(appCtx: AppContext) {
  const appProps = await App.getInitialProps(appCtx as any);
  const cookieStr = appCtx.ctx.req?.headers?.cookie ?? "";
  const parsed = cookieStr ? parseCookie(cookieStr) : {};
  const initialTheme = (parsed["tt-theme"] as ThemeKey) || "light";
  const initialLang  = (parsed["tt-lang"]  as LangKey)  || "UA";
  return { ...appProps, initialTheme, initialLang };
}
