import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";

export type ThemeKey =
  | "light" | "dark" | "neon" | "pastel"
  | "solaris" | "cyberpunk" | "oceanic" | "sakura" | "matrix";

export type LangKey = "UA" | "EN" | "UK";

type UIContext = {
  theme: ThemeKey;
  setTheme: (t: ThemeKey) => void;
  themeKey: ThemeKey;
  lang: LangKey;
  setLang: (l: LangKey) => void;
  mounted: boolean;
};

const Ctx = createContext<UIContext | null>(null);

export function UiProvider({
  children,
  initialTheme = "light",
  initialLang = "UA",
}: {
  children: React.ReactNode;
  initialTheme?: ThemeKey;
  initialLang?: LangKey;
}) {
  const [theme, setTheme] = useState<ThemeKey>(initialTheme);
  const [lang, setLang] = useState<LangKey>(initialLang);
  const [mounted, setMounted] = useState(false);

  // Клієнт: дочитуємо cookie та синхронізуємо (на випадок роут-транзішенів)
  useEffect(() => {
    setMounted(true);

    const cookieTheme = Cookies.get("tt-theme") as ThemeKey | undefined;
    if (cookieTheme && cookieTheme !== theme) setTheme(cookieTheme);

    const cookieLang = Cookies.get("tt-lang") as LangKey | undefined;
    if (cookieLang && cookieLang !== lang) setLang(cookieLang);
  }, []);

  // Тема → атрибут html + cookie
  useEffect(() => {
    if (!mounted) return; // уникнути «миготіння» на SSR
    document.documentElement.setAttribute("data-theme", theme);
    Cookies.set("tt-theme", theme, { expires: 365, sameSite: "lax" });
  }, [theme, mounted]);

  // Мова → cookie
  useEffect(() => {
    if (!mounted) return;
    Cookies.set("tt-lang", lang, { expires: 365, sameSite: "lax" });
  }, [lang, mounted]);

  const value = useMemo<UIContext>(() => ({
    theme,
    themeKey: theme,
    setTheme,
    lang,
    setLang,
    mounted,
  }), [theme, lang, mounted]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUi() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUi must be used within UiProvider");
  return ctx;
}
