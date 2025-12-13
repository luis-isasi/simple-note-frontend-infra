#!/usr/bin/env node
import * as cdk from "aws-cdk-lib/core";
import { SimpleNoteFrontendStack } from "../lib/SimpleNoteFrontendStack";
import config from "../config/config.json";

const app = new cdk.App();

new SimpleNoteFrontendStack(app, {
  env: {
    account: "192474940472",
    region: config.region,
  },
});
