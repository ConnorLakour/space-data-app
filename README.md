# Space Data App 

A real-time space data dashboard powered by NASA APIs, built on AWS microservices and deployed with CDK.

🌐 **Live site:** [connorlakour.com/space](https://connorlakour.com/space)

---

## What it does

| Feature | Description |
|---|---|
| 🌌 Astronomy Picture of the Day | Fetches and caches NASA's daily APOD image or video |
| ☄️ Asteroid Tracker | Tracks near-earth objects including hazardous ones with miss distance, velocity, and diameter |
| 🔭 NASA Search | Search over 140,000 NASA images, videos, and audio recordings |

---

## Architecture

```
React Dashboard (S3 + CloudFront)
        │
        ▼
   API Gateway
  ┌─────┼──────┐
  ▼     ▼      ▼
 APOD  Asteroid Search
Service Service  Service
  │       │
  ▼       ▼
DynamoDB DynamoDB
(cached) (cached)
  ▲       ▲
  │       │
EventBridge (daily cron)
```

### Services

| Service | Trigger | Description |
|---|---|---|
| APOD fetch | EventBridge daily 6am UTC | Fetches today's APOD and caches in DynamoDB |
| APOD get | API Gateway GET /apod | Serves APOD from cache, falls back to NASA |
| Asteroid fetch | EventBridge daily 6:30am UTC | Fetches next 7 days of near-earth objects |
| Asteroid list | API Gateway GET /asteroids | Serves asteroid data with optional hazard filter |
| NASA search | API Gateway GET /search | Searches NASA image and media library |
| Asset get | API Gateway GET /search/asset/{id} | Fetches full asset details for a NASA item |

---

## Tech stack

- **Runtime:** Node.js 20 on AWS Lambda
- **API:** AWS API Gateway (REST)
- **Database:** AWS DynamoDB (TTL enabled — old records auto-expire)
- **Scheduler:** AWS EventBridge (cron rules for daily data ingestion)
- **Secrets:** AWS SSM Parameter Store (NASA API key stored encrypted)
- **Infrastructure:** AWS CDK
- **Frontend:** React deployed to S3 + CloudFront

---

## Quick start

### Prerequisites

- Node.js 18+
- AWS CLI configured (`aws configure`)
- AWS CDK installed (`npm install -g aws-cdk`)
- NASA API key from [api.nasa.gov](https://api.nasa.gov)

### Clone and install

```powershell
git clone https://github.com/ConnorLakour/space-data-app.git
cd space-data-app
```

Install dependencies for each service:

```powershell
cd services/apod-service
npm install

cd ../asteroid-service
npm install

cd ../search-service
npm install

cd ../../infrastructure
npm install
```

### Store your NASA API key

```powershell
aws ssm put-parameter --name "/space-app/nasa-api-key" --value "YOUR_NASA_API_KEY" --type "SecureString" --overwrite
```

### Deploy

```powershell
cd infrastructure
npx cdk bootstrap
npx cdk deploy SpaceAppStack
```

CDK will print your API Gateway URL when done.

### Seed initial data

Manually trigger the scheduled Lambdas to populate DynamoDB before the daily cron runs:

```powershell
aws lambda invoke --function-name space-apod-fetch --payload "{}" response.json
aws lambda invoke --function-name space-asteroids-fetch --payload "{}" response.json
```

### Deploy the dashboard

```powershell
cd dashboard
npm install
npm run build
aws s3 sync build s3://YOUR_BUCKET/space --delete
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

---

## Project structure

```
space-data-app/
├── services/
│   ├── apod-service/
│   │   └── src/
│   │       ├── fetchApod.js       EventBridge triggered — caches APOD daily
│   │       ├── getApod.js         GET /apod — serves from cache
│   │       ├── nasa.js            NASA API helper (reads key from SSM)
│   │       └── response.js        HTTP response helpers
│   ├── asteroid-service/
│   │   └── src/
│   │       ├── fetchAsteroids.js  EventBridge triggered — caches NEOs daily
│   │       ├── listAsteroids.js   GET /asteroids — serves asteroid data
│   │       ├── nasa.js
│   │       └── response.js
│   └── search-service/
│       └── src/
│           ├── searchNasa.js      GET /search — NASA image library search
│           ├── getAsset.js        GET /search/asset/{id} — full asset details
│           └── response.js
├── infrastructure/
│   ├── app.js                     CDK app entrypoint
│   ├── space-app-stack.js         All resources defined here
│   └── cdk.json
└── dashboard/                     React frontend
    └── src/
        ├── App.js
        └── App.css
```

---

## API reference

### GET /apod
```json
{
  "date": "2026-05-21",
  "title": "The Milky Way over...",
  "explanation": "...",
  "url": "https://apod.nasa.gov/...",
  "mediaType": "image",
  "copyright": "NASA",
  "cached": true
}
```

### GET /asteroids
```json
{
  "asteroids": [...],
  "count": 42,
  "hazardousCount": 3
}
```

### GET /search?q=apollo
```json
{
  "query": "apollo",
  "totalResults": 5823,
  "results": [...]
}
```

---

## Key design decisions

**DynamoDB TTL** — APOD records expire after 48 hours, asteroid records after 24 hours. Old data is automatically deleted with no manual cleanup.

**SSM Parameter Store** — NASA API key is stored encrypted, never hardcoded in code or environment variables visible in the AWS console.

**EventBridge scheduling** — Data is ingested once daily on a cron schedule rather than fetching from NASA on every request. This keeps costs low and response times fast.

**NASA Image Library** — Uses `images-api.nasa.gov` which requires no API key and provides access to NASA's entire public media archive.

---

## License

MIT
