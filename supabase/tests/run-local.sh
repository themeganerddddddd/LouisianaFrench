#!/usr/bin/env bash
# Run the username migrations and pgTAP tests against a local Postgres container.
# Prefers the Supabase Postgres image pinned to config.toml major_version.
# Falls back to the official image and installs pgTAP if that image cannot start.
# Does not use supabase start, login, link, or a hosted project.
set -euo pipefail

root=$(cd "$(dirname "$0")/../.." && pwd)
cd "$root"

skip_migrations=0
if [[ "${1:-}" == "--skip-migrations" ]]; then
  skip_migrations=1
elif [[ $# -gt 0 ]]; then
  echo "usage: supabase/tests/run-local.sh [--skip-migrations]" >&2
  exit 2
fi

name=lf-bio80-postgres
port=55432
major=$(awk -F= '/^major_version[[:space:]]*=/ { gsub(/[[:space:]"]/, "", $2); print $2; exit }' supabase/config.toml)
if [[ "$major" != "17" ]]; then
  echo "supabase/config.toml major_version is ${major:-missing}; this harness expects 17." >&2
  exit 1
fi

supabase_image=public.ecr.aws/supabase/postgres:17.12.0.002
official_image=docker.io/library/postgres:17
used_image=$supabase_image

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
echo "Starting ${supabase_image} as ${name} on port ${port}."
podman run -d --name "$name" \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_HOST=/var/run/postgresql \
  -e POSTGRES_DB=postgres \
  -p "${port}:5432" \
  "$supabase_image" >/dev/null

if ! wait_ready; then
  echo "Supabase Postgres did not stay up. Falling back to ${official_image} and installing pgTAP."
  podman logs "$name" 2>&1 | tail -n 30 || true
  podman rm -f "$name" >/dev/null 2>&1 || true
  used_image=$official_image
  podman run -d --name "$name" \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=postgres \
    -p "${port}:5432" \
    "$official_image" >/dev/null
  if ! wait_ready; then
    echo "Official Postgres did not become ready." >&2
    podman logs "$name" 2>&1 | tail -n 30 || true
    exit 1
  fi
  podman exec -u root "$name" apt-get update
  podman exec -u root "$name" apt-get install -y --no-install-recommends postgresql-17-pgtap
fi

echo "Image: ${used_image}"
echo "Container: ${name}"
echo "Host port: ${port}"

admin_user=postgres
if podman exec "$name" psql -U postgres -d postgres -tAc "select 1 from pg_roles where rolname = 'supabase_admin'" | grep -q 1; then
  admin_user=supabase_admin
fi
echo "Admin role: ${admin_user}"

echo "=== auth stub ==="
psql_file "$admin_user" supabase/tests/stub_auth.sql

if [[ "$skip_migrations" -eq 0 ]]; then
  echo "=== migrations from zero ==="
  shopt -s nullglob
  files=(supabase/migrations/*.sql)
  if [[ ${#files[@]} -eq 0 ]]; then
    echo "No files in supabase/migrations." >&2
    exit 1
  fi
  for file in "${files[@]}"; do
    echo "-- ${file}"
    psql_file postgres "$file"
  done
else
  echo "=== migrations skipped ==="
fi

echo "=== pgTAP extension ==="
podman exec "$name" psql -U "$admin_user" -d postgres -v ON_ERROR_STOP=1 -c 'create extension if not exists pgtap;'

echo "=== pgTAP tests ==="
tmp=$(mktemp)
set +e
podman exec -i "$name" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f - < supabase/tests/profiles_username.sql | tee "$tmp"
status=${PIPESTATUS[0]}
set -e
if grep -E '^(not ok|ERROR:)' "$tmp" >/dev/null; then
  status=1
fi
rm -f "$tmp"
if [[ "$status" -ne 0 ]]; then
  echo "pgTAP tests failed (exit ${status})." >&2
  exit "$status"
fi
echo "pgTAP tests passed."
