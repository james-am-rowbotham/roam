import { Marker } from '@maplibre/maplibre-react-native';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Polygon, Stop } from 'react-native-svg';
import { colors } from '../../theme';

interface Props {
  /** [lng, lat] of the device. */
  coord: [number, number];
  /**
   * Compass heading in degrees (0 = north, clockwise). When provided, a
   * Google-Maps-style beam fans out in the direction the device is facing.
   * Null/undefined hides the beam and shows just the dot.
   */
  headingDeg?: number | null;
}

const DOT = 16; // dot diameter
const BEAM_LEN = 44; // how far the beam reaches from the dot centre
const BEAM_HALF = 34; // half-width of the beam's flared end
const BOX = (BEAM_LEN + DOT / 2) * 2; // square that fully contains beam + dot

const C = BOX / 2; // box centre = dot centre = rotation pivot
const TOP = C - BEAM_LEN; // y of the beam's flared far edge
// Triangle: apex at the dot centre, flaring outward (pointing "up" pre-rotation).
const BEAM_POINTS = `${C},${C} ${C - BEAM_HALF},${TOP} ${C + BEAM_HALF},${TOP}`;

// The "you are here" puck. Rendered as a Marker (an RN view drawn above all map
// layers) so the directional beam can rotate with a screen-aligned transform —
// on a north-up map this points the beam at the true compass heading, like
// Google Maps. The beam is an SVG cone that fades from solid at the dot to fully
// transparent at its far edge. Lives in components/map so MapLibre imports stay
// behind the map boundary (§3).
export function UserMarker({ coord, headingDeg }: Props) {
  const hasHeading = headingDeg != null && !Number.isNaN(headingDeg);
  return (
    <Marker id="user-location" lngLat={coord}>
      <View
        style={{
          width: BOX,
          height: BOX,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {hasHeading && (
          <View style={{ ...absoluteFill, transform: [{ rotate: `${headingDeg}deg` }] }}>
            <Svg width={BOX} height={BOX}>
              <Defs>
                <LinearGradient
                  id="beam"
                  x1={C}
                  y1={C}
                  x2={C}
                  y2={TOP}
                  gradientUnits="userSpaceOnUse"
                >
                  {/* Solid at the dot, fading to clear at the far edge. */}
                  <Stop offset="0" stopColor={colors.marker.water} stopOpacity={0.45} />
                  <Stop offset="1" stopColor={colors.marker.water} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Polygon points={BEAM_POINTS} fill="url(#beam)" />
            </Svg>
          </View>
        )}
        {/* Position dot */}
        <View
          style={{
            width: DOT,
            height: DOT,
            borderRadius: DOT / 2,
            backgroundColor: colors.marker.water,
            borderWidth: 3,
            borderColor: colors.text.onAccent,
          }}
        />
      </View>
    </Marker>
  );
}

const absoluteFill = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};
