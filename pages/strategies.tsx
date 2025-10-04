// pages/index.tsx
import { useEffect, useState } from "react";
import Head from "next/head";
import StrategyCard from "@/components/StrategyCard";

type Strategy = {
  id: string;
  name: string;
  description?: string;
  href?: string; // опціонально: свій шлях
};

export default function Home() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/strategies");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        setStrategies(Array.isArray(data) ? data : data?.items || []);
      } catch (e: any) {
        setErr(e?.message || "Помилка завантаження");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const skeletonCount = 6;

  // Делегований перехід: шукаємо перший <a> всередині плитки і клікаємо його.
  function openCard(target: HTMLElement) {
    // 1) Спроба знайти внутрішній лінк у StrategyCard
    const innerLink =
      target.querySelector("a[href]") as HTMLAnchorElement | null;

    if (innerLink && innerLink.href) {
      if (innerLink.target === "_blank") {
        window.open(innerLink.href, "_blank", "noopener,noreferrer");
      } else {
        // Віддаємо перевагу справжній навігації, яку вже налаштовано в компоненті
        innerLink.click();
      }
      return;
    }

    // 2) Запасний варіант: якщо у контейнера є data-href (із API)
    const fallback = (target.getAttribute("data-href") || "").trim();
    if (fallback) {
      window.location.assign(fallback);
    }
  }

  return (
    <>
      <Head>
        <title>Стратегії — TradingTool</title>
      </Head>

      <main className="wrap">
        <section className="section">
          <header className="section-head">
            <div className="title-wrap">
              <h1 className="title">Стратегії</h1>
              {!loading && !err && (
                <span className="badge" aria-label="кількість стратегій">
                  {strategies.length}
                </span>
              )}
            </div>
            <p className="subtitle">
              Готові підходи та ідеї. Обери плитку, щоб переглянути деталі.
            </p>
          </header>

          {loading && (
            <div className="grid">
              {Array.from({ length: skeletonCount }).map((_, i) => (
                <div className="skeleton-card" key={i} />
              ))}
            </div>
          )}

          {!loading && err && (
            <div className="note error">Сталася помилка: {err}</div>
          )}

          {!loading && !err && strategies.length === 0 && (
            <div className="note">Наразі немає стратегій для відображення.</div>
          )}

          {!loading && !err && strategies.length > 0 && (
            <div className="grid">
              {strategies.map((s) => {
                // Дамо запасний шлях, якщо він таки приїде з API
                const dataHref =
                  s.href && s.href.startsWith("/")
                    ? s.href
                    : s.href || ""; // залишимо пустим якщо нема

                return (
                  <div
                    key={s.id}
                    className="card clickable"
                    role="link"
                    tabIndex={0}
                    data-href={dataHref}
                    onClick={(e) => openCard(e.currentTarget as HTMLElement)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openCard(e.currentTarget as HTMLElement);
                      }
                    }}
                    aria-label={`Відкрити стратегію ${s.name}`}
                  >
                    <div className="card-inner">
                      <StrategyCard s={s} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <style jsx>{`
        /* ====== Лейаут ====== */
        .wrap {
          max-width: 1200px;
          margin: 0 auto;
          padding: 18px 16px 28px;
        }

        .section {
          position: relative;
          border-radius: 22px;
          background: linear-gradient(
            180deg,
            color-mix(in oklab, var(--card-bg) 92%, transparent) 0%,
            color-mix(in oklab, var(--card-bg) 86%, transparent) 100%
          );
          border: 1px solid var(--card-border);
          box-shadow: 0 12px 38px rgba(0, 0, 0, 0.1);
          padding: 18px;
          overflow: hidden;
        }
        .section::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(
            900px 400px at 6% 0%,
            color-mix(in oklab, var(--color-primary) 14%, transparent) 0%,
            transparent 60%
          );
          opacity: 0.7;
        }

        /* ====== Заголовок ====== */
        .section-head {
          position: relative;
          z-index: 1;
          margin-bottom: 12px;
        }
        .title-wrap {
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }
        .title {
          font-size: 1.6rem;
          line-height: 2rem;
          font-weight: 900;
          letter-spacing: 0.2px;
          margin: 0;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 28px;
          min-width: 28px;
          padding: 0 10px;
          font-size: 0.85rem;
          font-weight: 800;
          color: white;
          background: color-mix(in oklab, var(--color-primary) 75%, #0000);
          border: 1px solid
            color-mix(in oklab, var(--color-primary) 94%, var(--card-border));
          border-radius: 999px;
          box-shadow: 0 6px 18px
            color-mix(in oklab, var(--color-primary) 35%, transparent);
        }
        .subtitle {
          margin: 8px 2px 0;
          opacity: 0.78;
          font-size: 0.95rem;
        }

        /* ====== Сітка ====== */
        .grid {
          position: relative;
          z-index: 1;
          display: grid;
          gap: 16px;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        }

        /* ====== Плитка ====== */
        .card {
          border-radius: 16px;
          border: 1px solid var(--card-border);
          background: color-mix(in oklab, var(--card-bg) 94%, transparent);
          transition: border-color 0.18s ease, box-shadow 0.18s ease,
            transform 0.18s ease;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
          overflow: hidden;
        }
        .clickable {
          cursor: pointer;
          outline: none;
        }
        .clickable:focus-visible {
          box-shadow: 0 0 0 3px color-mix(
              in oklab,
              var(--color-primary) 45%,
              transparent
            );
        }
        .card:hover {
          border-color: color-mix(
            in oklab,
            var(--color-primary) 38%,
            var(--card-border)
          );
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.14);
          transform: translateY(-2px);
        }
        .card-inner {
          min-height: 124px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 8px;
        }

        /* 🔕 Ховаємо видиме текстове посилання всередині StrategyCard,
           але воно лишається у DOM для делегованого кліку */
        .card :global(a) {
          display: none;
        }

        /* ====== Інфо-блоки ====== */
        .note {
          position: relative;
          z-index: 1;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          padding: 14px;
          opacity: 0.92;
        }
        .error {
          color: #ff6b6b;
          border-color: color-mix(in oklab, #ff6b6b 35%, var(--card-border));
          background: linear-gradient(
            180deg,
            color-mix(in oklab, #ff6b6b 8%, var(--card-bg)) 0%,
            var(--card-bg) 100%
          );
        }

        /* ====== Скелетон ====== */
        .skeleton-card {
          height: 124px;
          border-radius: 16px;
          border: 1px solid var(--card-border);
          background: linear-gradient(
            90deg,
            color-mix(in oklab, var(--card-bg) 90%, transparent) 0%,
            color-mix(in oklab, var(--card-bg) 82%, transparent) 50%,
            color-mix(in oklab, var(--card-bg) 90%, transparent) 100%
          );
          animation: shimmer 1.4s infinite linear;
          background-size: 200% 100%;
        }
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        :global(html[data-theme*="dark"]) .card:hover {
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
        }
      `}</style>
    </>
  );
}
