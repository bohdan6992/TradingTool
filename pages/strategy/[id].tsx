import Navbar from "@/components/Navbar";
import { EquityCurve, ResultHistogram } from "@/components/StatsCharts";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function StrategyPage(){
  const router = useRouter();
  const { id } = router.query;
  const [s, setS] = useState<any>(null);
  const [trades, setTrades] = useState<any[]>([]);

  useEffect(()=>{
    if(!id) return;
    fetch(`/api/strategies/${id}`).then(r=>r.json()).then(setS);
    fetch(`/api/trades?strategy_id=${id}`).then(r=>r.json()).then(setTrades);
  },[id]);

  return (
    <div>
      <Navbar/>
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {s && (
          <div className="card p-6">
            <div className="text-3xl font-extrabold">{s.name}</div>
            <p className="mt-3 opacity-80">{s.description}</p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <EquityCurve rows={trades}/>
          <ResultHistogram rows={trades}/>
        </div>

        <div className="card p-6">
          <h3 className="font-bold text-xl mb-3">Додати запис</h3>
          <form className="grid md:grid-cols-6 gap-3" onSubmit={async (e)=>{
            e.preventDefault();
            const fd = new FormData(e.currentTarget as HTMLFormElement);
            await fetch("/api/trades", { method:"POST", body:fd });
            (e.target as HTMLFormElement).reset();
            const res = await fetch(`/api/trades?strategy_id=${id}`);
            setTrades(await res.json());
          }}>
            <input name="strategy_id" defaultValue={id as string} hidden />
            <input name="ticker" placeholder="Тікер" className="border rounded px-3 py-2 md:col-span-1" />
            <input name="trade_date" type="date" className="border rounded px-3 py-2 md:col-span-1"/>
            <input name="entry_amount" type="number" step="0.01" placeholder="Сума входу" className="border rounded px-3 py-2 md:col-span-2" />
            <input name="result" type="number" step="0.01" placeholder="Сума результату" className="border rounded px-3 py-2 md:col-span-2"/>
            <input name="screenshot_url" placeholder="URL скріншоту (необов'язково)" className="border rounded px-3 py-2 md:col-span-4" />
            <button className="btn md:col-span-2">Зберегти</button>
          </form>
        </div>

        <div className="card p-6">
          <h3 className="font-bold text-xl mb-3">Журнал</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr><th>Дата</th><th>Тікер</th><th>Вхід</th><th>Результат</th><th>Скрін</th></tr></thead>
              <tbody>
                {trades.map((t:any)=>(
                  <tr key={t.id}>
                    <td>{t.trade_date}</td>
                    <td>{t.ticker}</td>
                    <td>{t.entry_amount}</td>
                    <td>{t.result}</td>
                    <td>{t.screenshot_url ? <a className="underline" href={t.screenshot_url} target="_blank">відкрити</a> : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
