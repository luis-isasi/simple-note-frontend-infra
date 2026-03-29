#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import { SimpleNoteFrontendStack } from '../lib/SimpleNoteFrontendStack';
import { SimpleNoteCertificatesStack } from '../lib/SimpleNoteCertificatesStack';
import configuration from '../config/config.json';

const app = new App();

const certificates = new SimpleNoteCertificatesStack(app, {
  env: {
    region: 'us-east-1',
    account: configuration.account,
  },
  crossRegionReferences: true,
});

new SimpleNoteFrontendStack(app, {
  env: {
    region: configuration.region,
    account: configuration.account,
  },
  crossRegionReferences: true,
  certificates: {
    development: certificates.development,
    production: certificates.production,
  },
});
