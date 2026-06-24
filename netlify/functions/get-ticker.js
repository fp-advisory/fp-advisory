import { getStore } from "@netlify/blobs";

export default async () => {
  try {
    const store = getStore("ticker", { consistency: "strong" });
    const cached = await store.get("latest", { type: "json" });
    return new Response(JSON.stringify(cached || { data: [] }), {
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ data: [] }), {
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }
};
