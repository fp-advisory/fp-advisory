// Runs automatically once a day. Pulls the AI's tracked account performance
// from Alpaca (read-only calls — account balance, full equity history, and
// closed trade orders) using credentials stored as environment variables
// (never shipped to the browser), and stores a public-safe summary in
// Netlify Blobs for get-performance.js to serve. No dollar amounts are
// stored or shown — only percentages and entry/exit prices, matching the
// same privacy approach as the app's own subscriber-facing performance page.

import { getStore } from "@netlify/blobs";

const ALPACA_API_BASE = "https://paper-api.alpaca.markets";

function alpacaHeaders() {
  return {
    "APCA-API-KEY-ID": process.env.ALPACA_API_KEY_ID,
    "APCA-API-SECRET-KEY": process.env.ALPACA_API_SECRET_KEY,
  };
}

async function getAccount() {
  const res = await fetch(`${ALPACA_API_BASE}/v2/account`, { headers: alpacaHeaders() });
  if (!res.ok) throw new Error(`Account lookup failed: ${res.status}`);
  const data = await res.json();
  return { balance: parseFloat(data.equity || data.cash || 0) };
}

async function getPortfolioHistory() {
  const url = new URL(`${ALPACA_API_BASE}/v2/account/portfolio/history`);
  url.searchParams.set("period", "all");
  url.searchParams.set("timeframe", "1D");
  const res = await fetch(url, { headers: alpacaHeaders() });
  if (!res.ok) throw new Error(`Portfolio history failed: ${res.status}`);
  const data = await res.json();
  return {
    timestamps: data.timestamp || [],
    equity: data.equity || [],
  };
}

async function getClosedOrders() {
  const url = new URL(`${ALPACA_API_BASE}/v2/orders`);
  url.searchParams.set("status", "closed");
  url.searchParams.set("limit", "50");
  url.searchParams.set("nested", "true");
  url.searchParams.set("direction", "desc");
  const res = await fetch(url, { headers: alpacaHeaders() });
  if (!res.ok) throw new Error(`Orders lookup failed: ${res.status}`);
  return res.json();
}

// Mirrors the scanner script's own _reconstruct_closed_trades logic: only
// bracket orders where the entry filled AND one exit leg (take-profit or
// stop-loss) also filled count as a genuinely closed, reconstructable trade.
function reconstructClosedTrades(orders) {
  const out = [];
  for (const o of orders) {
    if (o.order_class !== "bracket" || o.status !== "filled") continue;
    const legs = o.legs || [];
    const filledLeg = legs.find((l) => l.status === "filled");
    if (!filledLeg) continue;
    const entryPrice = parseFloat(o.filled_avg_price);
    const exitPrice = parseFloat(filledLeg.filled_avg_price);
    if (!entryPrice || !exitPrice) continue;
    const side = o.side;
    const pct =
      side === "buy"
        ? ((exitPrice - entryPrice) / entryPrice) * 100
        : ((entryPrice - exitPrice) / entryPrice) * 100;
    out.push({
      symbol: o.symbol,
      side: side === "buy" ? "long" : "short",
      entry: entryPrice,
      exit: exitPrice,
      exitReason: filledLeg.type === "limit" ? "Target" : "Stop",
      pct,
      entryAt: o.filled_at,
      exitAt: filledLeg.filled_at,
    });
  }
  out.sort((a, b) => (b.exitAt || "").localeCompare(a.exitAt || ""));
  return out;
}

export default async () => {
  const keyId = process.env.ALPACA_API_KEY_ID;
  const secret = process.env.ALPACA_API_SECRET_KEY;
  if (!keyId || !secret) {
    console.error("ALPACA_API_KEY_ID / ALPACA_API_SECRET_KEY not set.");
    return new Response("Missing Alpaca credentials", { status: 500 });
  }

  try {
    const [account, history, orders] = await Promise.all([
      getAccount(),
      getPortfolioHistory(),
      getClosedOrders(),
    ]);

    const equity = history.equity;
    const timestamps = history.timestamps;
    let alltimePct = null;
    let equityPoints = [];

    if (equity.length >= 1 && equity[0]) {
      const baseline = equity[0];
      const current = account.balance;
      alltimePct = ((current - baseline) / baseline) * 100;

      equityPoints = timestamps
        .map((ts, i) => {
          const v = equity[i];
          if (v === null || v === undefined) return null;
          return {
            t: new Date(ts * 1000).toISOString(),
            pct: ((v - baseline) / baseline) * 100,
          };
        })
        .filter(Boolean);

      // Extend the line to "now" using the live current balance, so the
      // chart's last point agrees with the headline all-time % shown above it.
      const lastTs = timestamps[timestamps.length - 1];
      const nowTs = Math.floor(Date.now() / 1000);
      if (!lastTs || nowTs > lastTs) {
        equityPoints.push({ t: new Date().toISOString(), pct: alltimePct });
      }
    }

    const closedTrades = reconstructClosedTrades(orders);

    const store = getStore("performance", { consistency: "strong" });
    await store.setJSON("latest", {
      updatedAt: new Date().toISOString(),
      alltimePct,
      equityPoints,
      closedTrades,
    });

    return new Response(
      JSON.stringify({ ok: true, alltimePct, trades: closedTrades.length }),
      { headers: { "content-type": "application/json" } }
    );
  } catch (err) {
    console.error("Performance update failed:", err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};

export const config = {
  schedule: "@daily",
};
