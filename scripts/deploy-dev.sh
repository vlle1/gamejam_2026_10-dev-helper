#!/usr/bin/env bash
set -euo pipefail

echo "Starting dev deployment"

DEPLOY_STAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

echo "Dev deployment completed at ${DEPLOY_STAMP}"
