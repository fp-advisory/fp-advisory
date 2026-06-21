// Called by the website's ticker on every page load. Simply reads whatever
// the daily scheduled function last stored — no Finnhub call happens here,
// so this costs nothing against the API rate limit no matter how much
// traffic the site gets. Always no-store: this is a cheap blob read, so
// there's no reason to risk a stale cached response anywhere along the way.

import { getStore } from "@netlify/blobs";

export default async () => {
  try {
    const store = getStore("ticker", { consistency: "strong" });
    const cached = await store.get("latest", { type: "json" });

    return new Response(JSON.stringify(cached || { data: [] }), {
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ data: [] }), {
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  }
};
