#!/bin/bash

# Build all command files using markdown-magic
# Builds both variants: with-beads and without-beads

set -e

# Constants
readonly SRC_DIR="src/sources"
readonly OUT_DIR_WITH_BEADS="downloads/with-beads"
readonly OUT_DIR_WITHOUT_BEADS="downloads/without-beads"

# Function to build a variant
build_variant() {
  local variant=$1
  local beads_flag=$2
  local out_dir=$3

  echo ""
  echo "🔨 Building variant: $variant"
  echo "   📦 Beads integration: $([ -z "$beads_flag" ] && echo "ENABLED" || echo "DISABLED")"
  echo ""

  # Ensure output directory exists
  mkdir -p "$out_dir"

  # Process source files with markdown-magic, output to variant directory
  echo "📄 Processing source files..."
  tsx scripts/generate-readme.ts $beads_flag --output-dir "$out_dir" "$SRC_DIR"/*.md

  echo "   ✅ Generated command files"

  # Remove markdown-magic comment blocks (workaround for markdown-magic bug)
  echo "🧹 Removing comment blocks..."
  tsx scripts/post-process.ts "$out_dir"
  echo ""
}

echo "🏗️  Building all variants..."

# Clean previous build
echo "🧹 Cleaning previous build..."
pnpm clean
echo ""

# Build with-beads variant
build_variant "with-beads" "" "$OUT_DIR_WITH_BEADS"

# Build without-beads variant
build_variant "without-beads" "--without-beads" "$OUT_DIR_WITHOUT_BEADS"

# Generate README
echo "📖 Updating README.md..."
tsx scripts/generate-readme.ts README.md > /dev/null 2>&1
echo "🧹 Removing comment blocks from README.md..."
tsx scripts/post-process.ts README.md
echo "   ✅ README.md updated"
echo ""

# Summary
echo "✅ Build complete!"
echo ""
echo "📂 Generated files:"
echo ""
echo "   With Beads (downloads/with-beads/):"
ls -1 "$OUT_DIR_WITH_BEADS"/*.md | sed 's|.*/|     ✓ |'
echo ""
echo "   Without Beads (downloads/without-beads/):"
ls -1 "$OUT_DIR_WITHOUT_BEADS"/*.md | sed 's|.*/|     ✓ |'
