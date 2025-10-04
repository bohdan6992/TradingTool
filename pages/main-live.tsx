import useSWR from "swr";
import Link from "next/link";
import { useMemo } from "react";

type ApiResp = {
  headers: string[];
  rows: Record<string, any>[];
  updatedAt: number;
  sheet?: string;
  filePath?: string;
};

const fetcher = async (url: string) => {
  const r = await fetch(url);
  let data: any = null;
  try { data = await r.json(); } catch {}
  if (!r.ok) {
    const msg = data?.error || `HTTP ${r.status}`;
    throw new Error(msg);
  }
  return data as ApiResp;
};

export default function MainLive() {
  const { data, error } = useSWR<ApiResp>("/api/excel-main", fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
  });

  const headers = useMemo(() => data?.headers ?? [], [data]);
  const rows = useMemo(() => data?.rows ?? [], [data]);

  return (
    <div className="page">
      <div className="head">
        <h1>Лист MAIN — Live</h1>
        <Link href="/" className="btn">← На головну</Link>
      </div>

      <div className="blocks">
        <div className="card">
          <div className="card-title">Таблиця (оновлюється)</div>
          <div className="card-body">
            {error && (
              <div className="muted">
                Помилка: {String(error.message)}
              </div>
            )}

            {!error && !rows.length && <div className="muted">Дані відсутні.</div>}

            {!error && rows.length > 0 && (
              <>
                <div className="small muted">
                  Файл: {data?.filePath || "—"} | Аркуш: <b>{data?.sheet || "—"}</b>
                </div>
                <div className="scroll">
                  <table className="tbl">
                    <thead>
                      <tr>
                        {headers.map((h) => (
                          <th key={h}>{(h ?? "").toString().trim()}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, idx) => (
                        <tr key={idx}>
                          {headers.map((h) => (
                            <td key={h}>{formatCell(r[h])}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="muted small">
              {data ? `Оновлено: ${new Date(data.updatedAt).toLocaleTimeString()}` : "Завантаження…"}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .page{ max-width:1200px; margin:0 auto; padding: 16px; }
        .head{ display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
        .btn{ padding:6px 10px; border:1px solid var(--card-border); border-radius:8px; text-decoration:none; color:var(--fg); }

        .blocks{
          display:grid;
          grid-template-columns: repeat(3, minmax(280px, 1fr));
          gap:16px;
        }
        @media (max-width:980px){ .blocks{ grid-template-columns: repeat(2, minmax(260px, 1fr)); } }
        @media (max-width:640px){ .blocks{ grid-template-columns: 1fr; } }

        .card{
          background: var(--card-bg);
          border: 2px solid var(--card-border);
          border-radius: 1rem;
          display:flex; flex-direction:column; overflow:hidden;
        }
        .card-title{
          padding: .55rem .8rem;
          font-weight:700;
          text-align:center;
          border-bottom:1px solid var(--card-border);
        }
        .card-body{ padding:.75rem; display:flex; flex-direction:column; gap:.75rem; }
        .muted{ color: var(--tt-muted, #b6bac2); }
        .small{ font-size:.8rem; }

        .scroll{ overflow:auto; border:1px solid var(--card-border); border-radius:12px; }
        .tbl{ width:100%; border-collapse:collapse; min-width: 640px; }
        thead th{
          text-align:left; font-weight:600; font-size:.9rem; color: var(--tt-muted, #b6bac2);
          padding:10px 12px; border-bottom:1px solid var(--card-border); white-space:nowrap;
          position: sticky; top:0; background: var(--card-bg);
        }
        tbody td{
          padding:10px 12px; border-bottom:1px solid var(--card-border); white-space:nowrap;
        }
        tbody tr:hover td{ background: rgba(255,255,255,0.04); }
      `}</style>
    </div>
  );
}

function formatCell(v: any) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isInteger(v) ? v : v.toFixed(2);
  return String(v);
}
