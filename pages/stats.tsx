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
                  initialQuery="AAPL OR NVDA OR SPY"
                  limit={24}
                  refreshMs={120000} // автооновлення кожні 2 хв
                  // необовʼязково: власний білдер url, якщо у тебе інші ендпоінти
                  // fetchUrlBuilder={(src, q, limit) => `/api/social/${src}?q=${encodeURIComponent(q)}&limit=${limit}`}
                />
              </section>
          <section>
          <NewsBoard/>
        </section>
      </main>
    </>
  );
}
