# Managed PostgreSQL (RDS) and Redis (ElastiCache), both private.

resource "aws_db_subnet_group" "main" {
  name       = "${local.name}-db-subnets"
  subnet_ids = aws_subnet.private[*].id
  tags       = { Name = "${local.name}-db-subnets" }
}

resource "aws_db_instance" "postgres" {
  identifier             = "${local.name}-pg"
  engine                 = "postgres"
  engine_version         = "16"
  instance_class         = var.db_instance_class
  allocated_storage      = var.db_allocated_storage
  max_allocated_storage  = var.db_max_allocated_storage # storage autoscaling
  db_name                = "commerce"
  username               = "commerce"
  password               = random_password.db.result
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.db.id]
  storage_type           = "gp3"
  storage_encrypted      = true
  publicly_accessible    = false
  multi_az               = false # set true for HA in production
  backup_retention_period = 7
  skip_final_snapshot    = true # set false + add final_snapshot_identifier for prod
  deletion_protection    = false
  apply_immediately      = true
  tags                   = { Name = "${local.name}-pg" }
}

resource "aws_elasticache_subnet_group" "main" {
  name       = "${local.name}-redis-subnets"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "${local.name}-redis"
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = var.redis_node_type
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]
  tags                 = { Name = "${local.name}-redis" }
}