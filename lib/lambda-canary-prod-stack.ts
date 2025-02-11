import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import {Stack} from "aws-cdk-lib";
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as codedeploy from 'aws-cdk-lib/aws-codedeploy';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as ssm from 'aws-cdk-lib/aws-ssm';

export class LambdaCanaryProdStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Import the Lambda function and version from dev stack using SSM Parameters
    const devLambdaFunctionArn = ssm.StringParameter.valueForStringParameter(
        this,
        '/canary/dev/lambda-function-arn'
    );
    const devLambdaFunctionName = ssm.StringParameter.valueForStringParameter(
        this,
        '/canary/dev/lambda-function-name'
    );
    const devLambdaVersionArn = ssm.StringParameter.valueForStringParameter(
        this,
        '/canary/dev/lambda-version-arn'
    );
    const devApiId = ssm.StringParameter.valueForStringParameter(
        this,
        '/canary/dev/api-gateway-id'
    );

    const importedFunction = lambda.Function.fromFunctionArn(
        this,
        'ImportedFunction',
        devLambdaFunctionArn
    );

    const importedVersion = lambda.Version.fromVersionArn(
        this,
        'ImportedVersion',
        devLambdaVersionArn
    );

    const prodAlias = new lambda.Alias(this, 'ProdAlias', {
      aliasName: 'prod',
      version: importedVersion,
    });

    // Import API Gateway from dev stack using SSM Parameters
    const devApiGatewayId = ssm.StringParameter.valueForStringParameter(
        this,
        '/canary/dev/api-gateway-id'
    );
    const devApiGatewayRootResourceId = ssm.StringParameter.valueForStringParameter(
        this,
        '/canary/dev/api-gateway-root-resource-id'
    );

    const importedApi = apigateway.RestApi.fromRestApiAttributes(this, 'ImportedApi', {
      restApiId: devApiGatewayId,
      rootResourceId: devApiGatewayRootResourceId,
    });


    // Update the Lambda function alias permissions for the API Gateway
    importedFunction.addPermission('ApiGatewayInvoke', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: importedApi.arnForExecuteApi()
    });

    /**  Since the prod stage is created by default, you need to go in after and update it. **/
    const updateStageVariables = new cr.AwsCustomResource(this, 'UpdateStageVariables', {
      onCreate: {
        service: 'APIGateway',
        action: 'updateStage',
        parameters: {
          restApiId: devApiId,
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
          restApiId: devApiId,
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
          resources: [`arn:aws:apigateway:${Stack.of(this).region}::/restapis/${devApiId}/stages/*`],
          effect: iam.Effect.ALLOW
        })
      ])
    });

    // Create CloudWatch alarm for monitoring errors during deployment
    const errorMetric = new cdk.aws_cloudwatch.Metric({
      namespace: 'AWS/Lambda',
      metricName: 'Errors',
      dimensionsMap: {
        FunctionName: devLambdaFunctionName,
        Resource: `${devLambdaFunctionName}:prod`
      },
      period: cdk.Duration.minutes(1),
      statistic: 'Sum',
    });

    const errorAlarm = new cdk.aws_cloudwatch.Alarm(this, 'DeploymentErrorAlarmProd', {
      metric: errorMetric,
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: 'Monitors for errors during deployment on prod alias',
      comparisonOperator: cdk.aws_cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    const config = new codedeploy.LambdaDeploymentConfig(this, 'CustomConfigProd', {
      trafficRouting: new codedeploy.TimeBasedCanaryTrafficRouting({
        interval: cdk.Duration.minutes(3),
        percentage: 10,
      }),
      deploymentConfigName: 'Canary10Percent3Minutes',
    });

    // create Lambda Deployment Group
    const deploymentGroup = new codedeploy.LambdaDeploymentGroup(this, 'CanaryDeploymentProd', {
      application: new codedeploy.LambdaApplication(this, 'canaryDeploymentHellowWorldProd'),
      alias: prodAlias,
      deploymentConfig: config,
      alarms: [errorAlarm],
    });

    // Add permission for API Gateway to invoke prod lambda alias
    prodAlias.addPermission('ApiGatewayInvokeProd', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      action: 'lambda:InvokeFunction',
      sourceArn: `arn:aws:execute-api:${Stack.of(this).region}:${Stack.of(this).account}:${devApiId}/*/GET/`,
    });

  }
}