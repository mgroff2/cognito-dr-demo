# Cognito DR Demo

Demonstrates how to achieve disaster recovery (DR) / failover for AWS Cognito Identity Providers across regions.

A simple frontend app authenticates users via Google through Cognito's Hosted UI, then displays which AWS region the Cognito User Pool is in. After logging in with both regions, the app shows that the **Google Sub (identity) is the same** while the **Cognito Sub differs per region** — proving the same user can authenticate seamlessly in a DR scenario.

## Architecture

- **Frontend**: Static HTML/JS hosted on S3 + CloudFront (us-east-1)
- **Auth**: Cognito User Pool with Google IDP deployed to both us-east-1 and us-west-2
- **IaC**: Available in both Terraform and CDK (TypeScript)

### Flow

1. User selects a region (us-east-1 or us-west-2) from the dropdown
2. Clicks "Sign in with Google" which redirects to that region's Cognito Hosted UI
3. After Google authentication, the app displays the Cognito region, Cognito Sub, and Google Sub
4. Logging in with both regions shows the Google Sub matches (same user) while Cognito Subs differ

## Prerequisites

- AWS CLI configured with appropriate credentials
- A Google Cloud project with OAuth 2.0 credentials (Web application type)
- **Terraform option**: Terraform >= 1.0
- **CDK option**: Node.js >= 18, npm

## Option 1: Terraform

### Deploy

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your Google credentials and unique domain prefixes
terraform init
terraform apply
```

### Cleanup

```bash
terraform destroy
```

## Option 2: CDK (TypeScript)

### Deploy

```bash
cd cdk
npm install
```

Edit `cdk.json` context values with your Google credentials and unique domain prefixes, then:

```bash
# Bootstrap CDK (first time only)
npx cdk bootstrap aws://<ACCOUNT_ID>/us-east-1 aws://<ACCOUNT_ID>/us-west-2

# Deploy all stacks
npx cdk deploy --all
```

### CDK Stacks

| Stack | Region | Resources |
|---|---|---|
| `CognitoDrMain` | us-east-1 | S3, CloudFront, Cognito User Pool + Google IDP |
| `CognitoDrCognitoWest` | us-west-2 | Cognito User Pool + Google IDP |
| `CognitoDrFrontend` | us-east-1 | Frontend deployment (index.html + config.js) |

### Cleanup

```bash
npx cdk destroy --all
```

## Post-Deploy: Google OAuth Configuration

After deploying (either option), add the outputted redirect URIs as **Authorized redirect URIs** in your Google Cloud Console OAuth 2.0 client settings:

```
https://<prefix-east>.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
https://<prefix-west>.auth.us-west-2.amazoncognito.com/oauth2/idpresponse
```

## Key Takeaways

- Cognito User Pools are **regional** resources — each region gets its own pool with unique user IDs (Cognito Sub)
- For federated auth (Google, OIDC, SAML), the **identity lives with the external provider**, not Cognito
- To achieve DR: deploy the same Cognito config to your DR region and point your app to it
- Use the **IdP's stable identifier** (Google Sub, email) as your app's canonical user key, not the Cognito Sub
- No user data migration is needed for the authentication layer itself
