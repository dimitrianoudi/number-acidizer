resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.project}-backend"
  retention_in_days = 14
  tags              = local.tags
}

resource "aws_lambda_function" "backend" {
  function_name = "${var.project}-backend"
  role          = aws_iam_role.lambda_exec.arn
  package_type  = "Image"
  image_uri     = var.lambda_image_uri != "" ? var.lambda_image_uri : "${aws_ecr_repository.backend.repository_url}:bootstrap"

  environment {
    variables = {
      TABLE_COUNTER         = aws_dynamodb_table.counter.name
      TABLE_IDEMPOTENCY     = aws_dynamodb_table.idempotency.name
      IDEMPOTENCY_TTL_SECONDS = "60"
    }
  }

  depends_on = [aws_cloudwatch_log_group.lambda]
  tags       = local.tags
}
