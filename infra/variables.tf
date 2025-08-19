variable "aws_region" {
  type        = string
  description = "AWS region"
}

variable "project" {
  type        = string
  description = "Project name for tags and resource naming"
}

variable "account_id" {
  type        = string
  description = "AWS Account ID"
}

variable "lambda_image_uri" {
  type        = string
  description = "ECR image URI for the Lambda function (repo:tag)"
  default     = ""
}
