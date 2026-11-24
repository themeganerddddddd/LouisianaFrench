#!/usr/bin/env bash
# Run the username migration and pgTAP tests against a local Postgres container.
# Image: public.ecr.aws/supabase/postgres:17.12.0.002
# The database port is not published. Every command goes through podman exec.
# Does not use supabase start, login, link, or a hosted project.
set -euo pipefail

root=$(cd "$(dirname "$0")/../.." && pwd)
cd "$root"

skip_migrations=0
without=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-migrations) skip_migrations=1; shift ;;
    --without)
      if [[ $# -lt 2 || -z "${2:-}" ]]; then
        echo "usage: tests/db/run-local.sh [--skip-migrations] [--without <migration-file>]" >&2
        exit 2
      fi
      without="$2"
      shift 2
      ;;
    *)
      echo "usage: tests/db/run-local.sh [--skip-migrations] [--without <migration-file>]" >&2
      exit 2
      ;;
  esac
done

name=lf-bio80-postgres
image=public.ecr.aws/supabase/postgres:17.12.0.002

cleanup() {
  podman rm -f "$name" >/dev/null 2>&1 || true
}
trap cleanup EXIT

wait_ready() {
  local i running
  for i in $(seq 1 120); do
    running=$(podman inspect -f '{{.State.Running}}' "$name" 2>/dev/null || echo false)
    if [[ "$running" != "true" ]]; then
      return 1
    fi
    if podman logs "$name" 2>&1 | grep -q "PostgreSQL init process complete" \
      && podman exec "$name" pg_isready -U postgres -d postgres >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

psql_file() {
  local user=$1 file=$2
  podman exec -i "$name" psql -U "$user" -d postgres -v ON_ERROR_STOP=1 -f - < "$file"
}

cleanup
echo "Starting ${image} as ${name}. The database port is not published."
podman run -d --name "$name" \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_HOST=/var/run/postgresql \
  -e POSTGRES_DB=postgres \
  "$image" >/dev/null

if ! wait_ready; then
  echo "Postgres did not become ready." >&2
  podman logs "$name" 2>&1 | tail -n 30 || true
  exit 1
fi

echo "Image: ${image}"
echo "Container: ${name}"

# Trust auth never consumes a password, and non-superuser dblink refuses
# a connection that did not use one. Loopback must ask for the password.
# The socket stays peer/trust, so the harness can still connect without one.
echo "=== loopback password auth for dblink ==="
podman exec -u root "$name" sed -i -E \
  's/^(host[[:space:]]+all[[:space:]]+all[[:space:]]+127\.0\.0\.1\/32[[:space:]]+)trust/\1scram-sha-256/' \
  /etc/postgresql/pg_hba.conf
if ! podman exec -u root "$name" grep -Eq '127\.0\.0\.1/32[[:space:]]+scram-sha-256' /etc/postgresql/pg_hba.conf; then
  echo "Loopback auth was not switched to scram-sha-256." >&2
  exit 1
fi
podman exec "$name" psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 \
  -c "alter user postgres password 'postgres'; select pg_reload_conf();"

echo "=== auth users before migrations ==="
psql_file postgres tests/fixtures/db/users_before_migration.sql

if [[ "$skip_migrations" -eq 0 ]]; then
  echo "=== migrations from zero ==="
  shopt -s nullglob
  files=(supabase/migrations/*.sql)
  if [[ ${#files[@]} -eq 0 ]]; then
    echo "No files in supabase/migrations." >&2
    exit 1
  fi
  for file in "${files[@]}"; do
    if [[ -n "$without" && "$(basename "$file")" == "$without" ]]; then
      echo "-- skip ${file}"
      continue
    fi
    echo "-- ${file}"
    psql_file postgres "$file"
  done
else
  echo "=== migrations skipped ==="
fi

echo "=== pgTAP extension ==="
podman exec "$name" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c 'create extension if not exists pgtap;'

echo "=== pgTAP tests ==="
status=0
shopt -s nullglob
tests=(tests/db/*.sql)
if [[ ${#tests[@]} -eq 0 ]]; then
  echo "No pgTAP files in tests/db." >&2
  exit 1
fi
for file in "${tests[@]}"; do
  echo "=== ${file} ==="
  tmp=$(mktemp)
  set +e
  podman exec -i "$name" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f - < "$file" | tee "$tmp"
  one=${PIPESTATUS[0]}
  set -e
  if grep -E '^(not ok|ERROR:)' "$tmp" >/dev/null; then
    one=1
  fi
  if grep -F 'Looks like you planned' "$tmp" >/dev/null; then
    one=1
  fi
  rm -f "$tmp"
  if [[ "$one" -ne 0 ]]; then
    echo "pgTAP failed in ${file} (exit ${one})." >&2
    status=$one
  fi
done
if [[ "$status" -ne 0 ]]; then
  echo "pgTAP tests failed (exit ${status})." >&2
  exit "$status"
fi
echo "pgTAP tests passed."
