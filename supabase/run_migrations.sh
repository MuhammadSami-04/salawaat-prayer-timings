#!/usr/bin/env bash
# Applies the three migrations to a Supabase project, in order.
# Usage: ./scripts_run_migrations.sh "postgresql://postgres:PASSWORD@host:5432/postgres"
set -euo pipefail
CONN="${1:?Pass the Supabase connection string as the first argument}"

for f in supabase/migrations/0001_schema.sql \
         supabase/migrations/0002_rls.sql \
         supabase/migrations/0003_seed.sql; do
  echo "=== applying $f ==="
  psql "$CONN" -v ON_ERROR_STOP=1 -q -f "$f"
  echo "    ok"
done

echo
echo "=== verifying ==="
psql "$CONN" -X -c "select type, count(*) from public.locations group by type order by type;"
psql "$CONN" -X -c "select count(*) as timing_rows from public.prayer_timings;"
psql "$CONN" -X -c "select tablename, rowsecurity from pg_tables where schemaname='public' order by tablename;"
