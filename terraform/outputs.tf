output "cloudfront_url" {
  value = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "cognito_east_hosted_ui" {
  value = "${module.cognito_east.hosted_ui_domain}/login?client_id=${module.cognito_east.client_id}&response_type=token&scope=openid+email+profile&redirect_uri=https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "cognito_west_hosted_ui" {
  value = "${module.cognito_west.hosted_ui_domain}/login?client_id=${module.cognito_west.client_id}&response_type=token&scope=openid+email+profile&redirect_uri=https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "google_oauth_redirect_uris" {
  description = "Add these as authorized redirect URIs in Google Cloud Console"
  value = [
    "${var.cognito_domain_prefix_east}.auth.us-east-1.amazoncognito.com/oauth2/idpresponse",
    "${var.cognito_domain_prefix_west}.auth.us-west-2.amazoncognito.com/oauth2/idpresponse"
  ]
}
