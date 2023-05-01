#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { AwsStepFunctionsTutorialStack } from "../lib/aws_step_functions_tutorial-stack";

const app = new cdk.App();

const STAGE: string = app.node.tryGetContext("stage");
const ACCOUNT_ID: string =
  app.node.tryGetContext("accountId") || process.env.CDK_DEFAULT_ACCOUNT;
const REGION: string =
  app.node.tryGetContext("region") || process.env.CDK_DEFAULT_REGION;


new AwsStepFunctionsTutorialStack(app, `AwsStepFunctionsTutorialStack-${STAGE}`, {
  env: {
    account: ACCOUNT_ID,
    region: REGION,
  },
});