#!/usr/bin/env bash
#
# Ship the current backend/ to the live EC2 box and rebuild the stack.
# DB migrations run automatically (the api container runs `alembic upgrade head`
# on start). Postgres/Redis are managed (RDS/ElastiCache) and untouched.
#
# Usage:
#   HOST=ec2-user@<EC2_PUBLIC_IP> [SSH_KEY=~/.ssh/id_ed25519] bash deploy/update.sh
#
# See deploy/UPDATE.md for the full runbook, pre-flight checks and rollback.
set -euo pipefail

HOST="${HOST:?Set HOST=ec2-user@<EC2_PUBLIC_IP>}"
SSH_KEY="${SSH_KEY:-}"
REMOTE_DIR="/opt/commerce"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

SSH_CMD="ssh"
[ -n "$SSH_KEY" ] && SSH_CMD="ssh -i $SSH_KEY"

echo "→ Syncing backend/ to ${HOST}:${REMOTE_DIR}/backend/ ..."
rsync -avz \
  --exclude '.env' \
  --exclude '.venv' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude '*.db' \
  --exclude '.git' \
  -e "$SSH_CMD" \
  "${ROOT}/backend/" "${HOST}:${REMOTE_DIR}/backend/"

echo "→ Rebuilding + restarting (alembic upgrade head runs on api start) ..."
$SSH_CMD "$HOST" "cd ${REMOTE_DIR} && docker compose -f docker-compose.prod.yml up -d --build"

echo "→ Migration revision now at:"
$SSH_CMD "$HOST" "cd ${REMOTE_DIR} && docker compose -f docker-compose.prod.yml exec -T api alembic current" || true

echo "✓ Done. Verify: open https://<api-domain>/api/v1/docs and confirm the /costs routes are present."
