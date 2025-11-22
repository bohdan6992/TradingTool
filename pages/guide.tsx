import StrategySelect from "@/components/StrategySelect";
import TickerResearchPanel from "@/components/TickerResearchPanel";

export default function GuidePage() {
  return (
    <main className="page space-y-6">
      <h1>Довідник</h1>

      <StrategySelect />

      <section>
        <TickerResearchPanel />
      </section>
    </main>
  );
}
