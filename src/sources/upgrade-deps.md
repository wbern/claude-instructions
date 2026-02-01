---
description: Check for dependency upgrades and assess safety before updating
argument-hint: (no arguments - interactive)
_hint: Upgrade packages
_category: Utilities
_order: 50
---

<!-- docs INCLUDE path='src/fragments/universal-guidelines.md' -->
<!-- /docs -->

<!-- docs INCLUDE path='src/fragments/beads-awareness.md' featureFlag='beads' -->
<!-- /docs -->

<!-- docs INCLUDE path='src/fragments/no-plan-files.md' featureFlag='no-plan-files' -->
<!-- /docs -->

# Upgrade Dependencies

Analyze available dependency upgrades, assess codebase safety signals, and guide the user through upgrade decisions.

## Phase 1: Detect Environment

Scan for package manager and project setup:

| Check | How |
|-------|-----|
| Package manager | Look for `pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`, `bun.lockb` |
| Lockfile present | Exists and tracked in git |
| Test script | `package.json` has `test` script |
| Test files | `*.test.*`, `*.spec.*`, `__tests__/` exist |
| CI config | `.github/workflows/`, `.gitlab-ci.yml`, etc. |
| Type checking | `tsconfig.json` or `jsconfig.json` present |

Output:

```
## Environment

Package manager: pnpm
Lockfile: ✓ pnpm-lock.yaml (tracked)
Test script: ✓ "vitest run"
Test files: ✓ 16 test files found
CI config: ✓ .github/workflows/release.yml
Types: ✓ tsconfig.json
```

## Phase 2: List Available Upgrades

Run the appropriate outdated command:

| Manager | Command |
|---------|---------|
| pnpm | `pnpm outdated --format json` |
| npm | `npm outdated --json` |
| yarn | `yarn outdated --json` |
| bun | `bun outdated` |

Group results by semver level:

```
## Available Upgrades

### Patch (low risk)
| Package | Current | Latest | Age |
|---------|---------|--------|-----|
| lodash | 4.17.20 | 4.17.21 | 6 months |

### Minor (medium risk)
| Package | Current | Latest | Age |
|---------|---------|--------|-----|
| vitest | 1.5.0 | 1.6.0 | 3 weeks |

### Major (review changelog)
| Package | Current | Latest | Age |
|---------|---------|--------|-----|
| typescript | 4.9.5 | 5.4.2 | 8 months |
```

Note: "Age" is time since the latest version was published. Packages < 14 days old may pose supply chain risk.

## Phase 3: Safety Assessment

Present observable signals (not guarantees):

```
## Safety Signals

✓ Test files present (16 files)
✓ Test script configured
✓ CI pipeline exists
✓ Lockfile tracked in git
✓ TypeScript for type safety
⚠ No pre-commit hooks detected
✗ Coverage threshold not configured

──────────────────────────────────────────────────
⚠ DISCLAIMER: This is a surface-level check based
on file presence, not actual test quality or
coverage. You know your codebase best.
──────────────────────────────────────────────────
```

## Phase 4: Ask User

Use `AskUserQuestion` to determine next steps:

**Question: "How would you like to proceed?"** (header: "Upgrade")

Options:
1. **Patches only** - "Upgrade patch versions (X.Y.Z → X.Y.Z+1), lowest risk"
2. **Patches + minors** - "Include minor versions (X.Y → X.Y+1), some API additions"
3. **Interactive selection** - "Choose specific packages to upgrade"
4. **Doctor mode** - "Test each upgrade individually, keep only working ones (slower but safest)"
5. **Just show outdated** - "Don't upgrade, just list what's available"

## Phase 5: Execute Upgrade

Based on user selection:

### Patches Only
```bash
# pnpm
pnpm update --no-save  # updates lockfile only for patches within range

# or with ncu
npx npm-check-updates --target patch -u && pnpm install
```

### Patches + Minors
```bash
npx npm-check-updates --target minor -u && pnpm install
```

### Interactive Selection
```bash
npx npm-check-updates -i
```

### Doctor Mode
```bash
npx npm-check-updates --doctor -u
```

This will:
1. Verify tests pass before starting
2. Try upgrading all dependencies
3. If tests fail, test each dependency individually
4. Keep only upgrades that pass tests

### After Any Upgrade

1. Run tests: `pnpm test`
2. Run type check if available: `pnpm typecheck`
3. Run build if available: `pnpm build`
4. Report results to user

## Phase 6: Summary

```
## Upgrade Summary

### Upgraded
- lodash: 4.17.20 → 4.17.21 (patch)
- vitest: 1.5.0 → 1.6.0 (minor)

### Skipped
- typescript: 4.9.5 → 5.4.2 (major - user opted out)

### Verification
- [x] Tests passing
- [x] Types checking
- [x] Build successful

### Next Steps
- Review changelog for skipped major upgrades
- Consider running full test suite in CI before merging
```

---

Upgrade: $ARGUMENTS
