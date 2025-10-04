import { useEffect, useMemo, useState } from "react";

type Item = { date: string; ticker: string; sector: string; time: string };
type ApiResp = { date: string; items: Item[] };

const humanTime = (t: string) => {
  const u = (t || "").toUpperCase();
  if (u === "BMO") return "Before Open";
  if (u === "AMC") return "After Close";
  return t;
};

function kyivDateShift(days: number): string {
  const base = new Date(Date.now() + days * 86400000);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const p = fmt.formatToParts(base);
  const y = p.find(x => x.type === "year")?.value ?? "1970";
  const m = p.find(x => x.type === "month")?.value ?? "01";
  const d = p.find(x => x.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

export default function EarningsThreeDays() {
  const [yest, setYest] = useState<ApiResp | null>(null);
  const [today, setToday] = useState<ApiResp | null>(null);
  const [tom, setTom] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(true);

  const dNeg1 = useMemo(() => kyivDateShift(-1), []);
  const d0    = useMemo(() => kyivDateShift(0),  []);
  const d1    = useMemo(() => kyivDateShift(1),  []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [rY, rT, rTm] = await Promise.all([
          fetch(`/api/earnings/today?date=${dNeg1}`),
          fetch(`/api/earnings/today?date=${d0}`),
          fetch(`/api/earnings/today?date=${d1}`),
        ]);
        const [jY, jT, jTm] = (await Promise.all([rY.json(), rT.json(), rTm.json()])) as [ApiResp, ApiResp, ApiResp];
        if (!alive) return;
        setYest(jY); setToday(jT); setTom(jTm);
      } catch {
        if (!alive) return;
        setYest({ date: dNeg1, items: [] });
        setToday({ date: d0, items: [] });
        setTom({ date: d1, items: [] });
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [dNeg1, d0, d1]);

  const Panel: React.FC<{ title: string; rows?: Item[]; highlight?: boolean }> = ({ title, rows, highlight }) => (
    <div className="card">
      <div className={`card-title ${highlight ? "highlight" : ""}`}>{title}</div>

      {loading ? (
        <div className="card-body muted">Завантаження…</div>
      ) : !rows || rows.length === 0 ? (
        <div className="card-body muted">Немає звітів.</div>
      ) : (
        <div className="card-body">
          <table className="tbl" role="table" aria-label={title}>
            <thead>
              <tr>
                <th>Тікер</th>
                <th>Сектор</th>
                <th>Час</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={`${r.date}-${r.ticker}`}>
                  <td className="ticker">{r.ticker}</td>
                  <td title={r.sector}>{r.sector}</td>
                  <td>
                    <span className="badge" title={r.time}>{humanTime(r.time)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .card {
          background: var(--card-bg);
          border: 2px solid var(--card-border);
          border-radius: 1rem;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .card-title {
          padding: .55rem .8rem;
          font-weight: 700;
          text-align: center;
          border-bottom: 1px solid var(--card-border);
        }
        .card-title.highlight { color: var(--color-primary); }
        .card-body{ padding:.75rem; display:flex; flex-direction:column; gap:.5rem; }
        .muted{ color: var(--tt-muted, #b6bac2); }
        .tbl{ width:100%; border-collapse:collapse; }
        thead th{
          text-align:left; font-weight:600; font-size:.9rem; color:var(--tt-muted, #b6bac2);
          padding:8px 8px 10px; border-bottom:1px solid var(--card-border);
          white-space:nowrap;
        }
        tbody td{
          padding:10px 8px; border-bottom:1px solid var(--card-border);
          vertical-align:middle; white-space:nowrap;
        }
        tbody tr:last-child td{ border-bottom:none; }
        tbody tr:hover td{ background: rgba(255,255,255,0.04); transition: background .15s; }
        .ticker{ font-weight:800; letter-spacing:.2px; }
        .badge{
          display:inline-flex; align-items:center; padding:2px 10px;
          border-radius:999px; font-size:12px; line-height:18px;
          border:1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.08);
        }
      `}</style>
    </div>
  );

  return (
    <section className="reports">
      <div className="blocks">
        <Panel title="Звіти вчора"   rows={yest?.items} />
        <Panel title="Звіти сьогодні" rows={today?.items} highlight />
        <Panel title="Звіти завтра"   rows={tom?.items} />
      </div>

      <style jsx>{`
        .blocks {
          display:grid;
          grid-template-columns: repeat(3, minmax(280px, 1fr));
          gap:16px;
          max-width:1200px;
          margin: 0 auto 14px;
        }
        @media (max-width: 980px){ .blocks{ grid-template-columns: repeat(2, minmax(260px,1fr)); } }
        @media (max-width: 640px){ .blocks{ grid-template-columns: 1fr; } }
        .reports { max-width:1200px; margin:0 auto; padding:0; }
      `}</style>
    </section>
  );
}
