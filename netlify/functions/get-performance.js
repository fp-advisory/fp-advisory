// Called by the website on page load. Simply reads whatever the daily
// scheduled function last stored — no Alpaca call happens here, so this
// costs nothing no matter how much traffic the site gets.

import { getStore } from "@netlify/blobs";

export default async () => {
  try {
    const store = getStore("performance", { consistency: "strong" });
    const cached = await store.get("latest", { type: "json" });

    return new Response(
      JSON.stringify(cached || { alltimePct: null, equityPoints: [], closedTrades: [] }),
      {
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ alltimePct: null, equityPoints: [], closedTrades: [] }),
      {
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      }
    );
  }
};
