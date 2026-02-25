#!/bin/bash
# Create a new component with logging pre-configured
# Usage: ./scripts/create-component.sh ComponentName [subdirectory]

NAME="$1"
SUBDIR="${2:-}"

if [ -z "$NAME" ]; then
  echo "Usage: $0 ComponentName [subdirectory]"
  echo ""
  echo "Examples:"
  echo "  $0 UserProfile           # Creates src/components/UserProfile.tsx"
  echo "  $0 UserProfile sidebar   # Creates src/components/sidebar/UserProfile.tsx"
  exit 1
fi

# Determine target directory
if [ -n "$SUBDIR" ]; then
  TARGET_DIR="src/components/$SUBDIR"
else
  TARGET_DIR="src/components"
fi

TARGET_FILE="$TARGET_DIR/$NAME.tsx"

# Check if file already exists
if [ -f "$TARGET_FILE" ]; then
  echo "❌ File already exists: $TARGET_FILE"
  exit 1
fi

# Create directory if needed
mkdir -p "$TARGET_DIR"

# Create component with logging template
cat > "$TARGET_FILE" << EOF
'use client';

import { createLogger } from '@/lib/logger';

const log = createLogger('$NAME');

interface ${NAME}Props {
  // TODO: Define props
}

export function $NAME(props: ${NAME}Props) {
  log.debug('$NAME render', { props });

  // TODO: Implement component

  return (
    <div>
      {/* $NAME component */}
    </div>
  );
}
EOF

echo "✅ Created: $TARGET_FILE"
echo ""
echo "Component includes:"
echo "  - createLogger import"
echo "  - Debug logging on render"
echo "  - TypeScript props interface"
echo ""
echo "Next steps:"
echo "  1. Define props in ${NAME}Props interface"
echo "  2. Implement component JSX"
echo "  3. Add log.debug/info/warn/error calls for key state changes"
