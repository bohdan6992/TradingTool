// app/api/bridge/universe-quotes/route.ts
import { NextResponse } from 'next/server';

const BRIDGE_URL = process.env.TRADING_BRIDGE_URL ?? 'http://localhost:5197';

export async function GET() {
  const url = `${BRIDGE_URL}/api/universe-quotes`;

  try {
    // тягнемо з локального TradingBridgeApi
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      return NextResponse.json(
        {
          error: `Bridge HTTP ${res.status}`,
          type: 'BRIDGE_ERROR',
        },
        { status: 500 },
      );
    }

    const data = await res.json();
    // просто прокидуємо JSON далі фронту
    return NextResponse.json(data, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: e?.message ?? 'Bridge fetch failed',
        type: 'BRIDGE_ERROR',
      },
      { status: 500 },
    );
  }
}
