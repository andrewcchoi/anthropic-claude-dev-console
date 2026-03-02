#!/bin/bash
set -a  # Auto-export all variables
source ../../.env 2>/dev/null || source .env 2>/dev/null || true
set +a

echo "Running LangSmith test with project: $LANGSMITH_PROJECT"
npx tsx test-langsmith.ts
