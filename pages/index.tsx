import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import StrategyCard from "@/components/StrategyCard";
import { useEffect, useState } from "react";

export default function Home(){
  const [strategies, setStrategies] = useState<any[]>([]);
  useEffect(()=>{
    fetch("/api/strategies").then(r=>r.json()).then(setStrategies).catch(console.error);
  },[]);
  return (
    <div>
      <Navbar/>
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <Hero/>
        <section>
          <h2 className="text-2xl font-bold mb-3">Стратегії</h2>
          <div className="grid-auto">
            {strategies.map((s:any)=>(<StrategyCard key={s.id} s={s}/>))}
          </div>
        </section>
      </main>
    </div>
  )
}
