// pages/api/social.ts
import type { NextApiRequest, NextApiResponse } from "next";

// Можна задати свій інстанс Nitter у .env.local
const NITTER_BASE = process.env.NITTER_BASE || "https://nitter.net";

// Дуже простий RSS→JSON парсер (без залежностей)
async function fetchAndParseRSS(url: string) {
  const r = await fetch(url, {
    headers: { "User-Agent": "TradingTool/1.0 (+rss)" },
  });
  const text = await r.text();
  // Звичайний, «дешевий» парс: витягуємо <item>...</item>
  const items: { title: string; link: string; pubDate?: string }[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(text))) {
    const block = m[1];
    const title = (block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "")
      .replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1")
      .trim();
    const link = (block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || "").trim();
    const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || "").trim();
    if (title || link) items.push({ title, link, pubDate });
  }
  return { ok: true, items, rawLen: text.length };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const source = (req.query.source as string || "twitter").toLowerCase();
  const q = (req.query.q as string || "AAPL OR NVDA OR SPY").trim();
  const limit = Math.max(1, Math.min(100, +(req.query.limit as string) || 20));
  const debug = req.query.debug === "1";

  try {
    let url = "";
    if (source === "twitter") {
      // Nitter RSS: без ключів
      url = `${NITTER_BASE}/search/rss?f=tweets&q=${encodeURIComponent(q)}`;
    } else if (source === "reddit") {
      // Reddit RSS: теж без ключів
      url = `https://www.reddit.com/search.rss?q=${encodeURIComponent(q)}&sort=new`;
    } else {
      return res.status(400).json({ ok: false, error: "unknown source", source });
    }

    const data = await fetchAndParseRSS(url);
    const items = (data.items || []).slice(0, limit);

    return res.status(200).json({
      ok: true,
      count: items.length,
      items,
      ...(debug ? { diag: { url, source, q, limit, rssBytes: data.rawLen } } : null),
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      error: e?.message || "fetch/parsing error",
      ...(debug ? { diag: { source, q, limit } } : null),
    });
  }
}
