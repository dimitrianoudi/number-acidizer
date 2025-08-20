resource "aws_dynamodb_table" "counter" {
  name         = "${var.project}-counter"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"

  attribute {
    name = "pk"
    type = "S"
  }

  tags = local.tags
}

# Seed item so counter exists (value = 0)
resource "aws_dynamodb_table_item" "seed_counter" {
  table_name = aws_dynamodb_table.counter.name
  hash_key   = aws_dynamodb_table.counter.hash_key

  item = jsonencode({
    pk        = { S = "COUNTER" }
    value     = { N = "0" }
    version   = { N = "0" }
    updatedAt = { S = timestamp() }
  })
}

# Idempotency table with TTL
resource "aws_dynamodb_table" "idempotency" {
  name         = "${var.project}-idempotency"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  tags = local.tags
}
