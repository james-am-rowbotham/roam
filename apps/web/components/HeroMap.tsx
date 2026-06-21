'use client';

import {
  MAP_STYLE_URL,
  type MapRoute,
  POI_COLORS,
  POI_SORT,
  PYRENEES_BOUNDS,
  type PoiKind,
  type PoiPoint,
  ROUTE_INK,
} from '@/lib/map';
import type { Feature, FeatureCollection } from 'geojson';
import type { Geometry } from 'geojson';
import maplibregl from 'maplibre-gl';
import { useCallback, useEffect, useRef } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';

// Pull every [lng,lat] out of a (Multi)LineString so we can fit the view.
function collectCoords(geom: Geometry | null): [number, number][] {
  if (!geom) return [];
  if (geom.type === 'LineString') return geom.coordinates as [number, number][];
  if (geom.type === 'MultiLineString') return geom.coordinates.flat() as [number, number][];
  return [];
}

interface Drawn {
  sourceId: string;
  casingId: string;
  lineId: string;
  hitId: string;
  bounds: maplibregl.LngLatBounds;
  cleanup?: () => void;
}

function boundsOf(coords: [number, number][]): maplibregl.LngLatBounds {
  return coords.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
}

const POI_SOURCE = 'pois';
const POI_KINDS: PoiKind[] = ['water', 'refuge', 'food', 'viewpoint', 'historic', 'hazard'];

// White icon glyphs per POI kind, copied verbatim from the mobile marker
// masters (apps/mobile/assets/markers/src/*.svg, §16) so the web pins draw the
// exact same signs: droplet (water), hut (refuge/stay), pot (food), mountain
// (viewpoint/peak). historic/hazard have no mobile master yet — kept as close
// stand-ins; neither is emitted by the current data.
const POI_ICON: Record<PoiKind, string> = {
  water:
    '<path d="M12 3.8C12 3.8 7 9.8 7 13.2C7 14.53 7.53 15.8 8.46 16.74C9.4 17.67 10.67 18.2 12 18.2C13.33 18.2 14.6 17.67 15.54 16.74C16.47 15.8 17 14.53 17 13.2C17 9.8 12 3.8 12 3.8Z"/><path d="M10.8 13.6C10.8 14.24 11.05 14.85 11.5 15.3C11.95 15.75 12.56 16 13.2 16"/>',
  refuge: '<path d="M4.4 10.6L12 4.6L19.6 10.6M6.4 9.2V19H17.6V9.2M10.4 19V14.4H13.6V19"/>',
  food: '<path d="M4.8 10.4H19.2M6 10.4V14.6C6 15.13 6.1 15.65 6.3 16.13C6.51 16.62 6.8 17.06 7.17 17.43C7.92 18.18 8.94 18.6 10 18.6H14C15.06 18.6 16.08 18.18 16.83 17.43C17.58 16.68 18 15.66 18 14.6V10.4M9.7 7.6C9.7 6.4 10.7 6.4 10.7 5.2M13.5 7.6C13.5 6.4 14.5 6.4 14.5 5.2"/>',
  viewpoint:
    '<g transform="translate(0 4.2) scale(1.978)"><path d="M0.61 7.28L4.25 0.61L6.67 4.25L7.89 2.43L11.53 7.28H0.61Z" stroke-width="1.05"/></g>',
  historic: '<path d="M3 21h18"/><path d="M5 21V10l7-5 7 5v11"/><path d="M9.5 21v-6h5v6"/>',
  hazard: '<path d="M12 3 2 20h20z"/><path d="M12 10v4"/><path d="M12 17h.01"/>',
};

// Route termini — the play (start) / flag (finish) glyphs on the disc. Mobile's
// SectionEndpoints draws these via the shared <Icon> (lucide Play / Flag, §16),
// not the marker sprite, so use the exact lucide path data, stroked white like
// the app (lucide's default: fill none, 2px stroke).
const TERMINUS = {
  start: {
    color: '#3d5a3f',
    label: 'Start',
    glyph:
      '<path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/>',
  },
  finish: {
    color: '#26231e',
    label: 'Finish',
    glyph:
      '<path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"/>',
  },
} as const;

