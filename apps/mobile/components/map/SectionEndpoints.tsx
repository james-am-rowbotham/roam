import { Marker } from '@maplibre/maplibre-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { flattenCoords } from '../../lib/geo';
import { colors, fonts } from '../../theme';
import { Icon } from '../ui';

interface Props {
  /** The focused line's geometry — its first/last vertex are start/finish. */
  geom: Record<string, unknown> | null | undefined;
  /** Unique prefix for this overlay's markers. */
  id?: string;
}

// Start/finish termini at either end of the focused line (a section, or the
// whole trail). Rendered as RN `Marker` overlays (live vector views drawn above
// the map), NOT native symbol layers: the painted glyph used to ride a native
// SymbolLayer via an `icon-image` sprite, but runtime-registered sprites
// (<MapImages>) don't reliably resolve on these maps — the disc + text drew while
// the play/flag glyph silently went missing. A Marker renders the real `Icon`
// component (SVG, crisp, no Annotation rasterisation), so the sign always shows.
// Only two markers per map — §17.4's "a handful that must look like UI" case.
// Start = accent green + play; Finish = charcoal + flag.
export function SectionEndpoints({ geom, id = 'section-endpoints' }: Props) {
  if (!geom) return null;
  const pts = flattenCoords(geom);
  if (pts.length < 2) return null;

  const start = pts[0] as [number, number];
  const finish = pts[pts.length - 1] as [number, number];

  return (
    <>
      <Terminus id={`${id}-start`} coord={start} kind="start" />
      <Terminus id={`${id}-finish`} coord={finish} kind="finish" />
    </>
  );
}

function Terminus({
  id,
  coord,
  kind,
}: { id: string; coord: [number, number]; kind: 'start' | 'finish' }) {
  const isStart = kind === 'start';
  return (
    // Default 'center' anchor puts the disc's centre on the point; the label
    // hangs below it (absolutely positioned, so it never shifts the disc off it).
    <Marker id={id} lngLat={coord}>
      <View style={styles.box} pointerEvents="none">
        <View
          style={[styles.disc, { backgroundColor: isStart ? colors.accent : colors.text.primary }]}
        >
          <Icon name={isStart ? 'play' : 'flag'} size={13} color={colors.text.onAccent} />
        </View>
        <View style={styles.labelWrap}>
          <Text style={styles.label}>{isStart ? 'START' : 'FINISH'}</Text>
        </View>
      </View>
    </Marker>
  );
}

const DISC = 26;

const styles = StyleSheet.create({
  box: { width: DISC, height: DISC, alignItems: 'center', justifyContent: 'center' },
  disc: {
    width: DISC,
    height: DISC,
    borderRadius: DISC / 2,
    borderWidth: 2,
    borderColor: colors.text.onAccent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  // Centred under the disc with room for the label text either side of the 26px box.
  labelWrap: {
    position: 'absolute',
    top: DISC + 3,
    left: -40,
    right: -40,
    alignItems: 'center',
  },
  label: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: 0.2,
    color: colors.text.primary,
    backgroundColor: colors.bg.app,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
