# CI CD AWS Service Account Policy

This [policy document](cd-aws-policy.json) provides the necessary AWS IAM permissions for the GitHub Actions workflows to deploy and manage AWS resources. The policy follows the principle of least privilege and scopes resources to the "LambdaCanary" prefix.

## Included Permissions

The policy grants specific permissions for:
- CloudFormation stack management
- S3 bucket operations
- IAM role management
- Lambda function deployment and updates
- API Gateway configuration
- CloudWatch metrics and logs

## Usage

### Steps to Setup IAM user with appropriate permissions 

If you already have a user or role for your CI/CD pipeline, you will want to review them to ensure they include the necessary permissions.  To create a new user with appropriate permissions, you can follow these steps: 

## Setup Instructions

### 1. Create IAM User

You can replace the user name and policy name with relevant names for your environment.    

Create IAM user: 
```
aws iam create-user --user-name cicd-user
```

Create access keys for the user and save the access key id and secrete access key output for a later step: 
```
aws iam create-access-key --user-name cicd-user
```

### 2. Create IAM Policy

Create the policy using the JSON file:
```bash
aws iam create-policy \
    --policy-name cicd-policy \
    --policy-document file://cd-aws-policy.json
```
Note the ARN created for the policy for the next step.  

### 3. Attach Policy to User

Replace the ARN with the policy ARN value from output on the previous command.  
```bash
aws iam attach-user-policy \
    --user-name cicd-user \
    --policy-arn arn:aws:iam::ACCOUNT_ID:policy/cicd-policy
```

### 4. Setup CI CD Secrets if using GitHub or GitLab

#### GitHub Actions
1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Add the following secrets:
   - `AWS_ACCESS_KEY_ID`: Your IAM user's access key ID
   - `AWS_SECRET_ACCESS_KEY`: Your IAM user's secret access key
4. Add the following variable: 
   - `AWS_REGION`: Your desired AWS region (e.g., us-east-1)

#### GitLab CI CD
1. Go to your GitLab project
2. Navigate to Settings > CI/CD > Variables
3. Add the following variables (access key and key id mark as Protected and Masked)
   - `AWS_ACCESS_KEY_ID`: Your IAM user's access key ID
   - `AWS_SECRET_ACCESS_KEY`: Your IAM user's secret access key
   - `AWS_REGION`: Your desired AWS region (e.g., us-east-1)

## Cleanup

When you no longer need the CI/CD user and policy, follow these steps to clean up the AWS resources.  You will need the ARN for the policy created earlier in this README.  If you need to obtain this again, you can find it through the IAM console, searching for the cicd policy. 

### 1. Remove Policy from User

```bash
aws iam detach-user-policy \
    --user-name cicd-user \
    --policy-arn arn:aws:iam::ACCOUNT_ID:policy/cicd-policy
```

### 2. Delete Access Keys

First, list the access keys:
```bash
aws iam list-access-keys --user-name cicd-user
```

Then delete each access key:
```bash
aws iam delete-access-key \
    --user-name cicd-user \
    --access-key-id ACCESS_KEY_ID
```

### 3. Delete IAM User

```bash
aws iam delete-user --user-name cicd-user
```

### 4. Delete IAM Policy

```bash
aws iam delete-policy --policy-arn arn:aws:iam::ACCOUNT_ID:policy/cicd-policy
```

Note: Replace `ACCOUNT_ID` with your AWS account ID in the above commands.

### 5. Remove any secrets and variables created in your CI CD system



