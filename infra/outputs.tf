output "api_base_url" {
  value       = aws_apigatewayv2_stage.this.invoke_url
  description = "Base URL for the HTTP API stage"
}

output "cloudfront_domain" {
  value       = aws_cloudfront_distribution.site.domain_name
  description = "CloudFront domain for the frontend"
}

output "s3_bucket_name" {
  value = aws_s3_bucket.frontend.id
}

output "ecr_repo_url" {
  value = aws_ecr_repository.backend.repository_url
}
