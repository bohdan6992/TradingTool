// pages/signals/[strategy].tsx
import { useRouter } from "next/router";
import Link from "next/link";
import BridgeQuotes from "@/components/BridgeQuotes";

export default function StrategySignalsPage() {
  const { query } = useRouter();
  const strategy = String(query.strategy ?? "");

  return (
    <main className="page space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{strategy || "Стратегія"}</h1>
          <div className="small opacity-70">Живі ситуації за умовами цієї стратегії</div>
        </div>
        <Link href="/signals" className="btn">← Усі стратегії</Link>
      </header>

      {/* TODO: коли буде фільтр, можна передати проп: <BridgeQuotes strategy={strategy} /> */}
      <BridgeQuotes />
    </main>
  );
}
