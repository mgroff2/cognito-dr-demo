variable "region" {
  type = string
}

variable "cognito_domain_prefix" {
  type = string
}

variable "google_client_id" {
  type      = string
  sensitive = true
}

variable "google_client_secret" {
  type      = string
  sensitive = true
}

variable "callback_url" {
  type = string
}

variable "project_name" {
  type = string
}
