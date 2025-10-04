import { useMemo } from "react";

/* ===== Типи ===== */
export type Rank = "S" | "A" | "B" | "F" | "N";
export type EventItem = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  ticker?: string;
  tags?: string[];
  rank?: Rank;
  note?: string;
  link?: string;
};

type Props = { events: EventItem[] };

/* ===== Довідники/кольори ===== */
const WEEKDAYS = ["Пн","Вт","Ср","Чт","Пт","Сб","Нд"];
const MONTHS   = ["Січ","Лют","Бер","Кві","Тра","Чер","Лип","Сер","Вер","Жов","Лис","Гру"];
const RANK_COLORS: Record<Rank, string> = {
  S: "var(--rank-s, #d4af37)", A: "var(--rank-a, #a78bfa)",
  B: "var(--rank-b, #60a5fa)", F: "var(--rank-f, #f87171)",
  N: "var(--rank-n, #9ca3af)",
};
const getRankColor = (r?: Rank) => (r ? (RANK_COLORS[r] ?? "var(--color-primary)") : "var(--color-primary)");

/* ===== Утиліти ===== */
const pad = (n:number)=>String(n).padStart(2,"0");
const ymd = (d:Date)=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

function getQuarterBounds(d = new Date()){
  const q = Math.floor(d.getMonth()/3);
  const startMonth = q*3;
  return { start: new Date(d.getFullYear(), startMonth, 1), year: d.getFullYear() };
}

/** 4–6 тижнів; прибираємо фінальний повністю порожній тиждень */
function getMonthMatrix(y:number, m:number){
  const first = new Date(y, m, 1);
  const last  = new Date(y, m+1, 0);
  const startW = (first.getDay()+6)%7; // Пн=0

  const cells:(Date|null)[] = [];
  for(let i=0;i<startW;i++) cells.push(null);
  for(let d=1; d<=last.getDate(); d++) cells.push(new Date(y,m,d));
  while(cells.length % 7 !== 0) cells.push(null);

  const weeks:(Date|null)[][]=[];
  for(let i=0;i<cells.length;i+=7) weeks.push(cells.slice(i,i+7));
  while(weeks.length && weeks[weeks.length-1].every(c=>c===null)) weeks.pop();
  return weeks;
}

