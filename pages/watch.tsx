import NotesBoard from "@/components/NotesBoard";
import TrapFullExplorer from "@/components/signals/TrapFullExplorer";

export default function WatchPage() {
  return (
    <>
      <main className="page space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">Спостереження</h1>
        </header>

        {/* 📝 Новий компонент заміток */}
        <NotesBoard />

        {/* 🔍 TRAP Explorer з повним набором полів */}
        <TrapFullExplorer />
      </main>
    </>
  );
}
