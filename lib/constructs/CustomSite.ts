import { Duration } from 'aws-cdk-lib';
import {
  aws_cloudfront as cloudFront,
  aws_cloudfront_origins as origins,
  aws_route53 as route53,
  aws_route53_targets as targets,
  aws_certificatemanager as acm,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CustomWebBucket } from './CustomWebBucket';
import config from '../../config/config.json';

export interface CustomSiteProps {
  id: string;
  environment: string;
  customBucket: CustomWebBucket;
  subDomain: string;
  domain: string;
  certificate: acm.Certificate;
}

export class CustomSite {
  constructor(scope: Construct, props: CustomSiteProps) {
    const zone = route53.HostedZone.fromLookup(scope, `Zone${props.environment}`, {
      domainName: config.domain.baseDomain,
    });

    const responseHeadersPolicy = new cloudFront.ResponseHeadersPolicy(
      scope,
      `ResponseHeadersPolicy${props.environment}`,
      {
        securityHeadersBehavior: {
          strictTransportSecurity: {
            accessControlMaxAge: Duration.days(365),
            includeSubdomains: true,
            override: true,
          },
          xssProtection: {
            protection: true,
            modeBlock: true,
            override: true,
          },
          referrerPolicy: {
            referrerPolicy: cloudFront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
            override: true,
          },
        },
      },
    );

    const distribution = new cloudFront.Distribution(
      scope,
      `Distribution${props.environment}`,
      {
        defaultBehavior: {
          origin: origins.S3BucketOrigin.withOriginAccessControl(
            props.customBucket.bucket,
          ),
          viewerProtocolPolicy: cloudFront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          responseHeadersPolicy,
          cachePolicy: cloudFront.CachePolicy.CACHING_DISABLED,
        },
        domainNames: [`${props.subDomain}.${props.domain}`],
        certificate: props.certificate,
        errorResponses: [
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
          },
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
          },
        ],
      },
    );

    new route53.ARecord(scope, `ARecord${props.environment}`, {
      zone,
      recordName: `${props.subDomain}.${props.domain}`,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution),
      ),
    });
  }
}
