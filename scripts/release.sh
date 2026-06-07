#!/usr/bin/env bash
set -euo pipefail

# Per-target release script.
#
#   ./scripts/release.sh -t mapache-py 3.2.0
#       Cuts mapache-py 3.2.0 (PyPI via publish.yml), then bumps the
#       lockfile in every dependent Python service and pushes a chore
#       commit.
#
#   ./scripts/release.sh -t mapache-go 3.2.0
#       Cuts mapache-go 3.2.0 (Go module tag via the GH release),
#       warms proxy.golang.org via publish.yml, then runs `go get` in
#       every dependent Go service and pushes a chore commit.
#
#   ./scripts/release.sh 3.1.0                  (default -t mapache)
#       Cuts the services release (auth/gr26/live/vehicle/query). Bumps each
#       service's Version constant or pyproject.toml, commits, tags v3.1.0,
#       and lets the per-service workflows publish images.
#
# Each target is independently versioned. Release services without bumping
# libs (lib pins stay as-is); release a lib without bumping services
# (latest service version unchanged, only its lockfile/go.mod changes).

usage() {
    cat <<EOF
Usage: $0 [-t target] <version>

Targets:
  mapache       services (auth, gr26, live, vehicle, query) — default
  mapache-py    Python library; also bumps lockfiles in dependent services
  mapache-go    Go library; also bumps go.mod in dependent services

Examples:
  $0 3.1.0                       # release services as v3.1.0
  $0 -t mapache-py 3.2.0         # release mapache-py 3.2.0
  $0 -t mapache-go 3.2.0         # release mapache-go 3.2.0
EOF
}

TARGET="mapache"
while getopts ":t:h" opt; do
    case $opt in
        t) TARGET="$OPTARG" ;;
        h) usage; exit 0 ;;
        *) usage; exit 1 ;;
    esac
done
shift $((OPTIND - 1))

INPUT="${1:-}"

for cmd in gh git jq; do
    if ! command -v "$cmd" &>/dev/null; then
        echo "Error: $cmd is required"
        exit 1
    fi
done

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
    exit 1
fi

case "$TARGET" in
    mapache-py) PREV=$(git tag -l 'mapache-py/v*' | sort -V | tail -n1) ;;
    mapache-go) PREV=$(git tag -l 'mapache-go/v*' | sort -V | tail -n1) ;;
    mapache)    PREV=$(git tag -l 'v*' | sort -V | tail -n1) ;;
    *)
        echo "Error: unknown target '$TARGET'. Valid: mapache, mapache-py, mapache-go"
        exit 1
        ;;
esac

if [[ -z "$INPUT" ]]; then
    echo ""
    if [[ -n "$PREV" ]]; then
        echo "Current ${TARGET} release: ${PREV}"
    else
        echo "Current ${TARGET} release: (none)"
    fi
    echo ""
    read -rp "Enter new version: " INPUT
fi

if [[ -z "$INPUT" ]]; then
    echo "Error: version cannot be empty"
    exit 1
