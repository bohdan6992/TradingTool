import EconomicCalendar from "@/components/EconomicCalendar";
import EarningsCountdown from "@/components/EarningsCountdown";

export default function CalendarPage() {
  return (
    <>
      <main className="page">
        <h1>Календар</h1>
        
        <section>
                        <EarningsCountdown
        // варіант 1: через готовий бекенд
        // fetchUrl="/api/earnings/next?tickers=AAPL,MSFT,NVDA,META,AMZN,TSLA&limit=8"

        // варіант 2: нехай компонент сам сходить на /api/earnings/next
        tickers={["AAPL","MSFT","NVDA","META","AMZN","TSLA"]}
        limit={8}
        refreshMs={5 * 60 * 1000}
      />
          <EconomicCalendar
            height={520}
            locale="uk"
            importance={[2]}   // тільки важливі (High). Або [1,2] якщо хочеш Med+High
          />
        </section>
      </main>
    </>
  );
}
