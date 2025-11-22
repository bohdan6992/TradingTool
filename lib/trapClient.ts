// lib/trapClient.ts

export const DEFAULT_TRAP_URL = "http://127.0.0.1:5055";

export type TrapErrorType =
  | "NOT_RUNNING"
  | "HTTP_ERROR"
  | "BAD_JSON";

export type TrapError = {
  type: TrapErrorType;
  message: string;
  status?: number;
};

export async function getTrapQuotes() {
  const base = process.env.NEXT_PUBLIC_TRAP_URL || DEFAULT_TRAP_URL;

  try {
    const res = await fetch(`${base}/api/quotes`, { cache: "no-store" });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw <TrapError>{
        type: "HTTP_ERROR",
        status: res.status,
        message: text || `HTTP ${res.status}`,
      };
    }

    try {
      return await res.json();
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
