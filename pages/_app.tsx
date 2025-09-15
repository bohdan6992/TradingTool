import type { AppProps, AppContext } from "next/app";
import "@/styles/themes.css";
import "@/styles/topbar.css";
import "@/styles/layout.css";   // ⬅ новий рядок


import TopBar from "@/components/TopBar";
import { UiProvider } from "@/components/UiProvider";

import { parse as parseCookie } from "cookie";

type ThemeKey =
  | "light" | "dark" | "neon" | "pastel"
  | "solaris" | "cyberpunk" | "oceanic" | "sakura" | "matrix";

type LangKey = "UA" | "EN" | "UK";

type MyAppProps = AppProps & {
  initialTheme?: ThemeKey;
  initialLang?: LangKey;
};

export default function MyApp({
  Component,
  pageProps,
  initialTheme,
  initialLang,
}: MyAppProps) {
  return (
    <UiProvider initialTheme={initialTheme} initialLang={initialLang}>
      <TopBar />
      <Component {...pageProps} />
    </UiProvider>
  );
}

// SSR: читаємо cookie і синхронізуємо початкову тему/мову (прибирає гідраційні помилки)
MyApp.getInitialProps = async (appCtx: AppContext) => {
  const cookieStr = appCtx.ctx.req?.headers?.cookie ?? "";
  const parsed = cookieStr ? parseCookie(cookieStr) : {};

  const initialTheme = (parsed["tt-theme"] as ThemeKey) || "light";
  const initialLang = (parsed["tt-lang"] as LangKey) || "UA";

  return { pageProps: {}, initialTheme, initialLang };
};
