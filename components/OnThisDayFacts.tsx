// components/OnThisDayFacts.tsx
import React, { useEffect, useMemo, useState } from "react";

type Item = { year: number; text: string; emoji?: string; source?: string };
type ApiResponse = { items?: Item[] };

type Props = {
  tz?: string;      // таймзона (за замовч. America/New_York)
  lang?: string;    // мова (за замовч. uk)
  date?: string;    // YYYY-MM-DD (опц.)
  mmdd?: string;    // MM-DD (опц., має пріоритет над date)
  className?: string; // css-клас для <ul>
  limit?: number;   // ліміт елементів
};

export default function OnThisDayFacts({
  tz = "America/New_York",
  lang = "uk",
  date,
  mmdd,
  className = "facts__list",
  limit = 6,
}: Props) {
  const [items, setItems] = useState<Item[] | null>(null);

  const query = useMemo(() => {
    const p = new URLSearchParams({ tz, lang });
    if (date) p.set("date", date);
    if (mmdd) p.set("mmdd", mmdd);
    return `/api/onthisday?${p.toString()}`;
  }, [tz, lang, date, mmdd]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // 1) спроба через API
        const r = await fetch(query);
        if (!r.ok) throw new Error(String(r.status));
        const data: ApiResponse = await r.json();
        if (!alive) return;
        setItems((data.items ?? []).slice(0, limit));
      } catch {
        // 2) fallback: локальний JSON без зміни його структури
        try {
          const mod = await import("@/data/onthisday.json");
          const factsData: any = mod.default || mod;

          const key = mmdd || (() => {
            const parts = new Intl.DateTimeFormat("en-US", {
              timeZone: tz, month: "2-digit", day: "2-digit"
            }).formatToParts(new Date());
            const m = Object.fromEntries(parts.map(p => [p.type, p.value]));
            return `${m.month}-${m.day}`;
          })();

          const raw = (factsData[key] || []) as any[];
          const list: Item[] = raw.map(f => ({
            year: f.year,
            text: (f.i18n?.[lang] ?? f.text ?? f.i18n?.uk ?? "").trim(),
            emoji: f.emoji,
            source: f.source || undefined,
          }));
          if (!alive) return;
          setItems(list.slice(0, limit));
        } catch {
          if (!alive) return;
          setItems([]);
        }
      }
    })();
    return () => { alive = false; };
  }, [query, tz, lang, limit, mmdd]);

  if (!items) return <ul className={className}><li>Завантаження…</li></ul>;

  return (
    <ul className={className}>
      {items.length ? items.map((f, i) => (
        <li key={i}>
          <strong>{f.year}</strong> — {f.text}
          {f.emoji ? ` ${f.emoji}` : ""}
          {f.source ? <> · <a href={f.source} target="_blank" rel="noreferrer">джерело</a></> : null}
        </li>
      )) : (
        <li><em>Заглушка:</em> сьогодні поки без фактів ✨</li>
      )}
    </ul>
  );
}
