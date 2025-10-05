"use client";
import Link from "next/link";
import { motion } from "framer-motion";

type Strategy = {
  id: string | number;
  name: string;
  description?: string;
};

export default function StrategyCard({ s }: { s: Strategy }) {
  return (
    <motion.article
      whileHover={{ y: -4, scale: 1.003 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className="
        group relative overflow-hidden rounded-2xl p-5
        border border-[color-mix(in_oklab,var(--card-border)_92%,transparent)]
        bg-[color-mix(in_oklab,var(--card-bg)_94%,transparent)]
        shadow-[0_6px_18px_rgba(0,0,0,.06)]
        hover:shadow-[0_16px_36px_rgba(0,0,0,.18)]
        transition-all duration-200
      "
    >
      {/* декоративне світло зверху */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -left-20 h-40 w-52 rotate-12 rounded-full opacity-60 blur-2xl"
        style={{
          background:
            "radial-gradient(120px 120px at 50% 50%, color-mix(in oklab, var(--color-primary) 22%, transparent), transparent 70%)",
        }}
      />

      {/* заголовок */}
      <h3
        className="
          text-[clamp(18px,2.2vw,20px)] font-extrabold tracking-tight
          text-[color:var(--fg)]
        "
        style={{ letterSpacing: "-0.02em" }}
      >
        {s.name}
      </h3>

      {/* опис */}
      {s.description ? (
        <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)] line-clamp-3">
          {s.description}
        </p>
      ) : (
        <p className="mt-2 text-sm opacity-70">Без опису…</p>
      )}

      {/* кнопка-посилання */}
      <div className="mt-4">
        <Link
          href={`/strategy/${s.id}`}
          className="
            inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold
            border border-[color-mix(in_oklab,var(--color-primary)_35%,var(--card-ring))]
            bg-[color-mix(in_oklab,var(--color-primary)_10%,transparent)]
            text-[color:var(--fg)]
            transition-colors
            hover:bg-[color-mix(in_oklab,var(--color-primary)_18%,transparent)]
            focus:outline-none focus-visible:ring-2
            focus-visible:ring-[color:var(--color-primary)]
          "
        >
          Відкрити
          <span
            className="
              inline-block translate-x-0 transition-transform duration-200
              group-hover:translate-x-0.5
            "
            aria-hidden
          >
            →
          </span>
        </Link>
      </div>

      {/* тонка нижня лінія-акцент при наведенні */}
      <span
        className="
          pointer-events-none absolute inset-x-0 bottom-0 h-[2px]
          bg-gradient-to-r from-transparent via-[color:var(--color-primary)] to-transparent
          opacity-0 group-hover:opacity-100 transition-opacity duration-300
        "
      />
    </motion.article>
  );
}
