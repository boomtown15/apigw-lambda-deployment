# GitHub AWS Service Account Policy

This policy document (`github-aws-policy.json`) provides the necessary AWS IAM permissions for the GitHub Actions workflows to deploy and manage AWS resources. The policy follows the principle of least privilege and scopes resources to the "LambdaCanary" prefix.

## Included Permissions

The policy grants specific permissions for:
- CloudFormation stack management
- S3 bucket operations
- IAM role management
- Lambda function deployment and updates
- API Gateway configuration
- CloudWatch metrics and logs

## Resource Scoping

All resources are scoped to prevent unintended access:
- CloudFormation stacks: `LambdaCanary*`
- S3 buckets: `lambdacanary*`
- IAM roles: `LambdaCanary*`
- Lambda functions: `LambdaCanary*`
- CloudWatch log groups: `LambdaCanary*`

## Usage

Apply this policy to the IAM role or user that GitHub Actions uses for AWS authentication.

### Steps

Create the policy


Create the user


Apply the policy to the user

 
Generate secrets


