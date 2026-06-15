// GR11 official etapas — the canonical day-stages (the §5 Stage layer).
//
// Source: travesiapirenaica.com/gr-11/ (Travesía Pirenaica), the reference
// Spanish GR11 guide. West→east (Cabo Higuer → Cap de Creus), 46 etapas,
// ~824 km — matching the measured route line. Distance/ascent/descent are
// the guide's published per-stage figures; names are the from→to endpoints.
// This is `source: 'osm'`-grade reference data pending curator verification (§8).
//
// Regenerate: see scripts in git history / the pipeline README. Two etapas
// (11, 15) had no published ascent/descent in the table — left null.

export interface Gr11Etapa {
  /** Official etapa number, 1-based, west→east. */
  stage: number;
  /** From → To endpoints, as published. */
  name: string;
  /** Published stage distance, km. */
  distanceKm: number;
  /** Published ascent / descent, metres (null where the guide omits them). */
  ascentM: number | null;
  descentM: number | null;
}

export const GR11_ETAPAS: readonly Gr11Etapa[] = [
  { stage: 1, name: 'Cabo Higuer → Bera/Vera de Bidasoa', distanceKm: 31.6, ascentM: 830, descentM: 790 },
  { stage: 2, name: 'Bera/Vera de Bidasoa → Elizondo', distanceKm: 29.6, ascentM: 1260, descentM: 1140 },
  { stage: 3, name: 'Elizondo → Puerto de Urkiaga', distanceKm: 18.9, ascentM: 1080, descentM: 350 },
  { stage: 4, name: 'Puerto de Urkiaga → Burguete/Auritz', distanceKm: 17.5, ascentM: 720, descentM: 735 },
  { stage: 5, name: 'Burguete/Auritz → Villanueva de Aezkoa/Hiriberri', distanceKm: 17.3, ascentM: 595, descentM: 585 },
  { stage: 6, name: 'Villanueva de Aezkoa/Hiriberri → Ochagavía/Otsagabia', distanceKm: 20.6, ascentM: 780, descentM: 950 },
  { stage: 7, name: 'Ochagavía/Otsagabia → Isaba/Izaba', distanceKm: 21.1, ascentM: 675, descentM: 625 },
  { stage: 8, name: 'Isaba/Izaba → Zuriza (por Belabartze)', distanceKm: 11.2, ascentM: 560, descentM: 80 },
  { stage: 9, name: 'Zuriza → Aguas Tuertas', distanceKm: 18.6, ascentM: 1170, descentM: 780 },
  { stage: 10, name: 'Aguas Tuertas → Lizara', distanceKm: 13.7, ascentM: 635, descentM: 715 },
  { stage: 11, name: 'Lizara → Candanchú', distanceKm: 16.3, ascentM: null, descentM: null },
  { stage: 12, name: 'Candanchú → Sallent de Gállego', distanceKm: 23.8, ascentM: 905, descentM: 1135 },
  { stage: 13, name: 'Sallent de Gállego → Refugio de Respomuso', distanceKm: 11.2, ascentM: 902, descentM: 36 },
  { stage: 14, name: 'Refugio de Respomuso → Balneario de Panticosa', distanceKm: 13.9, ascentM: 745, descentM: 1 },
  { stage: 15, name: 'Balneario de Panticosa → San Nicolás de Bujaruelo', distanceKm: 21.0, ascentM: null, descentM: null },
  { stage: 16, name: 'San Nicolás de Bujaruelo → Góriz', distanceKm: 24.6, ascentM: 1238, descentM: 381 },
  { stage: 17, name: 'Refugio de Góriz → Refugio de Pineta', distanceKm: 13.4, ascentM: 943, descentM: 1 },
  { stage: 18, name: 'Circo de Pineta → Parzán', distanceKm: 18.0, ascentM: 880, descentM: 1025 },
  { stage: 19, name: 'Parzán → Refugio de Biados', distanceKm: 21.7, ascentM: 1580, descentM: 1000 },
  { stage: 20, name: 'Refugio de Biados → Puente de San Jaime', distanceKm: 20.3, ascentM: 905, descentM: 1 },
  { stage: 21, name: 'Puente de San Jaime → Refugio de Cap de Llauset', distanceKm: 16.5, ascentM: 1500, descentM: 350 },
  { stage: 22, name: 'Refugio de Cap de Llauset → Refugio de Conangles', distanceKm: 10.2, ascentM: 205, descentM: 1 },
  { stage: 23, name: 'Refugio de Conangles → Refugio de la Restanca', distanceKm: 12.0, ascentM: 900, descentM: 460 },
  { stage: 24, name: 'Refugio de la Restanca → Refugio de Colomers', distanceKm: 7.5, ascentM: 640, descentM: 510 },
  { stage: 25, name: 'Refugio de Colomers → Refugio Ernest Mallafré', distanceKm: 12.5, ascentM: 580, descentM: 830 },
  { stage: 26, name: 'Estany de Sant Maurici → Espot → La Guingueta', distanceKm: 17.4, ascentM: 240, descentM: 1200 },
  { stage: 27, name: 'La Guingueta → Estaon', distanceKm: 11.6, ascentM: 1290, descentM: 980 },
  { stage: 28, name: 'Estaon → Tavascan', distanceKm: 13.1, ascentM: 690, descentM: 865 },
  { stage: 29, name: 'Tavascan → Àreu', distanceKm: 14.7, ascentM: 1225, descentM: 1100 },
  { stage: 30, name: 'Àreu → Refugio Baiau', distanceKm: 15.4, ascentM: 1345, descentM: 80 },
  { stage: 31, name: 'Refugio Baiau → Arans', distanceKm: 14.9, ascentM: 810, descentM: 1920 },
  { stage: 32, name: 'Arans → Encamp', distanceKm: 15.1, ascentM: 1050, descentM: 1150 },
  { stage: 33, name: 'Encamp → Ref. l’Illa', distanceKm: 20.5, ascentM: 1350, descentM: 560 },
  { stage: 34, name: 'Ref. l’Illa → Refugio de Malniu', distanceKm: 10.3, ascentM: 810, descentM: 740 },
  { stage: 35, name: 'Refugio de Malniu → Guils → Puigcerdà', distanceKm: 14.0, ascentM: 100, descentM: 1030 },
  { stage: 36, name: 'Puigcerdà → Planoles', distanceKm: 25.3, ascentM: 1020, descentM: 1085 },
  { stage: 37, name: 'Planoles → Santuario de Núria', distanceKm: 16.9, ascentM: 1440, descentM: 750 },
  { stage: 38, name: 'Santuario de Núria → Refugio de Ulldeter', distanceKm: 11.6, ascentM: 1000, descentM: 720 },
  { stage: 39, name: 'Refugio de Ulldeter → Molló', distanceKm: 20.0, ascentM: 620, descentM: 1670 },
  { stage: 40, name: 'Molló → Talaixà', distanceKm: 23.0, ascentM: 735, descentM: 1200 },
  { stage: 41, name: 'Talaixà → Albanyà', distanceKm: 19.3, ascentM: 760, descentM: 1275 },
  { stage: 42, name: 'Albanyà → Maçanet de Cabrenys → La Vajol', distanceKm: 26.0, ascentM: 860, descentM: 550 },
  { stage: 43, name: 'La Vajol → La Jonquera → Requessens', distanceKm: 25.0, ascentM: 830, descentM: 880 },
  { stage: 44, name: 'Requessens → Vilamaniscle', distanceKm: 31.0, ascentM: 560, descentM: 890 },
  { stage: 45, name: 'Vilamaniscle → Llançà → El Port de la Selva', distanceKm: 21.0, ascentM: 760, descentM: 910 },
  { stage: 46, name: 'El Port de la Selva → Cap de Creus', distanceKm: 15.3, ascentM: 470, descentM: 450 },
];
