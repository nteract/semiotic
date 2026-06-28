// The Wheel of Urines — data for a medieval uroscopy diagnostic chart.
//
// Medieval physicians read disease from the color of urine. The "urine wheel"
// (rota urinarum) arranges twenty named colors in a ring and ties each to a
// stage of *digestio* (coction) — the body's cooking of the humors. The colors
// run as a single spectrum that wraps around the ring: the two pathological
// extremes, white (raw, uncooked) and black (burnt to death), meet at the
// bottom seam, while gold — the sign of perfect coction and health — crowns the
// top. Reading clockwise from the top down the right side, the urine grows ever
// more "cooked" (gold → red → wine → green → lead → black); continuing clockwise
// up the left side it runs back from cold white through the pales to gold again.
//
// The Latin color names and their classic similes ("ut aurum" — like gold) come
// from the uroscopy tradition of Gilles de Corbeil and the Articella; the seven
// central glosses are the prognostic phrases inscribed in the medieval wheels
// (e.g. Ullrich Pinder's Epiphanie Medicorum, 1506). Translations are ours.

// ── The seven coction diagnoses (the inner ring) ──────────────────────────
// `order` runs 0 = most raw → 6 = most burnt, the axis of coction. `accent`
// drives the spoke / diagnosis color: a diverging ramp peaking at vivid green
// (perfect digestion — life, echoing the wheel's central plant), with cold blues
// for the under-cooked end and hot reds shading to black for the over-cooked.
export const URINE_DIAGNOSES = [
  {
    id: "indigestio",
    order: 0,
    latin: "Indigestionem significat",
    english: "Signifies indigestion",
    short: "Indigestion",
    shortLatin: "Indigestio",
    meaning:
      "The humors are raw and uncooked; cold dominates and coction has not begun. The pale, watery urines of fevers' first days and of cold, phlegmatic complexions.",
    accent: "#5f86ad",
  },
  {
    id: "principium",
    order: 1,
    latin: "Principium digestionis",
    english: "The beginning of digestion",
    short: "Beginning",
    shortLatin: "Principium",
    meaning:
      "Coction has just begun to act on the humors. A faint warmth colors the urine, the first promise that the body is mastering the disease.",
    accent: "#5f9f93",
  },
  {
    id: "media",
    order: 2,
    latin: "Mediam digestionem significat",
    english: "Signifies middling digestion",
    short: "Middling",
    shortLatin: "Media",
    meaning:
      "Coction is well underway. The urine deepens toward citron as the humors are progressively cooked; a favorable, expected course.",
    accent: "#bb9a31",
  },
  {
    id: "perfecta",
    order: 3,
    latin: "Perfectam digestionem significat",
    english: "Signifies perfect digestion",
    short: "Perfect",
    shortLatin: "Perfecta",
    meaning:
      "The healthful sign. The humors are fully and evenly cooked; gold and ruddy urines mark a temperate body and a disease being overcome.",
    accent: "#1f7a44",
  },
  {
    id: "excessus",
    order: 4,
    latin: "Excessum digestionis significat",
    english: "Signifies excess of digestion",
    short: "Excess",
    shortLatin: "Excessus",
    meaning:
      "Coction has overshot. Excessive heat reddens the urine past health — the body burns hotter than it should, as in choleric fevers.",
    accent: "#d2691e",
  },
  {
    id: "adustio",
    order: 5,
    latin: "Adustionem significat",
    english: "Signifies adustion (burning)",
    short: "Adustion",
    shortLatin: "Adustio",
    meaning:
      "The humors are scorched. Heat has burnt the blood and choler to wine-dark, green, and livid hues — a grave derangement of the body's fire.",
    accent: "#9c2b1b",
  },
  {
    id: "mortificatio",
    order: 6,
    latin: "Mortificationem significat",
    english: "Signifies mortification",
    short: "Mortification",
    shortLatin: "Mortificatio",
    meaning:
      "A fatal sign. The part is dying: the humors are wholly burnt out to lead and black, the body's heat extinguished. The blackest urines foretell death.",
    accent: "#3a2f2c",
  },
]

