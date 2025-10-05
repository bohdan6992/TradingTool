// pages/index.tsx
import { useEffect, useMemo, useState } from "react";

import QuarterCalendar from "@/components/QuarterCalendar";
import NYTopInfo from "@/components/NYTopInfo";
import EarningsTwoDays from "@/components/EarningsTwoDays";
import BenchmarksTable from "@/components/BenchmarksTable";
import SectorHeatmap from "@/components/SectorHeatmap";
import NewsSentimentBadge from "@/components/NewsSentimentBadge";
import BenchmarksStrip from "@/components/BenchmarksStrip";
import TopMoversWidget from "@/components/TopMoversWidget";

// pages/index.tsx (будь-де)
import dynamic from "next/dynamic";
const MarketMood = dynamic(() => import("@/components/MarketMood"), { ssr:false });

type NewsItem = {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  source: string;
  categories?: string[];
};

type EventItem = {
  id: string;
  title: string;
  date: string;
  time?: string;
  ticker?: string;
  tags?: string[];
  rank?: "S" | "A" | "B" | "F" | "N";
  note?: string;
  link?: string;
};

export default function Home() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/news/investing?limit=40");
        const data = await r.json();
        setNews(data.items || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingNews(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/events");
        const data = await r.json();
        setEvents(data.items || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingEvents(false);
      }
    })();
  }, []);

  const tickerItems = useMemo(() => {
    const top = news.slice(0, 12);
    return [...top, ...top];
  }, [news]);

  return (
    <div>
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* ====== ГОДИННИК NY + ЦЬОГО ДНЯ ====== */}
        <section><NYTopInfo /></section>

        {/* ====== БЕНЧМАРКИ ПІД ГОДИННИКОМ ====== */}
        <section>
          <BenchmarksStrip />
          {/* Якщо хочеш ще й табличний вигляд:
          <div className="mt-4"><BenchmarksTable /></div> */}
        </section>

        {/* === SECTOR HEATMAP === */}
        <section>
          <SectorHeatmap
            height={460}
            locale="uk"
            defaultDataSource="SPX500"
            defaultGrouping="sector"
            defaultSizeBy="market_cap_basic"
            defaultColorBy="change"
            tooltip
          />
        </section>

          <TopMoversWidget
          universe="AAPL,MSFT,TSLA,NVDA,QQQ,SPY,AMD,META,NFLX,GOOGL"
          limit={5}
          refreshMs={60000}
        />
                <section className="mt-4">
          <BenchmarksTable />
        </section>

        <section>
          <NewsSentimentBadge
            fetchUrl="/api/news/investing?limit=60"
            refreshMs={120000}
          />
        </section>
              <MarketMood fetchUrl="/api/mood" refreshMs={60_000} />
      {/* … решта сторінки … */}


        {/* ====== КВАРТАЛЬНИЙ КАЛЕНДАР ПОДІЙ ====== */}
        <section>
          {loadingEvents ? (
            <div className="surface rounded-3xl p-4 opacity-80">
              Завантаження календаря…
            </div>
          ) : (
            <QuarterCalendar events={events} />
          )}
        </section>

        {/* ====== ЗВІТИ СЬОГОДНІ/ЗАВТРА ====== */}
        <EarningsTwoDays />

        {/* ====== ВАЖЛИВІ НОВИНИ ====== */}
        <section>
          {/* Бігуча стрічка */}
          <div className="surface rounded-3xl p-0 overflow-hidden">
            <div className={`news-ticker ${loadingNews ? "paused" : ""}`}>
              <div className="track">
                {tickerItems.map((n, i) => (
                  <a
                    key={`${n.id}-${i}`}
                    href={n.link}
                    target="_blank"
                    rel="noreferrer"
                    className="item"
                    title={n.title}
                  >
                    <span className="dot" aria-hidden>•</span>
                    <span className="title">{n.title}</span>
                    <span className="meta">
                      {new Date(n.pubDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {" · "}
                      {n.source}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <style jsx>{`
        .news-ticker {
          position: relative; overflow: hidden; border-radius: 1.5rem;
          background: var(--card-bg); border: 1px solid var(--card-border);
        }
        .news-ticker:hover { --ticker-play: paused; }
        .paused { --ticker-play: paused; }
        .track {
          display: inline-flex; gap: 28px; align-items: center; white-space: nowrap;
          padding: 12px 16px; animation: ticker 45s linear infinite;
          animation-play-state: var(--ticker-play, running); will-change: transform;
        }
        .item { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; color: var(--fg); opacity: .95; }
        .item .dot { color: var(--color-primary); font-weight: 700; transform: translateY(-1px); }
        .item .title { font-size: .95rem; line-height: 1.25rem; }
        .item .meta { font-size: .75rem; opacity: .65; }
        @keyframes ticker { 0% {transform: translateX(0);} 100% {transform: translateX(-50%);} }
        @media (prefers-reduced-motion: reduce) { .track { animation: none; } }

        .surface {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
        }
      `}</style>
    </div>
  );
}
