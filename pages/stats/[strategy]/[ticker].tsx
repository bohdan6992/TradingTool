// pages/stats/[strategy]/[ticker].tsx
import { useRouter } from "next/router";
import Link from "next/link";

// import ArbitrageTickerStats from "@/components/ArbitrageTickerStats"; // default export
import { ArbitrageTickerStats } from "@/components/ArbitrageTickerStats";

export default function TickerStatsPage() {
  const router = useRouter();

  const strategy = String(router.query.strategy ?? "").toLowerCase();
  const ticker = String(router.query.ticker ?? "");

  // поки router не готовий
  if (!router.isReady) return null;

  // можна обмежити лише arbitrage
  if (strategy !== "arbitrage") {
    return (
      <main className="page space-y-4">
        <h1 className="text-xl font-bold">Unsupported strategy</h1>
        <p className="opacity-70">Поки підтримується тільки arbitrage.</p>
        <Link href={`/stats/${strategy}`} className="btn small">
          ← Назад
        </Link>
      </main>
    );
  }

  const normTicker = decodeURIComponent(ticker).toUpperCase();

  return (
    <main className="page max-w-6xl mx-auto p-4 md:p-6 space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{normTicker}</h1>
          <p className="small opacity-70">
            Strategy: <code>{strategy}</code>
          </p>
        </div>

        <Link href={`/stats/${strategy}`} className="btn small">
          ← До списку
        </Link>
      </header>

      <ArbitrageTickerStats ticker={normTicker} />
    </main>
  );
}
