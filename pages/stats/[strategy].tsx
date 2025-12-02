import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { getArbitrageList } from "@/lib/trapClient";

type StatsRow = Record<string, string>;

type SortKey = "ticker" | "bench" | "corr" | "beta" | "sig";
type SortDir = "asc" | "desc";

export default function StrategyStatsPage() {
  const router = useRouter();
  const strategy = String(router.query.strategy ?? "").toLowerCase();

  const [rows, setRows] = useState<StatsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>("ticker");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    if (!router.isReady) return;
    if (!strategy) return;

    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        if (strategy !== "arbitrage") {
          setRows([]);
          setError("Поки підтримується тільки arbitrage");
          return;
        }

        const list = await getArbitrageList();
        if (!cancelled) setRows(list);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Помилка завантаження");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [router.isReady, strategy]);

  const handleSort = (key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return key;
    });
  };

  const sortedRows = useMemo(() => {
    const data = [...rows];
    const numericKeys: SortKey[] = ["corr", "beta", "sig"];

    data.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";

      if (numericKeys.includes(sortKey)) {
        const na = parseFloat(String(av).replace(",", "."));
        const nb = parseFloat(String(bv).replace(",", "."));

        const aValid = !Number.isNaN(na);
        const bValid = !Number.isNaN(nb);

        let cmp = 0;
        if (aValid && bValid) cmp = na === nb ? 0 : na < nb ? -1 : 1;
        else if (aValid && !bValid) cmp = -1;
        else if (!aValid && bValid) cmp = 1;

        return sortDir === "asc" ? cmp : -cmp;
      }

      const cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
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
        <h1 className="text-2xl font-bold">Stats: {strategy}</h1>

        <div className="flex gap-2">
          <Link href="/guide" className="btn small">
            ← До довідника
          </Link>
        </div>
      </header>

      {loading && <div>Завантаження…</div>}
      {error && <div className="text-red-500 small">Помилка: {error}</div>}

      {!loading && !error && sortedRows.length === 0 && <div>Немає даних.</div>}

      {sortedRows.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            Конфіг тікерів (ticker, bench, corr, beta, sig)
          </h2>

          <div className="overflow-x-auto border rounded-xl bg-[var(--card-bg)]">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-[var(--card-bg-soft)] text-left">
                  {(["ticker", "bench", "corr", "beta", "sig"] as SortKey[]).map(
                    (k) => (
                      <th
                        key={k}
                        className="px-3 py-2 cursor-pointer select-none"
                        onClick={() => handleSort(k)}
                      >
                        <span className="inline-flex items-center gap-1">
                          {k.toUpperCase()}{" "}
                          <span className="text-xs opacity-70">{sortIcon(k)}</span>
                        </span>
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody>
                {sortedRows.map((r, idx) => {
                  const t = r["ticker"] ?? r["Ticker"] ?? "";
                  const href = `/stats/${strategy}/${encodeURIComponent(t)}`;

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
                        router.push(href);
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
