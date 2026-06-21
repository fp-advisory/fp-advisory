// Called by the website's ticker on every page load. Simply reads whatever
// the daily scheduled function last stored — no Finnhub call happens here,
// so this costs nothing against the API rate limit no matter how much
// traffic the site gets.

import { getStore } from "@netlify/blobs";

export default async () => {
  const store = getStore("ticker");
  const cached = await store.get("latest", { type: "json" });

  return new Response(JSON.stringify(cached || { data: [] }), {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=3600",
    },
  });
};
