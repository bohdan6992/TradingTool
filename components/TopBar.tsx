"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { useUi } from "./UiProvider";
import "@/styles/topbar.css";

type Item = { key: string; label: string; disabled?: boolean };

function Dropdown({
  value, onChange, items, ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  items: Item[];
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = items.find(i => i.key === value);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  return (
    <div className="tt-dd" ref={ref}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        className="tt-btn"
        onClick={() => setOpen(v => !v)}
      >
        <span className="tt-dd-label">{active?.label || value}</span>
        <span className="tt-dd-caret" aria-hidden>▾</span>
      </button>

      {open && (
        <div className="tt-menu" role="menu">
          {items.map((i) => {
            const isActive = i.key === value;
            return (
              <button
                key={i.key}
                role="menuitemradio"
                aria-checked={isActive}
                type="button"
                className={`tt-option ${isActive ? "is-active" : ""} ${i.disabled ? "is-disabled" : ""}`}
                onClick={() => {
                  if (i.disabled) return;
                  onChange(i.key);
                  setOpen(false);
                }}
              >
                <span className="tt-option-dot" aria-hidden />
                <span>{i.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Лише шляхи до логотипів (SVG у /public/brand) */
const LOGO_PATHS = {
  light: "/brand/trading_logo_vector_black.svg", // на світлому тлі краще темне лого
  dark:  "/brand/trading_logo_vector_white.svg", // на темному тлі — світле лого
};

/** Теми, які вважаємо “світлими” (щоб брати темне лого) */
const LIGHT_THEMES = new Set(["light", "pastel"]);

export default function TopBar() {
  const router = useRouter();
  const { theme, setTheme, lang, setLang } = useUi();

  const isLightTheme = LIGHT_THEMES.has(String(theme || "").toLowerCase());
  const logoSrc = isLightTheme ? LOGO_PATHS.light : LOGO_PATHS.dark;

  const themeItems: Item[] = [
    { key: "light", label: "Light" },
    { key: "dark", label: "Dark" },
    { key: "neon", label: "Neon" },
    { key: "pastel", label: "Pastel" },
    { key: "solaris", label: "Solaris" },
    { key: "cyberpunk", label: "Cyber" },
    { key: "oceanic", label: "Ocean" },
    { key: "sakura", label: "Sakura" },
    { key: "matrix", label: "Matrix" },
    { key: "asher", label: "Asher" },
    { key: "inferno", label: "Inferno" },
    { key: "aurora", label: "Aurora" },
    { key: "desert", label: "Desert" },
    { key: "midnight", label: "Midnight" },
    { key: "forest", label: "Forest" },
    { key: "candy", label: "Candy" },
    { key: "monochrome", label: "Monochrome" },
  ];

  const langItems: Item[] = [
    { key: "UA", label: "UA" },
    { key: "EN", label: "EN" },
    { key: "UK", label: "UK" },
  ];

  const nav = [
    { href: "/strategies", label: "Стратегії" },
    { href: "/signals",    label: "Сигнали" },
    { href: "/stats",      label: "Новини" },
    { href: "/calendar",   label: "Календар" },
    { href: "/guide",      label: "Довідник" },
    { href: "/watch",      label: "Спостереження" },
  ];
  const isActive = (href: string) => router.pathname === href;

  return (
    <header className="tt-topbar">
      <div className="tt-topbar-inner">
        <Link href="/" className="tt-brand" aria-label="TradingTool — Home">
          <span className="tt-brand-logo">
            <Image
              src={logoSrc}
              alt="TradingTool"
              width={48}
              height={48}
              priority
              className="tt-logo-img"
            />
          </span>
          <span className="tt-brand-txt">TradingTool</span>
        </Link>

        <nav className="tt-nav" aria-label="Primary">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`tt-pill ${isActive(item.href) ? "is-active" : ""}`}
            >
              <span className="tt-pill-glow" aria-hidden />
              <span className="tt-pill-text">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="tt-right">
          <Dropdown ariaLabel="Theme" value={theme} onChange={(v) => setTheme(v as any)} items={themeItems} />
          <Dropdown ariaLabel="Language" value={lang} onChange={(v) => setLang(v as any)} items={langItems} />
        </div>
      </div>
    </header>
  );
}
