const fetch = require("node-fetch");
const { ok, error, badRequest } = require("./response");

// NASA Image and Video Library API — no API key required
const NASA_SEARCH_BASE = "https://images-api.nasa.gov";

/**
 * searchNasa — API Gateway triggered Lambda
 *
 * GET /search?q=apollo
 * GET /search?q=nebula&mediaType=image
 * GET /search?q=saturn&yearStart=2020&yearEnd=2024
 * GET /search?q=mars rover&page=2
 *
 * Searches NASA's entire image and media library.
 * No API key needed — uses images-api.nasa.gov which is separate
 * from api.nasa.gov and fully operational.
 *
 * Supported mediaType values: image, video, audio
 */
exports.handler = async (event) => {
  console.log("searchNasa event:", JSON.stringify(event));

  try {
    const params = event.queryStringParameters || {};
    const query      = params.q;
    const mediaType  = params.mediaType || "image";
    const yearStart  = params.yearStart;
    const yearEnd    = params.yearEnd;
    const page       = params.page || "1";

    if (!query || !query.trim()) {
      return badRequest("Missing required query parameter: q");
    }

    // Build NASA search URL
    const url = new URL(`${NASA_SEARCH_BASE}/search`);
    url.searchParams.set("q", query.trim());
    url.searchParams.set("media_type", mediaType);
    url.searchParams.set("page", page);
    if (yearStart) url.searchParams.set("year_start", yearStart);
    if (yearEnd)   url.searchParams.set("year_end", yearEnd);

    console.log("Searching NASA library:", url.toString());

    const res = await fetch(url.toString());

    if (!res.ok) {
      const body = await res.text();
      console.error(`NASA search API error ${res.status}:`, body);
      return error(`NASA API error: ${res.status}`);
    }

    const data = await res.json();
    const items = data.collection?.items || [];

    // Normalize the response into a clean shape
    const results = items.map((item) => {
      const meta  = item.data?.[0] || {};
      const links = item.links || [];
      const thumb = links.find((l) => l.rel === "preview")?.href || null;

      return {
        nasaId:      meta.nasa_id,
        title:       meta.title,
        description: meta.description?.substring(0, 300) || null,
        mediaType:   meta.media_type,
        dateCreated: meta.date_created,
        center:      meta.center,
        keywords:    meta.keywords || [],
        thumbnail:   thumb,
        href:        item.href, // link to full asset collection
      };
    });

    const total = data.collection?.metadata?.total_hits || 0;

    return ok({
      query,
      mediaType,
      page: parseInt(page),
      totalResults: total,
      totalPages: Math.ceil(total / 100),
      count: results.length,
      results,
    });
  } catch (err) {
    console.error("searchNasa error:", err);
    return error("Failed to search NASA library");
  }
};