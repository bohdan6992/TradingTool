"use client";

import { useEffect, useState } from "react";
import { getUniverseQuotes } from "@/lib/trapClient";

type QuoteItem = {
  Bid?: number | null;
  Ask?: number | null;
  LstCls?: number | null;
  Exchange?: string | null;
};

type UniverseResponse = {
  elapsedMs: number;
  universeTickers: number;
  returnedTickers: number;
  items: Record<string, QuoteItem>;
};

type FetchStatus = "idle" | "loading" | "ok" | "error";

const MAX_ROWS = 200; // щоб не вивалювати одразу 4k+ рядків у DOM

export default function BridgeUniverseQuotes() {
  const [data, setData] = useState<UniverseResponse | null>(null);
  const [status, setStatus] = useState<FetchStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const fetchData = async () => {
      if (cancelled) return;
      try {
        setStatus((prev) => (prev === "idle" ? "loading" : prev));

        // 🔁 ТЕПЕР напряму в локальний TradingBridgeApi через trapClient
        const json = (await getUniverseQuotes()) as UniverseResponse;

        if (!cancelled) {
          setData(json);
          setStatus("ok");
          setError(null);
        }
      } catch (e: any) {
        if (cancelled) return;
        setStatus("error");
        setError(e?.message ?? "Unknown error");
      }
    };

    // перший запит
    fetchData();
    // оновлення кожну секунду
    timer = setInterval(fetchData, 1000);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, []);

  const rows =
    data?.items
      ? Object.entries(data.items)
          .map(([ticker, q]) => ({
            ticker,
            exchange: q.Exchange ?? "",
            bid: q.Bid ?? null,
            ask: q.Ask ?? null,
            lstCls: q.LstCls ?? null,
          }))
          .sort((a, b) => a.ticker.localeCompare(b.ticker))
          .slice(0, MAX_ROWS)
      : [];

  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-700/70 shadow-xl overflow-hidden">
      {/* header */}
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between border-b border-slate-700/70 bg-gradient-to-r from-slate-900 to-slate-800">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-50">
              Котирування (bridge / universe)
            </span>
            <span className="text-xs text-slate-400">
              live дані з TRAP через TradingBridgeApi
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end text-xs text-slate-400">
          {data && (
            <>
              <span>
                Всесвіт:{" "}
                <span className="text-slate-100">
                  {data.universeTickers.toLocaleString("en-US")}
                </span>
              </span>
              <span>
                Відповіло:{" "}
                <span className="text-slate-100">
                  {data.returnedTickers.toLocaleString("en-US")}
                </span>
              </span>
              <span>
                Затримка:{" "}
                <span className="text-slate-100">
                  {data.elapsedMs.toFixed(1)} ms
                </span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* статус / помилка */}
      {status !== "ok" && (
        <div className="px-4 sm:px-6 py-3 border-b border-slate-800 text-xs">
          {status === "loading" && (
            <span className="text-slate-400">Завантаження котирувань…</span>
          )}
          {status === "error" && (
            <span className="text-rose-400">
              TRAP / TradingBridgeApi не відповідає або міст недоступний.{" "}
              {error && (
                <span className="text-slate-500">({error.toString()})</span>
              )}
            </span>
          )}
        </div>
      )}

      {/* таблиця */}
      <div className="overflow-auto max-h-[480px]">
        <table className="min-w-full text-xs sm:text-sm">
          <thead className="bg-slate-800/80 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-300">
                Ticker
              </th>
              <th className="px-3 py-2 text-left font-semibold text-slate-300">
                Exch
              </th>
              <th className="px-3 py-2 text-right font-semibold text-slate-300">
                Bid
              </th>
              <th className="px-3 py-2 text-right font-semibold text-slate-300">
                Ask
              </th>
              <th className="px-3 py-2 text-right font-semibold text-slate-300">
                LstCls
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
            {rows.map((row) => (
              <tr
                key={row.ticker}
                className="hover:bg-slate-800/60 transition-colors"
              >
                <td className="px-3 py-1.5 font-semibold text-slate-100">
                  {row.ticker}
                </td>
                <td className="px-3 py-1.5 text-slate-400 text-[11px] uppercase">
                  {row.exchange}
                </td>
                <td className="px-3 py-1.5 text-right text-slate-100 tabular-nums">
                  {row.bid !== null ? row.bid.toFixed(2) : "—"}
                </td>
                <td className="px-3 py-1.5 text-right text-slate-100 tabular-nums">
                  {row.ask !== null ? row.ask.toFixed(2) : "—"}
                </td>
                <td className="px-3 py-1.5 text-right text-slate-400 tabular-nums">
                  {row.lstCls !== null ? row.lstCls.toFixed(2) : "—"}
                </td>
              </tr>
            ))}

            {rows.length === 0 && status === "ok" && (
              <tr>
                <td
                  className="px-3 py-3 text-center text-slate-500"
                  colSpan={5}
                >
                  Даних немає.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* футер */}
      <div className="px-4 sm:px-6 py-2 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
        <span>Оновлення ~ раз на секунду</span>
        <span>local bridge: /api/universe-quotes</span>
      </div>
    </div>
  );
}
