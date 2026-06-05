import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { API_BASE_URL } from '../config'
import { TrailMap } from '../components/TrailMap'
import { loadTrailSync, saveTrailSync } from '../db/local'
import { useTrailStore } from '../store/trailStore'

const TRAIL_ID = 3

async function fetchTrail(): Promise<GeoJSON.Feature> {
  const res = await fetch(`${API_BASE_URL}/trails/${TRAIL_ID}`)
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json() as Promise<GeoJSON.Feature>
}

export function MapScreen() {
  const { cachedGeojson, source, setCached } = useTrailStore()

  // Warm Zustand from SQLite on first mount (offline-first start)
  useEffect(() => {
    if (!cachedGeojson) {
      const stored = loadTrailSync(TRAIL_ID)
      if (stored) setCached(stored, 'sqlite')
    }
  }, [])

  const { error, isFetching } = useQuery({
    queryKey: ['trail', TRAIL_ID],
    queryFn: async () => {
      const feature = await fetchTrail()
      const json = JSON.stringify(feature)
      saveTrailSync(TRAIL_ID, json)
      setCached(json, 'network')
      return feature
    },
    retry: cachedGeojson ? 0 : 1,
  })

  const geojson = cachedGeojson ? (JSON.parse(cachedGeojson) as GeoJSON.Feature) : null

  return (
    <View style={styles.container}>
      <TrailMap geojson={geojson} />
      <View style={styles.badge}>
        {isFetching && <Text style={styles.text}>Loading…</Text>}
        {!isFetching && source === 'network' && (
          <Text style={[styles.text, styles.live]}>Live — GR11</Text>
        )}
        {!isFetching && source === 'sqlite' && (
          <Text style={[styles.text, styles.offline]}>Offline — SQLite</Text>
        )}
        {error && !cachedGeojson && (
          <Text style={[styles.text, styles.err]}>No data — check API</Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  badge: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 360,
  },
  text: { color: '#fff', fontSize: 13, fontWeight: '600' },
  live: { color: '#a3e6a0' },
  offline: { color: '#f5c97a' },
  err: { color: '#f08080' },
})
