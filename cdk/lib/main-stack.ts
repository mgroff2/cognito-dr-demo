import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export interface MainStackProps extends cdk.StackProps {
  domainPrefix: string;
  googleClientId: string;
  googleClientSecret: string;
}

export class MainStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly userPoolClientId: string;
  public readonly hostedUiDomain: string;

  constructor(scope: Construct, id: string, props: MainStackProps) {
    super(scope, id, props);

    // S3 + CloudFront
    this.bucket = new s3.Bucket(this, 'FrontendBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
    });

    // Cognito User Pool (same stack = no cross-stack ref issues)
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `cognito-dr-demo-${this.region}`,
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      signInAliases: { email: true },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const googleProvider = new cognito.UserPoolIdentityProviderGoogle(this, 'Google', {
      userPool,
      clientId: props.googleClientId,
      clientSecretValue: cdk.SecretValue.unsafePlainText(props.googleClientSecret),
      scopes: ['openid', 'email', 'profile'],
      attributeMapping: {
        email: cognito.ProviderAttribute.GOOGLE_EMAIL,
      },
    });

    const client = userPool.addClient('AppClient', {
      oAuth: {
        flows: { implicitCodeGrant: true },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: [`https://${this.distribution.distributionDomainName}`],
        logoutUrls: [`https://${this.distribution.distributionDomainName}`],
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.GOOGLE,
      ],
    });
    client.node.addDependency(googleProvider);

    new cognito.CfnUserPoolDomain(this, 'CognitoDomain', {
      domain: props.domainPrefix,
      userPoolId: userPool.userPoolId,
    });

    this.userPoolClientId = client.userPoolClientId;
    this.hostedUiDomain = `https://${props.domainPrefix}.auth.${this.region}.amazoncognito.com`;

    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
    });
    new cdk.CfnOutput(this, 'GoogleRedirectUri', {
      value: `https://${props.domainPrefix}.auth.${this.region}.amazoncognito.com/oauth2/idpresponse`,
      description: 'Add this as an authorized redirect URI in Google Cloud Console',
    });
  }
}
