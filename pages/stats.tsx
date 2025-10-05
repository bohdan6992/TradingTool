import NewsBoard from "@/components/NewsBoard"; // шлях до твого компонента
// будь-де на сторінці (наприклад, pages/index.tsx)
import SocialFeedWidget from "@/components/SocialFeedWidget";



export default function StatsPage() {
  return (
    <>
      <main className="page">
        <h1>Новини</h1>
          <section>
            <SocialFeedWidget
              initialSource="twitter"
              initialQuery="AAPL NVDA SPY"
              limit={24}
              refreshMs={120000} // автооновлення кожні 2 хв
            />
          </section>

          <section>
          <NewsBoard/>
        </section>
      </main>
    </>
  );
}
