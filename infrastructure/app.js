const cdk = require("aws-cdk-lib");
const { SpaceAppStack } = require("./space-app-stack");

const app = new cdk.App();

new SpaceAppStack(app, "SpaceAppStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region:  process.env.CDK_DEFAULT_REGION || "us-east-1",
  },
  description: "Space Data Analysis App — NASA APIs + Lambda + DynamoDB + EventBridge",
});
