import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const source = (req.query.source as string || "twitter") as "twitter" | "reddit";
    const q = (req.query.q as string || "").trim();
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);

    if (process.env.SOCIAL_MOCK === "1") {
      const tickers = Array.from(new Set(q.match(/[A-Z]{1,5}/g) || [])).slice(0, 6);
      const now = Date.now();
      const items = Array.from({ length: limit }).map((_, i) => ({
        id: `${source}-${now}-${i}`,
        source,
        author: source === "twitter" ? "Trader Joe" : "r/StocksUser",
        handle: source === "twitter" ? "@traderjoe" : undefined,
        avatar:
          source === "twitter"
            ? "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png"
            : "https://www.redditstatic.com/avatars/defaults/v2/avatar_default_1.png",
        text:
          source === "twitter"
            ? `Швидкий коментар про ${tickers[i % Math.max(1, tickers.length)] || "AAPL"}.`
            : `Обговорення ${tickers[i % Math.max(1, tickers.length)] || "AAPL"} на сабреддіті.`,
        url: source === "twitter" ? "https://twitter.com" : "https://reddit.com",
        createdAt: new Date(now - i * 60_000).toISOString(),
        score: 10 + (i % 7) * 3,
        sentiment: (["pos", "neu", "neg"] as const)[i % 3],
        tickers,
      }));
      return res.status(200).json({ items });
    }

    // Порожня відповідь, якщо немає інтеграції
    return res.status(200).json({ items: [] });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Internal error" });
  }
}
