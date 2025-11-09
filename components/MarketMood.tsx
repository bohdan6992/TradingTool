"use client";

import React, {useEffect, useMemo, useState} from "react";

type Driver = {
  key: string;           // vix | breadth | sectors | credit | pcr | crypto | flows | rate
  label: string;
  value: number;         // -1..+1  (нормалізований вклад)
  note?: string;         // опціональний опис
};

type MoodPayload = {
  ts: string;            // ISO
  score: number;         // -100..+100
  drivers: Driver[];     // список чинників
};

function clamp(n:number, a:number, b:number){ return Math.min(b, Math.max(a, n)); }
function lerp(a:number,b:number,t:number){ return a+(b-a)*t; }

export default function MarketMood({
  fetchUrl = "/api/mood",
  refreshMs = 60_000,
  title = "Market Mood",
}: {
  fetchUrl?: string;
  refreshMs?: number;
  title?: string;
}) {
  const [data, setData] = useState<MoodPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setErr(null);
      const r = await fetch(fetchUrl, {cache: "no-store"});
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j: MoodPayload = await r.json();
      setData(j);
    } catch (e:any) {
      setErr(e?.message || "Fetch error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, refreshMs);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchUrl, refreshMs]);

  const score = clamp(data?.score ?? 0, -100, 100);
  const sentiment = useMemo(() => {
    if (score >= 40) return {label:"Risk-On",  tone:"on"};
    if (score >= 10) return {label:"Soft Risk-On", tone:"soft-on"};
    if (score > -10) return {label:"Neutral", tone:"neutral"};
    if (score > -40) return {label:"Soft Risk-Off", tone:"soft-off"};
    return {label:"Risk-Off", tone:"off"};
  }, [score]);

  // кольори під тему через CSS var, але даємо плавний мікс
  const hue = useMemo(() => {
    // -100 -> червоний, 0 -> жовтий, +100 -> зелений
    const t = (score + 100) / 200; // 0..1
    const h = lerp(6, 140, t);     // приблизна дуга HSL
    return h;
  }, [score]);

  const arc = useMemo(() => {
    // напів-гейдж 180° (SVG)
    const pct = (score + 100) / 200;         // 0..1
    const start = Math.PI;                   // 180°
    const end = Math.PI * (1 - pct);         // зліва -> вправо
    const R = 64, cx = 80, cy = 80;
    const sx = cx + R * Math.cos(start);
    const sy = cy + R * Math.sin(start);
    const ex = cx + R * Math.cos(end);
    const ey = cy + R * Math.sin(end);
    const large = 0; // півколо
    return `M ${sx} ${sy} A ${R} ${R} 0 ${large} 1 ${ex} ${ey}`;
  }, [score]);

  return (
    <section className="mood pane">
      <header className="head">
        <div className="title">
          <span className="emoji" aria-hidden>🌡️</span>{title}
          <span className={`chip ${sentiment.tone}`}>{sentiment.label}</span>
        </div>
        <time className="ts">{data ? new Date(data.ts).toLocaleTimeString() : ""}</time>
      </header>

      <div className="grid">
        {/* Gauge */}
        <div className="gauge">
          <svg viewBox="0 0 160 100" className="svg">
            {/* фонова дуга */}
            <path d="M 16 80 A 64 64 0 0 1 144 80" className="track"/>
            {/* заповнення */}
            <path d={arc} className="fill" style={{stroke: `oklch(0.72 0.15 ${hue})`}}/>
          </svg>
          <div className="score" style={{color: `oklch(0.8 0.12 ${hue})`}}>
            {Math.round(score)}
            <span className="unit">/100</span>
          </div>
          <div className="legend">
            <span>Risk-Off</span>
            <span>Neutral</span>
            <span>Risk-On</span>
          </div>
        </div>

        {/* Drivers */}
        <div className="drivers">
          {loading && <div className="note">Завантаження…</div>}
          {!loading && err && (
            <div className="note err">Помилка: {err}</div>
          )}
          {!loading && !err && (
            <ul>
              {(data?.drivers || []).map(d => {
                const pos = d.value > 0.05;
                const neg = d.value < -0.05;
                return (
                  <li key={d.key} className="driver">
                    <div className="d-row">
                      <span className="dot" aria-hidden
                        style={{background:`oklch(0.78 0.12 ${pos?130:neg?25:80})`}}/>
                      <span className="d-label">{d.label}</span>
                      <span className={`badge ${pos?"pos":neg?"neg":"neu"}`}>
                        {pos ? "↑" : neg ? "↓" : "·"} {Math.round(d.value*100)}%
                      </span>
                    </div>
                    {d.note && <div className="note small">{d.note}</div>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <style jsx>{`
        .pane{
          border-radius: 20px;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          padding: 14px;
          box-shadow: 0 10px 28px rgba(0,0,0,.12);
                    gap:16px;
          margin: 0 auto 14px;
        }
        .head{ display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px; }
        .title{ display:flex; align-items:center; gap:10px; font-weight:900; }
        .emoji{ filter:saturate(1.2); }
        .chip{
          height: 26px; padding: 0 10px; border-radius:999px; display:inline-flex; align-items:center;
          font-size:.82rem; font-weight:800; border:1px solid var(--card-border);
          background: color-mix(in oklab, var(--card-bg) 80%, transparent);
        }
        .chip.on{     border-color: color-mix(in oklab, var(--color-primary) 55%, var(--card-border)); }
        .chip.soft-on{border-color: color-mix(in oklab, var(--color-primary) 35%, var(--card-border)); }
        .chip.neutral{opacity:.85;}
        .chip.soft-off{border-color: color-mix(in oklab, crimson 35%, var(--card-border)); }
        .chip.off{    border-color: color-mix(in oklab, crimson 55%, var(--card-border)); }
        .ts{ opacity:.6; font-size:.85rem; }

        .grid{ display:grid; grid-template-columns: 260px 1fr; gap:14px; }
        @media (max-width: 680px){ .grid{ grid-template-columns:1fr; } }

        .gauge{ position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center; }
        .svg{ width:100%; height:auto; }
        .track{ stroke: color-mix(in oklab, var(--card-border) 90%, transparent); stroke-width:16; fill:none; }
        .fill{ stroke-width:16; fill:none; stroke-linecap:round; filter: drop-shadow(0 6px 16px rgba(0,0,0,.18)); }
        .score{
          position:absolute; inset:auto 0 18px;
          text-align:center; font-weight:900; font-size:2.2rem; letter-spacing:.5px;
        }
        .unit{ font-size:.9rem; margin-left:4px; opacity:.6; font-weight:800; }
        .legend{ width:100%; display:flex; justify-content:space-between; opacity:.7; font-size:.8rem; margin-top:2px; }

        .drivers ul{ display:grid; gap:10px; grid-template-columns:1fr; }
        .driver{ border:1px solid var(--card-border); border-radius:14px; padding:10px; background:
          linear-gradient(180deg, color-mix(in oklab, var(--card-bg) 90%, transparent) 0%, transparent 100%);
        }
        .d-row{ display:flex; align-items:center; gap:10px; }
        .dot{ width:9px; height:9px; border-radius:999px; box-shadow:0 0 0 5px color-mix(in oklab, var(--card-border) 60%, transparent); }
        .d-label{ font-weight:800; flex:1; }
        .badge{ font-weight:900; font-size:.85rem; padding:.2rem .55rem; border-radius:8px; border:1px solid var(--card-border); }
        .badge.pos{ color:oklch(0.78 0.13 135); border-color: color-mix(in oklab, limegreen 45%, var(--card-border)); }
        .badge.neg{ color:oklch(0.78 0.13 25);  border-color: color-mix(in oklab, crimson 45%, var(--card-border)); }
        .badge.neu{ opacity:.7; }
        .note{ background: color-mix(in oklab, var(--card-bg) 92%, transparent); border:1px solid var(--card-border);
               border-radius:10px; padding:8px 10px; }
        .note.small{ font-size:.82rem; opacity:.85; margin-top:6px; }
        :global(html[data-theme*="dark"]) .pane{ color:#e7eaf3; }
      `}</style>
    </section>
  );
}
