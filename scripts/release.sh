#!/usr/bin/env bash
set -euo pipefail

# Two-phase release. Phase 1 publishes the libs (mapache-py to PyPI,
# mapache-go via Go module tag). Phase 2 bumps each service's pin to the
# new lib version and cuts the services release.
#
# The script orchestrates both phases against a single operator command.
# Between phases it watches the libs publish workflow so service pins
# bump against versions that actually exist on the registries.

for cmd in gh go uv jq; do
    if ! command -v "$cmd" &>/dev/null; then
        echo "Error: $cmd is required"
        exit 1
    fi
done

INPUT="${1:-}"
if [[ -z "$INPUT" ]]; then
    echo "Usage: $0 <version>"
    echo "Example: $0 3.1.0"
    exit 1
fi
INPUT="${INPUT#v}"
if [[ ! "$INPUT" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: version must be a valid semver (e.g. 1.5.0)"
    exit 1
fi
SEMVER="$INPUT"
VERSION="v${INPUT}"
LIB_TAG="libs/${VERSION}"
SVC_TAG="${VERSION}"

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

if git tag -l "$LIB_TAG" | grep -q "^${LIB_TAG}$"; then
    echo "Error: tag $LIB_TAG already exists"
    exit 1
fi
if git tag -l "$SVC_TAG" | grep -q "^${SVC_TAG}$"; then
    echo "Error: tag $SVC_TAG already exists"
    exit 1
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

GO_SERVICES_WITH_DEP=("gr26" "vehicle")
GO_CONFIG_SERVICES=("auth" "gr26" "vehicle")
PY_SERVICES=("query")

PREV_TAG=$(gh release list --limit 20 --json tagName --jq '[.[] | select(.tagName | startswith("libs/") | not) | .tagName] | .[0]' 2>/dev/null || true)

echo ""
if [[ -n "$PREV_TAG" ]]; then
    echo "Current release: $PREV_TAG"
else
    echo "Current release: (none)"
fi
echo ""
echo "=== Two-phase release: ${VERSION} ==="
echo ""
echo "Phase 1 — libs (${LIB_TAG}):"
echo "  bump mapache-py/pyproject.toml -> ${SEMVER}"
echo "  publish.yml uploads mapache-py to PyPI and creates mapache-go/${VERSION}"
echo ""
echo "Phase 2 — services (${SVC_TAG}):"
echo "  go get mapache-go@${VERSION} in: ${GO_SERVICES_WITH_DEP[*]}"
echo "  uv lock --upgrade-package mapache-py in: ${PY_SERVICES[*]}"
echo "  bump config.go in: ${GO_CONFIG_SERVICES[*]}"
echo "  bump pyproject.toml in: ${PY_SERVICES[*]}"
echo "  per-service workflows tag images :${SEMVER}"
echo ""
read -rp "Proceed? (y/N) " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    echo "Aborted."
    exit 0
fi

# === Phase 1: libs ===
echo ""
echo "=== Phase 1: libs ==="
sed -i '' "s/^version = \".*\"/version = \"${SEMVER}\"/" "${REPO_ROOT}/mapache-py/pyproject.toml"
git add mapache-py/pyproject.toml
git commit -m "release: libs ${VERSION}"
git push origin main

gh release create "$LIB_TAG" \
    --target main \
    --title "libs ${VERSION}" \
    --generate-notes

# Wait for publish.yml to land. The first poll lets CI register the run;
# gh run watch then blocks until completion and exits non-zero on failure.
echo ""
echo "Waiting for publish.yml to start..."
RUN_ID=""
for i in $(seq 1 30); do
    RUN_ID=$(gh run list --workflow=publish.yml --limit=1 --json databaseId,status --jq '.[0] | select(.status != "completed") | .databaseId' 2>/dev/null || true)
    if [[ -n "$RUN_ID" ]]; then
        break
    fi
    sleep 2
done
if [[ -z "$RUN_ID" ]]; then
    echo "Error: publish.yml run did not appear within 60s"
    echo "Check GitHub Actions, then re-run with --skip-libs once libs are live."
    exit 1
fi
echo "Watching publish.yml run #${RUN_ID}..."
gh run watch "$RUN_ID" --exit-status

# Pull the mapache-go submodule tag locally; sleep gives PyPI a beat to
# index the new wheel before uv tries to resolve it.
git fetch origin --tags --quiet
echo "Sleeping 15s for PyPI to index the new release..."
sleep 15

# === Phase 2: services ===
echo ""
echo "=== Phase 2: services ==="

for svc in "${GO_SERVICES_WITH_DEP[@]}"; do
    echo "  bumping mapache-go in ${svc}..."
    (cd "${REPO_ROOT}/${svc}" && go get "github.com/gaucho-racing/mapache/mapache-go/v3@${VERSION}" && go mod tidy)
done

for svc in "${PY_SERVICES[@]}"; do
    echo "  bumping mapache-py in ${svc}..."
    (
        cd "${REPO_ROOT}/${svc}"
        for i in 1 2 3; do
            if uv lock --upgrade-package mapache-py; then
                break
            fi
            echo "    retry $i: PyPI may not have indexed ${SEMVER} yet"
            sleep 15
        done
    )
done

for svc in "${GO_CONFIG_SERVICES[@]}"; do
    sed -i '' "s/Version:.*\".*\"/Version:     \"${SEMVER}\"/" "${REPO_ROOT}/${svc}/config/config.go"
done

for svc in "${PY_SERVICES[@]}"; do
    sed -i '' "s/^version = \".*\"/version = \"${SEMVER}\"/" "${REPO_ROOT}/${svc}/pyproject.toml"
done

FILES=()
for svc in "${GO_CONFIG_SERVICES[@]}"; do
    FILES+=("${svc}/config/config.go")
done
for svc in "${GO_SERVICES_WITH_DEP[@]}"; do
    FILES+=("${svc}/go.mod" "${svc}/go.sum")
done
for svc in "${PY_SERVICES[@]}"; do
    FILES+=("${svc}/pyproject.toml" "${svc}/uv.lock")
done

git add "${FILES[@]}"
git commit -m "release: services ${VERSION}"
git push origin main

gh release create "$SVC_TAG" \
    --target main \
    --title "${VERSION}" \
    --generate-notes

echo ""
echo "Release ${SVC_TAG} created. Per-service workflows will tag images shortly."