// ── The twenty colors (the outer ring), in clockwise order from the top ─────
// `order` is the clockwise slot (0 = 12 o'clock). The right arc (0→10) descends
// from gold through ever-hotter hues to black; the left arc (11→19) climbs from
// white back through the pales to gold, so white (11) and black (10) abut at the
// bottom seam and the golds (19, 0) meet at the crown. `hex` is the urine's own
// appearance (the flask liquid); the diagnosis `accent` is a separate channel.
export const URINE_COLORS = [
  // Right arc — gold crown descending through over-coction to black at the seam
  { id: "Rufus", order: 0, hex: "#d99a2b", diagnosis: "perfecta",
    english: "Red-gold", simileLatin: "ut aurum purum", simileEnglish: "like pure gold" },
  { id: "Subrubeus", order: 1, hex: "#cc7d22", diagnosis: "perfecta",
    english: "Light ruddy", simileLatin: "ut aurum obscurum", simileEnglish: "like deepened gold" },
  { id: "Rubeus", order: 2, hex: "#b3531c", diagnosis: "perfecta",
    english: "Ruddy", simileLatin: "ut crocus orientalis", simileEnglish: "like Eastern saffron" },
  { id: "Subrubicundus", order: 3, hex: "#9e3318", diagnosis: "excessus",
    english: "Deep ruddy", simileLatin: "ut crocus ardens", simileEnglish: "like burning saffron" },
  { id: "Rubicundus", order: 4, hex: "#8c1410", diagnosis: "excessus",
    english: "Crimson", simileLatin: "ut flamma ignis", simileEnglish: "like flame of fire" },
  { id: "Inopos", order: 5, hex: "#5e1518", diagnosis: "adustio",
    english: "Wine-dark", simileLatin: "ut vinum nigrum", simileEnglish: "like black wine" },
  { id: "Kyanos", order: 6, hex: "#3b2f4a", diagnosis: "adustio",
    english: "Livid blue-black", simileLatin: "ut color cyaneus", simileEnglish: "like a blue-black bruise" },
  { id: "Viridis", order: 7, hex: "#4f6f33", diagnosis: "adustio",
    english: "Green", simileLatin: "ut viride aeris", simileEnglish: "like verdigris" },
  { id: "Lividus", order: 8, hex: "#45495a", diagnosis: "mortificatio",
    english: "Livid", simileLatin: "ut plumbum lividum", simileEnglish: "like livid lead" },
  { id: "Plumbeus", order: 9, hex: "#595a5c", diagnosis: "mortificatio",
    english: "Lead-gray", simileLatin: "ut plumbum", simileEnglish: "like lead" },
  { id: "Niger", order: 10, hex: "#211c1a", diagnosis: "mortificatio",
    english: "Black", simileLatin: "ut atramentum", simileEnglish: "like the blackest ink" },
  // Left arc — white seam climbing through the pales back to gold at the crown
  { id: "Albus", order: 11, hex: "#f1ecdc", diagnosis: "indigestio",
    english: "White", simileLatin: "ut aqua clara", simileEnglish: "like clear water" },
  { id: "Lacteus", order: 12, hex: "#e9e2cb", diagnosis: "indigestio",
    english: "Milky", simileLatin: "ut serum lactis", simileEnglish: "like the whey of milk" },
  { id: "Glaucus", order: 13, hex: "#d2d6c4", diagnosis: "indigestio",
    english: "Pale blue-white", simileLatin: "ut cornu lucidum", simileEnglish: "like a bright horn" },
  { id: "Karopos", order: 14, hex: "#dcc8a0", diagnosis: "indigestio",
    english: "Pale camel", simileLatin: "ut pilus cameli", simileEnglish: "like camel's hair" },
  { id: "Subpallidus", order: 15, hex: "#e6d59a", diagnosis: "principium",
    english: "Somewhat pale", simileLatin: "ut succus carnis crudae", simileEnglish: "like juice of raw flesh" },
  { id: "Pallidus", order: 16, hex: "#ecca6a", diagnosis: "principium",
    english: "Pale", simileLatin: "ut succus carnis semicoctae", simileEnglish: "like juice of half-cooked flesh" },
  { id: "Subcitrinus", order: 17, hex: "#e8bd45", diagnosis: "media",
    english: "Light citron", simileLatin: "ut pomum semimaturum", simileEnglish: "like a half-ripe apple" },
  { id: "Citrinus", order: 18, hex: "#e8b021", diagnosis: "media",
    english: "Citron", simileLatin: "ut citrum maturum", simileEnglish: "like a ripe citron" },
  { id: "Subrufus", order: 19, hex: "#dca927", diagnosis: "perfecta",
    english: "Light red-gold", simileLatin: "ut aurum dilutum", simileEnglish: "like thinned gold" },
]

// ── Network shape ───────────────────────────────────────────────────────────
// Nodes carry a `kind` discriminator so the layout, hover readout, and
// accessible table can tell a flask from a diagnosis. Ids are the human-readable
// Latin names, so keyboard navigation and the data table read meaningfully.
const diagnosisById = new Map(URINE_DIAGNOSES.map((d) => [d.id, d]))

export const URINE_NODES = [
  ...URINE_COLORS.map((c) => ({
    ...c,
    kind: "color",
    accent: diagnosisById.get(c.diagnosis).accent,
    diagnosisLabel: diagnosisById.get(c.diagnosis).short,
  })),
  ...URINE_DIAGNOSES.map((d) => ({ ...d, kind: "diagnosis" })),
]

// Each color is joined to the coction it signifies — twenty radial spokes.
export const URINE_EDGES = URINE_COLORS.map((c) => ({
  id: `${c.id}->${c.diagnosis}`,
  source: c.id,
  target: c.diagnosis,
  accent: diagnosisById.get(c.diagnosis).accent,
}))

export const URINE_COLOR_COUNT = URINE_COLORS.length
export const URINE_DIAGNOSIS_COUNT = URINE_DIAGNOSES.length
