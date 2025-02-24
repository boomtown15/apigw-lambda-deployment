# Lambda Canary Deployment with AWS CDK

> [!IMPORTANT]  
> This solution is intended for sandbox/development and non-production environments

This repository demonstrates how to implement canary deployments for AWS Lambda functions using AWS CDK. The deployment strategy uses Lambda function aliases and AWS CodeDeploy to gradually shift traffic from the current version to the new version.

This solution is not a guide or tutorial for GitHub Actions or GitLab.  It is assumed if using those methods, you have fundamental knowledge, access and permissions to those platforms.

See [Lambda Developer Guide](https://docs.aws.amazon.com/lambda/latest/dg/configuring-alias-routing.html) for more details on weighted alias and traffic shifting. 

## Project Structure

- `bin/` - Contains the CDK app entry point
- `lib/` - Contains the CDK stack definition
- `lambda/` - Contains the Lambda function code
- `test/` - Contains test files

## Prerequisites

- [Node.js](https://nodejs.org/en/download) 20.x or later
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) installed and configured with appropriate credentials
- [AWS CDK](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html) installed
- For Github or GitLab based solutions, you'll need accounts for the selected platform
- An AWS user or role for the CI/CD pipeline with appropriate permissions.  See [policy README](README.policy.md) for details.   

> [!NOTE]  
> There are 3 deployment options available: 
> [Stand-alone CDK](#deployment-stand-alone-cdk) for testing the deployment procedures manually   
> [Github Actions Workflow](#deployment-for-github-actions) for testing via a GitHub actions pipeline
> [GitLab Pipeline](#deployment-for-gitlab) for testing via a GitLab pipeline 


## Understanding the Deployment Strategy

The deployment uses AWS CodeDeploy's Canary deployment configuration, which:
- Starts by routing 25% of traffic to the new version for Dev alias, waiting 1 minute to shift additional traffic
- Starts by routing 10% of traffic to the new version for Prod alias, waiting 3 minutes to shift additional traffic
- Both deployments have CloudWatch alerts to rollback the deployment if any errors are encountered with the new version during the wait period

> [!NOTE]
View [Lambda deployments configurations](https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-configurations.html#deployment-configuration-lambda) for additional deployment options (Canary, Linear, All-At-Once). 

### Monitoring the Deployment

1. Open the AWS Console
2. Navigate to CodeDeploy > Deployments
3. Select your deployment to view:
   - Traffic shifting progress
   - CloudWatch metrics
   - Deployment status

### Rolling Back

- Automatic rollback occurs if error thresholds are exceeded
- Manual rollback can be initiated in the CodeDeploy console


## Deployment Stand-Alone CDK

You can use the stand-alone CDK process to test and iterate on the solution outside of a CI/CD provider.

1. Clone the repository
   ```bash
   git clone https://github.com/YOUR_USERNAME/apigw-lamba-deployment.git
   cd apigw-lambda-deployment
   ```

2. Install dependencies:
```bash
npm install
```

3. Bootstrap your AWS environment for CDK (if not already done):
```bash
npx cdk bootstrap
```

4. Review the Lambda function code in `lambda/index.js`

5. Run unit tests
```bash
npm run test:unit
 ```

6. Deploy the initial version
```bash
cdk deploy LambdaCanaryStack-Dev
```

7. Run integration tests
```bash
npm run test:integration
```

8. Deploy the new version:
```bash
cdk deploy LambdaCanaryStack-Prod
 ```

 
## Deployment for GitHub Actions

This solution uses a Github Actions workflow.  Forking this repository into your own private repository will allow you to have control over your own GitHub Actions workflow and secrets.

The .github/workflows/lambda-deploy.yml contains the following jobs:
1. **build and unit test**
    - Install dependencies
    - Runs unit tests
2. **deploy dev**
    - Deploys dev stack to AWS using CDK
    - Runs integration tests
3. **deploy prod**
    - Deploys prod stack to AWS using CDK

### Deployment Steps

1. [Fork the repository](https://github.com/boomtown15/apigw-lambda-deployment/fork)

2. Clone your forked repository
   ```bash
   git clone https://github.com/YOUR_USERNAME/apigw-lambda-deployment.git
   cd apigw-lambda-deployment
   ```

3. Configure AWS Credentials in GitHub
   - Go to your GitHub repository settings
   - Navigate to "Secrets and variables" > "Actions"
   - Add the following secrets:
      - `AWS_ACCESS_KEY_ID`: Your AWS access key
      - `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
   - Add the following variable: 
     - `AWS_DEFAULT_REGION`: Your preferred AWS region (e.g., us-east-1)

4. Modify the Lambda function under lambda directory (i.e. alert return message), commit changes and push to the repository.  [Manually start a pipeline execution](https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-workflow-runs/manually-running-a-workflow) in the GitHub actions monitor for progress.  To trigger pipeline executions on events, see [GitHub Action Docs](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/triggering-a-workflow)

## Deployment for GitLab

The GitLab CI/CD pipeline in `.gitlab-ci.yml` includes:

1. **build-unit-test**
    - Install dependencies
    - Runs unit tests

2. **deploy-dev-integration-test**
    - Deploys dev stack to AWS using CDK
    - Runs integration tests

3. **deploy-prod**
    - Deploys prod stack to AWS using CDK

### Deployment Steps

1. Create a GitLab repo and include code from this sample
2. Setup secrets and variables:
    - Navigate to Settings --> CI/CD, then Variables.  Create the following variables.  The AWS access key id and secret access key are sensitive and should be protected and masked.  Consult your security team for further guidance.  
      - AWS_ACCESS_KEY_ID: see pre-requisities section for setup
      - AWS_SECRET_ACCESS_KEY: see pre-requisities section for setup
      - AWS_DEFAULT_REGION: ex: us-east-1, us-west2, etc. 
3. [Setup a pipeline](https://docs.gitlab.com/ci/quick_start/) using the .gitlab-ci.yml file
4. Modify the Lambda function under lambda directory (i.e. alert return message), commit changes and push to the repository.  Start the pipeline manually or setup your own [trigger](https://docs.gitlab.com/ci/quick_start/).  

## Best Practices

1. Always test changes locally before deploying
2. Monitor CloudWatch metrics during deployment
3. Set appropriate alarms and error thresholds
4. Keep function versions for rollback capability

## Troubleshooting

Common issues and solutions:
1. Deployment fails to start
   - Verify AWS credentials are correctly set
   - Check CDK bootstrap status
   
2. Traffic shifting issues
   - Review CloudWatch logs
   - Verify permissions

## Additional Information 

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Lambda Aliases](https://docs.aws.amazon.com/lambda/latest/dg/configuration-aliases.html)
- [AWS CodeDeploy Documentation](https://docs.aws.amazon.com/codedeploy/)





