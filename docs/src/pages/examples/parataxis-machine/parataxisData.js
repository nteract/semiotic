export const RELATION_META = Object.freeze({
  sequence: {
    label: "sequence",
    connector: "then",
    color: "#f2b84b",
    meaning: "This reading treats the second event as following the first in time.",
  },
  contrast: {
    label: "contrast",
    connector: "but",
    color: "#ef6a5b",
    meaning: "This reading treats the second clause as a contrast with the first.",
  },
  cause: {
    label: "cause",
    connector: "because",
    color: "#5cc8be",
    meaning: "One clause is read as the reason for the other.",
  },
  consequence: {
    label: "consequence",
    connector: "therefore",
    color: "#63a8ff",
    meaning: "The first clause is treated as sufficient grounds for the second.",
  },
  simultaneity: {
    label: "simultaneity",
    connector: "meanwhile",
    color: "#a991d4",
    meaning: "The clauses share time but do not necessarily explain one another.",
  },
  irony: {
    label: "irony",
    connector: "somehow",
    color: "#f08db4",
    meaning: "This reading finds a conflict between the literal events and their apparent tone.",
  },
  revelation: {
    label: "revelation",
    connector: "in fact",
    color: "#e7d595",
    meaning: "The second clause recasts what the first appeared to mean.",
  },
  accumulation: {
    label: "accumulation",
    connector: "and",
    color: "#8bcf7b",
    meaning: "This reading treats the clauses as additional examples of the same point.",
  },
})

export const CLAUSE_PAIRS = Object.freeze([
  {
    id: "empty-room",
    clauses: ["He opened the door.", "The room was empty."],
    genre: "fiction",
    effect: "sequence or discovery",
    candidates: { sequence: 84, cause: 17, revelation: 63, contrast: 22, simultaneity: 11 },
    note: "Sequence is the most likely reading. The grammar does not say whether the empty room was expected or surprising.",
  },
  {
    id: "rain-crowd",
    clauses: ["The rain stopped.", "Nobody moved."],
    genre: "narrative",
    effect: "contrast",
    candidates: { sequence: 56, contrast: 82, consequence: 31, simultaneity: 18, cause: 9 },
    note: "Contrast is a strong reading because readers may expect people to move when the rain stops.",
  },
  {
    id: "smile-ambulance",
    clauses: ["She smiled.", "The ambulance arrived."],
    genre: "crime",
    effect: "ambiguous emotion",
    candidates: { sequence: 52, irony: 88, cause: 35, revelation: 61, simultaneity: 27 },
    note: "The smile could suggest relief, menace, denial or coincidence. The pair does not decide among them.",
  },
  {
    id: "server-green",
    clauses: ["The server light turned green.", "The invoices vanished."],
    genre: "bureaucratic",
    effect: "possible cause",
    candidates: { sequence: 66, cause: 58, consequence: 49, contrast: 33, irony: 41 },
    note: "The order makes a causal interpretation tempting, but the sentence states only that both events occurred.",
  },
  {
    id: "city-sleeps",
    clauses: ["The city sleeps.", "The billboards keep watch."],
    genre: "advertising",
    effect: "contrast in time",
    candidates: { contrast: 69, simultaneity: 72, accumulation: 38, irony: 47, revelation: 29 },
    note: "The clauses share a time frame and contrast the sleeping city with active billboards.",
  },
  {
    id: "model-confident",
    clauses: ["The model sounded certain.", "The evidence was thin."],
    genre: "AI model",
    effect: "confidence vs. evidence",
    candidates: { contrast: 94, consequence: 21, irony: 71, revelation: 48, cause: 8 },
    note: "The contrast is strong, but the reader still supplies the judgment that confidence was not warranted.",
  },
])

export const PARATAXIS_SPECTRUM = Object.freeze([
  {
    id: "declared",
    label: "Declared relation",
    score: 8,
    example: "Because the alarm failed, the building emptied late.",
    diagnosis: "Hypotaxis: the dependency is grammatically declared.",
  },
  {
    id: "lightly-linked",
    label: "Lightly linked",
    score: 30,
    example: "The alarm failed, and the building emptied late.",
    diagnosis: "Coordination remains, but the exact logic is loosened.",
  },
  {
    id: "paratactic",
    label: "Paratactic",
    score: 58,
    example: "The alarm failed. The building emptied late.",
    diagnosis: "The units are complete. Their relation is inferred.",
  },
  {
    id: "fragmented",
    label: "Fragmented",
    score: 78,
    example: "No alarm. A late evacuation.",
    diagnosis:
      "The phrases are incomplete clauses. A relationship can still be inferred, but this is also fragmentation.",
  },
  {
    id: "incoherent",
    label: "Incoherent",
    score: 96,
    example: "Alarm. Apricot. Late building.",
    diagnosis: "Adjacency alone cannot guarantee a usable bridge.",
  },
])

