// app/api/bridge/strategy-stats/[strategy]/route.ts
import { NextRequest, NextResponse } from "next/server";

const BRIDGE_URL =
  process.env.TRADING_BRIDGE_URL ?? "http://localhost:5197";

export async function GET(
  req: NextRequest,
  context: { params: { strategy: string } }
) {
  const strategy = context.params.strategy;

  // Прокидуємо ?ticker= з фронта
  const ticker = req.nextUrl.searchParams.get("ticker") || undefined;

  // Формуємо URL до .NET API
  const target = new URL(
    `${BRIDGE_URL}/api/strategy/${encodeURIComponent(strategy)}/stats`
  );
  if (ticker) {
    target.searchParams.set("ticker", ticker);
  }

  try {
    const upstream = await fetch(target.toString(), {
      cache: "no-store",
    });

    const data = await upstream.json();

    return NextResponse.json(data, {
      status: upstream.status,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err?.message ?? "Bridge fetch failed",
        type: "BRIDGE_ERROR",
        strategy,
      },
      { status: 500 }
    );
  }
}
