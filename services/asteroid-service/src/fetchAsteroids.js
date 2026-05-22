const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { nasaFetch } = require("./nasa");

const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" }));
const TABLE = process.env.ASTEROIDS_TABLE;

/**
 * fetchAsteroids — EventBridge scheduled Lambda
 *
 * Runs daily. Fetches near-earth objects for the next 7 days from NASA
 * NeoWs (Near Earth Object Web Service) and caches them in DynamoDB.
 */
exports.handler = async () => {
  console.log("fetchAsteroids: fetching near-earth objects");

  try {
    const today = new Date().toISOString().split("T")[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const data = await nasaFetch("/neo/rest/v1/feed", {
      start_date: today,
      end_date:   nextWeek,
    });

    const ttl = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
    let totalSaved = 0;

    // Flatten asteroids across all dates and save individually
    for (const [date, asteroids] of Object.entries(data.near_earth_objects)) {
      for (const asteroid of asteroids) {
        const closestApproach = asteroid.close_approach_data?.[0];
        const item = {
          id:                asteroid.id,
          date,
          name:              asteroid.name,
          nasaJplUrl:        asteroid.nasa_jpl_url,
          isPotentiallyHazardous: asteroid.is_potentially_hazardous_asteroid,
          estimatedDiameterMinKm: asteroid.estimated_diameter?.kilometers?.estimated_diameter_min,
          estimatedDiameterMaxKm: asteroid.estimated_diameter?.kilometers?.estimated_diameter_max,
          closestApproachDate:    closestApproach?.close_approach_date,
          missDistanceKm:         closestApproach?.miss_distance?.kilometers,
          relativeVelocityKmH:    closestApproach?.relative_velocity?.kilometers_per_hour,
          orbitingBody:           closestApproach?.orbiting_body,
          fetchedAt: new Date().toISOString(),
          ttl,
        };

        await db.send(new PutCommand({ TableName: TABLE, Item: item }));
        totalSaved++;
      }
    }

    console.log(`Saved ${totalSaved} asteroids to DynamoDB`);
    return { success: true, count: totalSaved };
  } catch (err) {
    console.error("fetchAsteroids error:", err);
    throw err;
  }
};
