#!/bin/bash

# Check if publishing locally (CI sets CI=true)
if [ "$CI" = "true" ]; then
  # In CI, let semantic-release handle everything
  exit 0
fi

VERSION=$(node -p "require('./package.json').version")
TAG="v$VERSION"

if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "✓ Tag $TAG exists, proceeding with publish"
  exit 0
else
  echo ""
  echo "⚠️  Warning: Tag $TAG does not exist"
  echo ""
  echo "If this is your first local publish after setting up semantic-release:"
  echo "  1. git tag $TAG"
  echo "  2. git push origin main --tags"
  echo "  3. Then run npm publish again"
  echo ""
  echo "Or push to main and let CI handle the release automatically."
  echo ""
  echo "Continuing anyway in 5 seconds... (Ctrl+C to cancel)"
  sleep 5
fi
