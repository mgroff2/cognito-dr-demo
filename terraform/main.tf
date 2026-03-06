terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
  alias  = "east"
}

provider "aws" {
  region = "us-west-2"
  alias  = "west"
}

# ------------------------------
# Cognito - both regions
# ------------------------------

module "cognito_east" {
  source = "./modules/cognito"
  providers = {
    aws = aws.east
  }

  region                = "us-east-1"
  cognito_domain_prefix = var.cognito_domain_prefix_east
  google_client_id      = var.google_client_id
  google_client_secret  = var.google_client_secret
  callback_url          = "https://${aws_cloudfront_distribution.frontend.domain_name}"
  project_name          = var.project_name
}

module "cognito_west" {
  source = "./modules/cognito"
  providers = {
    aws = aws.west
  }

  region                = "us-west-2"
  cognito_domain_prefix = var.cognito_domain_prefix_west
  google_client_id      = var.google_client_id
  google_client_secret  = var.google_client_secret
  callback_url          = "https://${aws_cloudfront_distribution.frontend.domain_name}"
  project_name          = var.project_name
}

# ------------------------------
# S3 + CloudFront for frontend
# ------------------------------

resource "random_id" "suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "frontend" {
  provider = aws.east
  bucket   = "${var.project_name}-frontend-${random_id.suffix.hex}"
}

resource "aws_cloudfront_origin_access_control" "frontend" {
  provider                          = aws.east
  name                              = "${var.project_name}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "frontend" {
  provider            = aws.east
  enabled             = true
  default_root_object = "index.html"

  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "s3-frontend"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 60
    max_ttl     = 300
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

resource "aws_s3_bucket_policy" "frontend" {
  provider = aws.east
  bucket   = aws_s3_bucket.frontend.id
  policy   = data.aws_iam_policy_document.cloudfront_oac.json
}

data "aws_iam_policy_document" "cloudfront_oac" {
  statement {
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.frontend.arn}/*"]
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.frontend.arn]
    }
  }
}

# ------------------------------
# Upload frontend to S3
# ------------------------------

locals {
  template_vars = {
    cognito_east_domain    = module.cognito_east.hosted_ui_domain
    cognito_east_client_id = module.cognito_east.client_id
    cognito_east_region    = "us-east-1"
    cognito_west_domain    = module.cognito_west.hosted_ui_domain
    cognito_west_client_id = module.cognito_west.client_id
    cognito_west_region    = "us-west-2"
    cloudfront_url         = "https://${aws_cloudfront_distribution.frontend.domain_name}"
  }
}

resource "aws_s3_object" "index_html" {
  provider     = aws.east
  bucket       = aws_s3_bucket.frontend.id
  key          = "index.html"
  content_type = "text/html"
  content      = templatefile("${path.module}/../frontend/index.html", local.template_vars)
  etag         = md5(templatefile("${path.module}/../frontend/index.html", local.template_vars))
}

# Invalidate CloudFront cache after frontend update
resource "null_resource" "invalidate_cache" {
  triggers = {
    index_etag      = aws_s3_object.index_html.etag
    distribution_id = aws_cloudfront_distribution.frontend.id
  }

  provisioner "local-exec" {
    command = "aws cloudfront create-invalidation --distribution-id ${self.triggers.distribution_id} --paths '/*'"
  }
}