// A round map pin (§16/§17 pin state): tinted circle, white ring + icon, soft
// shadow — rendered to an SVG data URL so MapLibre can use it as an icon image.
function pinDataUrl(color: string, inner: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><defs><filter id="s" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="1" stdDeviation="1.6" flood-color="#000" flood-opacity="0.3"/></filter></defs><circle cx="24" cy="24" r="16" fill="${color}" stroke="#fff" stroke-width="3" filter="url(#s)"/><g transform="translate(24 24) scale(0.82) translate(-12 -12)" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// Load one pin image per kind into the map (idempotent). Resolves once all are
// registered so the symbol layer's icon-image never references a missing image.
function loadPinImages(map: maplibregl.Map): Promise<void> {
  return Promise.all(
    POI_KINDS.map(
      (kind) =>
        new Promise<void>((resolve) => {
          const id = `poi-${kind}`;
          if (map.hasImage(id)) return resolve();
          const img = new Image(48, 48);
          img.onload = () => {
            if (!map.hasImage(id)) map.addImage(id, img, { pixelRatio: 2 });
            resolve();
          };
          img.onerror = () => resolve();
          img.src = pinDataUrl(POI_COLORS[kind], POI_ICON[kind]);
        }),
    ),
  ).then(() => undefined);
}

// The selected trail's POIs as zoom-banded markers (§17): faint tinted dots at
// the regional band, tinted icon-pins at the tactical band, and names fading in
// at the detail band (water wins label collisions, §17.3). Added once; the data
// is swapped on selection.
function addPoiLayers(map: maplibregl.Map) {
  if (map.getSource(POI_SOURCE)) return;
  map.addSource(POI_SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  // Regional band: small tinted dots, no icon.
  map.addLayer({
    id: 'poi-dots',
    type: 'circle',
    source: POI_SOURCE,
    minzoom: 8,
    maxzoom: 11.5,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 3, 11, 5],
      'circle-color': [
        'match',
        ['get', 'kind'],
        'water',
        POI_COLORS.water,
        'refuge',
        POI_COLORS.refuge,
        'food',
        POI_COLORS.food,
        'viewpoint',
        POI_COLORS.viewpoint,
        'historic',
        POI_COLORS.historic,
        'hazard',
        POI_COLORS.hazard,
        '#6f6a60',
      ],
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1.5,
    },
  });
  // Tactical / detail band: icon-pins + labels.
  map.addLayer({
    id: 'poi-pins',
    type: 'symbol',
    source: POI_SOURCE,
    minzoom: 11.5,
    layout: {
      'icon-image': ['concat', 'poi-', ['get', 'kind']],
      'icon-size': ['interpolate', ['linear'], ['zoom'], 11.5, 0.6, 14, 0.9, 16, 1],
      'icon-allow-overlap': true,
      'symbol-sort-key': ['get', 'sort'],
      'text-field': ['get', 'name'],
      'text-font': ['Noto Sans Regular'],
      'text-size': 11,
      'text-offset': [0, 1.3],
      'text-anchor': 'top',
      'text-optional': true,
    },
    paint: {
      'text-color': '#26231e',
      'text-halo-color': '#fffefb',
      'text-halo-width': 1.4,
      'text-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0, 15, 1],
    },
  });
}

function poiCollection(pois: PoiPoint[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: pois.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: { kind: p.kind, name: p.name, sort: POI_SORT[p.kind] },
    })),
  };
}

// A terminus marker (start / finish) — mirrors mobile's SectionEndpoints (§17.4):
// a 26px disc (white 2px ring + soft shadow) sitting centred on the point — green
// + play for start, charcoal + flag for finish — with a cream mono label pill
// hanging below (absolutely positioned so it never nudges the disc off the point).
function terminusMarker(
  map: maplibregl.Map,
  at: [number, number],
  kind: 'start' | 'finish',
): maplibregl.Marker {
  const { color, label, glyph } = TERMINUS[kind];
  const el = document.createElement('div');
  el.className = 'relative flex size-[26px] items-center justify-center';
  el.innerHTML = `<span class="flex size-[26px] items-center justify-center rounded-full border-2 border-white shadow-[0_1px_2px_rgba(38,35,30,0.25)]" style="background:${color}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${glyph}</svg></span><span class="absolute top-[29px] left-1/2 -translate-x-1/2 rounded bg-app px-[5px] py-px font-mono text-[10px] uppercase tracking-[0.02em] text-primary whitespace-nowrap">${label}</span>`;
  return new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(at).addTo(map);
}

