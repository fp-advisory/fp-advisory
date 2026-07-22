// Called by the website on every fetch. Returns live forex quotes
// server-side so the API key never appears in the browser.

const PAIRS = [
  { symbol: "OANDA:GBP_USD", display: "GBP/USD" },
  { symbol: "OANDA:EUR_USD", display: "EUR/USD" },
  { symbol: "OANDA:GBP_EUR", display: "GBP/EUR" },
  { symbol: "OANDA:USD_JPY", display: "USD/JPY" },
  { symbol: "OANDA:AUD_USD", display: "AUD/USD" },
  { symbol: "OANDA:USD_CAD", display: "USD/CAD" },
  { symbol: "OANDA:USD_CHF", display: "USD/CHF" },
  { symbol: "OANDA:EUR_GBP", display: "EUR/GBP" },
  { symbol: "OANDA:NZD_USD", display: "NZD/USD" },
];

export default async () => {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ data: [] }), {
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }

  const results = await Promise.all(
    PAIRS.map(async ({ symbol, display }) => {
      try {
        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`
        );
        const q = await res.json();
        if (q && typeof q.c === "number" && q.c !== 0) {
          return {
            symbol: display,
            price: q.c,
            changePct: typeof q.dp === "number" ? q.dp : 0,
          };
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