export const GENRE_SIGNATURES = Object.freeze([
  { genre: "Prophecy", connectorSuppression: 88, ambiguity: 72, pressure: 94 },
  { genre: "Crime", connectorSuppression: 71, ambiguity: 64, pressure: 80 },
  { genre: "Ad copy", connectorSuppression: 82, ambiguity: 51, pressure: 69 },
  { genre: "Interface", connectorSuppression: 76, ambiguity: 34, pressure: 58 },
  { genre: "Bureaucracy", connectorSuppression: 42, ambiguity: 23, pressure: 37 },
  { genre: "AI explainer", connectorSuppression: 61, ambiguity: 44, pressure: 62 },
])

export const APHORISM_LEDGER = Object.freeze([
  {
    id: "earned-compression",
    label: "The map was wrong. The convoy kept moving.",
    evidence: 88,
    compression: 71,
    risk: "supported",
    note: "The line describes a concrete conflict. The omitted connector makes it concise without implying an unsupported cause.",
  },
  {
    id: "useful-warning",
    label: "The metric rose. The patients did not recover.",
    evidence: 74,
    compression: 82,
    risk: "needs-context",
    note: "The line makes a sharp claim. It still owes definitions and evidence.",
  },
  {
    id: "mood-machine",
    label: "The future arrived. Nobody had a key.",
    evidence: 31,
    compression: 91,
    risk: "weak-support",
    note: "The line is evocative but abstract. Without explanation, it creates a mood more clearly than it makes an argument.",
  },
  {
    id: "false-bridge",
    label: "The chart glowed. The policy worked.",
    evidence: 16,
    compression: 79,
    risk: "unsupported",
    note: "The two statements imply that presentation quality caused a policy result, but no evidence for that link is provided.",
  },
  {
    id: "plain-account",
    label: "The doors opened after inspection. Staff recorded the time.",
    evidence: 92,
    compression: 28,
    risk: "supported",
    note: "This account is less compressed and makes the timing explicit. Its meaning is easier to verify.",
  },
])

export const SANDBOX_GENRES = Object.freeze({
  prophetic: {
    label: "Prophetic",
    clauses: [
      "The towers count the hours.",
      "The river forgets its name.",
      "A red light remains.",
      "Nobody asks who wired it.",
    ],
  },
  bureaucratic: {
    label: "Bureaucratic",
    clauses: [
      "The request entered review.",
      "The status field changed.",
      "No owner was assigned.",
      "The deadline remained active.",
    ],
  },
  romantic: {
    label: "Romantic",
    clauses: [
      "You left the window open.",
      "The curtains learned the wind.",
      "Morning entered quietly.",
      "I kept the cup you used.",
    ],
  },
  model: {
    label: "AI model",
    clauses: [
      "The answer arrived instantly.",
      "Its confidence was immaculate.",
      "The citation led nowhere.",
      "The summary continued.",
    ],
  },
  advertising: {
    label: "Advertising",
    clauses: [
      "The room knows your temperature.",
      "The glass predicts the sun.",
      "Comfort becomes invisible.",
      "The subscription renews itself.",
    ],
  },
  crime: {
    label: "Crime report",
    clauses: [
      "The camera lost four minutes.",
      "The elevator stopped on twelve.",
      "A wet umbrella waited upstairs.",
      "The witness changed one word.",
    ],
  },
})

export function relationRows(pairs = CLAUSE_PAIRS) {
  return pairs.flatMap((pair) =>
    Object.keys(RELATION_META).map((relation) => ({
      id: `${pair.id}-${relation}`,
      pair: pair.id,
      pairLabel: pair.clauses.join(" "),
      relation,
      value: pair.candidates[relation] ?? 0,
    })),
  )
}

export function buildMachineText({ genre, clauseCount, explicitness, seed }) {
  const specimen = SANDBOX_GENRES[genre] ?? SANDBOX_GENRES.prophetic
  const count = Math.max(2, Math.min(4, Number(clauseCount) || 3))
  const offset = Math.abs(Number(seed) || 0) % specimen.clauses.length
  const clauses = Array.from(
    { length: count },
    (_, index) => specimen.clauses[(index + offset) % specimen.clauses.length],
  )
  const connectors = ["Then", "But", "Therefore"]

  return clauses
    .map((clause, index) => {
      if (index === 0 || explicitness < 45) return clause
      const connector = connectors[(index + offset) % connectors.length]
      return `${connector}, ${clause.charAt(0).toLowerCase()}${clause.slice(1)}`
    })
    .join(explicitness > 78 ? " " : "\n")
}
