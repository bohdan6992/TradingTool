// pages/signals/[strategy].tsx
"use client";

import { useRouter } from "next/router";
import Link from "next/link";
import { useEffect, useState } from "react";

import BridgeArbitrageSignals, {
  ArbitrageSignal,
} from "@/components/BridgeArbitrageSignals";

export default function StrategySignalsPage() {
  const { query } = useRouter();
  const strategy = String(query.strategy ?? "");

  const [signals, setSignals] = useState<ArbitrageSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!strategy) return;

    const load = async () => {
      try {
        setLoading(true);
        setErr(null);

        const r = await fetch(`http://localhost:5197/api/strategy/${strategy}/signals`);

        if (!r.ok) {
          setErr(`Помилка ${r.status}`);
          return;
        }
        const json = await r.json();

        // JSON payload:
        // {
        //   strategy: "ARBITRAGE",
        //   generatedAt: ...,
        //   items: [...]
        // }
        setSignals(json.items || []);
      } catch (e: any) {
        setErr(e?.message || "Помилка завантаження");
      } finally {
        setLoading(false);
      }
    };

    load();
    const t = setInterval(load, 2500); // авто-оновлення
    return () => clearInterval(t);
  }, [strategy]);

  return (
    <main className="page space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {strategy || "Стратегія"}
          </h1>
          <div className="small opacity-70">
            Живі ситуації за умовами цієї стратегії
          </div>
        </div>
        <Link href="/signals" className="btn">
          ← Усі стратегії
        </Link>
      </header>

      {/* Помилки */}
      {err && (
        <div className="text-red-500 text-sm font-semibold">
          {err}
        </div>
      )}

      {/* Контент */}
      {loading && signals.length === 0 ? (
        <div className="text-sm opacity-70">Завантаження…</div>
      ) : (
        <BridgeArbitrageSignals items={signals} />
      )}
    </main>
  );
}
