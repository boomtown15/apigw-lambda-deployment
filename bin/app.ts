#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { LambdaCanaryStack } from '../lib/lambda-canary-stack';

const app = new cdk.App();
new LambdaCanaryStack(app, 'LambdaCanaryStack');