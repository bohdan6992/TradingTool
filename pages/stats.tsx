import NewsBoard from "@/components/NewsBoard"; // шлях до твого компонента

export default function StatsPage() {
  return (
    <>
      <main className="page">
        <h1>Новини</h1>
          <section>
          <NewsBoard/>
        </section>
      </main>
    </>
  );
}
