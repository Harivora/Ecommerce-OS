# Deploying AI Commerce OS to AWS (going live + real-time Shopify)

This runbook takes the app from "runs on my laptop, polls every 10 min" to a
**production, always-on, real-time** system on AWS, with every user-entered API
key encrypted and stored securely.

> **Why it isn't real-time today:** locally the app uses SQLite, runs sync inside
> your laptop's Python process, and has no public URL — so Shopify **webhooks can
> never reach it**. The code already supports webhooks (`/api/v1/webhooks/shopify`);
> they just need a public HTTPS server. Once `PUBLIC_WEBHOOK_BASE_URL` is set on a
> deployed instance, connecting a store auto-registers webhooks and orders/refunds
> land within **seconds**.

---

## 1. Target architecture

```
                          Internet
                             │
            ┌────────────────┼─────────────────┐
            │                │                  │
      Shopify webhooks   Merchants          (you)
            │                │
            ▼                ▼
   ┌─────────────────────────────────────┐
   │  Route 53  →  ACM (TLS)  →  ALB      │   api.yourdomain.com  (HTTPS)
   └───────────────────┬─────────────────┘
                       │  /health check, /api/v1/*
        ┌──────────────┴───────────────────────────────┐
        │            ECS Fargate cluster                │   (private subnets)
        │  ┌─────────┐  ┌──────────┐  ┌──────────────┐  │
        │  │  api    │  │  worker  │  │  beat (×1)    │  │  same Docker image,
        │  │ uvicorn │  │  celery  │  │  celery beat  │  │  3 commands
        │  └────┬────┘  └────┬─────┘  └──────┬───────┘  │
        └───────┼────────────┼───────────────┼──────────┘
                │            │               │
       ┌────────┴───┐  ┌─────┴──────┐  ┌─────┴────────────┐
       │ RDS        │  │ ElastiCache│  │ Secrets Manager  │
       │ PostgreSQL │  │ Redis      │  │ JWT/ENCRYPTION/  │
       │ (private)  │  │ (private)  │  │ DB pwd/Anthropic │
       └────────────┘  └────────────┘  └──────────────────┘

   Frontend (Next.js)  →  Vercel  (app.yourdomain.com)  →  calls api.yourdomain.com
```

**Service mapping** (one Docker image, three commands — same as your
[docker-compose.yml](backend/docker-compose.yml)):

| Compose service | AWS run as | Command |
|-----------------|-----------|---------|
| `api` | ECS Fargate **Load-Balanced Web Service** | `uvicorn app.main:app --host 0.0.0.0 --port 8000` |
| `worker` | ECS Fargate **Backend Service** | `celery -A app.tasks.celery_app.celery_app worker --loglevel=info` |
| `beat` | ECS Fargate **Backend Service** (exactly **1** task) | `celery -A app.tasks.celery_app.celery_app beat --loglevel=info` |
| `postgres` | **RDS PostgreSQL 16** (managed) | — |
| `redis` | **ElastiCache Redis 7** (managed) | — |

> **Important:** `beat` must run as **exactly one** task (desired count = 1). Two
> beats = duplicate scheduled syncs. `worker` can scale to many; `api` can scale
> behind the ALB.

The `nasdata` / `/data` volume in your compose file is **unused by the code**
(verified — nothing writes to `/data`), so **no EFS is needed**.

---

## 2. Two ways to provision (pick one)

- **Track A — AWS Copilot CLI (recommended).** Copilot turns your existing
  Dockerfile into ECS Fargate + ALB + ACM + VPC with a handful of commands, and
  manages Secrets Manager wiring for you. Fastest correct path. Steps below use it.
- **Track B — Terraform / raw console.** More control, more clicks. If you want
  this instead, I can generate the Terraform — just ask. The architecture above
  is the same either way.

Prerequisites for both: an AWS account, the **AWS CLI** logged in
(`aws configure`), **Docker** installed, a **domain** you control (in Route 53 or
delegated to it), and the **AWS Copilot CLI** (`brew install aws/tap/copilot-cli`
or the Windows binary from the Copilot releases page).

