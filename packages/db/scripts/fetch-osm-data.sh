#!/bin/bash
# Re-download OSM data for the GR11 seed.
# Run from the repo root: bash packages/db/scripts/fetch-osm-data.sh

set -e

mkdir -p packages/db/data

echo "Fetching GR11 ways from Overpass..."
curl -X POST https://overpass.openstreetmap.fr/api/interpreter \
  -H "User-Agent: roam-app/0.1 (trail data seed)" \
  --data-urlencode 'data=[out:json][timeout:300];relation["ref"="GR 11"]["route"="hiking"];way(r);out geom;' \
  -o packages/db/data/gr11-ways.json

echo "Done → packages/db/data/gr11-ways.json"
