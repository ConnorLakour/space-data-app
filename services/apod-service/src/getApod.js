const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { nasaFetch } = require("./nasa");
const { ok, error } = require("./response");

const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
const TABLE = process.env.APOD_TABLE;

/**
 * getApod — API Gateway triggered Lambda
 *
 * GET /apod          → today's or most recent cached APOD
 * GET /apod?date=YYYY-MM-DD → specific date
 *
 * Tries cache first. On miss, tries the last 3 days from NASA.
 */
exports.handler = async (event) => {
  console.log("getApod event:", JSON.stringify(event));

  try {
    const requestedDate = event.queryStringParameters?.date;

    // If specific date requested, try cache then NASA
    if (requestedDate) {
      const cached = await db.send(new GetCommand({ TableName: TABLE, Key: { date: requestedDate } }));
      if (cached.Item) return ok({ ...cached.Item, cached: true });

      // Try fetching from NASA for that specific date
      try {
        const data = await nasaFetch("/planetary/apod", { date: requestedDate });
        return ok({ ...normalize(data), cached: false });
      } catch (err) {
        return error(`No APOD found for date: ${requestedDate}`);
      }
    }

    // No date specified — try last 3 days from cache first
    for (let daysBack = 0; daysBack <= 3; daysBack++) {
      const date = getDateString(daysBack);
      console.log("Checking cache for date:", date);
      const cached = await db.send(new GetCommand({ TableName: TABLE, Key: { date } }));
      if (cached.Item) {
        console.log("Serving APOD from cache for date:", date);
        return ok({ ...cached.Item, cached: true });
      }
    }

    // Nothing in cache — fetch from NASA trying last 3 days
    for (let daysBack = 0; daysBack <= 3; daysBack++) {
      const date = getDateString(daysBack);
      console.log("Cache miss — trying NASA for date:", date);
      try {
        const data = await nasaFetch("/planetary/apod", { date });
        const item = {
          ...normalize(data),
          fetchedAt: new Date().toISOString(),
          ttl: Math.floor(Date.now() / 1000) + (48 * 60 * 60),
        };
        await db.send(new PutCommand({ TableName: TABLE, Item: item }));
        return ok({ ...item, cached: false });
      } catch (fetchErr) {
        console.warn(`NASA APOD not available for ${date}:`, fetchErr.message);
      }
    }

    return error("APOD not available at this time");
  } catch (err) {
    console.error("getApod error:", err);
    return error("Failed to fetch APOD");
  }
};

function getDateString(daysBack) {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return d.toISOString().split("T")[0];
}

function normalize(data) {
  return {
    date:        data.date,
    title:       data.title,
    explanation: data.explanation,
    url:         data.url,
    hdurl:       data.hdurl || data.url,
    mediaType:   data.media_type,
    copyright:   data.copyright || "NASA",
  };
}