/* ===== Головний компонент ===== */
export default function QuarterCalendar({ events }: Props){
  const { start, year } = useMemo(()=>getQuarterBounds(),[]);
  const months = [start.getMonth(), start.getMonth()+1, start.getMonth()+2];

  // індекс подій за датами
  const byDate = useMemo(()=>{
    const m = new Map<string, EventItem[]>();
    for(const e of events) m.set(e.date, [...(m.get(e.date)||[]), e]);
    return m;
  }, [events]);

  // ключі вчора/сьогодні/завтра
  const today = new Date();
  const kToday = ymd(today);
  const kYest  = ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate()-1));
  const kTomo  = ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate()+1));

  const todayEvents = byDate.get(kToday) || [];
  const yestEvents  = byDate.get(kYest)  || [];
  const tomoEvents  = byDate.get(kTomo)  || [];

  return (
    <>
      {/* ===== МІСЯЦІ ===== */}
      <div className="blocks">
        {months.map((m)=>{
          const weeks = getMonthMatrix(year, m);
          const label = `${MONTHS[(m%12+12)%12]}`; // без року
          return (
            <div key={m} className="card">
              <div className="card-title with-sep">{label}</div>

              <div className="weekdays">
                {WEEKDAYS.map(w => <div key={w} className="weekday">{w}</div>)}
              </div>

              <div className="days">
                {weeks.flat().map((d,i)=>{
                  const key = d ? ymd(d) : `empty-${i}`;
                  const evs = d ? (byDate.get(key)||[]) : [];
                  const isToday   = d ? key===kToday : false;
                  const isWeekend = d ? (d.getDay()===0 || d.getDay()===6) : false;
                  const dot       = evs.length ? getRankColor(evs[0]?.rank) : "transparent";
                  const tip       = evs.length
                    ? evs.map(e => `${e.time ? e.time+' · ' : ''}${e.ticker ? e.ticker+' · ' : ''}${e.title}`).join('\n')
                    : "";

                  return (
                    <div
                      key={key}
                      className={`day ${!d?"is-empty":""} ${isToday?"is-today":""} ${isWeekend?"is-weekend":""}`}
                      data-tip={tip}                 // стильований tooltip
                    >
                      <div className="day-top">
                        <span className="num">{d ? d.getDate() : ""}</span>
                        <span className="dot" style={{ background: dot }} />
                      </div>
                      {/* жодного тексту подій всередині клітинки */}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== ДНІ (Вчора • Сьогодні • Завтра) — той самий стиль картки ===== */}
      <div className="blocks">
        <DaysCard label="Вчора"    items={yestEvents} />
        <DaysCard label="Сьогодні" items={todayEvents} highlightTitle />
        <DaysCard label="Завтра"   items={tomoEvents} />
      </div>

      <style jsx>{`
        /* Ряди карток */
        .blocks{
          display:grid;
          grid-template-columns: repeat(3, minmax(280px, 1fr));
          gap:16px;
          max-width:1200px;
          margin: 0 auto 14px;
        }
        @media (max-width: 980px){ .blocks{ grid-template-columns: repeat(2, minmax(260px,1fr)); } }
        @media (max-width: 640px){ .blocks{ grid-template-columns: 1fr; } }

        /* Спільний стиль картки */
        .card{
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 1rem;
          display:flex; flex-direction:column;
          overflow:hidden;
        }
        .card-title{
          padding:.6rem .8rem;
          font-weight:700;
        }
        .card-title.with-sep{ border-bottom:1px solid var(--card-border); } /* лінія під заголовком (місяці) */
        .card-title.highlight{ color: var(--color-primary); }               /* для "Сьогодні" (дні) */

        /* Хедер днів тижня */
        .weekdays{
          display:grid; grid-template-columns: repeat(7, 1fr);
          gap:2px; padding: .25rem .5rem 0 .5rem;
          font-size:.75rem; opacity:.7;
        }
        .weekday{ text-align:center; padding:.25rem 0; }

        /* Дні місяця */
        .days{
          display:grid; grid-template-columns: repeat(7, 1fr);
          gap:8px; padding:.25rem .5rem .75rem .5rem;
        }
        .day{
          position:relative; /* для tooltip */
          border:1px solid var(--card-border);
          background: var(--app-bg);
          border-radius:.75rem;
          padding:.5rem;
          aspect-ratio:1/1;
          display:flex; flex-direction:column; min-width:0;
        }
        .day.is-empty{ border-style:dashed; opacity:.35; }
        .day.is-today{ outline:2px solid var(--color-primary); outline-offset:1px; }
        .day.is-weekend{ background: color-mix(in oklab, var(--app-bg), white 2%); }
        .day-top{ display:flex; align-items:center; justify-content:space-between; }
        .num{ font-size:.75rem; opacity:.75; }
        .dot{ width:8px; height:8px; border-radius:999px; box-shadow:0 0 0 1px var(--card-border) inset; flex:0 0 auto; }

        /* Темний tooltip у темі (і для .day, і для елементів у DaysCard) */
        [data-tip]:not([data-tip=""]):hover::after{
          content: attr(data-tip);
          position:absolute;
          bottom: 100%;
          left: 0;
          transform: translateY(-6px);
          background: var(--card-bg);
          color: var(--fg);
          border: 1px solid var(--card-border);
          border-radius: .5rem;
          padding: .35rem .5rem;
          font-size: .75rem;
          line-height: 1.1rem;
          white-space: pre-line;   /* підтримка переносу за \n */
          max-width: 280px;
          z-index: 20;
          box-shadow: 0 4px 18px rgba(0,0,0,.25);
          pointer-events: none;
        }
      `}</style>
    </>
  );
}

/* ===== Картка «Вчора / Сьогодні / Завтра» — той самий стиль .card ===== */
function DaysCard({ label, items, highlightTitle }:{
  label: string; items: EventItem[]; highlightTitle?: boolean;
}){
  return (
    <div className="card">
      <div className={`card-title ${highlightTitle ? "highlight" : ""}`}>{label}</div>
      <div className="card-body">
        {items.length === 0 ? (
          <div className="ev-meta">Подій немає.</div>
        ) : (
          items.map(e=>( 
            <div
              key={e.id}
              className="event-row"
              data-tip={`${e.time ? e.time+' · ' : ''}${e.ticker ? e.ticker+' · ' : ''}${e.title}`}
            >
              <span className="badge" style={{ background: getRankColor(e.rank) }} />
              <div className="minw0">
                <div className="ev-title">
                  {e.ticker ? `${e.ticker} · ` : ""}{e.title}
                </div>
                <div className="ev-meta">
                  {e.date}{e.time ? ` · ${e.time}` : ""}
                  {e.tags?.length ? ` · ${e.tags.join(", ")}` : ""}
                  {e.rank ? ` · [${e.rank}]` : ""}
                </div>
                {e.note ? <div className="ev-note">{e.note}</div> : null}
                {e.link ? <div className="ev-meta"><a href={e.link} target="_blank" rel="noreferrer">Посилання</a></div> : null}
              </div>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .card {
          border: 2px solid var(--card-border);
          border-radius: 1rem;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .card-title {
          padding: .55rem .8rem;
          font-weight: 700;
          text-align: center;               /* по центру */
          border-bottom: 1px solid var(--card-border); /* лінія як у місяців */
        }
        .card-title.highlight { color: var(--color-primary); }
        .card-body {
          padding: .75rem;
          display: flex;
          flex-direction: column;
          gap: .5rem;
        }
        .event-row {
          position: relative;
          display: flex; align-items: start; gap: .5rem;
          padding: .5rem;
          border: 1px solid var(--card-border);
          border-radius: .5rem;
          background: var(--app-bg);
        }
        .badge { width: 10px; height: 10px; border-radius: 999px; margin-top: .3rem; }
        .minw0 { min-width: 0; }
        .ev-title { font-weight: 600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .ev-meta { opacity: .75; font-size: .8rem; }
        .ev-note { opacity: .85; font-size: .8rem; }
      `}</style>
    </div>
  );
}
