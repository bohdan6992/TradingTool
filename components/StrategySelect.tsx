import { useState } from "react";
import { useRouter } from "next/router";
import { STRATEGIES } from "@/data/strategies";

export default function StrategySelect() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const choose = (id: string) => {
    setSelected(id);
    setOpen(false);
    router.push(`/stats/${id}`);
  };

  return (
    <>
      <div className="strategySelectContainer">
        <label className="label">Обери стратегію</label>

        <button
          className="dropdownButton"
          onClick={() => setOpen(!open)}
        >
          <span className="icon">📚</span>
          <span className="text">
            {selected
              ? STRATEGIES.find((s) => s.id === selected)?.title
              : "Обрати стратегію…"}
          </span>
          <span className="chevron">▾</span>
        </button>

        {open && (
          <div className="dropdownMenu">
            {STRATEGIES.map((s) => (
              <div
                key={s.id}
                className="dropdownItem"
                onClick={() => choose(s.id)}
              >
                <span className="itemIcon">{s.icon}</span>
                {s.title}
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .strategySelectContainer {
          position: relative;
          width: 260px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .label {
          font-size: 12px;
          opacity: 0.7;
        }

        .dropdownButton {
          display: flex;
          align-items: center;
          gap: 8px;
          border-radius: 12px;
          padding: 8px 12px;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          box-shadow: var(--card-shadow);
          cursor: pointer;
          color: var(--fg);
          font-size: 14px;
          font-weight: 600;
          transition: 0.15s ease;
          width: 100%;
          text-align: left;
        }

        .dropdownButton:hover {
          border-color: var(--color-primary);
        }

        .icon {
          opacity: 0.9;
        }

        .chevron {
          margin-left: auto;
          opacity: 0.6;
        }

        .dropdownMenu {
          position: absolute;
          top: 64px;
          width: 100%;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 12px;
          box-shadow: var(--card-shadow-heavy);
          padding: 6px 0;
          z-index: 40;
          backdrop-filter: blur(12px);
        }

        .dropdownItem {
          padding: 8px 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: 0.12s ease;
          font-size: 14px;
        }

        .dropdownItem:hover {
          background: var(--accent);
        }

        .itemIcon {
          width: 22px;
          text-align: center;
        }
      `}</style>
    </>
  );
}
