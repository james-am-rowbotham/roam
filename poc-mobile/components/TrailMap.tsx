import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native'
import { StyleSheet, View } from 'react-native'

const STYLE_URL = `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${process.env.EXPO_PUBLIC_MAPTILER_KEY}`

// Pyrenees centre: [lng, lat]
const CENTER: [number, number] = [0.8, 42.75]

interface Props {
  geojson: GeoJSON.Feature | null
}

export function TrailMap({ geojson }: Props) {
  return (
    <View style={styles.container}>
      <Map style={styles.map} mapStyle={STYLE_URL} logo={false}>
        <Camera zoom={6} center={CENTER} />
        {geojson && (
          <>
            <GeoJSONSource id="gr11" data={geojson} />
            <Layer
              id="gr11-line"
              type="line"
              source="gr11"
              paint={{ 'line-color': '#c74538', 'line-width': 3, 'line-opacity': 0.9 }}
            />
          </>
        )}
      </Map>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
})