---

## 3. Step-by-step (Track A — Copilot)

All commands run from the **`backend/`** directory (where the Dockerfile is).

### 3.1 Generate your secrets locally (once)

```bash
python -c "import secrets; print('JWT_SECRET=' + secrets.token_urlsafe(48))"
python -c "from cryptography.fernet import Fernet; print('ENCRYPTION_KEY=' + Fernet.generate_key().decode())"
```
Keep these two values safe — you'll store them in Secrets Manager, not in git.
**The `ENCRYPTION_KEY` is the master key for every stored credential; if you ever
lose it, all connected stores must reconnect; if it leaks, rotate it and
re-encrypt.**

### 3.2 Initialize the app + environment

```bash
copilot app init commerce-os
copilot env init --name prod --profile default --default-config
copilot env deploy --name prod          # creates the VPC, subnets, ECS cluster
```

### 3.3 Create the database and cache

**RDS Postgres** (Copilot can attach an Aurora Postgres cluster as an addon):
```bash
copilot storage init \
  --name commerce-db \
  --storage-type Aurora \
  --workload api \
  --engine PostgreSQL \
  --initial-db commerce
```
This injects a `COMMERCE_DB_SECRET` (JSON with host/port/user/pass) into the `api`
service. You'll reference it to build `DATABASE_URL` / `DATABASE_URL_SYNC`
(see 3.5). Prefer **Aurora Serverless v2** (scales to your 500k-customer store and
back down). If you'd rather use a plain **RDS instance**
(`db.t4g.small`, 50 GB gp3, storage autoscaling on), create it in the console in
the env's **private** subnets and put its connection string in Secrets Manager
instead — both work.

**ElastiCache Redis:** Copilot has no first-class generator, so add it as a CFN
addon (I can generate `copilot/api/addons/redis.yml` for you on request) **or**
create a `cache.t4g.micro` ElastiCache Redis in the env's private subnets via the
console and note its primary endpoint.

> Both RDS and ElastiCache must sit in **private subnets** with security groups
> that allow inbound **only** from the ECS tasks' security group. Never public.

### 3.4 Store secrets in Secrets Manager

```bash
copilot secret init --name JWT_SECRET            # paste the generated value
copilot secret init --name ENCRYPTION_KEY        # paste the Fernet key
copilot secret init --name SUPERADMIN_PASSWORD   # a strong password
copilot secret init --name ANTHROPIC_API_KEY     # optional global fallback
```
These land in AWS Secrets Manager, scoped to the `prod` env, and Copilot wires
them into the task definition's `secrets:` block (injected as env vars at runtime,
encrypted at rest, never in your image or git).

### 3.5 Configure the three services

Create the services (Copilot writes a manifest under `copilot/<name>/`):
```bash
copilot svc init --name api    --svc-type "Load Balanced Web Service" --port 8000 --dockerfile ./Dockerfile
copilot svc init --name worker --svc-type "Backend Service"           --dockerfile ./Dockerfile
copilot svc init --name beat   --svc-type "Backend Service"           --dockerfile ./Dockerfile
```

Then edit each manifest:

