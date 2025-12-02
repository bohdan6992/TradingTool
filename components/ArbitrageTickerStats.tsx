"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LabelList,
  LineChart,
  Line,
} from "recharts";

import type { TrapError } from "@/lib/trapClient";
import { getArbitrageStatsByTicker } from "@/lib/trapClient";

/** =========================
 * Types (soft)
 * ========================= */

type AnyObj = Record<string, any>;

type ApiEnvelope = {
  strategy: string;
  format: "jsonl" | "csv";
  updatedAt?: string;
  ticker: string;
  item: AnyObj | null;
};

type StatsRow = { label: string; value: any; type: "number" | "string" | "json" };

type BinRow = {
  label: string;
  norm?: number | null;
  not?: number | null;
  ev?: number | null;
  // for halfhour medians:
  pos?: number | null;
  neg?: number | null;
};

type RecentRow = {
  dt?: string;
  dev?: number;
  peak?: number;
};

const COL_NORM = "rgba(52, 211, 153, 0.85)"; // emerald
const COL_NOT = "rgba(251, 113, 133, 0.85)"; // rose
const COL_EV = "rgba(129, 140, 248, 0.85)"; // indigo-ish
const GRID = "rgba(255,255,255,0.08)";

/** =========================
 * Small utils
 * ========================= */

function isObj(v: any): v is AnyObj {
  return v && typeof v === "object" && !Array.isArray(v);
}

