#!/usr/bin/env bash
# 사용법: PGHOST=... PGPORT=... ./supabase/test/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
PSQL="psql -U postgres -X -q -v ON_ERROR_STOP=1"
$PSQL -c "drop database if exists itv_test" -c "create database itv_test" >/dev/null 2>&1
$PSQL -d itv_test -f test/stubs.sql >/dev/null
$PSQL -d itv_test -f schema.sql >/dev/null
$PSQL -d itv_test -f test/test.sql 2>&1 >/dev/null | sed -E 's/^psql:[^ ]+ (WARNING|ERROR):  //'
