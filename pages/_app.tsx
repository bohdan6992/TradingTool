// pages/_app.tsx
import type { AppProps, AppContext } from "next/app";
import Script from "next/script";
import Head from "next/head";
import { useEffect } from "react";

import "@/styles/themes.css";
import "@/styles/topbar.css";
import "@/styles/layout.css";
import "@/styles/globals.css";

// Хук для автоматичного масштабування
import { useAutoScale } from "@/hooks/useAutoScale";

// UI / TopBar
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
  // 🔧 масштабуємо ВНУТРІШНЮ обгортку (див. <div id="app-scale" /> нижче)
  useAutoScale(1920, "app-scale");

  // Вмикаємо zoom-mode для CSS-оверрайдів ширини
  useEffect(() => {
    document.body.classList.add("zoom-mode");
    return () => document.body.classList.remove("zoom-mode");
  }, []);

  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
      </Head>

      {/* tv.js вантажиться один раз глобально */}
      <Script
        id="tv-js"
        src="https://s3.tradingview.com/tv.js"
        strategy="afterInteractive"
        crossOrigin="anonymous"
      />

      <UiProvider initialTheme={initialTheme} initialLang={initialLang}>
        {/* Топбар поза масштабованою обгорткою → sticky/fixed ок */}
        <SafeTopBar />


        {/* Увесь сайт, що масштабується */}
        <div id="app-scale">
          <Component {...pageProps} />
        </div>
      </UiProvider>
    </>
  );
}

// SSR: зчитуємо cookie, щоб не було мерехтіння теми/мови
import { parse as parseCookie } from "cookie";
MyApp.getInitialProps = async (appCtx: AppContext) => {
  const cookieStr = appCtx.ctx.req?.headers?.cookie ?? "";
  const parsed = cookieStr ? parseCookie(cookieStr) : {};

  const initialTheme = (parsed["tt-theme"] as ThemeKey) || "light";
  const initialLang  = (parsed["tt-lang"]  as LangKey)  || "UA";

  return { pageProps: {}, initialTheme, initialLang };
};
