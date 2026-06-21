// Called by the website's ticker on every page load. Simply reads whatever
// the daily scheduled function last stored — no Finnhub call happens here,
// so this costs nothing against the API rate limit no matter how much
// traffic the site gets.

import { getStore } from "@netlify/blobs";

export default async () => {
  try {
    const store = getStore("ticker", { consistency: "strong" });
    const cached = await store.get("latest", { type: "json" });

    let keys = null;
    try {
      const listResult = await store.list();
      keys = listResult.blobs.map((b) => b.key);
    } catch (listErr) {
      keys = `list() failed: ${listErr.message}`;
    }

    return new Response(
      JSON.stringify({
        data: (cached && cached.data) || [],
        _debug: {
          cachedIsNull: cached === null,
          cachedIsUndefined: cached === undefined,
          rawCached: cached,
          storeKeys: keys,
        },
      }),
      {
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ data: [], _debug: { error: err.message, stack: err.stack } }),
      { headers: { "content-type": "application/json" } }
    );
  }
};
