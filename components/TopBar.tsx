import React, { useEffect, useRef, useState } from "react";
import { useUi } from "./UiProvider";

type Item = { key: string; label: string; disabled?: boolean };

function Dropdown({
  value, onChange, items, ariaLabel,
}: {
  value: string; onChange: (v: string) => void; items: Item[]; ariaLabel: string;
}) {
  const { mounted } = useUi();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  const active = items.find(i => i.key === value);

  return (
    <div className="tt-dd" ref={ref}>
      <button type="button" aria-label={ariaLabel} className="tt-btn" onClick={() => setOpen(v => !v)}>
        <span className="tt-dd-label">{active?.label || value}</span>
        <span className="tt-dd-caret">▾</span>
      </button>

      {mounted && open && (
        <div className="tt-menu">
          {items.map(i => {
            const isActive = i.key === value;
            const isDisabled = !!i.disabled;
            return (
              <button
                key={i.key}
                type="button"
                className={`tt-option ${isActive ? "is-active" : ""} ${isDisabled ? "is-disabled" : ""}`}
                onClick={() => {
                  if (isDisabled) return;
                  onChange(i.key);
                  setOpen(false);
                }}
              >
                <span className="tt-option-dot" />
                <span>{i.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TopBar() {
  const { theme, setTheme, lang, setLang } = useUi();

  const themeItems: Item[] = [
    { key: "light", label: "Light" },
    { key: "dark", label: "Dark" },
    { key: "neon", label: "Neon" },
    { key: "pastel", label: "Pastel" },
    { key: "solaris", label: "Solaris" },
    { key: "cyberpunk", label: "Cyberpunk" },
    { key: "oceanic", label: "Oceanic" },
    { key: "sakura", label: "Sakura" },
    { key: "matrix", label: "Matrix" },
  ];

  const langItems: Item[] = [
    { key: "UA", label: "UA" },
    { key: "EN", label: "EN" },
    { key: "UK", label: "UK" },
  ];

  return (
    <div className="tt-topbar">
      <div className="tt-topbar-inner">
        <a className="tt-brand" href="/">
          <span className="tt-brand-txt">TradingTool</span>
        </a>

        <div className="tt-actions">
          <Dropdown ariaLabel="Theme" value={theme} onChange={(v) => setTheme(v as any)} items={themeItems} />
          <Dropdown ariaLabel="Language" value={lang} onChange={(v) => setLang(v as any)} items={langItems} />
        </div>
      </div>
    </div>
  );
}
