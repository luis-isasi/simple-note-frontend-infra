import { Stack, StackProps, Tags } from 'aws-cdk-lib';
import {
  aws_route53 as route53,
  aws_certificatemanager as acm,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import config from '../config/config.json';

export class SimpleNoteCertificatesStack extends Stack {
  public development: acm.Certificate;
  public production: acm.Certificate;

  constructor(scope: Construct, props: StackProps) {
    super(scope, 'SimpleNoteCertificatesStack', props);

    Tags.of(this).add('project', 'SimpleNoteClone');

    const zone = route53.HostedZone.fromLookup(this, 'Zone', {
      domainName: config.domain.baseDomain,
    });

    this.development = new acm.Certificate(this, 'CertificateDevelopment', {
      domainName: `${config.component.development.subDomain}.${config.component.development.domain}`,
      validation: acm.CertificateValidation.fromDns(zone),
    });

    this.production = new acm.Certificate(this, 'CertificateProduction', {
      domainName: `${config.component.production.subDomain}.${config.component.production.domain}`,
      validation: acm.CertificateValidation.fromDns(zone),
    });
  }
}
