'use client';

import { MAP_STYLE_URL, type MapRoute, PYRENEES_BOUNDS, ROUTE_INK } from '@/lib/map';
import type { Feature, Geometry } from 'geojson';
import maplibregl from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { MapTrailCard } from './MapTrailCard';
import 'maplibre-gl/dist/maplibre-gl.css';

// Pull every [lng,lat] out of a (Multi)LineString so we can fit the view.
function collectCoords(geom: Geometry | null): [number, number][] {
  if (!geom) return [];
  if (geom.type === 'LineString') return geom.coordinates as [number, number][];
  if (geom.type === 'MultiLineString') return geom.coordinates.flat() as [number, number][];
  return [];
}

// The live, interactive map (§7/§17). Renders one or more trail routes over a
// vector base style with MapLibre GL — each in its painted way colour, with an
// optional trail-card popup floating over the line, fitting the view to all of
// them. Page scroll is preserved (scroll-zoom off); drag-pan and the zoom control
// stay interactive. Falls back to a Pyrenees view if no geometry loaded.
export function HeroMap({ routes }: { routes: MapRoute[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

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
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.touchZoomRotate.disableRotation();

    // React roots backing the card markers — unmounted on cleanup.
    const cardRoots: Root[] = [];

    map.on('load', () => {
      const allCoords: [number, number][] = [];

      routes.forEach((route, i) => {
        const coords = collectCoords(route.geometry);
        if (coords.length < 2 || !route.geometry) return;
        allCoords.push(...coords);

        const id = `route-${i}`;
        const feature: Feature = { type: 'Feature', geometry: route.geometry, properties: {} };
        map.addSource(id, { type: 'geojson', data: feature });
        // Soft casing under the line so it reads over busy terrain.
        map.addLayer({
          id: `${id}-casing`,
          type: 'line',
          source: id,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#ffffff', 'line-width': 6, 'line-opacity': 0.7 },
        });
        map.addLayer({
          id: `${id}-line`,
          type: 'line',
          source: id,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': route.color ?? ROUTE_INK, 'line-width': 3 },
        });

        // A trail-card popup over the line. Stagger anchors along each route so
        // two parallel trails (GR10/GR11) don't overlap their cards.
        if (route.card) {
          const frac = (i + 1) / (routes.length + 1);
          const at = coords[Math.floor((coords.length - 1) * frac)] as [number, number];
          const el = document.createElement('div');
          const root = createRoot(el);
          root.render(<MapTrailCard {...route.card} />);
          cardRoots.push(root);
          new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -10] })
            .setLngLat(at)
            .addTo(map);
        }
      });

      if (allCoords.length > 1) {
        const bounds = allCoords.reduce(
          (b, c) => b.extend(c),
          new maplibregl.LngLatBounds(allCoords[0], allCoords[0]),
        );
        map.fitBounds(bounds, {
          padding: { top: 80, bottom: 140, left: 80, right: 80 },
          duration: 0,
        });
      }
    });

    return () => {
      // Defer unmount so React isn't unmounting a root mid-render.
      const roots = cardRoots;
      setTimeout(() => {
        for (const r of roots) r.unmount();
      }, 0);
      map.remove();
    };
  }, [routes]);

  return <div ref={containerRef} className="absolute inset-0 h-full w-full" aria-hidden />;
}
