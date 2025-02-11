import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';
import {Stack} from "aws-cdk-lib";
import * as logs from 'aws-cdk-lib/aws-logs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as codedeploy from 'aws-cdk-lib/aws-codedeploy';



export class LambdaCanaryStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /** Create basic Lambda function **/
    const lambdaFn = new lambda.Function(this, 'CanaryFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda'),
      description: 'Canary Lambda Function',
    });

    // Create version and aliases
    const version = lambdaFn.currentVersion;
    const devAlias = new lambda.Alias(this, 'DevAlias', {
      aliasName: 'dev',
      version,
    });

    // Configure traffic shifting for prod alias
    const prodAlias = new lambda.Alias(this, 'ProdAlias', {
      aliasName: 'prod',
      version,
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

    // const prodAlias = new lambda.Alias(this, 'ProdAlias', {
    //   aliasName: 'prod',
    //   version,
    // });

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


/**  Since the prod stage is created by default, you need to go in after and update it. **/
    const updateStageVariables = new cr.AwsCustomResource(this, 'UpdateStageVariables', {
      onCreate: {
        service: 'APIGateway',
        action: 'updateStage',
        parameters: {
          restApiId: api.restApiId,
          stageName: 'prod',
          patchOperations: [
            {
              op: 'replace',
              path: '/variables/lambdaAlias',
              value: 'prod'
            }
          ]
        },
        physicalResourceId: cr.PhysicalResourceId.of('StageVariableUpdate')
      },
      onUpdate: {
        service: 'APIGateway',
        action: 'updateStage',
        parameters: {
          restApiId: api.restApiId,
          stageName: 'prod',
          patchOperations: [
            {
              op: 'replace',
              path: '/variables/lambdaAlias',
              value: 'prod'
            }
          ]
        },
        physicalResourceId: cr.PhysicalResourceId.of('StageVariableUpdate')
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ['apigateway:PATCH', 'apigateway:UpdateStage'],
          resources: [`arn:aws:apigateway:${Stack.of(this).region}::/restapis/${api.restApiId}/stages/*`],
          effect: iam.Effect.ALLOW
        })
      ])
    });

    // Make sure this runs after the stage is created
    updateStageVariables.node.addDependency(deployment);



  /**  Permissions **/

    // Add permission for API Gateway to invoke the Lambda function
    lambdaFn.addPermission('ApiGatewayInvoke', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      action: 'lambda:InvokeFunction',
      sourceArn: `arn:aws:execute-api:${Stack.of(this).region}:${Stack.of(this).account}:${api.restApiId}/*/*`,
    });

    // add permission for API Gateway to invoke prod lambda alias
    prodAlias.addPermission('ApiGatewayInvokeProd', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      action: 'lambda:InvokeFunction',
      sourceArn: `arn:aws:execute-api:${Stack.of(this).region}:${Stack.of(this).account}:${api.restApiId}/*/GET/`,
    });

    // add permissions for API Gateway to invoke dev alias
    devAlias.addPermission('ApiGatewayInvokeProd', {

      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      action: 'lambda:InvokeFunction',
      sourceArn: `arn:aws:execute-api:${Stack.of(this).region}:${Stack.of(this).account}:${api.restApiId}/*/GET/`,
    });

    // Export the function name for use in the GitHub Actions workflow
    new cdk.CfnOutput(this, 'FunctionName', {
      value: lambdaFn.functionName,
      description: 'Lambda function name',
    });


    /**  Outputs **/
    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: lambdaFn.functionName,
      description: 'The name of the Lambda function',
      exportName: 'CanaryLambdaFunctionName',
    });

    new cdk.CfnOutput(this, 'LambdaFunctionArn', {
      value: lambdaFn.functionArn,
      description: 'The ARN of the Lambda function',
      exportName: 'CanaryLambdaFunctionArn',
    });

    new cdk.CfnOutput(this, 'DevAliasName', {
      value: devAlias.aliasName,
      description: 'The name of the dev alias',
      exportName: 'CanaryDevAliasName',
    });

    new cdk.CfnOutput(this, 'ProdAliasName', {
      value: prodAlias.aliasName,
      description: 'The name of the prod alias',
      exportName: 'CanaryProdAliasName',
    });

  }
}