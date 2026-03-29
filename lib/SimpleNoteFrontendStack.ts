import { Stack, StackProps, Tags } from 'aws-cdk-lib';
import { aws_certificatemanager as acm } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import configuration from '../config/config.json';
import { EnvironmentNestedStack } from './EnvironmentNestedStack';
import { DevOpsNestedStack } from './DevOpsNestedStack';

export enum Environment {
  DEVELOPMENT = 'DEVELOPMENT',
  PRODUCTION = 'PRODUCTION',
}

interface SimpleNoteFrontendStackProps extends StackProps {
  certificates: {
    development: acm.Certificate;
    production: acm.Certificate;
  };
}

export class SimpleNoteFrontendStack extends Stack {
  constructor(scope: Construct, props: SimpleNoteFrontendStackProps) {
    super(scope, 'SimpleNoteFrontendStack', props);

    Tags.of(this).add('project', 'SimpleNoteClone');

    const developmentStack = new EnvironmentNestedStack(this, {
      environment: Environment.DEVELOPMENT,
      config: configuration.component.development,
      certificate: props.certificates.development,
    });

    const productionStack = new EnvironmentNestedStack(this, {
      environment: Environment.PRODUCTION,
      config: configuration.component.production,
      certificate: props.certificates.production,
    });

    new DevOpsNestedStack(this, {
      developmentStack,
      productionStack,
      config: configuration.component.core,
    });
  }
}
