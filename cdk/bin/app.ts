#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { MainStack } from '../lib/main-stack';
import { CognitoStack } from '../lib/cognito-stack';
import { FrontendDeployStack } from '../lib/frontend-deploy-stack';

const app = new cdk.App();

const googleClientId = app.node.tryGetContext('googleClientId');
const googleClientSecret = app.node.tryGetContext('googleClientSecret');
const domainPrefixEast = app.node.tryGetContext('cognitoDomainPrefixEast');
const domainPrefixWest = app.node.tryGetContext('cognitoDomainPrefixWest');

if (!googleClientId || !googleClientSecret || !domainPrefixEast || !domainPrefixWest) {
  throw new Error(
    'Missing required context. Set in cdk.json or pass via CLI:\n' +
    '  -c googleClientId=... -c googleClientSecret=... -c cognitoDomainPrefixEast=... -c cognitoDomainPrefixWest=...'
  );
}

const account = process.env.CDK_DEFAULT_ACCOUNT;
const east = { account, region: 'us-east-1' };
const west = { account, region: 'us-west-2' };

// S3 + CloudFront + Cognito East (all in one stack, no cross-stack ref issues)
const main = new MainStack(app, 'CognitoDrMain', {
  env: east,
  crossRegionReferences: true,
  domainPrefix: domainPrefixEast,
  googleClientId,
  googleClientSecret,
});

// Cognito in us-west-2 (cross-region, gets CloudFront domain via SSM)
const cognitoWest = new CognitoStack(app, 'CognitoDrCognitoWest', {
  env: west,
  crossRegionReferences: true,
  cloudFrontDomain: main.distribution.distributionDomainName,
  domainPrefix: domainPrefixWest,
  googleClientId,
  googleClientSecret,
});

// Deploy frontend with config pointing to both Cognito pools
new FrontendDeployStack(app, 'CognitoDrFrontend', {
  env: east,
  crossRegionReferences: true,
  bucket: main.bucket,
  distribution: main.distribution,
  cloudFrontDomain: main.distribution.distributionDomainName,
  cognitoEastDomain: main.hostedUiDomain,
  cognitoEastClientId: main.userPoolClientId,
  cognitoWestDomain: cognitoWest.hostedUiDomain,
  cognitoWestClientId: cognitoWest.userPoolClientId,
});
