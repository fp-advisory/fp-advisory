// Runs automatically once a day. Fetches live quotes from Finnhub using the
// FINNHUB_API_KEY environment variable (set in Netlify's dashboard — never
// shipped to the browser) and stores the result in Netlify Blobs, where
// get-ticker.js can serve it to every visitor without any per-visitor API calls.

import { getStore } from "@netlify/blobs";

const SYMBOLS = ["AAPL", "NVDA", "MSFT", "TSLA", "AMZN", "GOOGL", "META", "JPM", "SPY"];

export default async () => {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    console.error("FINNHUB_API_KEY environment variable is not set.");
    return new Response("Missing FINNHUB_API_KEY", { status: 500 });
  }

  const results = [];
  for (const symbol of SYMBOLS) {
    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`
      );
      const quote = await res.json();
      if (quote && typeof quote.c === "number" && quote.c !== 0) {
        results.push({
          symbol,
          price: quote.c,
          changePct: typeof quote.dp === "number" ? quote.dp : 0,
        });
      }
    } catch (err) {
      console.error(`Failed to fetch quote for ${symbol}:`, err);
    }
  }

  if (results.length > 0) {
    const store = getStore("ticker");
    await store.setJSON("latest", {
      updatedAt: new Date().toISOString(),
      data: results,
    });
    console.log(`Ticker updated: ${results.length} symbols.`);
  } else {
    console.error("No quotes were fetched — leaving previous data in place.");
  }

  return new Response(
    JSON.stringify({ ok: true, count: results.length }),
    { headers: { "content-type": "application/json" } }
  );
};

// Modern Netlify scheduled-function syntax — runs once every day.
export const config = {
  schedule: "@daily",
};
