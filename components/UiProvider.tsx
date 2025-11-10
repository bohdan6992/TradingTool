"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";

export type ThemeKey =
  | "light" | "dark" | "neon" | "pastel"
  | "solaris" | "cyberpunk" | "oceanic" | "sakura" | "matrix" | "asher" | "inferno"
  | "aurora" | "desert" | "midnight" | "forest" | "candy" | "monochrome";

export type LangKey = "UA" | "EN" | "UK";

type UIContext = {
  theme: ThemeKey;
  themeKey: ThemeKey;
  setTheme: (t: ThemeKey) => void;
  lang: LangKey;
  setLang: (l: LangKey) => void;
  mounted: boolean;
};

const Ctx = createContext<UIContext | null>(null);

export function useUi() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUi must be used within UiProvider");
  return ctx;
}

// Теми, які вважаємо "світлими" (без класу .dark)
const LIGHT_THEMES = new Set<ThemeKey>(["light", "pastel", "monochrome"]);

export default function UiProvider({
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

  // читаємо cookies лише на клієнті
  useEffect(() => {
    setMounted(true);
    const t = Cookies.get("tt-theme") as ThemeKey | undefined;
    if (t && t !== theme) setTheme(t);
    const l = Cookies.get("tt-lang") as LangKey | undefined;
    if (l && l !== lang) setLang(l);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔧 Синхронізуємо HTML-атрибути з темою (Tailwind dark + CSS variables)
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    root.setAttribute("data-theme", theme);

    const isDark = !LIGHT_THEMES.has(theme);
    root.classList.toggle("dark", isDark);

    // зберігаємо вибір теми для SSR у _document.tsx
    Cookies.set("tt-theme", theme, { expires: 365, sameSite: "lax" });
  }, [theme, mounted]);

  useEffect(() => {
    if (!mounted) return;
    Cookies.set("tt-lang", lang, { expires: 365, sameSite: "lax" });
  }, [lang, mounted]);

  const value = useMemo(
    () => ({ theme, themeKey: theme, setTheme, lang, setLang, mounted }),
    [theme, lang, mounted]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
