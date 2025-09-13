import Navbar from "@/components/Navbar";
import UploadImage from "@/components/UploadImage";
import { useEffect, useState } from "react";

type Strategy = { id:number, name:string, description:string, icon:string|null };

export default function Admin(){
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [form, setForm] = useState<Partial<Strategy>>({});
  const [editing, setEditing] = useState<Strategy|null>(null);

  async function load(){
    const r = await fetch("/api/strategies"); setStrategies(await r.json());
  }
  useEffect(()=>{ load(); },[]);

  async function save(e:any){
    e.preventDefault();
    if(editing){
      await fetch(`/api/strategies/${editing.id}`,{
        method:"PUT", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(form)
      });
    }else{
      await fetch(`/api/strategies`,{
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(form)
      });
    }
    setForm({}); setEditing(null); await load();
  }

  async function del(id:number){
    if(confirm("Видалити стратегію?")){
      await fetch(`/api/strategies/${id}`, { method:"DELETE" });
      await load();
    }
  }

  return (
    <div>
      <Navbar/>
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        <div className="card p-6">
          <h1 className="text-2xl font-bold mb-4">Адмін — Стратегії</h1>
          <form onSubmit={save} className="grid md:grid-cols-2 gap-3">
            <input className="border rounded px-3 py-2" placeholder="Назва" value={form.name||""} onChange={e=>setForm({...form, name:e.target.value})}/>
            <input className="border rounded px-3 py-2" placeholder="Icon URL" value={form.icon||""} onChange={e=>setForm({...form, icon:e.target.value})}/>
            <textarea className="border rounded px-3 py-2 md:col-span-2" placeholder="Опис" value={form.description||""} onChange={e=>setForm({...form, description:e.target.value})}/>
            <div className="flex items-center gap-2">
              <UploadImage onUploaded={(url)=>setForm({...form, icon:url})} label="Завантажити іконку"/>
              {form.icon && <a href={form.icon} target="_blank" className="underline">переглянути</a>}
            </div>
            <div className="md:col-span-2 flex gap-2">
              <button className="btn">{editing?"Зберегти":"Додати"}</button>
              {editing && <button type="button" className="btn" onClick={()=>{setEditing(null);setForm({});}}>Скасувати</button>}
            </div>
          </form>
        </div>

        <div className="card p-6">
          <h2 className="font-bold text-xl mb-3">Список стратегій</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead><tr><th>ID</th><th>Назва</th><th>Icon</th><th>Дії</th></tr></thead>
              <tbody>
                {strategies.map(s=>(
                  <tr key={s.id}>
                    <td>{s.id}</td>
                    <td>{s.name}</td>
                    <td>{s.icon ? <a className="underline" href={s.icon} target="_blank">іконка</a> : "-"}</td>
                    <td className="flex gap-2">
                      <button className="btn" onClick={()=>{setEditing(s); setForm(s);}}>Редагувати</button>
                      <button className="btn" onClick={()=>del(s.id)}>Видалити</button>
                    </td>
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
