import type { NextApiRequest, NextApiResponse } from "next";
import { pool } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = await pool.connect();
  try {
    if (req.method === "GET") {
      const { strategy_id } = req.query;
      if (strategy_id) {
        const { rows } = await client.query("SELECT * FROM trades WHERE strategy_id=$1 ORDER BY trade_date DESC", [strategy_id]);
        res.status(200).json(rows);
      } else {
        const { rows } = await client.query("SELECT * FROM trades ORDER BY trade_date DESC");
        res.status(200).json(rows);
      }
    } else if (req.method === "POST") {
      let data:any;
      const ctype = req.headers.get("content-type")||"";
      if(ctype.includes("application/json")){
        data = req.body;
      }else{
        const buf = await new Promise<Buffer>((resolve)=>{
          const chunks: any[] = [];
          req.on("data",(c)=>chunks.push(c));
          req.on("end",()=>resolve(Buffer.concat(chunks)));
        });
        const params = new URLSearchParams(buf.toString());
        data = Object.fromEntries(params.entries());
      }
      const { strategy_id, ticker, trade_date, entry_amount, result, screenshot_url } = data;
      const { rows } = await client.query(
        "INSERT INTO trades (strategy_id, ticker, trade_date, entry_amount, result, screenshot_url) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
        [strategy_id, ticker, trade_date, entry_amount, result, screenshot_url || null]
      );
      res.status(201).json(rows[0]);
    } else {
      res.setHeader("Allow", ["GET", "POST"]);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } finally {
    client.release();
  }
}
