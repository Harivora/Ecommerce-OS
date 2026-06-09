output "app_public_ip" {
  description = "Point your DNS A record (api.yourdomain.com) at this IP."
  value       = aws_eip.app.public_ip
}

output "ssh_command" {
  value = "ssh ec2-user@${aws_eip.app.public_ip}"
}

output "rds_endpoint" {
  value = aws_db_instance.postgres.address
}

output "redis_endpoint" {
  value = aws_elasticache_cluster.redis.cache_nodes[0].address
}

output "ssm_dotenv_param" {
  description = "SSM SecureString holding the full .env (already pulled to the instance)."
  value       = aws_ssm_parameter.dotenv.name
}

output "next_steps" {
  value = <<-EOT
    1. Create DNS A record: ${var.domain_name} -> ${aws_eip.app.public_ip}
    2. Copy code to the box (no git remote needed):
         rsync -av ../../backend ec2-user@${aws_eip.app.public_ip}:/opt/commerce/backend
         scp ../docker-compose.prod.yml ../Caddyfile ec2-user@${aws_eip.app.public_ip}:/opt/commerce/
    3. SSH in and launch:
         cd /opt/commerce && docker compose -f docker-compose.prod.yml up -d --build
    4. Verify: https://${var.domain_name}/health
  EOT
}
