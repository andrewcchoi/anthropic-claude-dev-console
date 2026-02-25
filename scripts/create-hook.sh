#!/bin/bash
# Create a new React hook with logging pre-configured
# Usage: ./scripts/create-hook.sh useHookName

NAME="$1"

if [ -z "$NAME" ]; then
  echo "Usage: $0 useHookName"
  echo ""
  echo "Examples:"
  echo "  $0 useUserProfile"
  echo "  $0 useFormValidation"
  exit 1
fi

# Validate hook name starts with "use"
if [[ ! "$NAME" =~ ^use ]]; then
  echo "❌ Hook name must start with 'use' (e.g., useMyHook)"
  exit 1
fi

TARGET_FILE="src/hooks/$NAME.ts"

# Check if file already exists
if [ -f "$TARGET_FILE" ]; then
  echo "❌ File already exists: $TARGET_FILE"
  exit 1
fi

# Create hook with logging template
cat > "$TARGET_FILE" << EOF
import { useState, useEffect, useCallback } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('$NAME');

interface ${NAME}Options {
  // TODO: Define options
}

interface ${NAME}Return {
  // TODO: Define return type
  isLoading: boolean;
  error: Error | null;
}

export function $NAME(options: ${NAME}Options = {}): ${NAME}Return {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  log.debug('$NAME initialized', { options });

  useEffect(() => {
    log.debug('$NAME effect triggered');

    // TODO: Implement effect logic

    return () => {
      log.debug('$NAME cleanup');
    };
  }, []);

  // TODO: Add more hook logic

  return {
    isLoading,
    error,
    // TODO: Return additional values
  };
}
EOF

echo "✅ Created: $TARGET_FILE"
echo ""
echo "Hook includes:"
echo "  - createLogger import"
echo "  - Debug logging for initialization, effects, and cleanup"
echo "  - TypeScript interfaces for options and return type"
echo "  - Standard loading/error state"
echo ""
echo "Next steps:"
echo "  1. Define options in ${NAME}Options interface"
echo "  2. Define return values in ${NAME}Return interface"
echo "  3. Implement hook logic"
echo "  4. Add log calls for state changes and errors"
