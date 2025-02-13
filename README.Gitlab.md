
# Canary based deployment with GitLab

> ℹ️ **Info**  
> This is a work in progress.  Will be updated after testing.  


This document explains how to migrate the AWS Lambda deployment pipeline from GitHub Actions to GitLab CI/CD.

## AWS Permissions Setup

1. Create an IAM user for GitLab CI/CD with permissions stated in [the Policy README](README.policy.md)

2. Configure GitLab CI/CD Variables:
   1. Go to your GitLab project
   2. Navigate to Settings > CI/CD > Variables
   3. Add the following variables:
      - `AWS_ACCESS_KEY_ID` (masked and protected)
      - `AWS_SECRET_ACCESS_KEY` (masked and protected)
      - `AWS_DEFAULT_REGION` (if different from us-east-1)

## Pipeline Features

The GitLab CI/CD pipeline in `.gitlab-ci.yml` includes:

1. **Test Stage**
   - Runs unit tests
   - Runs integration tests with extended timeout
   - Generates JUnit reports

2. **Build Stage**
   - Compiles TypeScript code
   - Builds CDK infrastructure
   - Caches dependencies for faster builds
   - Creates artifacts for deployment

3. **Deploy Stage**
   - Deploys to AWS using CDK
   - Only runs on main branch
   - Requires successful test and build stages

## Key Differences from GitHub Actions

1. **Variables**: GitLab uses CI/CD variables instead of GitHub Secrets
2. **Cache**: GitLab has built-in caching that's configured in the pipeline
3. **Artifacts**: GitLab uses a different syntax for artifacts handling
4. **Environment**: Production environment is explicitly defined
5. **Dependencies**: Stage dependencies are managed using `needs`

## Technical Requirements

- Node.js >= 22.0.0
- AWS CDK
- TypeScript
- Jest for testing

## Common Issues

1. **Node.js Version**: Ensure the Node.js version meets the requirement (>= 22.0.0)
2. **AWS Permissions**: Verify all required AWS permissions are granted
3. **Protected Variables**: Ensure AWS credentials are marked as protected and masked
4. **Resource Names**: All AWS resources are prefixed with "LambdaCanary" as per the IAM policy