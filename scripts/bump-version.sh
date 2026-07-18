#!/usr/bin/env bash
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Files
CHANGELOG="$PROJECT_ROOT/CHANGELOG.md"
PACKAGE_JSON="$PROJECT_ROOT/package.json"
TAURI_CONF="$PROJECT_ROOT/src-tauri/tauri.conf.json"
TAURI_CONF_DEV="$PROJECT_ROOT/src-tauri/tauri.conf.dev.json"

# Get current version from package.json
CURRENT_VERSION=$(grep '"version"' "$PACKAGE_JSON" | sed 's/.*"version": "\(.*\)".*/\1/')
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

echo -e "${BLUE}Current version: ${CURRENT_VERSION}${NC}"
echo ""
echo -e "${YELLOW}Select version bump type:${NC}"
echo "  1) Patch   (${MAJOR}.${MINOR}.$((PATCH + 1))) - bug fixes"
echo "  2) Minor   (${MAJOR}.$((MINOR + 1)).0) - new features"
echo "  3) Major   ($((MAJOR + 1)).0.0) - breaking changes"
echo "  4) Custom version"
read -p "Choice [1-4]: " BUMP_TYPE

case $BUMP_TYPE in
    1) NEW_VERSION="${MAJOR}.${MINOR}.$((PATCH + 1))" ;;
    2) NEW_VERSION="${MAJOR}.$((MINOR + 1)).0" ;;
    3) NEW_VERSION="$((MAJOR + 1)).0.0" ;;
    4)
        read -p "Enter custom version (x.y.z): " NEW_VERSION
        if [[ ! "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo -e "${RED}Invalid version format${NC}"
            exit 1
        fi
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo -e "${GREEN}New version: ${NEW_VERSION}${NC}"
echo ""

# Collect changelog entries
echo -e "${YELLOW}Enter changelog entries (empty line to finish each category):${NC}"
echo ""

declare -A CHANGES

for CATEGORY in "Added" "Changed" "Fixed" "Removed" "Security"; do
    echo -e "${BLUE}### ${CATEGORY}${NC}"
    ENTRIES=()
    while true; do
        read -p "  - " ENTRY
        [[ -z "$ENTRY" ]] && break
        ENTRIES+=("- $ENTRY")
    done
    if [[ ${#ENTRIES[@]} -gt 0 ]]; then
        CHANGES[$CATEGORY]=$(IFS=$'\n'; echo "${ENTRIES[*]}")
    fi
    echo ""
done

# Generate changelog entry
DATE=$(date +%Y-%m-%d)
CHANGELOG_ENTRY="## [${NEW_VERSION}] - ${DATE}"
for CATEGORY in "Added" "Changed" "Fixed" "Removed" "Security"; do
    if [[ -n "${CHANGES[$CATEGORY]:-}" ]]; then
        CHANGELOG_ENTRY+=$'\n\n### '${CATEGORY}$'\n'${CHANGES[$CATEGORY]}
    fi
done
CHANGELOG_ENTRY+=$'\n'

# Prepend to changelog (after "# Changelog\n")
{
    head -n 2 "$CHANGELOG"
    echo "$CHANGELOG_ENTRY"
    tail -n +3 "$CHANGELOG"
} > "${CHANGELOG}.tmp" && mv "${CHANGELOG}.tmp" "$CHANGELOG"

echo -e "${GREEN}Updated CHANGELOG.md${NC}"

# Update package.json
sed -i "s/\"version\": \"${CURRENT_VERSION}\"/\"version\": \"${NEW_VERSION}\"/" "$PACKAGE_JSON"
echo -e "${GREEN}Updated package.json${NC}"

# Update tauri.conf.json
sed -i "s/\"version\": \"${CURRENT_VERSION}\"/\"version\": \"${NEW_VERSION}\"/" "$TAURI_CONF"
echo -e "${GREEN}Updated tauri.conf.json${NC}"

# Update tauri.conf.dev.json
sed -i "s/\"version\": \"${CURRENT_VERSION}\"/\"version\": \"${NEW_VERSION}\"/" "$TAURI_CONF_DEV"
echo -e "${GREEN}Updated tauri.conf.dev.json${NC}"

echo ""
echo -e "${GREEN}Done! Version bumped from ${CURRENT_VERSION} to ${NEW_VERSION}${NC}"
echo ""
echo "Changes:"
echo "$CHANGELOG_ENTRY"