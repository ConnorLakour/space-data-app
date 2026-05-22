const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { ok, error } = require("./response");

const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
const TABLE = process.env.ASTEROIDS_TABLE;

/**
 * listAsteroids — API Gateway triggered Lambda
 *
 * GET /asteroids                    → all upcoming asteroids
 * GET /asteroids?hazardous=true     → only potentially hazardous ones
 * GET /asteroids?date=YYYY-MM-DD    → asteroids for a specific date
 */
exports.handler = async (event) => {
  console.log("listAsteroids event:", JSON.stringify(event));

  try {
    const { hazardous, date } = event.queryStringParameters || {};

    let items;

    if (date) {
      // Query by date using GSI
      const result = await db.send(new QueryCommand({
        TableName: TABLE,
        IndexName: "dateIndex",
        KeyConditionExpression: "#date = :date",
        ExpressionAttributeNames: { "#date": "date" },
        ExpressionAttributeValues: { ":date": date },
      }));
      items = result.Items;
    } else {
      const result = await db.send(new ScanCommand({ TableName: TABLE }));
      items = result.Items;
    }

    // Filter hazardous if requested
    if (hazardous === "true") {
      items = items.filter((a) => a.isPotentiallyHazardous);
    }

    // Sort by closest approach date
    items.sort((a, b) => new Date(a.closestApproachDate) - new Date(b.closestApproachDate));

    return ok({
      asteroids: items,
      count: items.length,
      hazardousCount: items.filter((a) => a.isPotentiallyHazardous).length,
    });
  } catch (err) {
    console.error("listAsteroids error:", err);
    return error("Failed to fetch asteroids");
  }
};
