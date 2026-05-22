const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");
const fetch = require("node-fetch");

const ssm = new SSMClient({ region: process.env.AWS_REGION || "us-east-1" });

let cachedApiKey = null;

async function getNasaApiKey() {
  if (cachedApiKey) return cachedApiKey;
  const result = await ssm.send(new GetParameterCommand({
    Name: "/space-app/nasa-api-key",
    WithDecryption: true,
  }));
  cachedApiKey = result.Parameter.Value;
  return cachedApiKey;
}

async function nasaFetch(endpoint, params = {}) {
  const apiKey = await getNasaApiKey();
  const url = new URL(`https://api.nasa.gov${endpoint}`);
  url.searchParams.set("api_key", apiKey);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`NASA API error: ${res.status}`);
  return res.json();
}

module.exports = { nasaFetch };