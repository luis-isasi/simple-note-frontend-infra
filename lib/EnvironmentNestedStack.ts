import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { aws_certificatemanager as acm } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CustomWebBucket } from './constructs/CustomWebBucket';
import { CustomSite } from './constructs/CustomSite';
import { Environment } from './SimpleNoteFrontendStack';

export interface EnvironmentConfig {
  certificateRegion: string;
  domain: string;
  subDomain: string;
}

export interface EnvironmentNestedStackProps extends NestedStackProps {
  environment: Environment;
  certificate: acm.Certificate;
  config: EnvironmentConfig;
}

export class EnvironmentNestedStack extends NestedStack {
  public customBucket: CustomWebBucket;

  constructor(scope: Construct, public props: EnvironmentNestedStackProps) {
    super(scope, props.environment, props);

    this.customBucket = new CustomWebBucket(this, {
      id: 'SimpleNoteFrontend',
      environment: props.environment,
      subDomain: props.config.subDomain,
      domain: props.config.domain,
    });

    new CustomSite(this, {
      id: 'SimpleNoteFrontend',
      environment: props.environment,
      customBucket: this.customBucket,
      subDomain: props.config.subDomain,
      domain: props.config.domain,
      certificate: props.certificate,
    });
  }
}
