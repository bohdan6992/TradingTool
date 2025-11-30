"use client";

import { useEffect, useMemo, useState } from "react";
import { getFullQuotes, FullQuotesRow } from "@/lib/trapClient";
import { FULL_FIELDS, FullFieldName } from "@/lib/fullFields";

type FetchStatus = "idle" | "loading" | "ok" | "error";
type FilterMode = "contains" | "eq" | "gte" | "lte" | "between";

type FilterSort = {
  id: number;
  field: FullFieldName | "ticker";
  mode: FilterMode;
  value: string;
  value2?: string;
  sortDir: "asc" | "desc" | null;
};

// відповідає тому, що лежить у items (без ticker всередині value)
type FullQuotesApiRow = Omit<FullQuotesRow, "ticker">;

let filterIdCounter = 1;

const MODE_OPTIONS: { value: FilterMode; label: string }[] = [
  { value: "contains", label: "contains" },
  { value: "eq",       label: "=" },
  { value: "gte",      label: "≥" },
  { value: "lte",      label: "≤" },
  { value: "between",  label: "between" },
];

type OpenDropdown =
  | { id: number; kind: "field" }
  | { id: number; kind: "mode" }
  | null;

export default function TrapFullExplorer() {
  const [data, setData] = useState<{
    elapsedMs: number;
    universeTickers: number;
    returnedTickers: number;
    items: Record<string, FullQuotesApiRow>;
  } | null>(null);

  const [status, setStatus] = useState<FetchStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterSort[]>([
    {
      id: filterIdCounter++,
      field: "ticker",
      mode: "contains",
      value: "",
      sortDir: null,
    },
  ]);

  // який дропдаун відкритий (поле / режим)
  const [openDrop, setOpenDrop] = useState<OpenDropdown>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setStatus("loading");
        setError(null);
        const json = await getFullQuotes();

        if (!cancelled) {
          setData(json as any);
          setStatus("ok");
        }
      } catch (e: any) {
        if (!cancelled) {
          setStatus("error");
          setError(e?.message ?? "Fetch error");
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows: FullQuotesRow[] = useMemo(() => {
    if (!data?.items) return [];
    return Object.entries(data.items).map(([ticker, fields]) => ({
      ticker,
      ...(fields as FullQuotesApiRow),
    }));
  }, [data]);

  const allFields: (FullFieldName | "ticker")[] = useMemo(
    () => ["ticker", ...FULL_FIELDS],
    []
  );

  // які колонки показуємо: завжди ticker + всі, що є у фільтрах
  const visibleFields: (FullFieldName | "ticker")[] = useMemo(() => {
    const set = new Set<FullFieldName | "ticker">();
    set.add("ticker");
    for (const f of filters) {
      set.add(f.field);
    }
    return Array.from(set);
  }, [filters]);

  const isNumericMode = (mode: FilterMode) =>
    mode === "gte" || mode === "lte" || mode === "between";

  const filteredSortedRows = useMemo(() => {
    let result = [...rows];

    for (const f of filters) {
      const { field, mode, value, value2 } = f;
      const v = value.trim();
      const v2 = value2?.trim();

      if (!field) continue;
      if (!v && mode !== "contains") {
        if (!v2 || mode !== "between") continue;
      }
      if (!v && mode === "contains") continue;

      result = result.filter((row) => {
        const raw = row[field];
        if (raw == null) return false;

        if (!isNumericMode(mode)) {
          const s = String(raw).toLowerCase();
          const val = v.toLowerCase();

          if (mode === "contains") return s.includes(val);
          if (mode === "eq") return s === val;
          return true;
        } else {
          const num = Number(raw);
          if (Number.isNaN(num)) return false;

          const from = v ? Number(v.replace(",", ".")) : undefined;
          const to = v2 ? Number(v2.replace(",", ".")) : undefined;

          if (mode === "gte") {
            if (from === undefined || Number.isNaN(from)) return false;
            return num >= from;
          }
          if (mode === "lte") {
            if (from === undefined || Number.isNaN(from)) return false;
            return num <= from;
          }
          if (mode === "between") {
            if (
              from === undefined ||
              Number.isNaN(from) ||
              to === undefined ||
              Number.isNaN(to)
            ) {
              return false;
            }
            return num >= from && num <= to;
          }
          return true;
        }
      });
    }

    const sortFilter = filters.find((f) => f.sortDir !== null);
    if (sortFilter) {
      const { field, sortDir } = sortFilter;

      result.sort((a, b) => {
        const av = a[field];
        const bv = b[field];

        const na = Number(av);
        const nb = Number(bv);

        let cmp = 0;

        if (!Number.isNaN(na) && !Number.isNaN(nb)) {
          cmp = na === nb ? 0 : na < nb ? -1 : 1;
        } else {
          const sa = String(av ?? "");
          const sb = String(bv ?? "");
          cmp = sa.localeCompare(sb);
        }

        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [rows, filters]);

  const updateFilterField = (id: number, field: FullFieldName | "ticker") => {
    setFilters((prev) =>
      prev.map((f) => (f.id === id ? { ...f, field } : f))
    );
  };

  const updateFilterMode = (id: number, mode: FilterMode) => {
    setFilters((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              mode,
              value2: mode === "between" ? f.value2 : undefined,
            }
          : f
      )
    );
  };

  const updateFilterValue = (id: number, value: string) => {
    setFilters((prev) =>
      prev.map((f) => (f.id === id ? { ...f, value } : f))
    );
  };

  const updateFilterValue2 = (id: number, value2: string) => {
    setFilters((prev) =>
      prev.map((f) => (f.id === id ? { ...f, value2 } : f))
    );
  };

  const toggleSort = (id: number) => {
    setFilters((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        if (f.sortDir === null) return { ...f, sortDir: "asc" };
        if (f.sortDir === "asc") return { ...f, sortDir: "desc" };
        return { ...f, sortDir: null };
      })
    );
  };

  const addFilter = () => {
    setFilters((prev) => [
      ...prev,
      {
        id: filterIdCounter++,
        field: "ticker",
        mode: "contains",
        value: "",
        sortDir: null,
      },
    ]);
  };

  const removeFilter = (id: number) => {
    setFilters((prev) =>
      prev.length <= 1 ? prev : prev.filter((f) => f.id !== id)
    );
  };

  const exportCsv = () => {
    if (!filteredSortedRows.length) return;

    const cols = visibleFields as string[];
    const lines = [
      cols.join(","), // header
      ...filteredSortedRows.map((row) =>
        cols
          .map((c) => {
            const v = (row as any)[c];
            const s = v == null ? "" : String(v);
            return `"${s.replace(/"/g, '""')}"`;
          })
          .join(",")
      ),
    ];

    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "trap_full_quotes.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const isOpen = (id: number, kind: "field" | "mode") =>
    openDrop?.id === id && openDrop.kind === kind;

  return (
    <>
      <section className="mt-10 space-y-4">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold">TRAP Explorer</h2>
          <p className="small opacity-70">
            Повний зріз полів TRAP з фільтрами, сортуванням і експортом у CSV.
          </p>
        </header>

        {/* Панель фільтрів + інфа + Export */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {filters.map((f, idx) => (
              <div
                key={f.id}
                className="flex items-center gap-2 px-2 py-1 rounded-full bg-[var(--card-bg-soft)] border border-slate-700/70 shadow-sm"
              >
                {/* Селектор ПОЛЯ */}
                <div className="pillSelectContainer">
                  <button
                    type="button"
                    className="pillDropdownButton"
                    onClick={() =>
                      setOpenDrop(
                        isOpen(f.id, "field")
                          ? null
                          : { id: f.id, kind: "field" }
                      )
                    }
                  >
                    <span className="icon">📊</span>
                    <span className="text">{f.field}</span>
                    <span className="chevron">▾</span>
                  </button>

                  {isOpen(f.id, "field") && (
                    <div className="pillDropdownMenu">
                      {allFields.map((fld) => (
                        <div
                          key={fld}
                          className="pillDropdownItem"
                          onClick={() => {
                            updateFilterField(f.id, fld);
                            setOpenDrop(null);
                          }}
                        >
                          <span className="pillItemIcon">▫️</span>
                          {fld}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Селектор РЕЖИМУ */}
                <div className="pillSelectContainer small">
                  <button
                    type="button"
                    className="pillDropdownButton"
                    onClick={() =>
                      setOpenDrop(
                        isOpen(f.id, "mode")
                          ? null
                          : { id: f.id, kind: "mode" }
                      )
                    }
                  >
                    <span className="text">
                      {MODE_OPTIONS.find((m) => m.value === f.mode)?.label ??
                        f.mode}
                    </span>
                    <span className="chevron">▾</span>
                  </button>

                  {isOpen(f.id, "mode") && (
                    <div className="pillDropdownMenu">
                      {MODE_OPTIONS.map((m) => (
                        <div
                          key={m.value}
                          className="pillDropdownItem"
                          onClick={() => {
                            updateFilterMode(f.id, m.value);
                            setOpenDrop(null);
                          }}
                        >
                          <span className="pillItemIcon">➤</span>
                          {m.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Значення */}
                <div className="flex items-center gap-1">
                  <input
                    className="bg-slate-900/80 text-xs px-2 py-1 rounded-full outline-none border border-slate-600 w-24"
                    placeholder={isNumericMode(f.mode) ? "value" : "text"}
                    value={f.value}
                    onChange={(e) => updateFilterValue(f.id, e.target.value)}
                  />
                  {f.mode === "between" && (
                    <>
                      <span className="text-xs text-slate-500">–</span>
                      <input
                        className="bg-slate-900/80 text-xs px-2 py-1 rounded-full outline-none border border-slate-600 w-24"
                        placeholder="value"
                        value={f.value2 ?? ""}
                        onChange={(e) =>
                          updateFilterValue2(f.id, e.target.value)
                        }
                      />
                    </>
                  )}
                </div>

                {/* Сортування */}
                <button
                  type="button"
                  onClick={() => toggleSort(f.id)}
                  className="text-xs px-1.5 py-0.5 rounded-full border border-slate-600 hover:bg-slate-700"
                  title="Сортування"
                >
                  {f.sortDir === "asc"
                    ? "↑"
                    : f.sortDir === "desc"
                    ? "↓"
                    : "⇅"}
                </button>

                {/* Видалити */}
                {filters.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeFilter(f.id)}
                    className="text-xs px-1 text-slate-500 hover:text-rose-400"
                    title="Видалити колонку"
                  >
                    ✕
                  </button>
                )}

                {/* Плюсик тільки біля останньої */}
                {idx === filters.length - 1 && (
                  <button
                    type="button"
                    onClick={addFilter}
                    className="text-xs px-1 text-emerald-400 hover:text-emerald-300"
                    title="Додати ще один параметр"
                  >
                    +
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            {status === "loading" && <span>Завантаження…</span>}
            {status === "error" && (
              <span className="text-rose-400">
                Помилка: {error ?? "невідомо"}
              </span>
            )}
            {data && (
              <span>
                Всесвіт:{" "}
                <span className="text-slate-100">
                  {data.universeTickers.toLocaleString("en-US")}
                </span>{" "}
                | Відповіло:{" "}
                <span className="text-slate-100">
                  {data.returnedTickers.toLocaleString("en-US")}
                </span>{" "}
                | {data.elapsedMs.toFixed(1)} ms
              </span>
            )}
            <button
              type="button"
              onClick={exportCsv}
              className="ml-2 px-3 py-1 rounded-full border border-slate-600 text-slate-100 hover:bg-slate-700 transition"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Таблиця – тільки видимі поля */}
        <div className="overflow-auto max-h-[600px] border border-slate-800 rounded-2xl bg-[var(--card-bg)] shadow-xl">
          <table className="min-w-full text-xs">
            <thead className="sticky top-0 z-10 bg-[var(--card-bg-soft)]/95 backdrop-blur">
              <tr>
                {visibleFields.map((fld) => (
                  <th
                    key={fld}
                    className="px-3 py-2 text-left font-semibold text-slate-300"
                  >
                    {fld}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredSortedRows.map((row, idx) => (
                <tr
                  key={row.ticker ?? idx}
                  className={
                    idx % 2 === 0
                      ? "bg-[var(--card-bg)]"
                      : "bg-[var(--card-bg-soft)]"
                  }
                >
                  {visibleFields.map((fld) => (
                    <td
                      key={fld}
                      className="px-3 py-1.5 text-slate-100 tabular-nums"
                    >
                      {row[fld] != null ? String(row[fld]) : "—"}
                    </td>
                  ))}
                </tr>
              ))}

              {filteredSortedRows.length === 0 && status === "ok" && (
                <tr>
                  <td
                    className="px-3 py-3 text-center text-slate-500"
                    colSpan={visibleFields.length}
                  >
                    Даних немає.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* локальні стилі дропдаунів у стилі StrategySelect */}
      <style jsx>{`
        .pillSelectContainer {
          position: relative;
          width: 160px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .pillSelectContainer.small {
          width: 120px;
        }

        .pillDropdownButton {
          display: flex;
          align-items: center;
          gap: 6px;
          border-radius: 999px;
          padding: 6px 10px;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          box-shadow: var(--card-shadow);
          cursor: pointer;
          color: var(--fg);
          font-size: 12px;
          font-weight: 600;
          transition: 0.15s ease;
          width: 100%;
          text-align: left;
        }

        .pillDropdownButton:hover {
          border-color: var(--color-primary);
        }

        .pillDropdownButton .icon {
          opacity: 0.9;
        }

        .pillDropdownButton .chevron {
          margin-left: auto;
          opacity: 0.6;
        }

        .pillDropdownMenu {
          position: absolute;
          top: 40px;
          width: 100%;
          max-height: 260px;
          overflow-y: auto;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 12px;
          box-shadow: var(--card-shadow-heavy);
          padding: 4px 0;
          z-index: 50;
          backdrop-filter: blur(12px);
        }

        .pillDropdownItem {
          padding: 6px 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: 0.12s ease;
          font-size: 12px;
        }

        .pillDropdownItem:hover {
          background: var(--accent);
        }

        .pillItemIcon {
          width: 18px;
          text-align: center;
          opacity: 0.7;
        }
      `}</style>
    </>
  );
}