// The live, interactive map (§7/§17). Created ONCE and reconciled by stable id
// (no re-mount, no flicker). EVERY trail is drawn; filtering + selection compose
// as three opacity tiers — the selected trail is highlighted and raised, trails
// matching the filter stay lit and clickable, and filtered-out trails fade to a
// faint, non-interactive ghost. The view centres on the selected trail.
export function HeroMap({
  routes,
  matchedIds,
  selectedId,
  onSelect,
}: {
  routes: MapRoute[];
  /** Ids passing the current filter/search. Undefined = all match. */
  matchedIds?: string[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);
  const routesRef = useRef(routes);
  routesRef.current = routes;
  const selectedRef = useRef<string | null>(selectedId ?? null);
  selectedRef.current = selectedId ?? null;
  const matchedRef = useRef<Set<string> | null>(matchedIds ? new Set(matchedIds) : null);
  matchedRef.current = matchedIds ? new Set(matchedIds) : null;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const drawn = useRef<Map<string, Drawn>>(new Map());
  const fitKeyRef = useRef('');
  const sfMarkers = useRef<maplibregl.Marker[]>([]);

  // Show the selected trail's POIs + start/finish; clear them otherwise.
  const updatePois = useCallback((sel: string | null) => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const source = map.getSource(POI_SOURCE) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    const route = sel ? routesRef.current.find((r) => r.id === sel) : undefined;
    source.setData(poiCollection(route?.pois ?? []));
    if (map.getLayer('poi-dots')) map.moveLayer('poi-dots');
    if (map.getLayer('poi-pins')) map.moveLayer('poi-pins');

    for (const m of sfMarkers.current) m.remove();
    sfMarkers.current = [];
    const coords = collectCoords(route?.geometry ?? null);
    if (coords.length > 1) {
      sfMarkers.current.push(terminusMarker(map, coords[0] as [number, number], 'start'));
      sfMarkers.current.push(
        terminusMarker(map, coords[coords.length - 1] as [number, number], 'finish'),
      );
    }
  }, []);

  // Three opacity tiers — selected (full + raised), filter-matched (lit), and
  // filtered-out (faint ghost) — then centre on the selected trail.
  const applySelection = useCallback(
    (sel: string | null, matched: Set<string> | null) => {
      const map = mapRef.current;
      if (!map || !readyRef.current) return;
      const inFilter = (mid: string) => !matched || matched.has(mid);
      for (const [id, d] of drawn.current) {
        if (!map.getLayer(d.lineId)) continue;
        const isSel = id === sel;
        const isMatch = inFilter(id);
        const lineOpacity = isSel ? 1 : isMatch ? 0.65 : 0.14;
        const casingOpacity = isSel ? 0.7 : isMatch ? 0.5 : 0.08;
        map.setPaintProperty(d.lineId, 'line-opacity', lineOpacity);
        map.setPaintProperty(d.lineId, 'line-width', isSel ? 5 : isMatch ? 3 : 2);
        map.setPaintProperty(d.casingId, 'line-opacity', casingOpacity);
        if (isSel) {
          map.moveLayer(d.casingId);
          map.moveLayer(d.lineId);
          map.moveLayer(d.hitId);
        }
      }

      // Centre on the selected trail (or frame the whole matched set when none)
      // — only when the target actually changes, so re-syncs don't re-pan.
      const selected = sel ? drawn.current.get(sel) : undefined;
      let target = selected?.bounds;
      let key = selected ? `sel:${sel}` : '';
      if (!target) {
        const matchedDrawn = [...drawn.current].filter(([id]) => inFilter(id)).map(([, d]) => d);
        const first = matchedDrawn[0];
        if (first) {
          const b = new maplibregl.LngLatBounds(
            first.bounds.getSouthWest(),
            first.bounds.getNorthEast(),
          );
          for (const d of matchedDrawn.slice(1)) {
            b.extend(d.bounds.getSouthWest());
            b.extend(d.bounds.getNorthEast());
          }
          target = b;
        }
        key = `all:${matchedDrawn.length}`;
      }
      if (target && key !== fitKeyRef.current) {
        fitKeyRef.current = key;
        // Leave room for the side cards on wide screens (CTA left, carousel right).
        const lg = map.getContainer().clientWidth >= 1024;
        map.fitBounds(target, {
          padding: lg
            ? { top: 100, bottom: 150, left: 460, right: 400 }
            : { top: 80, bottom: 80, left: 40, right: 40 },
          maxZoom: 12,
          duration: 600,
        });
      }

      updatePois(sel);
    },
    [updatePois],
  );

  const sync = useCallback(
    (current: MapRoute[]) => {
      const map = mapRef.current;
      if (!map || !readyRef.current) return;

      const desired = new Map(
        current
          .filter((r) => collectCoords(r.geometry).length >= 2 && r.geometry)
          .map((r) => [r.id, r]),
      );

      for (const [id, d] of drawn.current) {
        if (desired.has(id)) continue;
        d.cleanup?.();
        if (map.getLayer(d.hitId)) map.removeLayer(d.hitId);
        if (map.getLayer(d.lineId)) map.removeLayer(d.lineId);
        if (map.getLayer(d.casingId)) map.removeLayer(d.casingId);
        if (map.getSource(d.sourceId)) map.removeSource(d.sourceId);
        drawn.current.delete(id);
      }

      for (const [id, route] of desired) {
        if (drawn.current.has(id) || !route.geometry) continue;
        const coords = collectCoords(route.geometry);
        const sourceId = `route-${id}`;
        const casingId = `${sourceId}-casing`;
        const lineId = `${sourceId}-line`;
        const hitId = `${sourceId}-hit`;
        const feature: Feature = { type: 'Feature', geometry: route.geometry, properties: {} };
        map.addSource(sourceId, { type: 'geojson', data: feature });
        map.addLayer({
          id: casingId,
          type: 'line',
          source: sourceId,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#ffffff', 'line-width': 6, 'line-opacity': 0.7 },
        });
        map.addLayer({
          id: lineId,
          type: 'line',
          source: sourceId,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': route.color ?? ROUTE_INK, 'line-width': 3 },
        });
        // Invisible wide line on top: the generous hover/click target.
        map.addLayer({
          id: hitId,
          type: 'line',
          source: sourceId,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#000000', 'line-width': 22, 'line-opacity': 0 },
        });

        const matched = () => !matchedRef.current || matchedRef.current.has(id);
        const onClick = () => {
          if (matched()) onSelectRef.current?.(id);
        };
        const onEnter = () => {
          if (matched()) map.getCanvas().style.cursor = 'pointer';
        };
        const onLeave = () => {
          map.getCanvas().style.cursor = '';
        };
        map.on('click', hitId, onClick);
        map.on('mouseenter', hitId, onEnter);
        map.on('mouseleave', hitId, onLeave);

        drawn.current.set(id, {
          sourceId,
          casingId,
          lineId,
          hitId,
          bounds: boundsOf(coords),
          cleanup: () => {
            map.off('click', hitId, onClick);
            map.off('mouseenter', hitId, onEnter);
            map.off('mouseleave', hitId, onLeave);
          },
        });
      }

      applySelection(selectedRef.current, matchedRef.current);
    },
    [applySelection],
  );

  // Create the map exactly once.
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      bounds: PYRENEES_BOUNDS,
      fitBoundsOptions: { padding: 48 },
      attributionControl: { compact: true },
      scrollZoom: false,
      dragRotate: false,
      pitchWithRotate: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.touchZoomRotate.disableRotation();
    map.on('load', () => {
      readyRef.current = true;
      addPoiLayers(map);
      // Pin icons load async (data-URL SVGs); MapLibre repaints when they arrive.
      // Never block the trail lines / dots / start-finish on them.
      void loadPinImages(map);
      sync(routesRef.current);
    });

    return () => {
      for (const d of drawn.current.values()) d.cleanup?.();
      for (const m of sfMarkers.current) m.remove();
      sfMarkers.current = [];
      drawn.current.clear();
      fitKeyRef.current = '';
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
  }, [sync]);

  // Reconcile overlays in place whenever the filtered route set changes.
  useEffect(() => {
    sync(routes);
  }, [routes, sync]);

  // Restyle when the selection or the matched (filtered) set changes.
  useEffect(() => {
    applySelection(selectedId ?? null, matchedIds ? new Set(matchedIds) : null);
  }, [selectedId, matchedIds, applySelection]);

  return <div ref={containerRef} className="absolute inset-0 h-full w-full" aria-hidden />;
}
