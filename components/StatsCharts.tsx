"use client";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar } from "recharts";

export function EquityCurve({rows}:{rows:{trade_date:string,result:number}[]}){
  const data = rows.map(r=>({date:r.trade_date, value: Number(r.result)})).reverse();
  return (
    <div className="h-64 card p-4">
      <div className="font-semibold mb-2">Динаміка результатів</div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}><XAxis dataKey="date"/><YAxis/><Tooltip/><Line type="monotone" dataKey="value" strokeWidth={2}/></LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ResultHistogram({rows}:{rows:{trade_date:string,result:number}[]}){
  const data = rows.map(r=>({date:r.trade_date, value:Number(r.result)}));
  return (
    <div className="h-64 card p-4">
      <div className="font-semibold mb-2">Розподіл результатів</div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}><XAxis dataKey="date"/><YAxis/><Tooltip/><Bar dataKey="value"/></BarChart>
      </ResponsiveContainer>
    </div>
  )
}
