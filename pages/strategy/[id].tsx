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
  LabelList, // ⬅️ додано для підписів у Risk/Profit
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

/* css var helper (залишаю, але більше не використовуємо для кольорів графіків) */
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

  const topTrades = useMemo(() => {
    if (!trades.length) return { winners: [] as Trade[], losers: [] as Trade[] };

    const normalized = trades
      .map((t) => ({ ...t, _res: Number(t.result ?? 0) }))
      .filter((t) => Number.isFinite(t._res) && t._res !== 0);

    const winners = [...normalized]
      .filter((t) => t._res > 0)
      .sort((a, b) => b._res - a._res)
      .slice(0, 5) as Trade[];

    const losers = [...normalized]
      .filter((t) => t._res < 0)
      .sort((a, b) => a._res - b._res)
      .slice(0, 5) as Trade[];

    return { winners, losers };
  }, [trades]);

  // ОДИН ГОРИЗОНТАЛЬНИЙ РЯД: спочатку 3 кращі (green), потім 3 гірші (red)
  const topRow = useMemo(
    () =>
      [
        ...topTrades.winners.map((t) => ({ ...t, _kind: "win" as const })),
        ...topTrades.losers.map((t) => ({ ...t, _kind: "loss" as const })),
      ],
    [topTrades.winners, topTrades.losers]
  );

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

  /* CHART VARS — тепер це прямі CSS var, щоб теми підхоплювались миттєво */
  const chartVars = {
    line: "var(--chart-line)",
    dot: "var(--chart-dot)",
    grid: "var(--chart-grid)",
    win: "var(--chart-win)",
    loss: "var(--chart-loss)",
    legend: "var(--chart-legend)",
    tbg: "var(--chart-tooltip-bg)",
    tbd: "var(--chart-tooltip-border)",
  } as const;

  const tooltipStyle: React.CSSProperties = {
    background: chartVars.tbg,
    border: `1px solid ${chartVars.tbd}`,
    borderRadius: 12,
    color: "var(--fg)",
  };

  /* ---------- Risk/Profit data (для графіка) ---------- */
  const rp = useMemo(() => ({
    win: Math.max(0, stats.avgWinTrade),
    lossAbs: Math.max(0, stats.avgLossTradeAbs),
    ratio: stats.riskProfitRatio,
  }), [stats.avgWinTrade, stats.avgLossTradeAbs, stats.riskProfitRatio]);

  const rpBars = useMemo(
    () => [
      { name: "Avg Win", value: rp.win, kind: "win" as const },
      { name: "Avg Loss", value: rp.lossAbs, kind: "loss" as const },
    ],
    [rp.win, rp.lossAbs]
  );

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
      <section className="max-w-7xl mx-auto px-5 mt-6 tt-grid  gap-6">
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
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ color: "var(--chart-legend)", fontSize: 12, paddingTop: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </section>

      {/* CHARTS */}
      <section className="max-w-7xl mx-auto px-5 mt-6 tt-grid lg:grid-cols-3 gap-6">
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
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ color: "var(--chart-legend)", fontSize: 12, paddingTop: 6 }}
              />
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
                      fill="var(--donut-center, var(--fg))"
                    >
                      <tspan style={{ fontSize: "32px", fontWeight: 600 }}>
                        {stats.winRate.toFixed(0)}%
                      </tspan>
                    </text>
                  )}
                />
              </Pie>
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ color: "var(--chart-legend)", fontSize: 12, paddingTop: 6 }}
              />
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* 🔥 Risk/Profit (Avg Win vs Avg Loss) */}
        <Card title={`Співвідношення Risk/Profit`}>
          <ResponsiveContainer width="100%" height={230} key={`rp-${theme}`}>
            <BarChart
              data={rpBars}
              layout="vertical"
              margin={{ top: 12, right: 20, bottom: 12, left: 12 }}
              barCategoryGap={32}
            >
              <defs>
                {/* Градієнти беруть колір із теми */}
                <linearGradient id={gid("rp-win")} x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="color-mix(in oklab, var(--chart-win) 10%, transparent)" />
                  <stop offset="35%" stopColor="color-mix(in oklab, var(--chart-win) 40%, transparent)" />
                  <stop offset="100%" stopColor="var(--chart-win)" />
                </linearGradient>
                <linearGradient id={gid("rp-loss")} x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="color-mix(in oklab, var(--chart-loss) 10%, transparent)" />
                  <stop offset="35%" stopColor="color-mix(in oklab, var(--chart-loss) 40%, transparent)" />
                  <stop offset="100%" stopColor="var(--chart-loss)" />
                </linearGradient>
              </defs>

              <XAxis type="number" hide domain={[0, "dataMax"]} />
              <YAxis type="category" dataKey="name" hide />
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />

              <Tooltip
                cursor={{ fill: "transparent" }}
                contentStyle={{
                  background: "var(--chart-tooltip-bg)",
                  border: `1px solid var(--chart-tooltip-border)`,
                  borderRadius: 12,
                  color: "var(--fg)",
                  boxShadow: "0 10px 28px rgba(0,0,0,.25)",
                  backdropFilter: "blur(8px)",
                }}
                formatter={(v: any) => [fmt(Number(v)), "Середнє значення"]}
              />

              <Bar
                dataKey="value"
                radius={[14, 14, 14, 14]}
                barSize={58}
                isAnimationActive
              >
                {rpBars.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.kind === "win" ? `url(#${gid("rp-win")})` : `url(#${gid("rp-loss")})`}
                  />
                ))}

                {/* назва у центрі стовпчика */}
                <LabelList
                  dataKey="name"
                  position="center"
                  content={(props: any) => {
                    const { x, y, width, height, value } = props;
                    if (!x || !y) return null;
                    return (
                      <text
                        x={x + width / 2}
                        y={y + height / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                        style={{
                          fill: "rgba(255,255,255,.92)",
                          fontWeight: 700,
                          fontSize: 14,
                          letterSpacing: "-0.01em",
                          filter: "drop-shadow(0 0 6px rgba(0,0,0,.35))",
                        }}
                      >
                        {String(value)}
                      </text>
                    );
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

      </section>

{/* TOP WIN / LOSS */}
<section className="max-w-7xl mx-auto px-5 mt-6">
  <Card title="Топ-5 трейдів">
    <div className="topGrid">
      {/* Winners */}
      <div className="subcard">
        <div className="subhead win">Кращі</div>
        <ul className="list">
          {topTrades.winners.length ? (
            topTrades.winners.map((t) => (
              <li key={`w-${t.id}`} className="row winRow">
                <div className="info">
                  <div className="ticker">{t.ticker}</div>
                  <div className="date">{t.trade_date.slice(0, 10)}</div>
                </div>
                <div className="value winValue">{fmt(Number(t.result ?? 0))}</div>
              </li>
            ))
          ) : (
            <div className="empty">Немає позитивних трейдів</div>
          )}
        </ul>
      </div>

      {/* Losers */}
      <div className="subcard">
        <div className="subhead loss">Гірші</div>
        <ul className="list">
          {topTrades.losers.length ? (
            topTrades.losers.map((t) => (
              <li key={`l-${t.id}`} className="row lossRow">
                <div className="info">
                  <div className="ticker">{t.ticker}</div>
                  <div className="date">{t.trade_date.slice(0, 10)}</div>
                </div>
                <div className="value lossValue">{fmt(Number(t.result ?? 0))}</div>
              </li>
            ))
          ) : (
            <div className="empty">Немає від’ємних трейдів</div>
          )}
        </ul>
      </div>
    </div>

    <style jsx>{`
      .topGrid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 20px;
      }
      @media (min-width: 768px) {
        .topGrid {
          grid-template-columns: 1fr 1fr;
        }
      }

      .subcard {
        background: color-mix(in oklab, var(--card-bg) 90%, transparent);
        border: 1px solid var(--card-ring);
        border-radius: 20px;
        padding: 16px 20px;
        box-shadow: 0 6px 22px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      .subhead {
        font-weight: 700;
        margin-bottom: 10px;
        padding: 4px 10px;
        border-radius: 999px;
        width: fit-content;
        font-size: 0.85rem;
      }

      .subhead.win {
        background: color-mix(in oklab, var(--chart-win) 15%, transparent);
        color: color-mix(in oklab, var(--chart-win) 85%, white);
      }
      .subhead.loss {
        background: color-mix(in oklab, var(--chart-loss) 15%, transparent);
        color: color-mix(in oklab, var(--chart-loss) 85%, white);
      }

      .list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-radius: 14px;
        border: 1px solid var(--card-ring);
        background: color-mix(in oklab, var(--card-bg) 90%, transparent);
        transition: all 0.2s ease;
      }

      .row:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 18px rgba(0, 0, 0, 0.2);
        border-color: color-mix(in oklab, var(--color-primary) 25%, var(--card-ring));
      }

      .info {
        display: flex;
        flex-direction: column;
      }

      .ticker {
        font-weight: 700;
        font-size: 0.95rem;
      }
      .date {
        font-size: 0.8rem;
        opacity: 0.7;
      }

      .value {
        padding: 6px 12px;
        border-radius: 999px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        color: #fff;
        font-size: 0.9rem;
        box-shadow: inset 0 0 2px rgba(255, 255, 255, 0.2);
      }

      .winValue {
        background: linear-gradient(
          to bottom,
          color-mix(in oklab, var(--chart-win) 85%, transparent),
          color-mix(in oklab, var(--chart-win) 65%, transparent)
        );
      }

      .lossValue {
        background: linear-gradient(
          to bottom,
          color-mix(in oklab, var(--chart-loss) 85%, transparent),
          color-mix(in oklab, var(--chart-loss) 65%, transparent)
        );
      }

      .empty {
        opacity: 0.6;
        font-size: 0.9rem;
        padding: 10px;
      }
    `}</style>
  </Card>
</section>


{/* ADD FORM */}
<section className="max-w-7xl mx-auto px-5 mt-8">
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.35 }}
    className="rounded-3xl p-6 surface"
  >
    <h3 className="text-lg font-semibold mb-4">Додати запис</h3>

    <form onSubmit={onAdd}
      className="
        grid gap-3
        grid-cols-[200px_160px_1fr_auto]
        md:grid-cols-[240px_180px_1fr_auto]
        auto-rows-[42px]
      "
    >
      {/* Ряд 1 */}
      <Input
        name="ticker"
        placeholder="Тікер"
        required
        className="inp col-[1/2] row-[1/2]"
        onInput={(e:any)=>{e.currentTarget.value=
          String(e.currentTarget.value).toUpperCase().replace(/[^A-Z.]/g,'');}}
      />
      <Input
        name="trade_date"
        type="date"
        required
        defaultValue={new Date().toISOString().slice(0,10)}
        className="inp col-[2/3] row-[1/2]"
      />

      {/* Ряд 2 */}
      <div className="relWrap col-[1/2] row-[2/3]">
        <span className="prefix">$</span>
        <Input
          name="entry_amount"
          placeholder="Сума входу"
          inputMode="decimal"
          className="inp withPrefix"
        />
      </div>

      <div className="relWrap col-[2/3] row-[2/3]">
        <span className="prefix">$</span>
        <Input
          name="result"
          placeholder="Сума результату"
          inputMode="decimal"
          className="inp withPrefix"
        />
      </div>

      <Input
        name="screenshot_url"
        placeholder="URL скріншоту (необов'язково)"
        className="inp col-[3/4] row-[2/3]"
      />

      <input type="hidden" name="strategy_id" value={strategy.id} />

      <button className="tt-btn pretty col-[4/5] row-[2/3] px-6" disabled={busy}>
        {busy ? "Збереження…" : "Зберегти"}
      </button>
    </form>

    <style jsx>{`
      :global(.inp){
        width:100%; height:42px; padding:8px 12px;
        border:1px solid var(--card-ring); border-radius:12px;
        background:var(--card-bg); color:var(--fg);
        transition:box-shadow .15s ease, border-color .15s ease;
      }
      :global(.inp:focus){
        border-color:color-mix(in oklab, var(--color-primary) 55%, var(--card-ring));
        box-shadow:0 0 0 3px color-mix(in oklab, var(--color-primary) 18%, transparent);
        outline:none;
      }
      .relWrap{position:relative}
      .prefix{
        position:absolute; left:10px; top:50%; transform:translateY(-50%);
        font-weight:700; opacity:.75
      }
      :global(.withPrefix){padding-left:26px}
      :global(.tt-btn.pretty){
        height:42px; border-radius:12px; font-weight:800;
        background:linear-gradient(
          180deg,
          color-mix(in oklab, var(--color-primary) 88%, transparent),
          color-mix(in oklab, var(--color-primary) 68%, transparent)
        );
        border:1px solid color-mix(in oklab, var(--color-primary) 60%, var(--card-ring));
        color:#fff; box-shadow:0 6px 18px rgba(0,0,0,.18);
        transition:transform .12s ease, filter .12s ease, box-shadow .12s ease;
      }
      :global(.tt-btn.pretty:hover){
        transform:translateY(-1px);
        filter:brightness(1.05);
        box-shadow:0 10px 22px rgba(0,0,0,.22);
      }

      /* Адаптив: на вузьких — 2 колонки */
      @media (max-width: 860px){
        form{
          grid-template-columns: 1fr 1fr !important;
          grid-auto-rows: 42px;
        }
        /* Ряд 1: тікер + дата */
        :global(input[name="ticker"]){grid-column:1/2; grid-row:1/2;}
        :global(input[name="trade_date"]){grid-column:2/3; grid-row:1/2;}
        /* Ряд 2: суми */
        .relWrap:nth-of-type(1){grid-column:1/2; grid-row:2/3;}
        .relWrap:nth-of-type(2){grid-column:2/3; grid-row:2/3;}
        /* Ряд 3: URL + кнопка */
        :global(input[name="screenshot_url"]){grid-column:1/3; grid-row:3/4;}
        :global(.tt-btn.pretty){grid-column:2/3; grid-row:4/5; justify-self:end;}
      }
    `}</style>
  </motion.div>
</section>


{/* RECENT LIST */}
<section className="max-w-7xl mx-auto px-5 mt-6 mb-14">
  <Card title="Останні записи" className="p-0">
    <ul className="rlist">
      {trades.map((t) => {
        const res = Number(t.result ?? 0);
        const isWin = res >= 0;
        return (
          <li key={t.id} className="row">
            {/* left: main info */}
            <div className="main">
              <span className={`pill ${isWin ? "pillWin" : "pillLoss"}`}>
                {t.ticker}
              </span>

              <div className="meta">
                <span className="date">{fmtDate(t.trade_date)}</span>
                <span className="sep">•</span>
                <span className="entry">
                  Вхід:{" "}
                  <b>{t.entry_amount == null ? "—" : fmt(Number(t.entry_amount))}</b>
                </span>
              </div>
            </div>

            {/* right: value + actions */}
            <div className="right">
              <span className={`res ${isWin ? "win" : "loss"}`}>
                {fmt(res)}
              </span>

              <div className="actions">
                {t.screenshot_url ? (
                  <a
                    className="btnGhost"
                    target="_blank"
                    href={t.screenshot_url}
                    rel="noreferrer"
                    title="Переглянути скрін"
                  >
                    🔗
                  </a>
                ) : null}

                <button
                  className="btnDanger"
                  onClick={async () => {
                    await fetch(`/api/trades/${t.id}`, { method: "DELETE" });
                    const res = await fetch(`/api/trades?strategy_id=${strategy.id}`);
                    setTrades(await res.json());
                  }}
                  title="Видалити запис"
                >
                  ✕
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  </Card>

  <style jsx>{`
    .rlist {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 10px;
    }

    .row {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      border-radius: 16px;
      background:
        linear-gradient(
          180deg,
          color-mix(in oklab, var(--card-bg) 94%, transparent) 0%,
          color-mix(in oklab, var(--card-bg) 88%, transparent) 100%
        );
      border: 1px solid var(--card-ring);
      transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
    }
    .row:hover {
      transform: translateY(-2px);
      border-color: color-mix(in oklab, var(--color-primary) 30%, var(--card-ring));
      box-shadow: 0 10px 26px rgba(0,0,0,.22);
    }

    .main {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .pill {
      font-weight: 800;
      letter-spacing: .3px;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: .9rem;
      color: #fff;
      box-shadow: inset 0 0 1px rgba(255,255,255,.25), 0 6px 14px rgba(0,0,0,.18);
      white-space: nowrap;
    }
    .pillWin {
      background: linear-gradient(
        to bottom,
        color-mix(in oklab, var(--chart-win) 92%, transparent),
        color-mix(in oklab, var(--chart-win) 68%, transparent)
      );
    }
    .pillLoss {
      background: linear-gradient(
        to bottom,
        color-mix(in oklab, var(--chart-loss) 92%, transparent),
        color-mix(in oklab, var(--chart-loss) 68%, transparent)
      );
    }

    .meta {
      display: flex;
      align-items: center;
      gap: 8px;
      opacity: .8;
      font-size: .92rem;
      min-width: 0;
      color: var(--fg);
    }
    .date { font-variant-numeric: tabular-nums; }
    .sep  { opacity: .6; }

    .right {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .res {
      padding: 6px 12px;
      border-radius: 12px;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      color: #fff;
      min-width: 92px;
      text-align: right;
      box-shadow: inset 0 0 2px rgba(255,255,255,.25);
    }
    .win {
      background: linear-gradient(
        180deg,
        color-mix(in oklab, var(--chart-win) 88%, transparent) 0%,
        color-mix(in oklab, var(--chart-win) 62%, transparent) 100%
      );
    }
    .loss {
      background: linear-gradient(
        180deg,
        color-mix(in oklab, var(--chart-loss) 88%, transparent) 0%,
        color-mix(in oklab, var(--chart-loss) 62%, transparent) 100%
      );
    }

    .actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btnGhost, .btnDanger {
      height: 34px;
      width: 34px;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      border: 1px solid var(--card-ring);
      background: color-mix(in oklab, var(--card-bg) 85%, transparent);
      color: var(--fg);
      transition: all .2s ease;
      cursor: pointer;
      text-decoration: none;
      font-size: 16px;
    }
    .btnGhost:hover {
      border-color: color-mix(in oklab, var(--color-primary) 35%, var(--card-ring));
      box-shadow: 0 6px 16px rgba(0,0,0,.18);
    }
    .btnDanger {
      color: #fff;
      background: linear-gradient(
        180deg,
        color-mix(in oklab, var(--chart-loss) 85%, transparent),
        color-mix(in oklab, var(--chart-loss) 60%, transparent)
      );
      border-color: color-mix(in oklab, var(--chart-loss) 45%, var(--card-ring));
    }
    .btnDanger:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 18px rgba(0,0,0,.2);
    }

    @media (max-width: 560px) {
      .row {
        grid-template-columns: 1fr;
        gap: 8px;
      }
      .right {
        justify-content: space-between;
      }
      .res { min-width: 0; }
    }
  `}</style>
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
  const num =
    typeof value === "number" ? value : Number(String(value).replace(/[^\d.-]/g, ""));
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
      style={{
        boxShadow: "0 6px 24px rgba(0,0,0,.15)",
      }}
    >
      <div className="text-sm opacity-75">{title}</div>
      {/* більш виразне значення */}
      <div
        className="mt-1 tracking-tight"
        style={{
          color,
          fontSize: "clamp(28px, 4vw, 30px)",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
          fontVariantNumeric: "tabular-nums lining-nums",
          textShadow: "0 1px 0 rgba(0,0,0,.12)",
        }}
      >
        {value}
      </div>
      {sub ? (
        <div
          className="mt-2"
          style={{
            fontSize: 12,
            opacity: 0.75,
          }}
        >
          {sub}
        </div>
      ) : null}
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
function fmtDate(s: string) {
  const d = new Date(s);
  return isNaN(d.getTime()) ? String(s).slice(0, 10) : d.toISOString().slice(0, 10);
}
