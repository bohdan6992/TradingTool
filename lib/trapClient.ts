// lib/trapClient.ts
import { FullFieldName } from "./fullFields";

export const DEFAULT_TRAP_URL = "http://localhost:5197";

export type TrapErrorType = "NOT_RUNNING" | "HTTP_ERROR" | "BAD_JSON";

export type TrapError = {
  type: TrapErrorType;
  message: string;
  status?: number;
};

// один рядок full-quotes
export type FullQuotesRow = {
  ticker: string;
} & {
  [K in FullFieldName]: string | number | null;
};

function getBridgeBase() {
  return process.env.NEXT_PUBLIC_TRADING_BRIDGE_URL || DEFAULT_TRAP_URL;
}

/**
 * Універсальний запит до TradingBridgeApi
 */
async function fetchBridgeJson<T = any>(path: string): Promise<T> {
  const base = getBridgeBase();

  try {
    const res = await fetch(`${base}${path}`, { cache: "no-store" });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw <TrapError>{
        type: "HTTP_ERROR",
        status: res.status,
        message: text || `HTTP ${res.status}`,
      };
    }

    try {
      return (await res.json()) as T;
    } catch (e: any) {
      throw <TrapError>{
        type: "BAD_JSON",
        message: e?.message || "Bad JSON",
      };
    }
  } catch (e: any) {
    if (e?.type) throw e;

    throw <TrapError>{
      type: "NOT_RUNNING",
      message: "TRAP не запущений або недоступний на цьому пристрої",
    };
  }
}

/* ========= /api/quotes ========= */

export async function getTrapQuotes() {
  return fetchBridgeJson("/api/quotes");
}

/* ========= /api/strategy/{name}/stats (legacy; CSV) ========= */

export async function getStrategyStats(strategy: string) {
  const s = (strategy ?? "").trim();
  if (!s) throw <TrapError>{ type: "BAD_JSON", message: "Strategy is empty" };
  return fetchBridgeJson<any[]>(`/api/strategy/${encodeURIComponent(s)}/stats`);
}

/* ========= ARBITRAGE: list (CSV -> list page) =========
   NEW ENDPOINT (у мостi):
   GET /api/strategy/arbitrage/list
   returns: { strategy, updatedAt, count, items: [...] }
*/
export type ArbitrageListRow = Record<string, string>;

type ArbitrageListResponse = {
  strategy: string;
  updatedAt: string | Date;
  count: number;
  items: any[];
};

export async function getArbitrageList(): Promise<ArbitrageListRow[]> {
  const json = await fetchBridgeJson<ArbitrageListResponse>(
    `/api/strategy/arbitrage/list`
  );

  const items = Array.isArray(json?.items) ? json.items : [];

  // normalize: всі значення -> string
  return items.map((r) => {
    const obj: ArbitrageListRow = {};
    for (const [k, v] of Object.entries(r ?? {})) {
      obj[k] = v != null ? String(v) : "";
    }
    return obj;
  });
}

/* ========= ARBITRAGE: per ticker (JSONL -> personal page) =========
   EXISTING ENDPOINT:
   GET /api/strategy/arbitrage/stats?ticker=AAPL
   returns: { strategy, format, updatedAt, ticker, item }
*/
export type ArbitrageTickerStats = Record<string, any>;

type ArbitrageTickerResponse = {
  strategy: string;
  format: "jsonl" | "csv";
  updatedAt: string | Date;
  ticker: string;
  item: ArbitrageTickerStats | null;
};

export async function getArbitrageStatsByTicker(
  ticker: string
): Promise<ArbitrageTickerResponse> {
  const t = (ticker ?? "").trim();
  if (!t) throw <TrapError>{ type: "BAD_JSON", message: "Ticker is empty" };

  return fetchBridgeJson<ArbitrageTickerResponse>(
    `/api/strategy/arbitrage/stats?ticker=${encodeURIComponent(t)}`
  );
}

/* ========= /api/universe-quotes ========= */

export async function getUniverseQuotes() {
  return fetchBridgeJson(`/api/universe-quotes`);
}

/* ========= /api/full-quotes ========= */

type FullQuotesResponse = {
  elapsedMs: number;
  universeTickers: number;
  returnedTickers: number;
  items: Record<string, FullQuotesRow>;
};

/**
 * Якщо передаєш tickers → список обмежений.
 * Якщо tickers не передаєш → бере всіх з universe.csv
 */
export async function getFullQuotes(tickers?: string[]) {
  const query =
    tickers && tickers.length
      ? `?tickers=${encodeURIComponent(tickers.join(","))}`
      : "";

  return fetchBridgeJson<FullQuotesResponse>(`/api/full-quotes${query}`);
}
