// Content-generation scope specs (§21) — the curated chain rows the content stage runs
// over. For now hand-listed per trail; later derived from the pack's sections. Ids match
// the generated pack's section ids (`<trail>-<region-slug>`).

export interface SectionSpec {
  id: string;
  name: string;
  stages: string;
  places: string;
}

export const GR11_SECTIONS: SectionSpec[] = [
  {
    id: 'gr11-basque-country-navarre',
    name: 'Basque Country & Navarre',
    stages: 'stages 1–8',
    places:
      'Hondarribia, Bera, Elizondo, Burguete, Ochagavía, Isaba — Atlantic green hills, beech forest, the first cols',
  },
  {
    id: 'gr11-aragonese-pyrenees',
    name: 'Aragonese Pyrenees',
    stages: 'stages 9–15',
    places:
      'Zuriza, Candanchú, Sallent de Gállego, Respomuso, Panticosa — the first true high country',
  },
  {
    id: 'gr11-ordesa-high-country',
    name: 'Ordesa & High Country',
    stages: 'stages 16–22',
    places:
      'San Nicolás de Bujaruelo, Refugio de Góriz, Ordesa y Monte Perdido NP, Pineta, Parzán, Viadós, Benasque',
  },
  {
    id: 'gr11-andorra-pallars-high-country',
    name: 'Andorra & Pallars High Country',
    stages: 'stages 23–34',
    places:
      'Conangles, Restanca, Colomèrs, Sant Maurici, Tavascan, Àreu, Andorra (Baiau, Arans, Encamp), Refugi de l’Illa',
  },
  {
    id: 'gr11-eastern-pyrenees',
    name: 'Eastern Pyrenees',
    stages: 'stages 35–46',
    places:
      'Puigcerdà, Núria, Ulldeter, Molló, Albanyà, La Jonquera, El Port de la Selva, Cap de Creus — the descent to the Mediterranean',
  },
];
