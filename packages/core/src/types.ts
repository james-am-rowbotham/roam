// Route — the spine. A trail or peak ascent.
export interface Route {
  id: number;
  name: string;
  description: string | null;
  distanceM: number | null;
  ascentM: number | null;
  descentM: number | null;
}

// Trail — a long-distance Route with extra metadata
export interface Trail {
  id: number;
  routeId: number;
  ref: string | null; // e.g. "GR11"
  country: string | null;
  region: string | null;
}

// Section — a named segment of a route, linearly referenced
export interface Section {
  id: number;
  routeId: number;
  name: string;
  description: string | null;
  orderIndex: number;
  startChainageM: number;
  endChainageM: number;
  ascentM: number | null;
  descentM: number | null;
}

// Trust — shared by every POI
export interface Trust {
  source: 'osm' | 'model' | 'partner' | 'community';
  confidence: number;
  lastConfirmedAt: Date | null;
  reportCount: number;
  manualOverride: boolean;
}

// Water source
export interface WaterSource extends Trust {
  id: number;
  routeId: number;
  name: string | null;
  chainageM: number;
  seasonal: boolean;
}

// Accommodation
export interface Accommodation extends Trust {
  id: number;
  routeId: number;
  name: string;
  chainageM: number;
  type: 'refuge' | 'hut' | 'campsite' | 'hotel' | 'hostel';
  capacity: number | null;
  seasonal: boolean;
  bookingUrl: string | null;
}