**`copilot/api/manifest.yml`**
```yaml
http:
  path: '/'
  healthcheck:
    path: '/health'        # the app exposes GET /health
    healthy_threshold: 2
    interval: 15s
command: >-
  sh -c "alembic upgrade head &&
         uvicorn app.main:app --host 0.0.0.0 --port 8000"
cpu: 512
memory: 1024
count: 1                   # raise for HA once stable
variables:
  ENVIRONMENT: production
  API_V1_PREFIX: /api/v1
  CORS_ORIGINS: https://app.yourdomain.com
  PUBLIC_WEBHOOK_BASE_URL: https://api.yourdomain.com
  CELERY_TASK_ALWAYS_EAGER: "false"
  LOCAL_SCHEDULER_ENABLED: "false"
  SYNC_INTERVAL_MINUTES: "60"
  ANTHROPIC_MODEL: claude-opus-4-8
  # Build these from the Aurora secret JSON + the Redis endpoint:
  DATABASE_URL: postgresql+asyncpg://<user>:<pass>@<rds-host>:5432/commerce
  DATABASE_URL_SYNC: postgresql+psycopg://<user>:<pass>@<rds-host>:5432/commerce
  REDIS_URL: redis://<redis-endpoint>:6379/0
  CELERY_BROKER_URL: redis://<redis-endpoint>:6379/1
  CELERY_RESULT_BACKEND: redis://<redis-endpoint>:6379/2
secrets:
  JWT_SECRET: JWT_SECRET
  ENCRYPTION_KEY: ENCRYPTION_KEY
  SUPERADMIN_PASSWORD: SUPERADMIN_PASSWORD
  ANTHROPIC_API_KEY: ANTHROPIC_API_KEY
```

**`copilot/worker/manifest.yml`** — same `variables`/`secrets` block, but:
```yaml
command: celery -A app.tasks.celery_app.celery_app worker --loglevel=info
cpu: 512
memory: 1024           # bump to 2048 for the first 500k-customer backfill
count: 1               # scale up for throughput
```

**`copilot/beat/manifest.yml`** — same `variables`/`secrets` block, but:
```yaml
command: celery -A app.tasks.celery_app.celery_app beat --loglevel=info
cpu: 256
memory: 512
count: 1               # MUST stay 1
```

> The full env-var list and which values are secret is in
> [backend/.env.production.example](backend/.env.production.example). Reuse the
> `variables`/`secrets` blocks across all three services so they share config.

### 3.6 Deploy

```bash
copilot svc deploy --name api    --env prod   # runs migrations, starts API behind ALB
copilot svc deploy --name worker --env prod
copilot svc deploy --name beat   --env prod
```
Copilot builds the image, pushes to ECR, provisions the ALB + ACM cert, and starts
the tasks. It prints the ALB URL.

### 3.7 Point your domain + TLS

- In Route 53, create `api.yourdomain.com` as an **A/ALIAS** record to the ALB.
  (Copilot can manage this for you if your domain is the app's
  `--domain`; otherwise add the record manually and validate the ACM cert via DNS.)
- Confirm `https://api.yourdomain.com/health` returns `{"status":"ok"}`.

### 3.8 Deploy the frontend (Vercel — simplest)

1. Import the `Frontend/` directory into Vercel.
2. Set env var `NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1`.
3. Add your domain `app.yourdomain.com`.
4. Make sure the API's `CORS_ORIGINS` includes exactly that origin.

(All-AWS alternative: AWS Amplify Hosting or S3 + CloudFront. Vercel is faster for
a Next.js app; pick Amplify only if you want everything inside AWS.)

---

## 4. Turn on real-time Shopify (the payoff)

Once the API is live at `https://api.yourdomain.com` with
`PUBLIC_WEBHOOK_BASE_URL` set:

