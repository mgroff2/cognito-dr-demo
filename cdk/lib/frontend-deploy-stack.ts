import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

export interface FrontendDeployStackProps extends cdk.StackProps {
  bucket: s3.IBucket;
  distribution: cloudfront.IDistribution;
  cloudFrontDomain: string;
  cognitoEastDomain: string;
  cognitoEastClientId: string;
  cognitoWestDomain: string;
  cognitoWestClientId: string;
}

export class FrontendDeployStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FrontendDeployStackProps) {
    super(scope, id, props);

    // Deploy static index.html
    new s3deploy.BucketDeployment(this, 'DeployHtml', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '..', 'frontend'))],
      destinationBucket: props.bucket,
      distribution: props.distribution,
      distributionPaths: ['/*'],
      prune: false,
    });

    // Deploy config.js with actual Cognito values using AwsCustomResource
    // This handles CDK tokens (cross-region references) correctly at deploy time
    const configContent = cdk.Fn.join('', [
      'var CONFIG = {',
      '"us-east-1": { "domain": "', props.cognitoEastDomain, '", "clientId": "', props.cognitoEastClientId, '", "region": "us-east-1" },',
      '"us-west-2": { "domain": "', props.cognitoWestDomain, '", "clientId": "', props.cognitoWestClientId, '", "region": "us-west-2" }',
      '};',
      'var CALLBACK_URL = "https://', props.cloudFrontDomain, '";',
    ]);

    new cr.AwsCustomResource(this, 'DeployConfig', {
      onCreate: {
        service: 'S3',
        action: 'putObject',
        parameters: {
          Bucket: props.bucket.bucketName,
          Key: 'config.js',
          Body: configContent,
          ContentType: 'application/javascript',
        },
        physicalResourceId: cr.PhysicalResourceId.of('config-js-deploy'),
      },
      onUpdate: {
        service: 'S3',
        action: 'putObject',
        parameters: {
          Bucket: props.bucket.bucketName,
          Key: 'config.js',
          Body: configContent,
          ContentType: 'application/javascript',
        },
        physicalResourceId: cr.PhysicalResourceId.of('config-js-deploy'),
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ['s3:PutObject'],
          resources: [props.bucket.arnForObjects('config.js')],
        }),
      ]),
    });
  }
}
