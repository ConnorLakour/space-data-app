const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { nasaFetch } = require("./nasa");

const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
const TABLE = process.env.APOD_TABLE;

/**
 * fetchApod — EventBridge scheduled Lambda
 *
 * Runs daily. Fetches today's Astronomy Picture of the Day from NASA
 * and caches it in DynamoDB so the frontend doesn't hit NASA on every request.
 */
exports.handler = async () => {
  console.log("fetchApod: fetching today's APOD");

  try {
    const data = await nasaFetch("/planetary/apod");

    const item = {
      date:        data.date,           // partition key e.g. "2024-01-15"
      title:       data.title,
      explanation: data.explanation,
      url:         data.url,
      hdurl:       data.hdurl || data.url,
      mediaType:   data.media_type,     // "image" or "video"
      copyright:   data.copyright || "NASA",
      fetchedAt:   new Date().toISOString(),
      // TTL: expire after 48 hours (DynamoDB auto-deletes old records)
      ttl: Math.floor(Date.now() / 1000) + (48 * 60 * 60),
    };

    await db.send(new PutCommand({ TableName: TABLE, Item: item }));
    console.log("APOD cached for date:", item.date);
    return { success: true, date: item.date };
  } catch (err) {
    console.error("fetchApod error:", err);
    throw err;
  }
};