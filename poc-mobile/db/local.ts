import { open, type DB } from '@op-engineering/op-sqlite'

let _db: DB | null = null

function getDb(): DB {
  if (!_db) {
    _db = open({ name: 'roam_poc.db' })
    _db.executeSync(
      'CREATE TABLE IF NOT EXISTS trails (id INTEGER PRIMARY KEY, geojson TEXT NOT NULL)'
    )
  }
  return _db
}

export function saveTrailSync(id: number, geojson: string): void {
  getDb().executeSync('INSERT OR REPLACE INTO trails (id, geojson) VALUES (?, ?)', [id, geojson])
}

export function loadTrailSync(id: number): string | null {
  const result = getDb().executeSync('SELECT geojson FROM trails WHERE id = ?', [id])
  const row = result.rows?.[0] as { geojson: string } | undefined
  return row?.geojson ?? null
}
