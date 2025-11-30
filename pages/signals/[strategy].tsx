// pages/signals/[strategy].tsx
"use client";

import { useRouter } from "next/router";
import Link from "next/link";
import BridgeArbitrageSignals from "@/components/BridgeArbitrageSignals";

export default function StrategySignalsPage() {
  const { query } = useRouter();
  const strategy = String(query.strategy ?? "");

  const strategyId = strategy.toLowerCase();
  const isArbitrage = strategyId === "arbitrage";

  const titleMap: Record<string, string> = {
    arbitrage: "Арбітраж",
  };

  const title =
    titleMap[strategyId] || (strategy || "Стратегія").toString();

  return (
    <main className="page space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <div className="small opacity-70">
            Живі ситуації за умовами цієї стратегії
          </div>
          {isArbitrage && (
            <div className="small opacity-60 mt-1">
              Тумблер зверху перемикає між{" "}
              <strong>топовими</strong> сетапами та{" "}
              <strong>усіма σ-ситуаціями</strong> з моста.
            </div>
          )}
        </div>
        <Link href="/signals" className="btn">
          ← Усі стратегії
        </Link>
      </header>

      {!isArbitrage && (
        <div className="text-sm opacity-70">
          Для стратегії <code>{strategy}</code> окрема вітрина сигналів
          ще не налаштована. Зараз реалізовано тільки для{" "}
          <code>arbitrage</code>.
        </div>
      )}

      {isArbitrage && <BridgeArbitrageSignals />}
    </main>
  );
}
