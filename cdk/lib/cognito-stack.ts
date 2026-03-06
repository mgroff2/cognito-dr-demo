import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export interface CognitoStackProps extends cdk.StackProps {
  cloudFrontDomain: string;
  domainPrefix: string;
  googleClientId: string;
  googleClientSecret: string;
}

export class CognitoStack extends cdk.Stack {
  public readonly userPoolClientId: string;
  public readonly hostedUiDomain: string;

  constructor(scope: Construct, id: string, props: CognitoStackProps) {
    super(scope, id, props);

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

    const callbackUrl = `https://${props.cloudFrontDomain}`;

    const client = userPool.addClient('AppClient', {
      oAuth: {
        flows: { implicitCodeGrant: true },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: [callbackUrl],
        logoutUrls: [callbackUrl],
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

    new cdk.CfnOutput(this, 'UserPoolClientId', { value: client.userPoolClientId });
    new cdk.CfnOutput(this, 'HostedUiDomain', { value: this.hostedUiDomain });
    new cdk.CfnOutput(this, 'GoogleRedirectUri', {
      value: `https://${props.domainPrefix}.auth.${this.region}.amazoncognito.com/oauth2/idpresponse`,
      description: 'Add this as an authorized redirect URI in Google Cloud Console',
    });
  }
}
