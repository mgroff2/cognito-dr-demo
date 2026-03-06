# Cognito DR Demo

Demonstrates how to achieve disaster recovery (DR) / failover for AWS Cognito Identity Providers across regions.

A simple frontend app authenticates users via Google through Cognito's Hosted UI, then displays which AWS region the Cognito User Pool is in. This shows that redeploying Cognito to another region with the same Google IDP configuration is all that's needed for DR.

## Architecture

- **Frontend**: Static HTML/JS hosted on S3 + CloudFront (us-east-1)
- **Auth**: Cognito User Pool with Google IDP deployed to both us-east-1 and us-west-2
- **IaC**: Terraform with dual-region AWS providers in a single config

### Flow

1. User selects a region (us-east-1 or us-west-2) from the dropdown
2. Clicks "Sign in with Google" which redirects to that region's Cognito Hosted UI
3. After Google authentication, the app displays which Cognito region was used
4. Switching regions simulates a failover scenario

## Prerequisites

- AWS CLI configured with appropriate credentials
- Terraform >= 1.0
- A Google Cloud project with OAuth 2.0 credentials (Web application type)

## Deployment

### 1. Configure variables

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your values:

| Variable | Description |
|---|---|
| `google_client_id` | Google OAuth 2.0 Client ID |
| `google_client_secret` | Google OAuth 2.0 Client Secret |
| `cognito_domain_prefix_east` | Globally unique Cognito domain prefix for us-east-1 |
| `cognito_domain_prefix_west` | Globally unique Cognito domain prefix for us-west-2 |

### 2. Deploy infrastructure

```bash
terraform init
terraform apply
```

### 3. Configure Google OAuth redirect URIs

After `terraform apply`, the output `google_oauth_redirect_uris` will display two URIs. Add both as **Authorized redirect URIs** in your Google Cloud Console OAuth 2.0 client settings:

```
https://<prefix-east>.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
https://<prefix-west>.auth.us-west-2.amazoncognito.com/oauth2/idpresponse
```

### 4. Test

Open the `cloudfront_url` from the Terraform output. Select a region, sign in with Google, and verify the region display.

## Cleanup

```bash
cd terraform
terraform destroy
```

## Key Takeaway

Cognito User Pools are regional resources. To achieve DR, deploy the same Cognito configuration (User Pool, Google IDP, App Client, Domain) to your DR region. Your application just needs to be configured to point to the DR region's Cognito endpoint. No user data migration is needed for federated (Google) authentication since the identity lives with the external provider.
