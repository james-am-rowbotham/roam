import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export interface UserCoords {
  lng: number;
  lat: number;
  /** Metres above sea level, or null if the device didn't report it. */
  altitudeM: number | null;
  /** Ground speed in m/s, or null. */
  speedMps: number | null;
  /** Heading in degrees (0 = north), or null. */
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
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (status !== 'granted') {
        setPermission('denied');
        return;
      }
      setPermission('granted');
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 5 },
        (loc) => {
          const c = loc.coords;
          setCoords({
            lng: c.longitude,
            lat: c.latitude,
            altitudeM: c.altitude ?? null,
            speedMps: c.speed ?? null,
            headingDeg: c.heading ?? null,
            accuracyM: c.accuracy ?? null,
          });
        },
      );
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  return { coords, permission };
}
