import { useRouter } from "next/router";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { STRATEGIES } from "@/data/strategies";

type StatsRow = Record<string, string>;

type SortKey = "ticker" | "bench" | "corr" | "beta" | "sig";
type SortDir = "asc" | "desc";

export default function StrategyStatsPage() {
  const { query } = useRouter();
  const strategy = String(query.strategy ?? "");

  const [rows, setRows] = useState<StatsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>("ticker");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // завантаження stats з bridge-ендпоінта
  useEffect(() => {
    if (!strategy) return;

    let cancelled = false;

    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/bridge/strategy-stats/${strategy}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = (await res.json()) as any[];

        if (!cancelled) {
          const normalized: StatsRow[] = json.map((r) => {
            const obj: StatsRow = {};
            for (const [k, v] of Object.entries(r)) {
              obj[k] = v != null ? String(v) : "";
            }
            return obj;
          });
          setRows(normalized);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Помилка завантаження статистики");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, [strategy]);

  const meta = STRATEGIES.find((s) => s.id === strategy);
  const title = meta?.title ?? strategy ?? "Стратегія";

  const handleSort = (key: SortKey) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        // просто перемикаємо напрям
        setSortDir((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
        return prevKey;
      } else {
        setSortDir("asc");
        return key;
      }
    });
  };

  const sortedRows = useMemo(() => {
    const data = [...rows];

    const numericKeys: SortKey[] = ["corr", "beta", "sig"];

    data.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";

      if (numericKeys.includes(sortKey)) {
        const na = parseFloat(av.replace(",", "."));
        const nb = parseFloat(bv.replace(",", "."));

        const aValid = !Number.isNaN(na);
        const bValid = !Number.isNaN(nb);

        let cmp = 0;

        if (aValid && bValid) {
          cmp = na === nb ? 0 : na < nb ? -1 : 1;
        } else if (aValid && !bValid) {
          cmp = -1;
        } else if (!aValid && bValid) {
          cmp = 1;
        } else {
          cmp = 0;
        }

        return sortDir === "asc" ? cmp : -cmp;
      } else {
        const cmp = av.localeCompare(bv);
        return sortDir === "asc" ? cmp : -cmp;
      }
    });

    return data;
  }, [rows, sortKey, sortDir]);

  const sortIcon = (key: SortKey) => {
    if (key !== sortKey) return "↕";
    return sortDir === "asc" ? "↑" : "↓";
  };

  return (
    <main className="page space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="small opacity-70">
          Стратегія: <code>{strategy}</code>
        </p>
        <Link href="/guide" className="btn small">
          ← До довідника
        </Link>
      </header>

      {loading && <div>Завантаження статистики…</div>}
      {error && <div className="text-red-500 small">Помилка: {error}</div>}

      {!loading && !error && sortedRows.length === 0 && (
        <div>Немає даних для цієї стратегії.</div>
      )}

      {sortedRows.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            Конфіг тікерів (ticker, bench, corr, beta, sig)
          </h2>

          <div className="overflow-x-auto border rounded-xl bg-[var(--card-bg)]">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-[var(--card-bg-soft)] text-left">
                  <th
                    className="px-3 py-2 cursor-pointer select-none"
                    onClick={() => handleSort("ticker")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Ticker <span className="text-xs opacity-70">{sortIcon("ticker")}</span>
                    </span>
                  </th>
                  <th
                    className="px-3 py-2 cursor-pointer select-none"
                    onClick={() => handleSort("bench")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Bench <span className="text-xs opacity-70">{sortIcon("bench")}</span>
                    </span>
                  </th>
                  <th
                    className="px-3 py-2 cursor-pointer select-none"
                    onClick={() => handleSort("corr")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Corr <span className="text-xs opacity-70">{sortIcon("corr")}</span>
                    </span>
                  </th>
                  <th
                    className="px-3 py-2 cursor-pointer select-none"
                    onClick={() => handleSort("beta")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Beta <span className="text-xs opacity-70">{sortIcon("beta")}</span>
                    </span>
                  </th>
                  <th
                    className="px-3 py-2 cursor-pointer select-none"
                    onClick={() => handleSort("sig")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Sig <span className="text-xs opacity-70">{sortIcon("sig")}</span>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((r, idx) => {
                  const t = r["ticker"] ?? r["Ticker"] ?? "";

                  return (
                    <tr
                      key={`${t}-${idx}`}
                      className={
                        "cursor-pointer " +
                        (idx % 2 === 0
                          ? "bg-[var(--card-bg)]"
                          : "bg-[var(--card-bg-soft)]")
                      }
                      onClick={() => {
                        if (!t) return;
                        window.location.href = `/stats/${strategy}/${t}`;
                      }}
                    >
                      <td className="px-3 py-1.5 font-mono text-xs">{t}</td>
                      <td className="px-3 py-1.5 font-mono text-xs">
                        {r["bench"] ?? r["Bench"] ?? ""}
                      </td>
                      <td className="px-3 py-1.5 tabular-nums">
                        {r["corr"] ?? r["Corr"] ?? ""}
                      </td>
                      <td className="px-3 py-1.5 tabular-nums">
                        {r["beta"] ?? r["Beta"] ?? ""}
                      </td>
                      <td className="px-3 py-1.5 tabular-nums">
                        {r["sig"] ?? r["Sig"] ?? ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

            </table>
          </div>
        </section>
      )}
    </main>
  );
}
