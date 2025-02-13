This is the specific deployment README for Github Actions Workflow.  See main README for any pre-requisites and main content.  

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

4. Modify the Lambda functions under lambda directory, commit changes and push to the repository.  This will kickoff a pipeline workflow in the GitHub actions tab, which you can monitor for progress


## Additional Resources

For detailed documentation on the technologies used in this project, visit:
- [AWS CDK TypeScript Reference](https://docs.aws.amazon.com/cdk/api/v2/)
- [AWS Lambda Canary Deployments](https://docs.aws.amazon.com/lambda/latest/dg/configuring-alias-routing.html)
- [AWS CodeDeploy User Guide](https://docs.aws.amazon.com/codedeploy/latest/userguide/)
