const fetch = require("node-fetch");
const { ok, error, badRequest } = require("./response");

const NASA_SEARCH_BASE = "https://images-api.nasa.gov";

/**
 * getAsset — API Gateway triggered Lambda
 *
 * GET /search/asset/{nasaId}
 *
 * Fetches the full asset collection for a specific NASA item.
 * Returns direct links to the image/video files in various sizes.
 */
exports.handler = async (event) => {
  console.log("getAsset event:", JSON.stringify(event));

  try {
    const nasaId = event.pathParameters?.nasaId;
    if (!nasaId) return badRequest("Missing nasaId path parameter");

    // Fetch asset manifest
    const assetRes = await fetch(`${NASA_SEARCH_BASE}/asset/${encodeURIComponent(nasaId)}`);
    if (!assetRes.ok) return error(`Asset not found: ${nasaId}`, 404);
    const assetData = await assetRes.json();

    // Fetch metadata
    const metaRes = await fetch(`${NASA_SEARCH_BASE}/metadata/${encodeURIComponent(nasaId)}`);
    const metaData = metaRes.ok ? await metaRes.json() : null;

    const assets = assetData.collection?.items || [];

    // Categorize asset links by size/type
    const links = {
      orig:   assets.find((a) => a.href?.includes("~orig"))?.href || null,
      large:  assets.find((a) => a.href?.includes("~large"))?.href || null,
      medium: assets.find((a) => a.href?.includes("~medium"))?.href || null,
      small:  assets.find((a) => a.href?.includes("~small"))?.href || null,
      thumb:  assets.find((a) => a.href?.includes("~thumb"))?.href || null,
      all:    assets.map((a) => a.href),
    };

    return ok({
      nasaId,
      links,
      metadata: metaData,
    });
  } catch (err) {
    console.error("getAsset error:", err);
    return error("Failed to fetch asset");
  }
};