# Deploy AI Commerce OS to AWS (EC2 + RDS + ElastiCache)

This provisions the whole stack with Terraform, then runs the Dockerized app on
the EC2 box. Postgres and Redis are managed AWS services. Secrets live in SSM
Parameter Store (SecureString) and are pulled to the instance at boot — they are
never committed to git.

```
Internet ──HTTPS──> EC2 (Caddy ─> api:8000, + worker, + beat)
                      │
                      ├──> RDS PostgreSQL (private)
                      └──> ElastiCache Redis (private)
```

## Prerequisites
- AWS CLI logged in (`aws configure`) with permissions to create VPC/EC2/RDS/etc.
- Terraform >= 1.5 installed.
- An SSH keypair (`ssh-keygen -t ed25519`).
- A domain you control, with the ability to add an A record.

## 1. Generate the two secrets
```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"                         # jwt_secret
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"  # encryption_key
```
> **Keep `encryption_key` safe forever.** It decrypts every customer's stored API
> keys. Losing it = every store must reconnect. Leaking it = rotate immediately.

## 2. Configure Terraform
```bash
cd deploy/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars: paste the two secrets, your IP/32, SSH public key,
# domain, frontend origin, ACME email, superadmin password.
```

## 3. Provision
```bash
terraform init
terraform apply        # ~10-15 min (RDS is the slow part)
```
Note the outputs: `app_public_ip`, `rds_endpoint`, `redis_endpoint`.

## 4. Point DNS
Create an **A record**: `api.yourdomain.com -> <app_public_ip>`. Wait for it to
resolve (`nslookup api.yourdomain.com`).

## 5. Ship the code + launch
The repo isn't a git remote, so copy the source up directly (run from the project
root, one level above `deploy/`):
```bash
rsync -av ./backend ec2-user@<app_public_ip>:/opt/commerce/backend
scp deploy/docker-compose.prod.yml deploy/Caddyfile ec2-user@<app_public_ip>:/opt/commerce/

ssh ec2-user@<app_public_ip>
cd /opt/commerce
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f api   # watch migrations + boot
```
`.env` (with all secrets, including the RDS/Redis endpoints) is already at
`/opt/commerce/.env` — the app reads it via `env_file`.

## 6. Verify it's live
- `https://api.yourdomain.com/health` -> `{"status":"ok"}`
- `https://api.yourdomain.com/api/v1/docs` -> Swagger UI
- Log in as the superadmin, connect a Shopify store **with its api_secret** ->
  webhooks auto-register (because `PUBLIC_WEBHOOK_BASE_URL=https://api.yourdomain.com`)
  -> place a test order -> it appears within seconds. Tail `worker` logs to see
  `webhook ... incremental sync triggered`.

## 7. Frontend
Deploy `Frontend/` to Vercel with `NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1`,
and set its domain to match `frontend_origin` in your tfvars.

## Updating the app later
```bash
rsync -av ./backend ec2-user@<ip>:/opt/commerce/backend
ssh ec2-user@<ip> "cd /opt/commerce && docker compose -f docker-compose.prod.yml up -d --build"
```

## Changing config/secrets later
Edit the value in Terraform (or the SSM param), re-apply, then on the box:
```bash
aws ssm get-parameter --name /commerce-os/prod/dotenv --with-decryption \
  --region ap-south-1 --query 'Parameter.Value' --output text > /opt/commerce/.env
docker compose -f docker-compose.prod.yml up -d
```

## Tear down
```bash
terraform destroy
```

## Security notes
- RDS + Redis are in private subnets, reachable only from the EC2 security group.
- Secrets are SSM SecureString (KMS-encrypted); the instance role can only read
  `/commerce-os/prod/*`.
- TLS is automatic via Caddy/Let's Encrypt.
- Terraform **state contains secrets** — use the encrypted S3 backend (commented
  in `main.tf`) and keep `terraform.tfvars` out of git.
- For production hardening later: enable RDS Multi-AZ, set `skip_final_snapshot
  = false`, turn on `deletion_protection`, and move SSH behind Session Manager.