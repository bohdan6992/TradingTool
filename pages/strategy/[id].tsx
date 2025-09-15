import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
  PieChart,
  Pie,
  Legend,
  Label,
} from "recharts";
import { useUi } from "@/components/UiProvider";
import { useGradIds } from "@/hooks/useGradIds";

/* ============================= types ============================= */
type Strategy = {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
};
type Trade = {
  id: number;
  strategy_id: number;
  ticker: string;
  trade_date: string;
  entry_amount: number | null;
  result: number | null;
  screenshot_url: string | null;
};

/* css var helper */
function cssVar(name: string) {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export default function StrategyPage() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const { theme } = useUi();
  const gid = useGradIds("strategy");

  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const s = await fetch(`/api/strategies/${id}`).then((r) => r.json());
      setStrategy(s);
      const t = await fetch(`/api/trades?strategy_id=${id}`).then((r) => r.json());
      setTrades(t);
    })();
  }, [id]);

  /* equity */
  const equityData = useMemo(() => {
    const sorted = [...trades].sort(
      (a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
    );
    let acc = 0;
    return sorted.map((t) => {
      const res = Number(t.result ?? 0);
      acc += res;
      return { date: new Date(t.trade_date).toISOString(), equity: acc };
    });
  }, [trades]);

  /* stats */
  const stats = useMemo(() => {
    if (!trades.length) {
      return {
        count: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        sum: 0,
        avgTrade: 0,
        avgDay: 0,
        bestDay: 0,
        worstDay: 0,
        avgWinTrade: 0,
        avgLossTradeAbs: 0,
        riskProfitRatio: 0,
        winLossRatio: 0,
        avgPosDay: 0,
        avgNegDay: 0,
      };
    }
    const res = trades.map((t) => Number(t.result ?? 0));
    const sum = res.reduce((a, b) => a + b, 0);
    const count = res.length;
    const wins = res.filter((x) => x > 0).length;
    const losses = res.filter((x) => x < 0).length;
    const winRate = count ? (wins / count) * 100 : 0;

    const pos = res.filter((x) => x > 0);
    const neg = res.filter((x) => x < 0);
    const avgWinTrade = pos.length ? pos.reduce((a, b) => a + b, 0) / pos.length : 0;
    const avgLossTradeAbs = neg.length
      ? Math.abs(neg.reduce((a, b) => a + b, 0) / neg.length)
      : 0;
    const riskProfitRatio = avgLossTradeAbs ? avgWinTrade / avgLossTradeAbs : 0;
    const winLossRatio = losses ? wins / losses : wins ? wins : 0;

    const dayMap = new Map<string, number>();
    for (const t of trades) {
      const d = new Date(t.trade_date);
      const key = isNaN(d.getTime())
        ? String(t.trade_date).slice(0, 10)
        : d.toISOString().slice(0, 10);
      dayMap.set(key, (dayMap.get(key) ?? 0) + Number(t.result ?? 0));
    }
    const dayPnls = [...dayMap.values()];
    const avgDay = dayPnls.length
      ? dayPnls.reduce((a, b) => a + b, 0) / dayPnls.length
      : 0;
    const bestDay = dayPnls.length ? Math.max(...dayPnls) : 0;
    const worstDay = dayPnls.length ? Math.min(...dayPnls) : 0;
    const posDays = dayPnls.filter((v) => v > 0);
    const negDays = dayPnls.filter((v) => v < 0);
    const avgPosDay = posDays.length ? posDays.reduce((a, b) => a + b, 0) / posDays.length : 0;
    const avgNegDay = negDays.length ? negDays.reduce((a, b) => a + b, 0) / negDays.length : 0;

    return {
      count,
      wins,
      losses,
      winRate,
      sum,
      avgTrade: count ? sum / count : 0,
      avgDay,
      bestDay,
      worstDay,
      avgWinTrade,
      avgLossTradeAbs,
      riskProfitRatio,
      winLossRatio,
      avgPosDay,
      avgNegDay,
    };
  }, [trades]);

  const pieData = useMemo(
    () => [
      { name: "Win", value: stats.wins },
      { name: "Loss", value: stats.losses },
    ],
    [stats.wins, stats.losses]
  );

  const barData = useMemo(
    () => trades.map((t) => ({ ...t, result: Number(t.result ?? 0) })),
    [trades]
  );

  /* CHART VARS from theme */
  const chartVars = useMemo(
    () => ({
      line: cssVar("--chart-line") || "#60a5fa",
      dot: cssVar("--chart-dot") || "#93c5fd",
      grid: cssVar("--chart-grid") || "rgba(148,163,184,.18)",
      win: cssVar("--chart-win") || "#34d399",
      loss: cssVar("--chart-loss") || "#fb7185",
      legend: cssVar("--chart-legend") || "#a8b1c5",
      tbg: cssVar("--chart-tooltip-bg") || "rgba(15,23,42,.92)",
      tbd: cssVar("--chart-tooltip-border") || "rgba(255,255,255,.10)",
    }),
    [theme]
  );

  const tooltipStyle: React.CSSProperties = {
    background: chartVars.tbg,
    border: `1px solid ${chartVars.tbd}`,
    borderRadius: 12,
    color: "var(--fg)",
  };

  async function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id) return;
    setBusy(true);
    try {
      const fd = new FormData(e.currentTarget);
      const payload = {
        strategy_id: Number(id),
        ticker: String(fd.get("ticker") || "").toUpperCase(),
        trade_date: String(fd.get("trade_date") || ""),
        entry_amount: fd.get("entry_amount") ? Number(fd.get("entry_amount")) : null,
        result: fd.get("result") ? Number(fd.get("result")) : null,
        screenshot_url: String(fd.get("screenshot_url") || "") || null,
      };
      const res = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert("Помилка збереження: " + (err.error || res.statusText));
        return;
      }
      (e.target as HTMLFormElement).reset();
      const t = await fetch(`/api/trades?strategy_id=${id}`).then((r) => r.json());
      setTrades(t);
    } finally {
      setBusy(false);
    }
  }

  if (!strategy) {
    return (
      <div className="min-h-screen text-center flex items-center justify-center">
        Завантаження…
      </div>
    );
  }

  return (
    <div className="min-h-screen selection:bg-cyan-400/20">
      {/* HERO */}
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              radial-gradient(1400px 600px at 10% -10%, color-mix(in oklab, var(--color-primary) 18%, transparent), transparent),
              radial-gradient(900px 480px at 85% 0%, color-mix(in oklab, var(--color-primary) 10%, transparent), transparent)
            `,
            opacity: 0.8,
            maskImage: "linear-gradient(to bottom, rgba(0,0,0,.9), rgba(0,0,0,.2))",
          }}
        />

        <section className="relative max-w-7xl mx-auto px-5 py-10">
          <div className="surface rounded-3xl p-7" style={{ backdropFilter: "blur(6px)" }}>
            <h1 className="text-4xl font-extrabold tracking-tight">{strategy.name}</h1>
            <p className="text-[color:var(--muted)] mt-2 max-w-3xl">{strategy.description}</p>
          </div>
        </section>
      </div>

      {/* STATS STRIP */}
      <section className="max-w-7xl mx-auto px-5 mt-6 tt-grid sm:grid-cols-2 xl:grid-cols-7 gap-5">
        <StatTile title="Win / Loss" value={`${stats.wins} / ${stats.losses}`} sub={`${stats.winRate.toFixed(1)}% winrate`} />
        <StatTile title="W/L Ratio" value={fmtRatio(stats.winLossRatio)} sub="вигр./збитк. (шт.)" />
        <StatTile title="Risk/Profit" value={fmtRatio(stats.riskProfitRatio)} sub="серед. профіт / втрата" />
        <StatTile title="Сумарний P&L" value={fmt(stats.sum)} colored />
        <StatTile title="Сер. за день" value={fmt(stats.avgDay)} colored />
        <StatTile title="Сер. + день" value={fmt(stats.avgPosDay)} colored />
        <StatTile title="Сер. − день" value={fmt(stats.avgNegDay)} colored />
      </section>

      {/* CHARTS */}
      <section className="max-w-7xl mx-auto px-5 mt-6 tt-grid lg:grid-cols-3 gap-6">
        {/* Equity */}
        <Card title="Динаміка результатів">
          <ResponsiveContainer width="100%" height={280} key={`line-${theme}`}>
            <LineChart data={equityData}>
              <defs>
                <linearGradient id={gid("line")} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={chartVars.line} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={chartVars.line} stopOpacity={0.35} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartVars.grid} />
              <XAxis dataKey="date" hide />
              <YAxis />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={0} stroke={chartVars.grid} strokeDasharray="4 4" />
              <Line
                type="monotone"
                dataKey="equity"
                stroke={`url(#${gid("line")})`}
                strokeWidth={3}
                dot={{ r: 3, stroke: chartVars.dot, fill: "var(--bg)" }}
                activeDot={{
                  r: 5,
                  stroke: chartVars.dot,
                  fill: "var(--bg)",
                  style: { filter: "drop-shadow(0 0 6px rgba(255,255,255,.18))" },
                }}
                isAnimationActive
              />
              <Legend verticalAlign="bottom" wrapperStyle={{ color: chartVars.legend, fontSize: 12, paddingTop: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Histogram */}
        <Card title="Розподіл результатів">
          <ResponsiveContainer width="100%" height={280} key={`bar-${theme}`}>
            <BarChart data={barData}>
              <defs>
                <linearGradient id={gid("win")} x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor={chartVars.win} stopOpacity={0.15} />
                  <stop offset="60%" stopColor={chartVars.win} stopOpacity={0.65} />
                  <stop offset="100%" stopColor={chartVars.win} stopOpacity={0.95} />
                </linearGradient>
                <linearGradient id={gid("loss")} x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor={chartVars.loss} stopOpacity={0.15} />
                  <stop offset="60%" stopColor={chartVars.loss} stopOpacity={0.65} />
                  <stop offset="100%" stopColor={chartVars.loss} stopOpacity={0.95} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartVars.grid} />
              <XAxis dataKey="trade_date" hide />
              <YAxis />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={0} stroke={chartVars.grid} strokeDasharray="4 4" />
              <Bar dataKey="result" radius={[8, 8, 0, 0]}>
                {barData.map((t) => (
                  <Cell key={t.id} fill={t.result >= 0 ? `url(#${gid("win")})` : `url(#${gid("loss")})`} />
                ))}
              </Bar>
              <Legend verticalAlign="bottom" wrapperStyle={{ color: chartVars.legend, fontSize: 12, paddingTop: 6 }} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Donut */}
        <Card title="Співвідношення Win / Loss">
          <ResponsiveContainer width="100%" height={280} key={`pie-${theme}`}>
            <PieChart>
              <defs>
                <linearGradient id={gid("pie-green")} x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor={chartVars.win} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={chartVars.win} stopOpacity={0.95} />
                </linearGradient>
                <linearGradient id={gid("pie-red")} x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor={chartVars.loss} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={chartVars.loss} stopOpacity={0.95} />
                </linearGradient>
              </defs>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={70}
                outerRadius={105}
                paddingAngle={3}
                isAnimationActive
              >
                <Cell fill={`url(#${gid("pie-green")})`} />
                <Cell fill={`url(#${gid("pie-red")})`} />
                <Label
                  position="center"
                  content={() => (
                    <text
                      x="50%"
                      y="50%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-white"
                    >
                      <tspan className="text-2xl font-semibold">{stats.winRate.toFixed(0)}%</tspan>
                      <tspan x="50%" dy="1.2em" className="text-xs opacity-70">
                        winrate
                      </tspan>
                    </text>
                  )}
                />
              </Pie>
              <Legend verticalAlign="bottom" wrapperStyle={{ color: chartVars.legend, fontSize: 12, paddingTop: 6 }} />
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </section>

      {/* ADD FORM */}
      <section className="max-w-7xl mx-auto px-5 mt-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl p-6 surface"
        >
          <h3 className="text-lg font-semibold mb-4">Додати запис</h3>
          <form onSubmit={onAdd} className="grid md:grid-cols-6 gap-3">
            <Input name="ticker" placeholder="Тікер" required />
            <Input name="trade_date" type="date" required />
            <Input name="entry_amount" placeholder="Сума входу" inputMode="decimal" />
            <Input name="result" placeholder="Сума результату" inputMode="decimal" />
            <Input name="screenshot_url" placeholder="URL скріншоту (необов'язково)" className="md:col-span-2" />
            <input type="hidden" name="strategy_id" value={strategy.id} />
            <div className="md:col-span-6">
              <button className="tt-btn" disabled={busy}>
                Зберегти
              </button>
            </div>
          </form>
        </motion.div>
      </section>

      {/* RECENT LIST */}
      <section className="max-w-7xl mx-auto px-5 mt-6 mb-14">
        <Card title="Останні записи" className="p-0">
          <ul className="divide-y" style={{ borderColor: "var(--card-ring)" }}>
            {trades.map((t) => (
              <li
                key={t.id}
                className="p-4 flex items-center justify-between"
                style={{ background: "transparent" }}
              >
                <div className="text-sm">
                  <div className="font-medium tracking-wide">
                    {t.ticker} — {t.trade_date}
                  </div>
                  <div className="opacity-75">
                    Вхід: {t.entry_amount ?? "—"} | Результат:{" "}
                    <span style={{ color: (t.result ?? 0) >= 0 ? "var(--chart-win)" : "var(--chart-loss)" }}>
                      {fmt(t.result ?? 0)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {t.screenshot_url ? (
                    <a
                      className="underline"
                      style={{ color: "var(--color-primary)" }}
                      target="_blank"
                      href={t.screenshot_url}
                      rel="noreferrer"
                    >
                      скрін
                    </a>
                  ) : null}
                  <button
                    className="tt-btn"
                    onClick={async () => {
                      await fetch(`/api/trades/${t.id}`, { method: "DELETE" });
                      const res = await fetch(`/api/trades?strategy_id=${strategy.id}`);
                      setTrades(await res.json());
                    }}
                  >
                    Видалити
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}

/* ========= shared UI ========= */

function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className={`relative rounded-3xl p-6 overflow-hidden surface ${className}`}
    >
      <h3 className="relative text-lg font-semibold mb-3">{title}</h3>
      <div className="relative h-full">{children}</div>
    </motion.div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`px-3 py-2.5 rounded-2xl focus:outline-none focus:ring-2 placeholder:opacity-60 ${className}`}
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-ring)",
        color: "var(--fg)",
        outlineColor: "var(--color-primary)",
      }}
    />
  );
}

function StatTile({
  title,
  value,
  sub,
  colored = false,
}: {
  title: string;
  value: string | number;
  sub?: string;
  colored?: boolean;
}) {
  const num = typeof value === "number" ? value : Number(String(value).replace(/[^\d.-]/g, ""));
  const color =
    colored && !Number.isNaN(num)
      ? num > 0
        ? "var(--chart-win)"
        : num < 0
        ? "var(--chart-loss)"
        : "var(--fg)"
      : "var(--fg)";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35 }}
      className="rounded-3xl p-5 surface"
    >
      <div className="text-sm opacity-75">{title}</div>
      <div className="text-3xl font-semibold mt-1 tracking-tight" style={{ color }}>
        {value}
      </div>
      {sub ? <div className="text-xs opacity-75 mt-1">{sub}</div> : null}
    </motion.div>
  );
}

/* helpers */
function fmt(n: number) {
  const sign = n >= 0 ? "" : "-";
  const v = Math.abs(n);
  return `${sign}${v.toLocaleString("uk-UA", { maximumFractionDigits: 2 })}`;
}
function fmtRatio(n: number) {
  if (!isFinite(n) || n === 0) return "—";
  return `${n.toFixed(2)}×`;
}
