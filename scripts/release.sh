#!/usr/bin/env bash
set -euo pipefail

if ! command -v gh &> /dev/null; then
    echo "Error: gh CLI is required (https://cli.github.com)"
    exit 1
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" != "main" ]]; then
    echo "Error: must be on main branch (currently on $BRANCH)"
    exit 1
fi

git fetch origin main --tags --quiet
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
if [[ "$LOCAL" != "$REMOTE" ]]; then
    echo "Error: local main is not up to date with origin/main"
    echo "  local:  $LOCAL"
    echo "  remote: $REMOTE"
    echo "Run 'git pull' first."
    exit 1
fi

PREV_TAG=$(gh release list --limit 1 --json tagName --jq '.[0].tagName' 2>/dev/null || true)

echo ""
if [[ -n "$PREV_TAG" ]]; then
    echo "Current release: $PREV_TAG"
else
    echo "Current release: (none)"
fi
echo ""
read -rp "Enter new version: " INPUT

if [[ -z "$INPUT" ]]; then
    echo "Error: version cannot be empty"
    exit 1
fi

INPUT="${INPUT#v}"
if [[ ! "$INPUT" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: version must be a valid semver (e.g. 1.5.0)"
    exit 1
fi
VERSION="v${INPUT}"

if git tag -l "$VERSION" | grep -q "^${VERSION}$"; then
    echo "Error: tag $VERSION already exists"
    exit 1
fi

SEMVER="${VERSION#v}"
SERVICES=("auth" "gr26" "vehicle")
CONFIG_FILES=()
for svc in "${SERVICES[@]}"; do
    CONFIG_FILES+=("${svc}/config/config.go")
done

echo ""
echo "=== Release Summary ==="
echo "  Version: $VERSION"
echo "  Commit:  $(git rev-parse --short HEAD)"
echo "  Branch:  main"
echo ""
echo "  Files to update:"
for f in "${CONFIG_FILES[@]}"; do
    echo "    $f"
done
echo "    mapache-py/pyproject.toml"
echo ""
echo "  Docker images that will be tagged:"
for svc in "${SERVICES[@]}"; do
    echo "    ghcr.io/gaucho-racing/mapache/${svc}:${VERSION}"
done
echo ""
read -rp "Proceed? (y/N) " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    echo "Aborted."
    exit 0
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
for f in "${CONFIG_FILES[@]}"; do
    sed -i '' "s/Version:.*\".*\"/Version:     \"${SEMVER}\"/" "${REPO_ROOT}/${f}"
done
sed -i '' "s/^version = \".*\"/version = \"${SEMVER}\"/" "${REPO_ROOT}/mapache-py/pyproject.toml"

git add "${CONFIG_FILES[@]}" mapache-py/pyproject.toml
git commit -m "release: ${VERSION}"
git push origin main

gh release create "$VERSION" \
    --target main \
    --title "$VERSION" \
    --generate-notes

echo ""
echo "Release $VERSION created successfully."
echo "CI workflows will tag Docker images once builds complete."
