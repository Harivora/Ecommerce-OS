# AI Commerce OS — Backend

FastAPI multi-tenant SaaS backend for the AI CFO platform. Subscribers log in,
paste their own platform API keys (stored encrypted), and the system pulls their
real Shopify/Shiprocket data, computes true profit, and powers a Claude analyst.

## Stack
FastAPI · SQLAlchemy 2 (async + asyncpg) · PostgreSQL · Redis · Celery (worker + beat)
· Anthropic Claude (`claude-opus-4-8`) · Alembic · JWT + Argon2 · Fernet-encrypted credentials.

## Run with Docker (recommended)

```bash
cp .env.example .env
# Generate secrets and put them in .env:
python -c "import secrets; print('JWT_SECRET=' + secrets.token_urlsafe(48))"
python -c "from cryptography.fernet import Fernet; print('ENCRYPTION_KEY=' + Fernet.generate_key().decode())"
# Set ANTHROPIC_API_KEY and SUPERADMIN_* in .env too.

docker compose up --build
```

This starts `postgres`, `redis`, `api` (runs `alembic upgrade head` then uvicorn),
`worker`, and `beat`. Open the API docs at <http://localhost:8000/api/v1/docs>.

## Run locally (without Docker)

```bash
python -m venv .venv && .venv/Scripts/activate   # Windows; use source .venv/bin/activate on *nix
pip install -r requirements.txt
# point DATABASE_URL/DATABASE_URL_SYNC at a local Postgres, set JWT_SECRET + ENCRYPTION_KEY
alembic upgrade head
uvicorn app.main:app --reload
# In separate shells, for background sync:
celery -A app.tasks.celery_app.celery_app worker --loglevel=info
celery -A app.tasks.celery_app.celery_app beat --loglevel=info
```

The platform owner (super-admin) is seeded from `SUPERADMIN_*` on first boot.

## Key flows
- **Onboarding:** public `POST /api/v1/auth/signup`, or super-admin `POST /api/v1/admin/organizations` (provision org + owner login). Super-admins `POST /api/v1/admin/impersonate` to act inside a tenant.
- **Integrations:** `POST /api/v1/integrations/{provider}/connect` validates live credentials, stores them Fernet-encrypted, and enqueues a Celery sync. Connectors: `shopify`, `shiprocket`. `meta`, `google_ads`, `razorpay`, `cashfree` accept manual data entry.
- **Profit engine:** `net_profit = revenue − COGS − ad_spend − shipping − gateway_fees − refunds`, recomputed after each sync into `profit_metrics`; served via `/dashboard/*`.
- **AI analyst:** `POST /api/v1/ai/chat` builds a per-org data context (cached) and asks Claude. Falls back to a clear message if `ANTHROPIC_API_KEY` is unset.

## Tests

```bash
pytest          # SQLite-backed; covers profit engine, auth, tenant isolation, integrations, AI, admin
```

## Frontend integration (follow-up)
Responses mirror `Frontend/src/types/index.ts` (camelCase). Wiring the Next.js app
to this API (a `lib/api.ts` client + replacing the mock-data imports) is the next phase.
