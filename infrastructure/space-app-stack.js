const { Stack, Duration, RemovalPolicy, CfnOutput } = require("aws-cdk-lib");
const dynamodb   = require("aws-cdk-lib/aws-dynamodb");
const lambda     = require("aws-cdk-lib/aws-lambda");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const events     = require("aws-cdk-lib/aws-events");
const targets    = require("aws-cdk-lib/aws-events-targets");
const iam        = require("aws-cdk-lib/aws-iam");
const path       = require("path");

class SpaceAppStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const apodTable = new dynamodb.Table(this, "ApodTable", {
      tableName: "space-apod",
      partitionKey: { name: "date", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
      timeToLiveAttribute: "ttl",
    });

    const asteroidsTable = new dynamodb.Table(this, "AsteroidsTable", {
      tableName: "space-asteroids",
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
      timeToLiveAttribute: "ttl",
    });

    asteroidsTable.addGlobalSecondaryIndex({
      indexName: "dateIndex",
      partitionKey: { name: "date", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const ssmPolicy = new iam.PolicyStatement({
      actions: ["ssm:GetParameter"],
      resources: ["arn:aws:ssm:*:*:parameter/space-app/*"],
    });

    const commonEnv = { NODE_OPTIONS: "--enable-source-maps" };

    const apodFetchFn = new lambda.Function(this, "FetchApod", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "src/fetchApod.handler",
      functionName: "space-apod-fetch",
      timeout: Duration.seconds(30),
      memorySize: 256,
      code: lambda.Code.fromAsset(path.join(__dirname, "../services/apod-service")),
      environment: { ...commonEnv, APOD_TABLE: apodTable.tableName },
    });

    const apodGetFn = new lambda.Function(this, "GetApod", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "src/getApod.handler",
      functionName: "space-apod-get",
      timeout: Duration.seconds(15),
      memorySize: 256,
      code: lambda.Code.fromAsset(path.join(__dirname, "../services/apod-service")),
      environment: { ...commonEnv, APOD_TABLE: apodTable.tableName },
    });

    apodTable.grantWriteData(apodFetchFn);
    apodTable.grantReadWriteData(apodGetFn);
    apodFetchFn.addToRolePolicy(ssmPolicy);
    apodGetFn.addToRolePolicy(ssmPolicy);

    const asteroidFetchFn = new lambda.Function(this, "FetchAsteroids", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "src/fetchAsteroids.handler",
      functionName: "space-asteroids-fetch",
      timeout: Duration.seconds(60),
      memorySize: 256,
      code: lambda.Code.fromAsset(path.join(__dirname, "../services/asteroid-service")),
      environment: { ...commonEnv, ASTEROIDS_TABLE: asteroidsTable.tableName },
    });

    const asteroidListFn = new lambda.Function(this, "ListAsteroids", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "src/listAsteroids.handler",
      functionName: "space-asteroids-list",
      timeout: Duration.seconds(15),
      memorySize: 256,
      code: lambda.Code.fromAsset(path.join(__dirname, "../services/asteroid-service")),
      environment: { ...commonEnv, ASTEROIDS_TABLE: asteroidsTable.tableName },
    });

    asteroidsTable.grantWriteData(asteroidFetchFn);
    asteroidsTable.grantReadData(asteroidListFn);
    asteroidFetchFn.addToRolePolicy(ssmPolicy);

    const searchFn = new lambda.Function(this, "SearchNasa", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "src/searchNasa.handler",
      functionName: "space-search",
      timeout: Duration.seconds(15),
      memorySize: 256,
      code: lambda.Code.fromAsset(path.join(__dirname, "../services/search-service")),
      environment: { ...commonEnv },
    });

    const assetFn = new lambda.Function(this, "GetAsset", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "src/getAsset.handler",
      functionName: "space-asset-get",
      timeout: Duration.seconds(15),
      memorySize: 256,
      code: lambda.Code.fromAsset(path.join(__dirname, "../services/search-service")),
      environment: { ...commonEnv },
    });

    new events.Rule(this, "ApodDailyRule", {
      ruleName: "space-apod-daily",
      schedule: events.Schedule.cron({ minute: "0", hour: "6" }),
      targets: [new targets.LambdaFunction(apodFetchFn)],
    });

    new events.Rule(this, "AsteroidsDailyRule", {
      ruleName: "space-asteroids-daily",
      schedule: events.Schedule.cron({ minute: "30", hour: "6" }),
      targets: [new targets.LambdaFunction(asteroidFetchFn)],
    });

    const api = new apigateway.RestApi(this, "SpaceApi", {
      restApiName: "space-app",
      description: "Space Data Analysis API",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ["Content-Type"],
      },
      deployOptions: { stageName: "prod", tracingEnabled: true },
    });

    api.root.addResource("apod").addMethod("GET", new apigateway.LambdaIntegration(apodGetFn));
    api.root.addResource("asteroids").addMethod("GET", new apigateway.LambdaIntegration(asteroidListFn));

    const search = api.root.addResource("search");
    search.addMethod("GET", new apigateway.LambdaIntegration(searchFn));
    search.addResource("asset").addResource("{nasaId}").addMethod("GET", new apigateway.LambdaIntegration(assetFn));

    new CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "Space App API Gateway URL",
      exportName: "SpaceAppApiUrl",
    });
  }
}

module.exports = { SpaceAppStack };