1. Log into the app → **Integrations → Shopify → Connect**.
2. Enter **`shop_url`**, the **`access_token`** (`shpat_…` from a Shopify custom
   app), **and the `api_secret`** (the custom app's API secret key). The
   `api_secret` is required so the server can verify webhook HMAC signatures —
   without it, webhooks are rejected.
3. On connect, the server validates the creds, encrypts + stores them, **and
   registers webhooks** (`orders/create`, `orders/updated`, `refunds/create`,
   `products/*`, `customers/*`) pointing at
   `https://api.yourdomain.com/api/v1/webhooks/shopify`.
4. From now on, a new order in Shopify → webhook → HMAC verified → incremental
   sync → profit recomputed → dashboard updates **within seconds**.

> **If a store was connected before you set the public URL**, just disconnect and
> reconnect it once so the webhooks register.

**Required Shopify scopes** for the access token: `read_orders`, `read_products`,
`read_customers`, `read_inventory` (the last is needed to pull per-unit COGS for
true-profit; without it, costs read as 0).

### Shiprocket
After you **rotate the password you shared** (treat it as compromised — it was
pasted in plaintext), connect Shiprocket the same secure way: **Integrations →
Shiprocket → Connect**, entering the new credentials in the form. They're
validated live and stored Fernet-encrypted. Prefer a dedicated Shiprocket **API
user** over your main login.

---

## 5. First-run: migrate + verify

- The `api` service runs `alembic upgrade head` on every deploy (3.5), so the RDS
  schema is created automatically on first deploy. (Alternatively run it once as a
  standalone `copilot task run` if you prefer not to chain it.)
- Verify:
  - `GET https://api.yourdomain.com/health` → ok
  - `GET https://api.yourdomain.com/api/v1/docs` → Swagger UI loads
  - Log in as the seeded super-admin → connect a Shopify store → place a test
    order in Shopify → confirm it appears on the dashboard within seconds (check
    the `worker` logs in CloudWatch for `webhook ... incremental sync triggered`).

---

## 6. Security checklist (your "keep all API keys secure" requirement)

Already handled by the app:
- ✅ Integration credentials are **Fernet-encrypted at rest**
  ([crypto.py](backend/app/core/crypto.py)); decrypted only in-process at sync
  time; **never returned to any client**.
- ✅ Passwords hashed with **Argon2**; auth via short-lived **JWT** + refresh.

You must ensure in production:
- [ ] `JWT_SECRET` and `ENCRYPTION_KEY` exist **only** in Secrets Manager (not in
      git, not in the image, not in plain task-def env). Generate fresh prod values.
- [ ] **TLS everywhere** — ALB listener is HTTPS (ACM cert); HTTP → HTTPS redirect.
- [ ] **RDS and ElastiCache are private** (no public IP); security groups allow
      inbound only from the ECS tasks' SG.
- [ ] Enable **RDS encryption at rest** + automated backups + (optionally)
      ElastiCache in-transit encryption (`rediss://`).
- [ ] `CORS_ORIGINS` = your exact frontend origin only.
- [ ] `ENVIRONMENT=production`, strong `SUPERADMIN_PASSWORD`.
- [ ] Back up the `ENCRYPTION_KEY` securely (e.g., a second Secrets Manager entry
      or your password manager) — losing it orphans every stored credential.
- [ ] Restrict who can read the Secrets Manager entries via IAM.
- [ ] Keep `.env` (with real values) **out of git** — it already is, via
      [backend/.gitignore](backend/.gitignore). This repo's
      [backend/.env](backend/.env) holds local dev values only.

---

## 7. Rough monthly cost (small production)

| Component | Size | ~USD/mo |
|-----------|------|---------|
| ECS Fargate (api+worker+beat, small) | 3 tasks | $30–55 |
| RDS / Aurora Serverless v2 Postgres | min ACU / t4g.small | $15–45 |
| ElastiCache Redis | cache.t4g.micro | $12 |
| ALB | 1 | $18–22 |
| Secrets Manager | ~4 secrets | $2 |
| Route 53 | 1 zone | $0.50 |
| **Backend subtotal** | | **~$80–135** |
| Frontend (Vercel) | Hobby/Pro | $0–20 |

The one-time **500k-customer backfill** is CPU/time-heavy on the worker (give it
2 GB during the first sync); steady-state runs on cheap incremental + webhook
syncs, so ongoing cost stays low.

---

## 8. Quick-start alternative (if AWS feels like too much right now)

A single **EC2** box (`t3.small`) running your existing
`docker compose up -d` + **Caddy** (auto-HTTPS) gets you live in ~1 hour: set the
same production env values, point `api.yourdomain.com` at the instance, set
`PUBLIC_WEBHOOK_BASE_URL`, and webhooks work identically. Trade-off: DB/Redis live
on the same box (less durable, harder to scale) — fine to validate, migrate to the
ECS+RDS setup above when it matters.

---

*Generated as a deployment guide. No application code was modified. Files added:
this runbook and [backend/.env.production.example](backend/.env.production.example).*
