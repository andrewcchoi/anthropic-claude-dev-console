#!/bin/bash
# Component Trace Script
# Use this to verify you're editing the correct component before making changes
#
# Usage: ./scripts/trace-component.sh ComponentName
# Example: ./scripts/trace-component.sh SessionList

COMPONENT=$1

if [ -z "$COMPONENT" ]; then
  echo "Usage: $0 <ComponentName>"
  echo "Example: $0 SessionList"
  exit 1
fi

echo "════════════════════════════════════════════════════════════════"
echo "🔍 COMPONENT TRACE: $COMPONENT"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Find the component file
echo "📁 Component Definition:"
COMPONENT_FILE=$(find src -name "*.tsx" -exec grep -l "export.*function $COMPONENT\|export.*const $COMPONENT\|export default.*$COMPONENT" {} \; 2>/dev/null | head -1)

if [ -z "$COMPONENT_FILE" ]; then
  echo "   ❌ Component '$COMPONENT' not found"
  exit 1
fi

echo "   $COMPONENT_FILE"
echo ""

# Find where it's imported
echo "📥 Imported By:"
grep -r "import.*$COMPONENT" src --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "$COMPONENT_FILE" | while read line; do
  FILE=$(echo "$line" | cut -d: -f1)
  echo "   $FILE"
done
echo ""

# Check if it's used in production (not just tests)
echo "🏭 Production Usage:"
PROD_USAGE=$(grep -r "<$COMPONENT" src --include="*.tsx" 2>/dev/null | grep -v "__tests__" | grep -v "\.test\." || true)

if [ -n "$PROD_USAGE" ]; then
  echo "$PROD_USAGE" | while read line; do
    FILE=$(echo "$line" | cut -d: -f1)
    echo "   ✅ Used in: $FILE"
  done
else
  echo "   ⚠️  NOT FOUND IN PRODUCTION CODE"
  echo "   This component may only be used in tests!"
fi
echo ""

# Check test usage
echo "🧪 Test Usage:"
TEST_USAGE=$(grep -r "$COMPONENT" __tests__ --include="*.tsx" --include="*.ts" 2>/dev/null | head -5 || true)

if [ -n "$TEST_USAGE" ]; then
  echo "$TEST_USAGE" | while read line; do
    FILE=$(echo "$line" | cut -d: -f1)
    echo "   $FILE"
  done
else
  echo "   None"
fi
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "💡 Before editing $COMPONENT_FILE:"
echo "   1. Verify it's used in production (see above)"
echo "   2. Add a console.log and verify it appears in browser"
echo "   3. Only then make your actual changes"
echo "════════════════════════════════════════════════════════════════"
