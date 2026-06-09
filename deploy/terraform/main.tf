# ============================================================
# AI Commerce OS — AWS infrastructure (EC2 app + RDS + ElastiCache)
# Provisions: VPC, public/private subnets, an EC2 instance running the
# Dockerized app (api + worker + beat via Caddy/HTTPS), a managed RDS
# PostgreSQL, and an ElastiCache Redis. All secrets live in SSM
# Parameter Store (SecureString) and are pulled by the instance at boot.
# ============================================================

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws    = { source = "hashicorp/aws", version = "~> 5.0" }
    random = { source = "hashicorp/random", version = "~> 3.0" }
  }
  # Recommended: store state in an encrypted S3 bucket (it will contain
  # generated secrets). Uncomment and set your bucket:
  # backend "s3" {
  #   bucket  = "your-tf-state-bucket"
  #   key     = "commerce-os/prod.tfstate"
  #   region  = "ap-south-1"
  #   encrypt = true
  # }
}

provider "aws" {
  region = var.aws_region
}

data "aws_availability_zones" "available" {
  state = "available"
}

# Latest Amazon Linux 2023 x86_64 AMI.
data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }
  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}

locals {
  name = "${var.project}-${var.environment}"
  azs  = slice(data.aws_availability_zones.available.names, 0, 2)

  # The full production .env, rendered from TF-known values + secrets.
  # Stored as one SecureString param and written to /opt/commerce/.env on boot.
  dotenv = <<-EOT
    APP_NAME="AI Commerce OS"
    ENVIRONMENT=production
    API_V1_PREFIX=/api/v1
    CORS_ORIGINS=${var.frontend_origin}
    DOMAIN=${var.domain_name}
    ACME_EMAIL=${var.acme_email}

    DATABASE_URL=postgresql+asyncpg://commerce:${random_password.db.result}@${aws_db_instance.postgres.address}:5432/commerce
    DATABASE_URL_SYNC=postgresql+psycopg://commerce:${random_password.db.result}@${aws_db_instance.postgres.address}:5432/commerce

    REDIS_URL=redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:6379/0
    CELERY_BROKER_URL=redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:6379/1
    CELERY_RESULT_BACKEND=redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:6379/2
    CELERY_TASK_ALWAYS_EAGER=false
    LOCAL_SCHEDULER_ENABLED=false

    JWT_SECRET=${var.jwt_secret}
    JWT_ALGORITHM=HS256
    ACCESS_TOKEN_EXPIRE_MINUTES=30
    REFRESH_TOKEN_EXPIRE_DAYS=14
    ENCRYPTION_KEY=${var.encryption_key}

    SUPERADMIN_EMAIL=${var.superadmin_email}
    SUPERADMIN_PASSWORD=${var.superadmin_password}
    SUPERADMIN_NAME="Platform Owner"

    ANTHROPIC_API_KEY=${var.anthropic_api_key}
    ANTHROPIC_MODEL=claude-opus-4-8
    AI_MAX_TOKENS=1024

    PUBLIC_WEBHOOK_BASE_URL=https://${var.domain_name}
    SYNC_INTERVAL_MINUTES=60
  EOT
}