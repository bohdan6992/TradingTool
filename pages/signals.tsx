// pages/signals/index.tsx
import LiveStrategyTiles from "@/components/signals/LiveStrategyTiles";

export default function SignalsPage() {
  return (
    <main className="page space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Сигнали</h1>
        <span className="small opacity-70">Живі можливості просто зараз</span>
      </header>

      <LiveStrategyTiles />
    </main>
  );
}