fi
INPUT="${INPUT#v}"
if [[ ! "$INPUT" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: version must be a valid semver (e.g. 1.5.0)"
    exit 1
fi
SEMVER="$INPUT"
VERSION="v${INPUT}"

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

# Wait for the most recent publish.yml run to finish. Used after creating
# a libs release; bails non-zero if the run failed.
wait_for_publish() {
    echo ""
    echo "Waiting for publish.yml to start..."
    local run_id=""
    for i in $(seq 1 30); do
        run_id=$(gh run list --workflow=publish.yml --limit=1 --json databaseId,status \
            --jq '.[0] | select(.status != "completed") | .databaseId' 2>/dev/null || true)
        if [[ -n "$run_id" ]]; then
            break
        fi
        sleep 2
    done
    if [[ -z "$run_id" ]]; then
        echo "Error: publish.yml run did not appear within 60s"
        exit 1
    fi
    echo "Watching publish.yml run #${run_id}..."
    gh run watch "$run_id" --exit-status
}

case "$TARGET" in
    mapache-py)
        TAG="mapache-py/${VERSION}"
        if git tag -l "$TAG" | grep -q "^${TAG}$"; then
            echo "Error: tag $TAG already exists"
            exit 1
        fi
        if ! command -v uv &>/dev/null; then
            echo "Error: uv is required"
            exit 1
        fi

        PY_DEPENDENTS=("query")

        echo ""
        echo "=== Release Summary ==="
        echo "  Target:  mapache-py"
        echo "  Version: ${VERSION}"
        echo "  Tag:     ${TAG}"
        echo "  Commit:  $(git rev-parse --short HEAD)"
        echo "  Branch:  main"
        echo ""
        echo "  Files to update:"
        echo "    mapache-py/pyproject.toml"
        echo ""
        echo "  Files updated after PyPI publish:"
        for svc in "${PY_DEPENDENTS[@]}"; do
            echo "    ${svc}/uv.lock"
        done
        echo ""
        echo "  Will publish:"
        echo "    PyPI: mapache-py ${SEMVER}"
        echo ""
        read -rp "Proceed? (y/N) " CONFIRM
        if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
            echo "Aborted."
            exit 0
        fi

        sed -i '' "s/^version = \".*\"/version = \"${SEMVER}\"/" mapache-py/pyproject.toml
        git add mapache-py/pyproject.toml
        git commit -m "release: mapache-py ${VERSION}"
        git push origin main

        gh release create "$TAG" \
            --target main \
            --title "mapache-py ${VERSION}" \
            --generate-notes

        wait_for_publish

        echo ""
        echo "Sleeping 15s for PyPI to index ${SEMVER}..."
        sleep 15

        for svc in "${PY_DEPENDENTS[@]}"; do
            echo "Bumping mapache-py in ${svc}..."
            (
                cd "${REPO_ROOT}/${svc}"
                for i in 1 2 3; do
                    if uv lock --upgrade-package mapache-py; then
                        break
                    fi
                    echo "  retry $i: PyPI may not have indexed ${SEMVER} yet"
                    sleep 15
                done
            )
        done

        FILES=()
        for svc in "${PY_DEPENDENTS[@]}"; do
            FILES+=("${svc}/uv.lock")
        done
        if ! git diff --quiet -- "${FILES[@]}"; then
            git add "${FILES[@]}"
            git commit -m "chore: bump mapache-py to ${VERSION} in services"
            git push origin main
        else
            echo "(no lockfile changes — services already on ${VERSION})"
        fi

        echo ""
        echo "Done. mapache-py ${VERSION} released and dependent services bumped."
        ;;

    mapache-go)
        TAG="mapache-go/${VERSION}"
        if git tag -l "$TAG" | grep -q "^${TAG}$"; then
            echo "Error: tag $TAG already exists"
            exit 1
        fi
        if ! command -v go &>/dev/null; then
            echo "Error: go is required"
            exit 1
        fi

        GO_DEPENDENTS=("gr26" "live" "vehicle")

        echo ""
        echo "=== Release Summary ==="
        echo "  Target:  mapache-go"
        echo "  Version: ${VERSION}"
        echo "  Tag:     ${TAG}"
        echo "  Commit:  $(git rev-parse --short HEAD)"
        echo "  Branch:  main"
        echo ""
        echo "  Files updated after Go proxy warms:"
        for svc in "${GO_DEPENDENTS[@]}"; do
            echo "    ${svc}/go.mod"
            echo "    ${svc}/go.sum"
        done
        echo ""
        echo "  Will publish:"
        echo "    Go module: github.com/gaucho-racing/mapache/mapache-go/v3@${VERSION}"
        echo ""
        read -rp "Proceed? (y/N) " CONFIRM
        if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
            echo "Aborted."
            exit 0
        fi

        # mapache-go has no version file to bump, so the release commit is
        # empty — it just marks the release point in main so the tag (and
        # the resulting Go submodule tag) lands on a dedicated commit
        # instead of whatever HEAD happened to be.
        git commit --allow-empty -m "release: mapache-go ${VERSION}"
        git push origin main

        gh release create "$TAG" \
            --target main \
            --title "mapache-go ${VERSION}" \
            --generate-notes

        wait_for_publish
        git fetch origin --tags --quiet

        for svc in "${GO_DEPENDENTS[@]}"; do
            echo "Bumping mapache-go in ${svc}..."
            (cd "${REPO_ROOT}/${svc}" && go get "github.com/gaucho-racing/mapache/mapache-go/v3@${VERSION}" && go mod tidy)
        done

        FILES=()
        for svc in "${GO_DEPENDENTS[@]}"; do
            FILES+=("${svc}/go.mod" "${svc}/go.sum")
        done
        if ! git diff --quiet -- "${FILES[@]}"; then
            git add "${FILES[@]}"
            git commit -m "chore: bump mapache-go to ${VERSION} in services"
            git push origin main
        else
            echo "(no go.mod changes — services already on ${VERSION})"
        fi

        echo ""
        echo "Done. mapache-go ${VERSION} released and dependent services bumped."
        ;;

    mapache)
        TAG="${VERSION}"
        if git tag -l "$TAG" | grep -q "^${TAG}$"; then
            echo "Error: tag $TAG already exists"
            exit 1
        fi

        GO_CONFIG_SERVICES=("auth" "gr26" "live" "vehicle")
        PY_SERVICES=("query")
        NODE_SERVICES=("dashboard")
        ALL_SERVICES=("${GO_CONFIG_SERVICES[@]}" "${PY_SERVICES[@]}" "${NODE_SERVICES[@]}")

        echo ""
        echo "=== Release Summary ==="
        echo "  Target:  mapache (services)"
        echo "  Version: ${VERSION}"
        echo "  Tag:     ${TAG}"
        echo "  Commit:  $(git rev-parse --short HEAD)"
        echo "  Branch:  main"
        echo ""
        echo "  Files to update:"
        for svc in "${GO_CONFIG_SERVICES[@]}"; do
            echo "    ${svc}/config/config.go"
        done
        for svc in "${PY_SERVICES[@]}"; do
            echo "    ${svc}/pyproject.toml"
        done
        for svc in "${NODE_SERVICES[@]}"; do
            echo "    ${svc}/package.json"
        done
        echo ""
        echo "  Docker images that will be tagged:"
        for svc in "${ALL_SERVICES[@]}"; do
            echo "    ghcr.io/gaucho-racing/mapache/${svc}:${SEMVER}"
        done
        echo ""
        read -rp "Proceed? (y/N) " CONFIRM
        if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
            echo "Aborted."
            exit 0
        fi

        for svc in "${GO_CONFIG_SERVICES[@]}"; do
            sed -i '' "s/Version:.*\".*\"/Version:     \"${SEMVER}\"/" "${REPO_ROOT}/${svc}/config/config.go"
        done
        for svc in "${PY_SERVICES[@]}"; do
            sed -i '' "s/^version = \".*\"/version = \"${SEMVER}\"/" "${REPO_ROOT}/${svc}/pyproject.toml"
        done
        # Top-level package.json "version" — the only line in package.json
        # matching this pattern (npm deps use the package name as key, not
        # the literal token "version").
        for svc in "${NODE_SERVICES[@]}"; do
            sed -i '' "s/\"version\": \".*\"/\"version\": \"${SEMVER}\"/" "${REPO_ROOT}/${svc}/package.json"
        done

        FILES=()
        for svc in "${GO_CONFIG_SERVICES[@]}"; do
            FILES+=("${svc}/config/config.go")
        done
        for svc in "${PY_SERVICES[@]}"; do
            FILES+=("${svc}/pyproject.toml")
        done
        for svc in "${NODE_SERVICES[@]}"; do
            FILES+=("${svc}/package.json")
        done
        git add "${FILES[@]}"
        git commit -m "release: mapache ${VERSION}"
        git push origin main

        gh release create "$TAG" \
            --target main \
            --title "${VERSION}" \
            --generate-notes

        echo ""
        echo "Done. ${TAG} released. Per-service workflows will tag images shortly."
        ;;
esac
