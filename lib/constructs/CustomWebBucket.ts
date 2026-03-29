import { aws_s3 as s3, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface CustomWebBucketProps {
  id: string;
  environment: string;
  domain: string;
  subDomain: string;
}

export class CustomWebBucket {
  public bucket: s3.Bucket;

  constructor(scope: Construct, props: CustomWebBucketProps) {
    this.bucket = new s3.Bucket(scope, `${props.id}Bucket${props.environment}`, {
      bucketName: `${props.subDomain}.${props.domain}`,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
  }
}
