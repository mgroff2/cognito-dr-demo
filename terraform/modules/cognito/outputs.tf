output "user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "client_id" {
  value = aws_cognito_user_pool_client.main.id
}

output "hosted_ui_domain" {
  value = "https://${var.cognito_domain_prefix}.auth.${var.region}.amazoncognito.com"
}
