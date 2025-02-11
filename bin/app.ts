#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { LambdaCanaryStack } from '../lib/lambda-canary-stack';
import {LambdaCanaryProdStack} from "../lib/lambda-canary-prod-stack";

const app = new cdk.App();
const devStack = new LambdaCanaryStack(app, 'LambdaCanaryStack-Dev');

// Then create the prod stack, passing the required props from dev stack
const prodStack = new LambdaCanaryProdStack(app, 'LambdaCanaryStack-Prod');

// Add dependency to ensure dev stack is deployed first
prodStack.addDependency(devStack);
