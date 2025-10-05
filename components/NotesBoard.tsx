"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Note = {
  id: string;
  text: string;
  created: string;
  pinned?: boolean;
};

const LS_KEY_V2 = "tt_notes_v2";
const LS_KEY_OLD = "tt_notes";

export default function NotesBoard() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");
  const [filter, setFilter] = useState<"all" | "pinned">("all");
  const inputRef = useRef<HTMLInputElement>(null);

  // === Завантаження з localStorage (міграція зі старого ключа) ===
  useEffect(() => {
    try {
      const savedV2 = localStorage.getItem(LS_KEY_V2);
      if (savedV2) {
        setNotes(JSON.parse(savedV2));
        return;
      }
      const savedOld = localStorage.getItem(LS_KEY_OLD);
      if (savedOld) {
        const migrated: Note[] = JSON.parse(savedOld);
        setNotes(migrated);
        localStorage.setItem(LS_KEY_V2, JSON.stringify(migrated));
      }
    } catch {}
  }, []);

  // === Авто-збереження ===
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY_V2, JSON.stringify(notes));
    } catch {}
  }, [notes]);

  // === Дії ===
  const addNote = () => {
    const t = text.trim();
    if (!t) return;
    const newNote: Note = {
      id: Math.random().toString(36).slice(2),
      text: t,
      created: new Date().toISOString(),
      pinned: false,
    };
    setNotes((p) => [newNote, ...p]);
    setText("");
    // невеличка візуальна підсвітка — клас на контейнер
    requestAnimationFrame(() => {
      document.querySelector(".notes-board")?.classList.add("pulse");
      setTimeout(() => document.querySelector(".notes-board")?.classList.remove("pulse"), 350);
    });
  };

  const removeNote = (id: string) => {
    setNotes((p) => p.filter((n) => n.id !== id));
  };

  const togglePin = (id: string) => {
    setNotes((p) =>
      p.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n))
    );
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      addNote();
    }
  };

  const sorted = useMemo(() => {
    const arr = [...notes];
    arr.sort((a, b) => {
      if ((a.pinned ? 1 : 0) !== (b.pinned ? 1 : 0)) {
        return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      }
      return new Date(b.created).getTime() - new Date(a.created).getTime();
    });
    return arr;
  }, [notes]);

  const visible = useMemo(() => {
    return filter === "pinned" ? sorted.filter((n) => n.pinned) : sorted;
  }, [sorted, filter]);

  return (
    <div className="notes-board surface rounded-3xl p-5 mt-6">
      <header className="nb-head">
        <div className="nb-title">
          <span className="nb-emoji" aria-hidden>📝</span>
          <h2 className="nb-h2">Замітки</h2>
          <span className="nb-badge" aria-label="кількість заміток">{notes.length}</span>
        </div>

        <div className="nb-controls">
          <div className="nb-filter" role="tablist" aria-label="фільтр заміток">
            <button
              role="tab"
              aria-selected={filter === "all"}
              className={`pill ${filter === "all" ? "is-active" : ""}`}
              onClick={() => setFilter("all")}
            >
              Усі
            </button>
            <button
              role="tab"
              aria-selected={filter === "pinned"}
              className={`pill ${filter === "pinned" ? "is-active" : ""}`}
              onClick={() => setFilter("pinned")}
            >
              Закріплені
            </button>
          </div>
        </div>
      </header>

      <div className="nb-input">
        <div className="nb-input-inner">
          <input
            ref={inputRef}
            type="text"
            placeholder="Нова замітка… (Ctrl/⌘ + Enter — додати)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            className="nb-text"
            aria-label="текст замітки"
          />
          <div className="nb-buttons">
            <button
              className="btn ghost"
              onClick={() => {
                setText("");
                inputRef.current?.focus();
              }}
              title="Очистити"
              aria-label="Очистити ввід"
            >
              ⨯
            </button>
            <button className="btn primary" onClick={addNote} title="Додати замітку">
              Додати
            </button>
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="nb-empty" aria-live="polite">
          <div className="nb-empty-art" aria-hidden>
            <div className="spark" />
            <div className="sheet" />
          </div>
          <p className="nb-empty-txt">Поки немає заміток. Додай першу вище!</p>
        </div>
      ) : (
        <ul className="nb-list">
          {visible.map((n) => (
            <li key={n.id} className={`nb-card ${n.pinned ? "is-pinned" : ""}`}>
              <div className="nb-card-main">
                <p className="nb-card-text">{n.text}</p>
                <div className="nb-meta">
                  <time className="nb-date">
                    {new Date(n.created).toLocaleString("uk-UA")}
                  </time>
                </div>
              </div>

              <div className="nb-card-actions">
                <button
                  className={`icon ${n.pinned ? "on" : ""}`}
                  onClick={() => togglePin(n.id)}
                  title={n.pinned ? "Відкріпити" : "Закріпити"}
                  aria-label={n.pinned ? "Відкріпити замітку" : "Закріпити замітку"}
                >
                  📌
                </button>
                <button
                  className="icon danger"
                  onClick={() => removeNote(n.id)}
                  title="Видалити"
                  aria-label="Видалити замітку"
                >
                  🗑️
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* ====== стилі, що підкоряються темі (CSS variables) ====== */}
      <style jsx>{`
        .surface {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
                    max-width: 1200px;
          margin: 0 auto 14px;
        }

        .notes-board {
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 28px rgba(0,0,0,.08);
          transition: box-shadow .25s ease;
        }
        .notes-board::before {
          content: "";
          position: absolute; inset: 0; pointer-events: none;
          background:
            radial-gradient(800px 320px at 10% -10%,
              color-mix(in oklab, var(--color-primary) 14%, transparent) 0%,
              transparent 60%);
          opacity: .6;
        }
        .notes-board.pulse {
          box-shadow: 0 16px 40px color-mix(in oklab, var(--color-primary) 18%, transparent);
        }

        .nb-head {
          position: relative; z-index: 1;
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; margin-bottom: 12px;
        }
        .nb-title { display: inline-flex; align-items: center; gap: 8px; }
        .nb-emoji { font-size: 1.25rem; }
        .nb-h2 { margin: 0; font-size: 1.2rem; font-weight: 900; letter-spacing: .2px; }
        .nb-badge {
          display: inline-flex; align-items: center; justify-content: center;
          height: 26px; min-width: 26px; padding: 0 10px;
          font-size: .82rem; font-weight: 800; color: #fff;
          background: color-mix(in oklab, var(--color-primary) 85%, #0000);
          border: 1px solid color-mix(in oklab, var(--color-primary) 94%, var(--card-border));
          border-radius: 999px;
          box-shadow: 0 8px 22px color-mix(in oklab, var(--color-primary) 30%, transparent);
        }

        .nb-controls { display: flex; align-items: center; gap: 8px; }
        .nb-filter { display: inline-flex; gap: 6px; }

        .pill {
          height: 34px; padding: 0 12px; border-radius: 999px;
          border: 1px solid var(--card-border);
          background: color-mix(in oklab, var(--card-bg) 92%, transparent);
          color: var(--fg); font-weight: 800; cursor: pointer;
          transition: background .15s ease, border-color .15s ease, transform .15s ease;
        }
        .pill:hover {
          background: color-mix(in oklab, var(--color-primary) 10%, var(--card-bg));
          border-color: color-mix(in oklab, var(--color-primary) 30%, var(--card-border));
          transform: translateY(-1px);
        }
        .pill.is-active {
          background: color-mix(in oklab, var(--color-primary) 22%, var(--card-bg));
          border-color: var(--color-primary);
          color: white;
        }

        .nb-input {
          position: relative; z-index: 1; margin: 8px 0 14px;
        }
        .nb-input-inner {
          display: flex; align-items: center; gap: 10px;
          border: 1px solid var(--card-border);
          background: color-mix(in oklab, var(--card-bg) 94%, transparent);
          border-radius: 14px; padding: 8px 10px;
        }
        .nb-text {
          flex: 1; border: none; outline: none; background: transparent;
          color: var(--fg);
          font-weight: 700; letter-spacing: .2px;
        }
        .nb-text::placeholder { opacity: .6; font-weight: 600; }
        .nb-buttons { display: inline-flex; gap: 6px; }

        .btn {
          height: 34px; padding: 0 12px; border-radius: 10px; font-weight: 800;
          border: 1px solid var(--card-border); cursor: pointer;
          transition: background .15s ease, border-color .15s ease, transform .15s ease;
        }
        .btn:focus-visible { outline: 2px solid color-mix(in oklab, var(--color-primary) 45%, transparent); outline-offset: 2px; }
        .btn.ghost {
          background: color-mix(in oklab, var(--card-bg) 88%, transparent);
          color: var(--fg);
        }
        .btn.ghost:hover {
          background: color-mix(in oklab, var(--color-primary) 12%, var(--card-bg));
          border-color: color-mix(in oklab, var(--color-primary) 28%, var(--card-border));
          transform: translateY(-1px);
        }
        .btn.primary {
          background: var(--color-primary); color: white;
          border-color: color-mix(in oklab, var(--color-primary) 70%, var(--card-border));
          box-shadow: 0 8px 20px color-mix(in oklab, var(--color-primary) 35%, transparent);
        }
        .btn.primary:hover {
          filter: brightness(1.02);
          transform: translateY(-1px);
        }

        .nb-empty {
          position: relative; z-index: 1;
          display: grid; place-items: center;
          border: 1px dashed color-mix(in oklab, var(--card-border) 80%, transparent);
          border-radius: 16px; padding: 28px; opacity: .9;
          background: color-mix(in oklab, var(--card-bg) 96%, transparent);
        }
        .nb-empty-txt { margin-top: 10px; opacity: .7; font-style: italic; }
        .nb-empty-art {
          position: relative; width: 120px; height: 80px;
        }
        .nb-empty-art .spark {
          position: absolute; inset: 0; border-radius: 999px;
          background: radial-gradient(
            60px 40px at 50% 50%,
            color-mix(in oklab, var(--color-primary) 30%, transparent),
            transparent 70%
          );
          filter: blur(8px);
          animation: pulse 2.2s ease-in-out infinite;
        }
        .nb-empty-art .sheet {
          position: absolute; left: 26px; top: 12px; width: 68px; height: 52px;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 10px;
          box-shadow: 0 10px 26px rgba(0,0,0,.08);
        }

        .nb-list {
          position: relative; z-index: 1;
          display: grid; gap: 12px;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        }

        .nb-card {
          display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;
          border: 1px solid var(--card-border);
          background: color-mix(in oklab, var(--card-bg) 96%, transparent);
          border-radius: 14px; padding: 12px;
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
          box-shadow: 0 6px 18px rgba(0,0,0,.06);
        }
        .nb-card:hover {
          transform: translateY(-2px);
          border-color: color-mix(in oklab, var(--color-primary) 26%, var(--card-border));
          box-shadow: 0 14px 30px rgba(0,0,0,.14);
        }
        .nb-card.is-pinned {
          border-color: color-mix(in oklab, var(--color-primary) 42%, var(--card-border));
          box-shadow: 0 12px 26px color-mix(in oklab, var(--color-primary) 18%, transparent);
        }

        .nb-card-main { display: grid; gap: 6px; }
        .nb-card-text { margin: 0; font-weight: 700; letter-spacing: .15px; }
        .nb-meta { display: inline-flex; gap: 8px; align-items: center; opacity: .7; }
        .nb-date {
          display: inline-flex; align-items: center; height: 22px;
          padding: 0 8px; border-radius: 999px; font-size: .72rem; font-weight: 800;
          background: color-mix(in oklab, var(--card-bg) 92%, transparent);
          border: 1px solid color-mix(in oklab, var(--card-border) 86%, transparent);
        }

        .nb-card-actions { display: inline-flex; align-items: center; gap: 6px; }
        .icon {
          height: 34px; min-width: 34px;
          display: inline-grid; place-items: center;
          border-radius: 10px; border: 1px solid var(--card-border);
          background: color-mix(in oklab, var(--card-bg) 90%, transparent);
          cursor: pointer; transition: transform .12s ease, background .15s ease, border-color .15s ease;
        }
        .icon:hover {
          background: color-mix(in oklab, var(--color-primary) 10%, var(--card-bg));
          border-color: color-mix(in oklab, var(--color-primary) 28%, var(--card-border));
          transform: translateY(-1px);
        }
        .icon.on {
          background: color-mix(in oklab, var(--color-primary) 22%, var(--card-bg)); color: white;
          border-color: var(--color-primary);
        }
        .icon.danger:hover {
          border-color: color-mix(in oklab, #ff6b6b 38%, var(--card-border));
          background: color-mix(in oklab, #ff6b6b 12%, var(--card-bg));
        }

        @keyframes pulse {
          0%, 100% { opacity: .8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.03); }
        }

        :global(html[data-theme*="dark"]) .notes-board:hover {
          box-shadow: 0 18px 42px rgba(0,0,0,.35);
        }
      `}</style>
    </div>
  );
}
