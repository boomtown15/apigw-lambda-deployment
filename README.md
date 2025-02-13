# Lambda Canary Deployment with AWS CDK

This repository demonstrates how to implement canary deployments for AWS Lambda functions using AWS CDK. The deployment strategy uses Lambda function aliases and AWS CodeDeploy to gradually shift traffic from the current version to the new version.

## Prerequisites

- [Node.js](https://nodejs.org/en/download) 20.x or later
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) installed and configured with appropriate credentials
- [AWS CDK](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html) installed
- For Github or GitLab based solutions, you'll need accounts for either platform
- Setup an AWS user or role with appropriate permissions.  See [policy README](README.policy.md) for details.   

> ℹ️ **Info**  
> You have 3 Options Available: [Stand-alone CDK](#deployment-stand-alone-cdk) [Github Actions Workflow](README.GitHub.md) [GitLab Pipeline](README.Gitlab.md)

## Deployment Stand-Alone CDK

### Fork and Setup
This solution uses a Github Actions workflow, which requires permissions to write to and create secrets in the destination repository.  Forking this repository into your own private repository will allow you to have control over those actions.

1. Fork this repository
   - Visit the repository on GitHub
   - Click the "Fork" button in the top right
   - Select your GitHub account as the destination

2. Clone your forked repository
   ```bash
   git clone https://github.com/YOUR_USERNAME/lambda-canary.git
   cd lambda-canary
   ```

3. Configure AWS Credentials in GitHub
   - Go to your GitHub repository settings
   - Navigate to "Secrets and variables" > "Actions"
   - Add the following secrets:
     - `AWS_ACCESS_KEY_ID`: Your AWS access key
     - `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
     - `AWS_REGION`: Your preferred AWS region (e.g., us-east-1)

## Additional Resources

For detailed documentation on the technologies used in this project, visit:
- [AWS CDK TypeScript Reference](https://docs.aws.amazon.com/cdk/api/v2/)
- [AWS Lambda Canary Deployments](https://docs.aws.amazon.com/lambda/latest/dg/configuring-alias-routing.html)
- [AWS CodeDeploy User Guide](https://docs.aws.amazon.com/codedeploy/latest/userguide/)

## Deployment Process

1. Install dependencies:
```bash
npm install
```

2. Bootstrap your AWS environment for CDK (if not already done):
```bash
npx cdk bootstrap
```

3. Review the Lambda function code in `lambda/index.js`
4. Run unit tests
```bash
npm run test:unit
 ```

5. Deploy the initial version:
```bash
cdk deploy cdk deploy LambdaCanaryStack-Dev
```

6. Run integration tests
```bash
npm run test:integration
```

7. Deploy the new version:
```bash
cdk deploy LambdaCanaryStack-Prod
 ```
   
## Understanding the Deployment Strategy

The deployment uses AWS CodeDeploy's LINEAR_10PERCENT_EVERY_1MINUTE configuration, which:
- Starts by routing 10% of traffic to the new version
- Increases traffic by 10% every minute
- Takes approximately 10 minutes to complete the shift
- Automatically rolls back if errors exceed specified thresholds

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
   - Check Lambda function error rates
   - Verify CodeDeploy service role permissions

## Contributing

1. Create a new branch for your changes
2. Make your changes and test locally
3. Submit a pull request with a clear description of changes

For more information, refer to:
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Lambda Aliases](https://docs.aws.amazon.com/lambda/latest/dg/configuration-aliases.html)
- [AWS CodeDeploy Documentation](https://docs.aws.amazon.com/codedeploy/)


## Project Structure

- `bin/` - Contains the CDK app entry point
- `lib/` - Contains the CDK stack definition
- `lambda/` - Contains the Lambda function code
- `test/` - Contains test files
```


