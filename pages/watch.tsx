import NotesBoard from "@/components/NotesBoard"; // 🆕 ДОДАНО

export default function WatchPage() {
  return (
    <>
      <main className="page">
        <h1>Спостереження</h1>
             {/* 📝 Новий компонент заміток */}
      <NotesBoard />
      </main>
    </>
  );
}
