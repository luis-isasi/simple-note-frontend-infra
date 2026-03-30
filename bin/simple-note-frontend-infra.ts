#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import { SimpleNoteFrontendStack } from '../lib/SimpleNoteFrontendStack';
import configuration from '../config/config.json';

const app = new App();

new SimpleNoteFrontendStack(app, {
  env: {
    region: configuration.region,
    account: configuration.account,
  },
});
