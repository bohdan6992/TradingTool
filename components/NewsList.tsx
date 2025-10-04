import * as React from "react";
import type { NewsItem } from "@/types/news";

export function NewsList({ items }: { items: NewsItem[] }) {
  if (!items?.length) {
    return (
      <div className="surface p-6 rounded-3xl tt-muted">
        Наразі важливих новин немає.
      </div>
    );
  }

  return (
    <section className="max-w-5xl mx-auto px-5 mt-6">
      <div className="surface rounded-3xl p-4 max-h-[450px] overflow-y-auto">
        <ul className="divide-y divide-[var(--card-border)]">
          {items.map((n) => (
            <li key={n.id} className="py-3">
              <a
                href={n.link}
                target="_blank"
                rel="noreferrer"
                className="block hover:underline"
                style={{ color: "var(--fg)" }}
              >
                <h3 className="text-sm font-semibold">{n.title}</h3>
              </a>
              <div className="text-xs tt-muted mt-1">
                <time dateTime={new Date(n.pubDate).toISOString()}>
                  {new Date(n.pubDate).toLocaleString()}
                </time>
                {" · "}
                <span>{n.source}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
