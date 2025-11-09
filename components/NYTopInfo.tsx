// components/NYTopInfo.tsx
import React, { useEffect, useRef, useState } from "react";
import OnThisDayFacts from "@/components/OnThisDayFacts";

function getNYParts() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(new Date());
  const m = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return {
    h: parseInt(m.hour, 10),
    m: parseInt(m.minute, 10),
    s: parseInt(m.second, 10),
  };
}

export default function NYTopInfo() {
  const [time, setTime] = useState("00:00:00");
  const dateLabelRef = useRef<HTMLSpanElement>(null);
  const hourRef = useRef<SVGLineElement>(null);
  const minuteRef = useRef<SVGLineElement>(null);
  const secondRef = useRef<SVGLineElement>(null);

  useEffect(() => {
    // Дата у таймзоні NY (українською)
    if (dateLabelRef.current) {
      const f = new Intl.DateTimeFormat("uk-UA", {
        timeZone: "America/New_York",
        day: "numeric",
        month: "long",
      });
      dateLabelRef.current.textContent = f.format(new Date());
    }

    const tick = () => {
      const { h, m, s } = getNYParts();
      setTime(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);

      const secDeg = s * 6;
      const minDeg = m * 6 + s * 0.1;
      const hourDeg = (h % 12) * 30 + m * 0.5;

      if (secondRef.current) secondRef.current.style.transform = `rotate(${secDeg}deg)`;
      if (minuteRef.current) minuteRef.current.style.transform = `rotate(${minDeg}deg)`;
      if (hourRef.current)   hourRef.current.style.transform = `rotate(${hourDeg}deg)`;
    };

    tick();
    const tAlign = setTimeout(() => {
      tick();
      const id = setInterval(tick, 1000);
      (window as any).__nyClockInt = id;
    }, 1000 - (Date.now() % 1000));

    return () => {
      clearTimeout(tAlign);
      if ((window as any).__nyClockInt) clearInterval((window as any).__nyClockInt);
    };
  }, []);

  return (
    <div className="nytopbar">
      {/* робимо таку ж 3-колоночну сітку, як у календаря, а картку тягнемо на всі 3 */}
      <div className="nytopbar__grid">
        <div className="card clock-card" role="group" aria-label="New York time and daily facts">
          {/* вміст картки: зліва час, праворуч факти */}
          <div className="card__content">
            {/* LEFT: analog + big digital */}
            <div className="clock-left">
              <div className="clock__analog" aria-hidden="true">
                <svg viewBox="0 0 100 100" className="clock-svg">
                  <defs>
                    <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
                      <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.25" />
                    </filter>
                  </defs>
                  <circle className="clock-face" cx="50" cy="50" r="46" filter="url(#softShadow)" />
                  <g className="ticks">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <g key={i} transform={`rotate(${i * 30},50,50)`}>
                        <line x1="50" y1="6" x2="50" y2="12" />
                      </g>
                    ))}
                  </g>
                  <line ref={hourRef}   className="hand hand-hour"   x1="50" y1="50" x2="50" y2="30" />
                  <line ref={minuteRef} className="hand hand-minute" x1="50" y1="50" x2="50" y2="20" />
                  <line ref={secondRef} className="hand hand-second" x1="50" y1="52" x2="50" y2="16" />
                  <circle className="pivot" cx="50" cy="50" r="2.2" />
                </svg>
              </div>

              {/* ⬇️ додав tabular-nums для стабільної ширини цифр */}
              <div className="clock__digital tabular-nums" aria-live="polite">
                {time}
              </div>
            </div>

            {/* RIGHT: facts */}
            <aside className="facts" aria-label="Цього дня в історії">
              <div className="facts__hdr">
                <span className="facts__title">Цього дня</span>
                <span className="facts__date" ref={dateLabelRef}>—</span>
              </div>
              <OnThisDayFacts tz="America/New_York" lang="uk" />
            </aside>
          </div>
        </div>
      </div>

      {/* === існуючі стилі збережено, нижче — лише доповнення/overrides для стабільного масштабування === */}
      <style jsx>{`
        .nytopbar { width: 100%; }

        /* 3-колоночна сітка (як у карток місяців) */
        .nytopbar__grid {
          display:grid;
          grid-template-columns: repeat(3, minmax(280px, 1fr));
          gap:16px;
          margin: 0 auto 14px;
        }

        /* сама картка розтягується на всі колонки */
        .clock-card {
          grid-column: 1 / -1;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          padding: 14px;
        }

        .card__hdr {
          display: flex; gap: 8px; align-items: center; margin-bottom: 8px;
        }
        .card__city { font-weight: 700; color: var(--fg); letter-spacing: .3px; }
        .card__tz   { font-size: 12px; color: var(--muted); padding: 2px 8px; border: 1px dashed var(--card-border); border-radius: 999px; }

        /* Дві зони: ліворуч час (ширше), праворуч факти */
        .card__content {
          display: grid;
          grid-template-columns: 2fr 1fr;   /* ліва зона ширша */
          gap: 16px;
          align-items: center;
        }

        /* LEFT: analog + big digital у ряд */
        .clock-left {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 20px;
          align-items: center;
        }
        .clock__analog { width: 120px; height: 120px; }
        .clock-svg { width: 100%; height: 100%; display: block; }
        .clock-face { fill: color-mix(in oklab, var(--fg) 6%, transparent); stroke: var(--card-border); stroke-width: 1.5; }
        .ticks line { stroke: var(--muted); stroke-width: 1.5; stroke-linecap: round; transform-origin: 50px 50px; opacity: .8; }
        .hand { stroke-linecap: round; transform-origin: 50px 50px; }
        .hand-hour { stroke: var(--fg); stroke-width: 3.2; }
        .hand-minute { stroke: var(--fg); stroke-width: 2.2; opacity: .9; }
        .hand-second { stroke: var(--color-primary); stroke-width: 1.6; }
        .pivot { fill: var(--color-primary); }

        /* Великі цифри — по висоті з аналоговим */
        .clock__digital {
          display: flex; align-items: center;
          min-height: 100px;
          line-height: 1;
          letter-spacing: .5px;
          font-variant-numeric: tabular-nums;
          font-weight: 500;
          color: var(--fg);
          font-size: clamp(56px, 6.2vw, 112px);
        }

        /* RIGHT: facts */
        .facts { min-width: 0; }
        .facts__hdr { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; }
        .facts__title { font-weight: 700; color: var(--fg); }
        .facts__date { color: var(--muted); font-size: 14px; }
        .facts__list { margin: 0; padding-left: 18px; color: var(--fg); }
        .facts__list li { margin: 4px 0; }

        /* Мобільний стек */
        @media (max-width: 960px) {
          .card__content { grid-template-columns: 1fr; gap: 14px; }
          .clock-left { grid-template-columns: 1fr; gap: 14px; }
          .clock__analog { width: 100px; height: 100px; margin: 0 auto; }
          .clock__digital { min-height: 100px; font-size: clamp(36px, 10vw, 64px); justify-content: center; }
        }

        /* === OVERRIDES для "масштабування без адаптиву" (стабільність при scale) === */
        .nytopbar,
        .clock-card { backface-visibility: hidden; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }


        /* фіксовані px-розміри, щоб цифри не «пливли» під subpixel-scale */
        .clock__digital { font-size: 88px; line-height: 1; letter-spacing: .02em; }
        .clock__analog, .clock-svg { width: 120px; height: 120px; }

        /* руки годинника рендеримо стабільно */
        .hand { will-change: transform; }
      `}</style>
    </div>
  );
}
