# Shipping an update to the live server

Runbook for deploying **code changes** to the already-running production box
(EC2 + managed RDS + ElastiCache). For first-time provisioning, see
[README.md](README.md).

## How a deploy works

- Code reaches the box by **rsync** into `/opt/commerce/backend` (there is no git
  remote on the box — the build context is just that folder).
- `docker compose ... up -d --build` rebuilds the **api** and **worker** images
  from that code (both use `build: ./backend`).
- On start, the **api** container runs `alembic upgrade head` automatically, so
  **DB migrations apply on deploy** — you never touch RDS by hand.
- **Caddy** keeps serving during the rebuild; the api has only a short blip while
  it restarts. Postgres/Redis are managed and untouched by a deploy.

## Prerequisites (on your laptop)

- SSH access to the box (the keypair created during provisioning).
- The box's public IP — from `terraform -chdir=deploy/terraform output` (the
  Elastic IP), or your API domain's A record.

## Deploy — one command

```bash
HOST=ec2-user@<EC2_PUBLIC_IP> SSH_KEY=~/.ssh/id_ed25519 bash deploy/update.sh
```

`update.sh` rsyncs `backend/` to the box (excluding `.env`, `.venv`, caches and
local `*.db`), runs `docker compose up -d --build`, and prints the migration
revision afterwards.

## Deploy — manual (same thing, step by step)

```bash
# 1. Sync code (note the trailing slashes — they matter for rsync)
rsync -avz --exclude '.env' --exclude '.venv' --exclude '__pycache__' \
  --exclude '*.pyc' --exclude '*.db' \
  -e "ssh -i ~/.ssh/id_ed25519" \
  backend/ ec2-user@<EC2_PUBLIC_IP>:/opt/commerce/backend/

# 2. Rebuild + restart (alembic upgrade head runs automatically on api start)
ssh -i ~/.ssh/id_ed25519 ec2-user@<EC2_PUBLIC_IP> \
  'cd /opt/commerce && docker compose -f docker-compose.prod.yml up -d --build'
```

## Pre-flight & verify

```bash
# BEFORE deploying — confirm the DB revision (expect 0003 before this change):
ssh ... 'cd /opt/commerce && docker compose -f docker-compose.prod.yml exec -T api alembic current'

# AFTER deploying — expect: 0004_product_landing_costs (head)
# Then check health + that the new routes are live:
curl -s https://<api-domain>/health
#   → open https://<api-domain>/api/v1/docs and confirm the /costs endpoints appear
```

## This change — Product Landing Cost

- Migration `0004` creates **one new empty table** (`product_landing_costs`) —
  instant, **no locks** on `orders` / `order_items`, safe during live traffic.
- A new Celery task (`app.tasks.landing_costs`) is registered; the rebuilt
  **worker** picks it up automatically.
- No files were deleted, so a plain (non-`--delete`) rsync is safe.

## Frontend

The Next.js frontend is hosted **separately** (Vercel). Deploy it from its own
pipeline (push to the connected branch, or `vercel --prod`). Deploy the
**backend first** so `/api/v1/costs` exists before the new page calls it.

## Rollback

- Re-sync the previous commit's `backend/` and run `up -d --build` again.
- This migration is additive; to revert the schema:
  `docker compose -f docker-compose.prod.yml exec -T api alembic downgrade -1`
  (drops `product_landing_costs` — any data entered in it is lost).
