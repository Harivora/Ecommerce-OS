variable "aws_region" {
  description = "AWS region. Mumbai (ap-south-1) suits an India/INR store."
  type        = string
  default     = "ap-south-1"
}

variable "project" {
  type    = string
  default = "commerce-os"
}

variable "environment" {
  type    = string
  default = "prod"
}

# ── Networking / access ──────────────────────────────────────
variable "ssh_ingress_cidr" {
  description = "CIDR allowed to SSH (use YOUR.IP.ADDR/32, find it at whatismyip)."
  type        = string
}

variable "ssh_public_key" {
  description = "Contents of your SSH public key (e.g. ~/.ssh/id_ed25519.pub)."
  type        = string
}

variable "domain_name" {
  description = "API domain Caddy will get a TLS cert for, e.g. api.yourdomain.com."
  type        = string
}

variable "frontend_origin" {
  description = "Allowed CORS origin (your Vercel/frontend URL), e.g. https://app.yourdomain.com."
  type        = string
}

variable "acme_email" {
  description = "Email for Let's Encrypt (cert expiry notices)."
  type        = string
}

# ── Instance sizing ──────────────────────────────────────────
variable "ec2_instance_type" {
  type    = string
  default = "t3.small"
}

variable "ec2_volume_size" {
  type    = string
  default = 30
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "db_allocated_storage" {
  type    = number
  default = 20
}

variable "db_max_allocated_storage" {
  description = "Upper bound for RDS storage autoscaling (your 500k-customer store grows)."
  type        = number
  default     = 100
}

variable "redis_node_type" {
  type    = string
  default = "cache.t4g.micro"
}

# ── Secrets (mark sensitive; pass via terraform.tfvars, NOT committed) ──
variable "jwt_secret" {
  description = "Generate: python -c \"import secrets; print(secrets.token_urlsafe(48))\""
  type        = string
  sensitive   = true
}

variable "encryption_key" {
  description = "Fernet master key. Generate: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
  type        = string
  sensitive   = true
}

variable "superadmin_email" {
  type    = string
  default = "admin@commerceos.ai"
}

variable "superadmin_password" {
  type      = string
  sensitive = true
}

variable "anthropic_api_key" {
  description = "Optional global fallback Claude key (per-org keys override it)."
  type        = string
  sensitive   = true
  default     = ""
}