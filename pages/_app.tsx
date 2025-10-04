// pages/_app.tsx
import type { AppProps, AppContext } from "next/app";
import Script from "next/script";

import "@/styles/themes.css";
import "@/styles/topbar.css";
import "@/styles/layout.css";

// pages/_app.tsx
import UiProvider from "@/components/UiProvider"; // ✅ default import

// Якщо TopBar раптом не експортується (або шлях зіб'ється) — не впадемо:
import TopBarMaybe from "@/components/TopBar";

// Страхувальний компонент, якщо TopBar = undefined
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
  return (
    <>
      {/* tv.js вантажиться один раз глобально */}
      <Script
        id="tv-js"
        src="https://s3.tradingview.com/tv.js"
        strategy="afterInteractive"
        crossOrigin="anonymous"
      />

      <UiProvider initialTheme={initialTheme} initialLang={initialLang}>
        <SafeTopBar />
        <Component {...pageProps} />
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
