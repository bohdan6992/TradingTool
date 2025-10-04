import EconomicCalendar from "@/components/EconomicCalendar";

export default function CalendarPage() {
  return (
    <>
      <main className="page">
        <h1>Календар</h1>
        
        <section>
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