function numOrNull(x: any): number | null {
  if (x === null || x === undefined) return null;
  const n = typeof x === "number" ? x : Number(String(x).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function fmtNum(x: any, digits = 2): string {
  const n = numOrNull(x);
  return n === null ? "—" : n.toFixed(digits);
}

function fmtInt(x: any): string {
  const n = numOrNull(x);
  return n === null ? "—" : String(Math.round(n));
}

function fmtPct01(x: any, digits = 1): string {
  // accepts 0..1 or 0..100 (tries to guess)
  const n = numOrNull(x);
  if (n === null) return "—";
  const v = n > 1.5 ? n : n * 100;
  return `${v.toFixed(digits)}%`;
}

function fmtDt(dt?: string): string {
  if (!dt) return "—";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return String(dt);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function clipText(s: any, max = 48) {
  const t = s == null ? "" : String(s);
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function keysSorted(obj: AnyObj) {
  return Object.keys(obj).sort((a, b) => a.localeCompare(b));
}

function shallowOmit(obj: AnyObj, omitKeys: string[]) {
  const out: AnyObj = {};
  for (const k of Object.keys(obj || {})) if (!omitKeys.includes(k)) out[k] = obj[k];
  return out;
}

/** =========================
 * UI primitives
 * ========================= */

function Panel({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-zinc-950/60 border border-white/10 shadow-lg overflow-hidden">
      <div className="p-4 md:p-5 border-b border-white/10 flex items-start justify-between gap-4">
        <div>
          <div className="text-lg md:text-xl font-semibold text-white">{title}</div>
          {subtitle ? <div className="text-sm text-white/60 mt-0.5">{subtitle}</div> : null}
        </div>
        {right}
      </div>
      <div className="p-4 md:p-5">{children}</div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
      <div className="text-xs text-white/60">{label}</div>
      <div className="text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function StatChip({
  k,
  v,
  accent,
}: {
  k: string;
  v: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
      <div className="text-xs text-white/60">{k}</div>
      <div className="text-sm font-semibold" style={{ color: accent ?? "white" }}>
        {v}
      </div>
    </div>
  );
}

function Progress({ value01 }: { value01: number }) {
  const v = Math.max(0, Math.min(1, value01));
  return (
    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
      <div className="h-full bg-emerald-400/80" style={{ width: `${Math.round(v * 100)}%` }} />
    </div>
  );
}

function MiniBars({ values }: { values: number[] }) {
  const max = Math.max(1e-9, ...values.map((v) => Math.abs(v)));
  return (
    <div className="flex items-end gap-1 h-[44px]">
      {values.map((v, i) => {
        const pct = Math.abs(v) / max;
        const h = Math.max(2, Math.round(pct * 44));
        const pos = v >= 0;
        return (
          <div
            key={i}
            title={v.toFixed(3)}
            className={`w-2 rounded-sm ${pos ? "bg-emerald-400/80" : "bg-rose-400/80"}`}
            style={{ height: h }}
          />
        );
      })}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  return (
    <button
      className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
      onClick={() => navigator.clipboard.writeText(text)}
    >
      Copy
    </button>
  );
}

function CodeBox({ value }: { value: any }) {
  return (
    <pre className="text-xs text-white/70 whitespace-pre-wrap break-words bg-black/20 border border-white/10 rounded-xl p-3">
      {value ? JSON.stringify(value, null, 2) : "—"}
    </pre>
  );
}

/** =========================
 * Chart helpers (gradients)
 * ========================= */

function GradientDefs() {
  // We rely on default stroke colors by recharts; for bars we use our own fill with gradients.
  return (
    <defs>
      <linearGradient id="gradNorm" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="rgba(52, 211, 153, 0.15)" />
        <stop offset="40%" stopColor="rgba(52, 211, 153, 0.55)" />
        <stop offset="100%" stopColor="rgba(52, 211, 153, 0.95)" />
      </linearGradient>

      <linearGradient id="gradNot" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="rgba(251, 113, 133, 0.15)" />
        <stop offset="40%" stopColor="rgba(251, 113, 133, 0.55)" />
        <stop offset="100%" stopColor="rgba(251, 113, 133, 0.95)" />
      </linearGradient>

      <linearGradient id="gradEv" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="rgba(129, 140, 248, 0.10)" />
        <stop offset="45%" stopColor="rgba(129, 140, 248, 0.45)" />
        <stop offset="100%" stopColor="rgba(129, 140, 248, 0.85)" />
      </linearGradient>
    </defs>
  );
}

function BarsPanel({
  title,
  subtitle,
  data,
  showEv = false,
  height = 320,
}: {
  title: string;
  subtitle?: string;
  data: BinRow[];
  showEv?: boolean;
  height?: number;
}) {
  if (!data?.length) return null;

  return (
    <Panel title={title} subtitle={subtitle}>
      <div className="h-[320px]" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 16, bottom: 10, left: 0 }}>
            <GradientDefs />
            <CartesianGrid stroke={GRID} strokeDasharray="4 4" />
            <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 12 }} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                background: "rgba(10,10,10,0.9)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
              }}
              labelStyle={{ color: "rgba(255,255,255,0.75)" }}
            />
            <Legend />

            {showEv ? (
              <Bar dataKey="ev" name="Events" fill="url(#gradEv)" radius={[10, 10, 0, 0]}>
                <LabelList dataKey="ev" position="top" fill="rgba(255,255,255,0.85)" fontSize={11} />
              </Bar>
            ) : null}

            <Bar dataKey="norm" name="Normalized" fill="url(#gradNorm)" radius={[10, 10, 0, 0]}>
              <LabelList dataKey="norm" position="top" fill="rgba(255,255,255,0.85)" fontSize={11} />
            </Bar>

            <Bar dataKey="not" name="Not normalized" fill="url(#gradNot)" radius={[10, 10, 0, 0]}>
              <LabelList dataKey="not" position="top" fill="rgba(255,255,255,0.85)" fontSize={11} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

function LinesPanel({
  title,
  subtitle,
  data,
  keys,
  height = 320,
  zeroLine = true,
}: {
  title: string;
  subtitle?: string;
  data: AnyObj[];
  keys: { key: string; name: string; color?: string }[];
  height?: number;
  zeroLine?: boolean;
}) {
  if (!data?.length) return null;

  return (
    <Panel title={title} subtitle={subtitle}>
      <div className="h-[320px]" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 16, right: 16, bottom: 10, left: 0 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="4 4" />
            <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 12 }} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                background: "rgba(10,10,10,0.9)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
              }}
              labelStyle={{ color: "rgba(255,255,255,0.75)" }}
            />
            <Legend />

            {zeroLine ? <Line type="linear" dataKey="zero" stroke="rgba(255,255,255,0.12)" dot={false} /> : null}

            {keys.map((k) => (
              <Line
                key={k.key}
                type="monotone"
                dataKey={k.key}
                name={k.name}
                stroke={k.color ?? undefined}
                strokeWidth={2.8}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

function KeyValueTable({
  title,
  subtitle,
  rows,
  right,
}: {
  title: string;
  subtitle?: string;
  rows: { k: string; v: any }[];
  right?: React.ReactNode;
}) {
  if (!rows.length) return null;
  return (
    <Panel title={title} subtitle={subtitle} right={right}>
      <div className="overflow-auto">
        <table className="min-w-[560px] w-full text-sm">
          <thead>
            <tr className="text-white/60">
              <th className="py-2 text-left font-medium">key</th>
              <th className="py-2 text-left font-medium">value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.k} className="border-t border-white/10">
                <td className="py-2 text-white/70 font-mono text-xs">{r.k}</td>
                <td className="py-2 text-white/85">
                  {isObj(r.v) || Array.isArray(r.v) ? (
                    <span className="font-mono text-xs text-white/70">{clipText(JSON.stringify(r.v), 140)}</span>
                  ) : (
                    <span className="font-mono text-xs">{String(r.v)}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/** =========================
 * Payload normalizers
 * ========================= */

/**
 * bins can be:
 *  - bins.dev / bins.bench / bins.time arrays
 *  - bins.dev_bins object with keys and "a/b" string pairs
 *  - time bins could include triple (norm/not/ev)
 *
 * We'll try hard to normalize into BinRow[].
 */
function parsePairCell(x: any): { a: number | null; b: number | null } {
  if (x == null) return { a: null, b: null };

  // If object: {norm, not} etc
  if (isObj(x)) {
    const a = numOrNull(x.norm ?? x.a ?? x.normalized ?? x.n);
    const b = numOrNull(x.not ?? x.b ?? x.not_normalized ?? x.nn);
    return { a, b };
  }

  // If array: [a,b]
  if (Array.isArray(x) && x.length >= 2) return { a: numOrNull(x[0]), b: numOrNull(x[1]) };

  const s = String(x).trim();

  // Try "12/34" or "12 | 34" or "12, 34"
  const m =
    s.match(/^\s*([+-]?\d+(?:\.\d+)?)\s*[/|,]\s*([+-]?\d+(?:\.\d+)?)\s*$/) ||
    s.match(/^\s*\(\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)\s*\)\s*$/);

  if (m) return { a: numOrNull(m[1]), b: numOrNull(m[2]) };

  // If only one number present -> treat as "a"
  const n = numOrNull(s);
  return { a: n, b: null };
}

function parseTripleCell(x: any): { a: number | null; b: number | null; e: number | null } {
  if (x == null) return { a: null, b: null, e: null };

  if (isObj(x)) {
    return {
      a: numOrNull(x.norm ?? x.a ?? x.n),
      b: numOrNull(x.not ?? x.b ?? x.nn),
      e: numOrNull(x.ev ?? x.e ?? x.events),
    };
  }
  if (Array.isArray(x) && x.length >= 3) return { a: numOrNull(x[0]), b: numOrNull(x[1]), e: numOrNull(x[2]) };

  const s = String(x).trim();
  // try "a/b/e"
  const m = s.match(/^\s*([+-]?\d+(?:\.\d+)?)\s*[/|,]\s*([+-]?\d+(?:\.\d+)?)\s*[/|,]\s*([+-]?\d+(?:\.\d+)?)\s*$/);
  if (m) return { a: numOrNull(m[1]), b: numOrNull(m[2]), e: numOrNull(m[3]) };

  // fallback to pair
  const p = parsePairCell(s);
  return { a: p.a, b: p.b, e: null };
}

function normalizeBins(data: AnyObj | null) {
  const bins = (data?.bins ?? {}) as AnyObj;

  // preferred: direct arrays
  const devArr = Array.isArray(bins.dev) ? bins.dev : Array.isArray(bins.dev_bins) ? bins.dev_bins : null;
  const benchArr = Array.isArray(bins.bench) ? bins.bench : Array.isArray(bins.bench_bins) ? bins.bench_bins : null;
  const timeArr = Array.isArray(bins.time) ? bins.time : Array.isArray(bins.time_bins) ? bins.time_bins : null;
  const hhArr =
    Array.isArray(bins.halfhour) ? bins.halfhour : Array.isArray(bins.halfhour_medians) ? bins.halfhour_medians : null;
  const intrArr = Array.isArray(bins.intraday) ? bins.intraday : Array.isArray(bins.intraday_last5) ? bins.intraday_last5 : null;

  const out: {
    dev: BinRow[];
    bench: BinRow[];
    time: BinRow[];
    halfhour: BinRow[];
    intraday: { label: string; series: { date: string; values: number[] }[] } | null;
  } = { dev: [], bench: [], time: [], halfhour: [], intraday: null };

  // --- DEV (object style: keys like bin_0.5 or "0.5" -> pair string)
  if (!devArr && isObj(bins.dev) && !Array.isArray(bins.dev)) {
    const rows: BinRow[] = [];
    for (const k of keysSorted(bins.dev)) {
      const { a, b } = parsePairCell(bins.dev[k]);
      rows.push({ label: k.replace(/^bin_/, ""), norm: a, not: b });
    }
    out.dev = rows;
  } else if (devArr) {
    out.dev = devArr
      .map((r: any) => ({
        label: String(r.label ?? r.bin ?? r.k ?? r.name ?? ""),
        norm: numOrNull(r.norm ?? r.a ?? r.normalized),
        not: numOrNull(r.not ?? r.b ?? r.not_normalized),
      }))
      .filter((r: BinRow) => r.label);
  } else if (isObj(bins) && Object.keys(bins).some((k) => k.startsWith("bin_"))) {
    // ultra fallback: bins contains bin_* keys at top-level
    const rows: BinRow[] = [];
    for (const k of keysSorted(bins)) {
      if (!k.startsWith("bin_") || k.endsWith("_ratio")) continue;
      const { a, b } = parsePairCell(bins[k]);
      rows.push({ label: k.replace(/^bin_/, ""), norm: a, not: b });
    }
    out.dev = rows;
  }

  // --- BENCH (object style: keys like "0-1" or "1-2" -> pair)
  if (!benchArr && isObj(bins.bench)) {
    const rows: BinRow[] = [];
    for (const k of keysSorted(bins.bench)) {
      const { a, b } = parsePairCell(bins.bench[k]);
      rows.push({ label: k, norm: a, not: b });
    }
    out.bench = rows;
  } else if (benchArr) {
    out.bench = benchArr
      .map((r: any) => ({
        label: String(r.label ?? r.bin ?? r.k ?? r.name ?? ""),
        norm: numOrNull(r.norm ?? r.a ?? r.normalized),
        not: numOrNull(r.not ?? r.b ?? r.not_normalized),
      }))
      .filter((r: BinRow) => r.label);
  }

  // --- TIME (can be triple)
  if (!timeArr && isObj(bins.time)) {
    const rows: BinRow[] = [];
    for (const k of keysSorted(bins.time)) {
      const { a, b, e } = parseTripleCell(bins.time[k]);
      rows.push({ label: k, norm: a, not: b, ev: e });
    }
    out.time = rows;
  } else if (timeArr) {
    out.time = timeArr
      .map((r: any) => ({
        label: String(r.label ?? r.time ?? r.k ?? r.name ?? ""),
        norm: numOrNull(r.norm ?? r.a ?? r.normalized),
        not: numOrNull(r.not ?? r.b ?? r.not_normalized),
        ev: numOrNull(r.ev ?? r.e ?? r.events),
      }))
      .filter((r: BinRow) => r.label);
  }

  // --- HALFHOUR (pos/neg medians)
  if (!hhArr && isObj(bins.halfhour)) {
    const rows: BinRow[] = [];
    for (const k of keysSorted(bins.halfhour)) {
      const v = bins.halfhour[k];
      // format could be: "0.12(-0.08)" or {pos,neg} or [pos,neg]
      if (Array.isArray(v)) rows.push({ label: k, pos: numOrNull(v[0]), neg: numOrNull(v[1]) });
      else if (isObj(v)) rows.push({ label: k, pos: numOrNull(v.pos ?? v.a), neg: numOrNull(v.neg ?? v.b) });
      else {
        const s = String(v).trim();
        const m = s.match(/^\s*([+-]?\d+(?:\.\d+)?)\s*(?:\(\s*([+-]?\d+(?:\.\d+)?)\s*\))?\s*$/);
        rows.push({ label: k, pos: numOrNull(m?.[1]), neg: numOrNull(m?.[2]) });
      }
    }
    out.halfhour = rows;
  } else if (hhArr) {
    out.halfhour = hhArr
      .map((r: any) => ({
        label: String(r.label ?? r.time ?? r.k ?? r.name ?? ""),
        pos: numOrNull(r.pos ?? r.a ?? r.plus),
        neg: numOrNull(r.neg ?? r.b ?? r.minus),
      }))
      .filter((r: BinRow) => r.label);
  }

  // --- INTRADAY overlay
  // Expect: [{date, values:[...]}, ...] or object {labels, series}
  if (intrArr) {
    const series = intrArr
      .map((s: any) => ({
        date: String(s.date ?? s.dt ?? s.label ?? ""),
        values: Array.isArray(s.values) ? s.values.map((x: any) => numOrNull(x) ?? 0) : [],
      }))
      .filter((s: any) => s.date && s.values.length);

    if (series.length) {
      // labels: if provided
      const labels =
        Array.isArray(bins.intraday_labels) ? bins.intraday_labels.map((x: any) => String(x)) : null;

      out.intraday = {
        label: "Intraday 09:30–09:40",
        series,
        ...(labels ? { labels } : {}),
      } as any;
    }
  } else if (isObj(bins.intraday) && Array.isArray(bins.intraday.series)) {
    const series = bins.intraday.series
      .map((s: any) => ({
        date: String(s.date ?? s.dt ?? s.label ?? ""),
        values: Array.isArray(s.values) ? s.values.map((x: any) => numOrNull(x) ?? 0) : [],
      }))
      .filter((s: any) => s.date && s.values.length);

    const labels = Array.isArray(bins.intraday.labels) ? bins.intraday.labels.map(String) : null;

    if (series.length) {
      out.intraday = {
        label: "Intraday 09:30–09:40",
        series,
        ...(labels ? { labels } : {}),
      } as any;
    }
  }

  return out;
}

/** =========================
 * Main component
 * ========================= */

export default function ArbitrageTickerStats({ ticker }: { ticker: string }) {
  const t = (ticker ?? "").trim().toUpperCase();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [env, setEnv] = useState<ApiEnvelope | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!t) return;

      setLoading(true);
      setErr(null);

      try {
        const res = await getArbitrageStatsByTicker(t); // uses trapClient base URL
        const json = res as ApiEnvelope;

        if (!json?.item) throw new Error("No data for this ticker");

        if (!cancelled) setEnv(json);
      } catch (e: any) {
        const te = e as TrapError;
        if (cancelled) return;

        if (te?.type === "NOT_RUNNING") setErr(te.message);
        else if (te?.type === "HTTP_ERROR") setErr(`${te.message} (HTTP ${te.status ?? "?"})`);
        else setErr(e?.message ?? "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const data = env?.item ?? null;

  // --- Overview pills (like your header)
  const overview = useMemo(() => {
    if (!data) return null;

    const bench = data.bench ?? data.Bench ?? "—";
    const corr = data.static?.corr ?? data.stats?.Corr ?? data.Corr;
    const beta = data.static?.beta ?? data.stats?.Beta ?? data.Beta;
    const sig = data.static?.sigma ?? data.stats?.Sig ?? data.Sig;

    const globRate = data.stats?.Glob_rate ?? data.Glob_rate;
    const bestWindow = data.stats?.Best_norm_window ?? data.Best_norm_window ?? data.best_window;

    return { bench, corr, beta, sig, globRate, bestWindow };
  }, [data]);

  // --- Chip grid (your “right grid” idea, but auto)
  const chips = useMemo(() => {
    if (!data) return [];

    const s = data.stats ?? {};
    // Most “card-worthy” keys (your python header showed many of these)
    const pick = [
      ["Glob rate", fmtPct01(s.Glob_rate, 1), "rgba(181, 242, 221, 0.95)"],
      ["Blue rate", fmtPct01(s.Blue_rate, 1), "rgba(166, 207, 255, 0.95)"],
      ["Ark rate", fmtPct01(s.Ark_rate, 1), "rgba(255, 214, 118, 0.95)"],

      ["Dev/N (glob)", `${fmtInt(s.Dev_glob)} / ${fmtInt(s.Norm_glob)}`, "rgba(237,237,254,0.95)"],
      ["Dev/N (blue)", `${fmtInt(s.Blue_dev)} / ${fmtInt(s.Blue_norm)}`, "rgba(237,237,254,0.95)"],
      ["Dev/N (ark)", `${fmtInt(s.Ark_dev)} / ${fmtInt(s.Ark_norm)}`, "rgba(237,237,254,0.95)"],

      ["Pos dev/norm", `${fmtInt(s.Dev_pos)} / ${fmtInt(s.Dev_pos_norm)}`, "rgba(199,247,227,0.95)"],
      ["Soft_norm", fmtInt(s.Soft_norm), "rgba(215,241,233,0.95)"],
      ["Print_norm", fmtInt(s.Print_norm), "rgba(217,230,255,0.95)"],

      ["Neg dev/norm", `${fmtInt(s.Dev_neg)} / ${fmtInt(s.Dev_neg_norm)}`, "rgba(255,201,212,0.95)"],
      ["Open_norm", fmtInt(s.Open_norm), "rgba(255,225,184,0.95)"],
      ["Ark_norm", fmtInt(s.Ark_norm), "rgba(255,232,166,0.95)"],
    ];

    // Filter out all-empty chips
    return pick
      .filter((x) => x[1] !== "—" && x[1] !== "—%")
      .map((x) => ({ k: x[0], v: x[1], accent: x[2] }));
  }, [data]);

  // --- Quality blocks
  const quality = useMemo(() => data?.quality ?? null, [data]);

  // --- Recent prints (table + mini bars)
  const last10 = useMemo(() => {
    const arr = data?.recent?.last10_print;
    if (!Array.isArray(arr)) return [] as RecentRow[];
    return arr.slice(0, 10).map((x: any) => ({
      dt: x?.dt,
      dev: numOrNull(x?.dev) ?? undefined,
      peak: x?.peak != null ? numOrNull(x?.peak) ?? undefined : undefined,
    }));
  }, [data]);

  const last10Devs = useMemo(() => last10.map((x) => x.dev).filter((n): n is number => typeof n === "number"), [last10]);

  // --- Timeline line chart data (print + peak) with a 0-line
  const timelineData = useMemo(() => {
    if (!last10.length) return [];
    return last10.map((x, i) => ({
      label: x.dt ? new Date(x.dt).toLocaleDateString(undefined, { month: "2-digit", day: "2-digit" }) : String(i + 1),
      print: x.dev ?? null,
      peak: x.peak ?? null,
      zero: 0,
    }));
  }, [last10]);

  // --- Bins charts
  const bins = useMemo(() => normalizeBins(data), [data]);

  // map halfhour to line data
  const halfhourLine = useMemo(() => {
    if (!bins.halfhour?.length) return [];
    return bins.halfhour.map((r) => ({
      label: r.label,
      pos: r.pos ?? null,
      neg: r.neg ?? null,
      zero: 0,
    }));
  }, [bins.halfhour]);

  // --- Intraday overlay -> LineChart series
  const intraday = useMemo(() => {
    const intr: any = bins.intraday;
    if (!intr?.series?.length) return null;

    const labels =
      (intr.labels as string[] | undefined) ??
      // default 09:30..09:40
      [...Array(11)].map((_, i) => {
        const m = 30 + i;
        return m <= 39 ? `09:${String(m).padStart(2, "0")}` : "09:40";
      });

    const series = intr.series.slice(0, 5);

    // transform into chart rows: [{label, d0, d1, ...}]
    const rows: AnyObj[] = labels.map((lab: string, idx: number) => {
      const row: AnyObj = { label: lab, zero: 0 };
      series.forEach((s: any, j: number) => {
        row[`s${j}`] = s.values[idx] ?? null;
        row[`name${j}`] = s.date;
      });
      return row;
    });

    return { labels, series, rows };
  }, [bins.intraday]);

  // --- Best params (unused before)
  const bestParamsRows = useMemo(() => {
    const bp = data?.best_params;
    if (!isObj(bp)) return [];
    return keysSorted(bp).map((k) => ({ k, v: bp[k] }));
  }, [data]);

  // --- Stats table (unused before)
  const statsRows = useMemo(() => {
    const s = data?.stats;
    if (!isObj(s)) return [];
    return keysSorted(s).map((k) => ({ k, v: s[k] }));
  }, [data]);

  // --- Time best norm ranges (your screenshot payload had time_best_norm_ranges / time_best_norm_ranges2)
  const timeRanges = useMemo(() => {
    const a = data?.stats?.time_best_norm_ranges;
    const b = data?.stats?.time_best_norm_ranges2;
    const rows: { k: string; v: any }[] = [];
    if (isObj(a)) for (const k of keysSorted(a)) rows.push({ k: `ranges.${k}`, v: a[k] });
    if (isObj(b)) for (const k of keysSorted(b)) rows.push({ k: `ranges2.${k}`, v: b[k] });
    return rows;
  }, [data]);

  // --- “Other data” = everything we didn't explicitly render
  const otherData = useMemo(() => {
    if (!data) return null;

    // keys already used in UI (don’t repeat)
    const usedTop = [
      "ticker",
      "bench",
      "static",
      "stats",
      "quality",
      "recent",
      "bins",
      "best_params",
      "format",
      "updatedAt",
    ];
    const rest = shallowOmit(data, usedTop);

    // If empty -> null
    if (!rest || Object.keys(rest).length === 0) return null;
    return rest;
  }, [data]);

  const updatedAt = env?.updatedAt;

  if (!t) return null;

  return (
    <div className="space-y-4 md:space-y-5">
      {/* HERO HEADER (like your title band) */}
      <div className="rounded-2xl bg-gradient-to-br from-zinc-950/70 to-zinc-900/40 border border-white/10 p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <div className="text-2xl md:text-3xl font-semibold text-white">{t}</div>
            <div className="text-sm text-white/60 mt-1">Arbitrage stats · source: bridge API</div>
          </div>

          <div className="text-xs text-white/50">
            {updatedAt ? <span>Updated: {fmtDt(updatedAt)}</span> : <span>—</span>}
          </div>
        </div>

        {loading ? (
          <div className="mt-4 text-white/60">Loading…</div>
        ) : err ? (
          <div className="mt-4 text-rose-300">
            Error: <span className="text-white/70">{err}</span>
          </div>
        ) : overview ? (
          <>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-2">
              <StatPill label="Benchmark" value={overview.bench} />
              <StatPill label="Corr" value={fmtNum(overview.corr, 2)} />
              <StatPill label="Beta" value={fmtNum(overview.beta, 2)} />
              <StatPill label="Sigma" value={fmtNum(overview.sig, 2)} />
              <StatPill label="Glob rate" value={fmtNum(overview.globRate, 3)} />
              <StatPill label="Best window" value={overview.bestWindow ?? "—"} />
            </div>

            {chips.length ? (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2">
                {chips.map((c) => (
                  <StatChip key={c.k} k={c.k} v={c.v} accent={c.accent} />
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {/* DEV / BENCH / TIME bins */}
      <BarsPanel
        title="Dev bins (peak |dev|)"
        subtitle="Normalized vs not normalized"
        data={bins.dev}
      />

      <BarsPanel
        title="Bench bins (peak |bench%|)"
        subtitle="Normalized vs not normalized"
        data={bins.bench}
      />

      <BarsPanel
        title="Time bins"
        subtitle="Normalized / Not normalized / Normalizations"
        data={bins.time}
        showEv
      />

      {/* Halfhour medians */}
      {halfhourLine.length ? (
        <LinesPanel
          title="Halfhour medians (00:00–09:30) by first sign"
          subtitle="pos vs neg"
          data={halfhourLine}
          keys={[
            { key: "pos", name: "First-sign +", color: COL_NORM },
            { key: "neg", name: "First-sign −", color: COL_NOT },
          ]}
          zeroLine
        />
      ) : null}

      {/* Quality (print/open checks) */}
      {quality ? (
        <Panel
          title="Quality"
          subtitle="Print/Open checks + how clean your normalization looks"
          right={
            typeof quality?.print_vs_peak?.rating === "number" ? (
              <div className="text-sm text-white/80">
                rating:{" "}
                <span className="font-semibold text-white">{fmtNum(quality.print_vs_peak.rating, 2)}</span>
              </div>
            ) : null
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <div className="text-sm font-semibold text-white mb-2">Print check</div>
              <div className="space-y-2 text-sm text-white/70">
                <div className="flex justify-between">
                  <span>events</span>
                  <span className="text-white">{quality?.print_check?.events_total ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>print_norm</span>
                  <span className="text-white">{quality?.print_check?.print_norm ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>bad_print</span>
                  <span className="text-white">{quality?.print_check?.bad_print ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>soft_print</span>
                  <span className="text-white">{quality?.print_check?.soft_print ?? "—"}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <div className="text-sm font-semibold text-white mb-2">Open check</div>
              <div className="space-y-2 text-sm text-white/70">
                <div className="flex justify-between">
                  <span>events_with_open</span>
                  <span className="text-white">{quality?.open_check?.events_with_open ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>open_soft</span>
                  <span className="text-white">{quality?.open_check?.open_soft ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>open_bad</span>
                  <span className="text-white">{quality?.open_check?.open_bad ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>open_norm</span>
                  <span className="text-white">{quality?.open_check?.open_norm ?? "—"}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <div className="text-sm font-semibold text-white mb-2">Summary</div>
              <div className="text-xs text-white/60 mb-2">Glob_rate (how often you normalize)</div>
              <Progress value01={Math.max(0, Math.min(1, numOrNull(data?.stats?.Glob_rate) ?? 0))} />
              <div className="mt-2 text-xs text-white/60">
                Best norm window:
                <span className="text-white/80"> {data?.stats?.Best_norm_window ?? "—"}</span>
              </div>
            </div>
          </div>
        </Panel>
      ) : null}

      {/* Recent table */}
      <Panel
        title="Recent (last 10 prints)"
        subtitle="Quick glance at deviations around print"
        right={last10Devs.length ? <MiniBars values={last10Devs} /> : undefined}
      >
        {last10.length ? (
          <div className="overflow-auto">
            <table className="min-w-[720px] w-full text-sm">
              <thead>
                <tr className="text-white/60">
                  <th className="py-2 text-left font-medium">dt</th>
                  <th className="py-2 text-right font-medium">dev</th>
                  <th className="py-2 text-right font-medium">peak</th>
                </tr>
              </thead>
              <tbody>
                {last10.map((x, i) => {
                  const dev = x.dev;
                  const pos = typeof dev === "number" ? dev >= 0 : true;
                  return (
                    <tr key={i} className="border-t border-white/10">
                      <td className="py-2 text-white/80">{fmtDt(x.dt)}</td>
                      <td className={`py-2 text-right font-semibold ${pos ? "text-emerald-300" : "text-rose-300"}`}>
                        {dev == null ? "—" : fmtNum(dev, 3)}
                      </td>
                      <td className="py-2 text-right text-white/80">
                        {x.peak == null ? "—" : fmtNum(x.peak, 3)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-white/60">No recent data</div>
        )}
      </Panel>

      {/* Timeline chart (print + peak if exists) */}
      {timelineData.length ? (
        <LinesPanel
          title="Timeline (last 10 prints)"
          subtitle="Print dev + Peak if available"
          data={timelineData}
          keys={[
            { key: "print", name: "Print dev", color: COL_NORM },
            ...(timelineData.some((r) => r.peak != null) ? [{ key: "peak", name: "Peak", color: COL_EV }] : []),
          ]}
          zeroLine
        />
      ) : null}

      {/* Intraday overlay */}
      {intraday?.rows?.length ? (
        <LinesPanel
          title="Intraday 09:30–09:40 (overlay last 5 days)"
          subtitle="Each line is one day"
          data={intraday.rows}
          keys={intraday.series.map((s: any, i: number) => ({
            key: `s${i}`,
            name: s.date,
            color: i % 2 === 0 ? "rgba(147, 197, 253, 0.9)" : "rgba(250, 204, 21, 0.9)",
          }))}
          zeroLine
        />
      ) : null}

      {/* Extra data: best_params */}
      <KeyValueTable
        title="Best params"
        subtitle="All parameters used for best fit (debug + useful)"
        rows={bestParamsRows}
        right={bestParamsRows.length ? <CopyButton text={JSON.stringify(data?.best_params, null, 2)} /> : undefined}
      />

      {/* Extra data: stats */}
      <KeyValueTable
        title="Stats (all)"
        subtitle="Everything from data.stats (so nothing is lost)"
        rows={statsRows}
        right={statsRows.length ? <CopyButton text={JSON.stringify(data?.stats, null, 2)} /> : undefined}
      />

      {/* Extra data: time best ranges */}
      <KeyValueTable
        title="Time best norm ranges"
        subtitle="stats.time_best_norm_ranges / ranges2 if present"
        rows={timeRanges}
        right={timeRanges.length ? <CopyButton text={JSON.stringify({ a: data?.stats?.time_best_norm_ranges, b: data?.stats?.time_best_norm_ranges2 }, null, 2)} /> : undefined}
      />

      {/* Other data we didn't explicitly use */}
      {otherData ? (
        <Panel
          title="Other data (unused keys)"
          subtitle="Everything not rendered above (so we don’t miss any fields)"
          right={<CopyButton text={JSON.stringify(otherData, null, 2)} />}
        >
          <CodeBox value={otherData} />
        </Panel>
      ) : null}

      {/* Raw JSON */}
      <Panel
        title="Raw JSON"
        subtitle="Full item payload (debug)"
        right={<CopyButton text={JSON.stringify(data, null, 2)} />}
      >
        <CodeBox value={data} />
      </Panel>
    </div>
  );
}

/** Also export named for convenience (optional) */
export { ArbitrageTickerStats };
