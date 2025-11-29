// lib/trapClient.ts

export const DEFAULT_TRAP_URL = "http://localhost:5197";

export type TrapErrorType = "NOT_RUNNING" | "HTTP_ERROR" | "BAD_JSON";

export type TrapError = {
  type: TrapErrorType;
  message: string;
  status?: number;
};

function getBridgeBase() {
  return process.env.NEXT_PUBLIC_TRADING_BRIDGE_URL || DEFAULT_TRAP_URL;
}

/**
 * Базова функція: тягне JSON з локального TradingBridgeApi
 * і кидає TrapError при помилці.
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
      message: "TRAP не запущений на цьому пристрої або недоступний",
    };
  }
}

/**
 * Котирування (коротка вітрина) з /api/quotes
 */
export async function getTrapQuotes() {
  return fetchBridgeJson("/api/quotes");
}

/**
 * Статистика стратегії з /api/strategy/{strategy}/stats
 */
export async function getStrategyStats(strategy: string) {
  return fetchBridgeJson<any[]>(`/api/strategy/${strategy}/stats`);
}

/**
 * Котирування по всьому universe з /api/universe-quotes
 */
export async function getUniverseQuotes() {
  return fetchBridgeJson(`/api/universe-quotes`);
}
