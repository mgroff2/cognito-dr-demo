variable "project_name" {
  type    = string
  default = "cognito-dr-demo"
}

variable "cognito_domain_prefix_east" {
  type        = string
  description = "Globally unique Cognito domain prefix for us-east-1"
}

variable "cognito_domain_prefix_west" {
  type        = string
  description = "Globally unique Cognito domain prefix for us-west-2"
}

variable "google_client_id" {
  type      = string
  sensitive = true
}

variable "google_client_secret" {
  type      = string
  sensitive = true
}
