# Hello World CDK Application with Lambda Weighted Alias Deployment

This project demonstrates a CDK application in Node.js that:
1. Creates a simple Lambda function that returns "Hello World"
2. Sets up a deployment pipeline using CodeDeploy
3. Implements weighted alias deployment for gradual rollouts

## Prerequisites
- Node.js
- AWS CDK CLI
- AWS CLI configured with appropriate credentials

## Installation
1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

3. Deploy the stack:
```bash
cdk deploy
```

## Deployment Strategy
The application uses CodeDeploy to manage Lambda function deployments with a LINEAR_10PERCENT_EVERY_1MINUTE configuration, meaning:
- Traffic is shifted gradually from the old version to the new version
- 10% of traffic is shifted every minute
- Total deployment time is approximately 10 minutes

## Project Structure
- `bin/app.ts` - CDK app entry point
- `lib/hello-world-stack.ts` - Stack definition with Lambda and deployment configuration
- `lambda/index.js` - Lambda function code