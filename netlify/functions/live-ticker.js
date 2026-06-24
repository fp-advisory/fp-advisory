// Called by the website on every page load. Fetches fresh quotes from Finnhub
// server-side so the API key never appears in the browser. No caching —
// always returns the latest available price.

const SYMBOLS = ["AAPL", "NVDA", "MSFT", "TSLA", "AMZN", "GOOGL", "META", "JPM", "SPY"];

export default async () => {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ data: [] }), {
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }

  const results = await Promise.all(
    SYMBOLS.map(async (sym) => {
      try {
        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${sym}&token=${apiKey}`
        );
        const q = await res.json();
        if (q && typeof q.c === "number" && q.c !== 0) {
          return { symbol: sym, price: q.c, changePct: q.dp || 0 };
        }
        return null;
      } catch {
        return null;
      }
    })
  );

  const clean = results.filter(Boolean);
  return new Response(JSON.stringify({ data: clean }), {
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
};
