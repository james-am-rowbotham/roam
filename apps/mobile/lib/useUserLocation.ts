import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export interface UserCoords {
  lng: number;
  lat: number;
  /** Metres above sea level, or null if the device didn't report it. */
  altitudeM: number | null;
  /** Ground speed in m/s, or null. */
  speedMps: number | null;
  /**
   * Compass heading in degrees (0 = north, clockwise) — the direction the
   * device is physically facing, from the magnetometer. Falls back to course
   * over ground while the compass is warming up, and is null until either is
   * available. This is what the map puck rotates to (Google-Maps-style).
   */
  headingDeg: number | null;
  /** Horizontal accuracy radius in metres, or null. */
  accuracyM: number | null;
}

export type LocationPermission = 'pending' | 'granted' | 'denied';

interface UseUserLocation {
  coords: UserCoords | null;
  permission: LocationPermission;
}

// Foreground device location for the active map. Requests permission once on
// mount and watches position; if permission is denied, `coords` stays null and
// callers fall back gracefully (no nagging). Background location is out of scope.
export function useUserLocation(): UseUserLocation {
  const [coords, setCoords] = useState<UserCoords | null>(null);
  const [permission, setPermission] = useState<LocationPermission>('pending');

  useEffect(() => {
    let posSub: Location.LocationSubscription | null = null;
    let headingSub: Location.LocationSubscription | null = null;
    let cancelled = false;
    // Latest compass heading, kept outside React state so a position update can
    // read it synchronously without an extra render dependency.
    let compassHeading: number | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (status !== 'granted') {
        setPermission('denied');
        return;
      }
      setPermission('granted');

      // Compass: the direction the device physically points. trueHeading is -1
      // when uncalibrated/unavailable, so fall back to magHeading.
      headingSub = await Location.watchHeadingAsync((h) => {
        const heading = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
        compassHeading = heading >= 0 ? heading : null;
        setCoords((prev) =>
          prev && compassHeading != null ? { ...prev, headingDeg: compassHeading } : prev,
        );
      });

      posSub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 5 },
        (loc) => {
          const c = loc.coords;
          setCoords({
            lng: c.longitude,
            lat: c.latitude,
            altitudeM: c.altitude ?? null,
            speedMps: c.speed ?? null,
            // Prefer the live compass; fall back to course over ground.
            headingDeg: compassHeading ?? c.heading ?? null,
            accuracyM: c.accuracy ?? null,
          });
        },
      );
    })();

    return () => {
      cancelled = true;
      posSub?.remove();
      headingSub?.remove();
    };
  }, []);

  return { coords, permission };
}
