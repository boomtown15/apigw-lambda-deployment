import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import {RemovalPolicy, Stack} from "aws-cdk-lib";
import * as logs from 'aws-cdk-lib/aws-logs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as codedeploy from 'aws-cdk-lib/aws-codedeploy';
import * as ssm from 'aws-cdk-lib/aws-ssm';


export class LambdaCanaryStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /** Create basic Lambda function **/
    const lambdaFn = new lambda.Function(this, 'CanaryFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda'),
      description: 'Canary Lambda Function',
      currentVersionOptions: {
        removalPolicy: RemovalPolicy.RETAIN,
        retryAttempts: 1
      }
    });

    // Publish a new version
    const version = lambdaFn.currentVersion;

    const devAlias = new lambda.Alias(this, 'DevAlias', {
      aliasName: 'dev',
      version: version,
    });

    // Create CloudWatch alarm for monitoring errors during deployment
    const errorMetric = new cdk.aws_cloudwatch.Metric({
      namespace: 'AWS/Lambda',
      metricName: 'Errors',
      dimensionsMap: {
        FunctionName: lambdaFn.functionName,
        Resource: `${lambdaFn.functionName}:dev`
      },
      period: cdk.Duration.minutes(1),
      statistic: 'Sum',
    });

    const errorAlarm = new cdk.aws_cloudwatch.Alarm(this, 'DeploymentErrorAlarm', {
      metric: errorMetric,
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: 'Monitors for errors during deployment on dev alias',
      comparisonOperator: cdk.aws_cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    const config = new codedeploy.LambdaDeploymentConfig(this, 'CustomConfig', {
      trafficRouting: new codedeploy.TimeBasedCanaryTrafficRouting({
        interval: cdk.Duration.minutes(1),
        percentage: 25,
      }),
      deploymentConfigName: 'Canary25Percent1Minutes',
    });

    // create Lambda Deployment Group
    const deploymentGroup = new codedeploy.LambdaDeploymentGroup(this, 'CanaryDeployment', {
      application: new codedeploy.LambdaApplication(this, 'canaryDeploymentHellowWorld'),
      alias: devAlias,
      deploymentConfig: config,
      alarms: [errorAlarm],
    });

    /** Create REST API **/
    const api = new apigateway.RestApi(this, 'CanaryApi', {
      restApiName: 'Canary API',
      endpointTypes: [apigateway.EndpointType.REGIONAL],
    });

    // Create the Lambda integration that uses stageVariable.lambdaAlias as URI
    const integration = new apigateway.AwsIntegration({
      service: 'lambda',
      proxy: true,
      integrationHttpMethod: 'POST',
      // set path variable to lambda function alias using stage variable lambdaAlias
      path: `2015-03-31/functions/${lambdaFn.functionArn}:\${stageVariables.lambdaAlias}/invocations`,
    });

    // Add method to root resource
    api.root.addMethod('GET', integration);

    // Create deployment and stages
    const deployment = new apigateway.Deployment(this, 'ApiDeployment', {
      api,
      retainDeployments: true,
    });

    // Create dev stage
    const devStage = new apigateway.Stage(this, 'DevStageCanary', {
      deployment,
      stageName: 'dev',
      variables: {
        lambdaAlias: 'dev',
      },
      // Enable CloudWatch logging
      accessLogDestination: new apigateway.LogGroupLogDestination(
          new logs.LogGroup(this, 'CanaryDevAccessLogs')
      ),
      accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
      // Configure method logging settings
      methodOptions: {
        '/*/*': {  // This applies to all resources and methods
          loggingLevel: apigateway.MethodLoggingLevel.INFO
        }
      }
    });

  /**  Permissions **/

    // Add permission for API Gateway to invoke the Lambda function
    lambdaFn.addPermission('ApiGatewayInvoke', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      action: 'lambda:InvokeFunction',
      sourceArn: `arn:aws:execute-api:${Stack.of(this).region}:${Stack.of(this).account}:${api.restApiId}/*/*`,
    });

    // add permissions for API Gateway to invoke dev alias
    devAlias.addPermission('ApiGatewayInvokeDev', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      action: 'lambda:InvokeFunction',
      sourceArn: `arn:aws:execute-api:${Stack.of(this).region}:${Stack.of(this).account}:${api.restApiId}/*/GET/`,
    });

    /** storing output necessary for other stacks in SSM to decouple stacks **/
    // Store values in SSM Parameter Store instead of CloudFormation exports
    new ssm.StringParameter(this, 'LambdaFunctionArn', {
      parameterName: '/canary/dev/lambda-function-arn',
      stringValue: lambdaFn.functionArn,
    });

    new ssm.StringParameter(this, 'LambdaFunctionName', {
      parameterName: '/canary/dev/lambda-function-name',
      stringValue: lambdaFn.functionName,
    });

    new ssm.StringParameter(this, 'LambdaVersionArn', {
      parameterName: '/canary/dev/lambda-version-arn',
      stringValue: version.functionArn,
    });

    new ssm.StringParameter(this, 'ApiGatewayId', {
      parameterName: '/canary/dev/api-gateway-id',
      stringValue: api.restApiId,
    });

    new ssm.StringParameter(this, 'ApiGatewayRootResourceId', {
      parameterName: '/canary/dev/api-gateway-root-resource-id',
      stringValue: api.root.resourceId,
    });

   // store the api url for the dev stage in SSM parameter store and allow overwrite
    new ssm.StringParameter(this, 'ApiGatewayInvokeUrl', {
      parameterName: '/canary/dev/api-gateway-invoke-url',
      stringValue: `https://${api.restApiId}.execute-api.${Stack.of(this).region}.amazonaws.com/dev`,
    });



    // export API Gateway endpoint URL
    new cdk.CfnOutput(this, 'ApiGatewayEndpoint', {
      value: api.url,
    });

  }
}