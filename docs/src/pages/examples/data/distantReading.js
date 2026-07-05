export const SIGNALS = [
  {
    id: "voice",
    label: "Voices",
    noun: "dialogue",
    color: "#d95f43",
    description: "Speech, letters, testimony, and direct address.",
  },
  {
    id: "motion",
    label: "Motion",
    noun: "movement",
    color: "#1f9a8a",
    description: "Travel, pursuit, blocking, escape, and scene-to-scene momentum.",
  },
  {
    id: "interiority",
    label: "Interior",
    noun: "interiority",
    color: "#4f6fb3",
    description: "Reflection, self-argument, memory, shame, and inward narration.",
  },
  {
    id: "danger",
    label: "Threat",
    noun: "danger",
    color: "#b33b65",
    description: "Violence, dread, illness, ruin, and visible pressure on the plot.",
  },
]

export const PHASES = [
  { id: "opening", label: "Opening", color: "#d95f43" },
  { id: "entanglement", label: "Entanglement", color: "#e0a92f" },
  { id: "crisis", label: "Crisis", color: "#b33b65" },
  { id: "aftermath", label: "Aftermath", color: "#1f9a8a" },
]

const RAW_BOOKS = [
  {
    id: "frankenstein",
    title: "Frankenstein",
    author: "Mary Shelley",
    year: 1818,
    chapters: 24,
    words: 74500,
    color: "#486a8f",
    accent: "#d95f43",
    question: "When does confession become pursuit?",
    claim:
      "Its strongest shape is not the monster. It is nested testimony that turns inwardness into motion.",
    sourceNote: "Modeled as 24 chapter-level bins from the 1818 public-domain novel.",
    signals: {
      voice: {
        base: 34,
        slope: 2,
        wave: 11,
        phase: 0.2,
        peaks: [
          [0.08, 18, 0.08],
          [0.5, 30, 0.12],
          [0.92, 16, 0.08],
        ],
      },
      motion: {
        base: 24,
        slope: 25,
        wave: 9,
        phase: 1.5,
        peaks: [
          [0.12, 16, 0.1],
          [0.78, 22, 0.09],
          [0.96, 31, 0.08],
        ],
      },
      interiority: {
        base: 51,
        slope: -2,
        wave: 13,
        phase: 2.1,
        peaks: [
          [0.34, 25, 0.14],
          [0.58, 18, 0.12],
          [0.83, 22, 0.09],
        ],
      },
      danger: {
        base: 18,
        slope: 34,
        wave: 8,
        phase: 0.7,
        peaks: [
          [0.62, 18, 0.09],
          [0.76, 25, 0.07],
          [0.93, 34, 0.08],
        ],
      },
    },
    motifs: [
      { motif: "Framing testimony", score: 86, phase: "opening" },
      { motif: "Forbidden making", score: 72, phase: "entanglement" },
      { motif: "Domestic fracture", score: 54, phase: "crisis" },
      { motif: "Pursuit over ice", score: 78, phase: "aftermath" },
    ],
    network: {
      nodes: [
        { id: "Walton", type: "Frame" },
        { id: "Victor", type: "Witness" },
        { id: "Creature", type: "Witness" },
        { id: "Family", type: "Domestic" },
        { id: "Science", type: "Force" },
        { id: "Justice", type: "Institution" },
        { id: "Pursuit", type: "Force" },
        { id: "Arctic", type: "Place" },
      ],
      edges: [
        { source: "Walton", target: "Victor", value: 34 },
        { source: "Victor", target: "Creature", value: 52 },
        { source: "Creature", target: "Family", value: 30 },
        { source: "Victor", target: "Science", value: 26 },
        { source: "Creature", target: "Justice", value: 22 },
        { source: "Creature", target: "Pursuit", value: 32 },
        { source: "Victor", target: "Pursuit", value: 38 },
        { source: "Pursuit", target: "Arctic", value: 28 },
      ],
    },
  },
  {
    id: "pride",
    title: "Pride and Prejudice",
    author: "Jane Austen",
    year: 1813,
    chapters: 24,
    words: 122000,
    color: "#8f5b73",
    accent: "#e0a92f",
    question: "How much plot is carried by talk?",
    claim:
      "The social machine looks gentle until the motion signal spikes around disgrace and repair.",
    sourceNote: "Modeled as 24 equal narrative bins from the public-domain novel.",
    signals: {
      voice: {
        base: 62,
        slope: -3,
        wave: 10,
        phase: 0.6,
        peaks: [
          [0.18, 19, 0.1],
          [0.48, 20, 0.12],
          [0.86, 16, 0.1],
        ],
      },
      motion: {
        base: 21,
        slope: 9,
        wave: 12,
        phase: 2.4,
        peaks: [
          [0.56, 18, 0.1],
          [0.72, 28, 0.08],
          [0.88, 16, 0.09],
        ],
      },
      interiority: {
        base: 40,
        slope: 8,
        wave: 8,
        phase: 1.8,
        peaks: [
          [0.42, 22, 0.12],
          [0.64, 25, 0.1],
          [0.9, 18, 0.09],
        ],
      },
      danger: {
        base: 12,
        slope: 8,
        wave: 7,
        phase: 0.9,
        peaks: [
          [0.72, 34, 0.06],
          [0.8, 22, 0.07],
        ],
      },
    },
    motifs: [
      { motif: "Assembly talk", score: 74, phase: "opening" },
      { motif: "Letters as evidence", score: 70, phase: "entanglement" },
      { motif: "Reputation at risk", score: 63, phase: "crisis" },
      { motif: "Judgment revised", score: 82, phase: "aftermath" },
    ],
    network: {
      nodes: [
        { id: "Elizabeth", type: "Witness" },
        { id: "Darcy", type: "Witness" },
        { id: "Bennet family", type: "Domestic" },
        { id: "Bingley", type: "Domestic" },
        { id: "Wickham", type: "Force" },
        { id: "Lydia", type: "Domestic" },
        { id: "Letters", type: "Frame" },
        { id: "Estate", type: "Institution" },
      ],
      edges: [
        { source: "Elizabeth", target: "Darcy", value: 48 },
        { source: "Elizabeth", target: "Bennet family", value: 44 },
        { source: "Darcy", target: "Bingley", value: 26 },
        { source: "Bingley", target: "Bennet family", value: 24 },
        { source: "Wickham", target: "Lydia", value: 32 },
        { source: "Wickham", target: "Darcy", value: 22 },
        { source: "Letters", target: "Elizabeth", value: 34 },
        { source: "Darcy", target: "Estate", value: 20 },
      ],
    },
  },
  {
    id: "dracula",
    title: "Dracula",
    author: "Bram Stoker",
    year: 1897,
    chapters: 27,
    words: 160000,
    color: "#7f3046",
    accent: "#4f6fb3",
    question: "Can a monster be detected as document flow?",
    claim:
      "The signal is bureaucratic horror: diaries, phonographs, and clippings make fear into a shared ledger.",
    sourceNote: "Modeled as 27 chapter-level bins from the public-domain novel.",
    signals: {
      voice: {
        base: 46,
        slope: 12,
        wave: 14,
        phase: 1.2,
        peaks: [
          [0.08, 24, 0.08],
          [0.48, 18, 0.12],
          [0.82, 22, 0.1],
        ],
      },
      motion: {
        base: 30,
        slope: 24,
        wave: 12,
        phase: 2.2,
        peaks: [
          [0.18, 26, 0.1],
          [0.67, 20, 0.12],
          [0.94, 30, 0.08],
        ],
      },
      interiority: {
        base: 38,
        slope: -1,
        wave: 11,
        phase: 0.4,
        peaks: [
          [0.34, 22, 0.12],
          [0.58, 24, 0.1],
        ],
      },
      danger: {
        base: 45,
        slope: 18,
        wave: 15,
        phase: 1.7,
        peaks: [
          [0.18, 28, 0.08],
          [0.52, 34, 0.08],
          [0.86, 24, 0.12],
        ],
      },
    },
    motifs: [
      { motif: "Documents assembled", score: 88, phase: "opening" },
      { motif: "Contagion crosses rooms", score: 79, phase: "entanglement" },
      { motif: "Pursuit by committee", score: 84, phase: "crisis" },
      { motif: "The old world retreats", score: 69, phase: "aftermath" },
    ],
    network: {
      nodes: [
        { id: "Harker", type: "Witness" },
        { id: "Mina", type: "Witness" },
        { id: "Dracula", type: "Force" },
        { id: "Lucy", type: "Domestic" },
        { id: "Van Helsing", type: "Institution" },
        { id: "Seward", type: "Witness" },
        { id: "London", type: "Place" },
        { id: "Transylvania", type: "Place" },
      ],
      edges: [
        { source: "Harker", target: "Dracula", value: 42 },
        { source: "Dracula", target: "London", value: 38 },
        { source: "Dracula", target: "Lucy", value: 32 },
        { source: "Mina", target: "Harker", value: 30 },
        { source: "Mina", target: "Van Helsing", value: 28 },
        { source: "Seward", target: "Van Helsing", value: 24 },
        { source: "Van Helsing", target: "Dracula", value: 34 },
        { source: "Dracula", target: "Transylvania", value: 29 },
      ],
    },
  },
  {
    id: "war-worlds",
    title: "The War of the Worlds",
    author: "H. G. Wells",
    year: 1898,
    chapters: 27,
    words: 62000,
    color: "#6d7340",
    accent: "#1f9a8a",
    question: "What does invasion look like from far away?",
    claim:
      "The danger signal arrives before the social signal can name it, then collapses into wandering and aftershock.",
    sourceNote: "Modeled as 27 chapter-level bins from the public-domain novel.",
    signals: {
      voice: {
        base: 25,
        slope: 4,
        wave: 9,
        phase: 1.5,
        peaks: [
          [0.2, 14, 0.1],
          [0.76, 20, 0.09],
        ],
      },
      motion: {
        base: 45,
        slope: 18,
        wave: 13,
        phase: 0.3,
        peaks: [
          [0.24, 22, 0.08],
          [0.52, 28, 0.08],
          [0.78, 18, 0.1],
        ],
      },
      interiority: {
        base: 30,
        slope: 10,
        wave: 7,
        phase: 2.5,
        peaks: [
          [0.68, 24, 0.12],
          [0.9, 16, 0.08],
        ],
      },
      danger: {
        base: 50,
        slope: -3,
        wave: 16,
        phase: 0.6,
        peaks: [
          [0.18, 30, 0.07],
          [0.34, 34, 0.07],
          [0.52, 22, 0.1],
        ],
      },
    },
    motifs: [
      { motif: "Landing observed", score: 76, phase: "opening" },
      { motif: "Technology as weather", score: 88, phase: "entanglement" },
      { motif: "Civil order disperses", score: 82, phase: "crisis" },
      { motif: "Survival after empire", score: 64, phase: "aftermath" },
    ],
    network: {
      nodes: [
        { id: "Narrator", type: "Witness" },
        { id: "Martians", type: "Force" },
        { id: "Tripods", type: "Force" },
        { id: "Heat-Ray", type: "Force" },
        { id: "Artilleryman", type: "Witness" },
        { id: "Brother", type: "Witness" },
        { id: "London", type: "Place" },
        { id: "Red weed", type: "Force" },
      ],
      edges: [
        { source: "Narrator", target: "Martians", value: 46 },
        { source: "Martians", target: "Tripods", value: 40 },
        { source: "Martians", target: "Heat-Ray", value: 36 },
        { source: "Narrator", target: "Artilleryman", value: 24 },
        { source: "Brother", target: "London", value: 26 },
        { source: "Tripods", target: "London", value: 32 },
        { source: "Martians", target: "Red weed", value: 22 },
        { source: "Red weed", target: "London", value: 18 },
      ],
    },
  },
]

const phaseFor = (t) => {
  if (t < 0.22) return "opening"
  if (t < 0.58) return "entanglement"
  if (t < 0.82) return "crisis"
  return "aftermath"
}

const round = (value) => Math.round(value)
const clamp = (value, min = 4, max = 96) => Math.max(min, Math.min(max, value))
const mean = (values) => values.reduce((total, value) => total + value, 0) / values.length

function pulse(t, center, height, width) {
  const distance = t - center
  return height * Math.exp(-(distance * distance) / (2 * width * width))
}

function signalValue(definition, t, index) {
  const wave = Math.sin(t * Math.PI * definition.wave + definition.phase) * 5
  const drift = definition.slope * t
  const spikes = definition.peaks.reduce(
    (total, [center, height, width]) => total + pulse(t, center, height, width),
    0,
  )
  const smallVariation = Math.sin((index + 1) * 1.9 + definition.phase) * 3
  return round(clamp(definition.base + drift + wave + spikes + smallVariation))
}

function buildBook(raw) {
  const chapters = Array.from({ length: raw.chapters }, (_, index) => {
    const t = raw.chapters === 1 ? 0 : index / (raw.chapters - 1)
    const values = Object.fromEntries(
      SIGNALS.map((signal) => [signal.id, signalValue(raw.signals[signal.id], t, index)]),
    )
    const dominantSignal = SIGNALS.reduce((best, signal) =>
      values[signal.id] > values[best.id] ? signal : best
    )
    const density = mean(SIGNALS.map((signal) => values[signal.id]))
    const wordWeight = 0.82 + density / 420 + Math.sin(index * 1.3 + raw.year) * 0.07
    return {
      chapter: index + 1,
      label: `Chapter ${index + 1}`,
      phase: phaseFor(t),
      dominantSignal: dominantSignal.id,
      words: round((raw.words / raw.chapters) * wordWeight),
      ...values,
    }
  })

  const averages = Object.fromEntries(
    SIGNALS.map((signal) => [
      signal.id,
      round(mean(chapters.map((chapter) => chapter[signal.id]))),
    ]),
  )
  const volatility = round(
    mean(
      chapters.slice(1).map((chapter, index) =>
        Math.abs(chapter.danger - chapters[index].danger) +
        Math.abs(chapter.motion - chapters[index].motion),
      ),
    ),
  )
  const peak = chapters.reduce((best, chapter) =>
    chapter.danger + chapter.motion > best.danger + best.motion ? chapter : best
  )

  return {
    ...raw,
    chapters,
    averages,
    volatility,
    peak,
    signature: [
      { label: "Voice load", value: averages.voice, color: SIGNALS[0].color },
      { label: "Motion load", value: averages.motion, color: SIGNALS[1].color },
      { label: "Interior load", value: averages.interiority, color: SIGNALS[2].color },
      { label: "Threat load", value: averages.danger, color: SIGNALS[3].color },
    ],
  }
}

export const BOOKS = RAW_BOOKS.map(buildBook)

export const CORPUS_FINGERPRINTS = BOOKS.map((book) => ({
  id: book.id,
  title: book.title,
  author: book.author,
  year: book.year,
  voice: book.averages.voice,
  motion: book.averages.motion,
  interiority: book.averages.interiority,
  danger: book.averages.danger,
  volatility: book.volatility,
  chapters: book.chapters.length,
  color: book.color,
}))

export const CORPUS_CHAPTER_FINGERPRINTS = BOOKS.flatMap((book) =>
  book.chapters.map((chapter) => ({
    id: `${book.id}-${chapter.chapter}`,
    bookId: book.id,
    title: book.title,
    author: book.author,
    year: book.year,
    chapter: chapter.chapter,
    label: `${book.title}, chapter ${chapter.chapter}`,
    phase: chapter.phase,
    voice: chapter.voice,
    motion: chapter.motion,
    interiority: chapter.interiority,
    danger: chapter.danger,
    dominantSignal: chapter.dominantSignal,
    color: book.color,
  })),
)

export function getBook(id) {
  return BOOKS.find((book) => book.id === id) || BOOKS[0]
}

export function signalRows(book, signalId) {
  return book.chapters.map((chapter) => ({
    chapter: chapter.chapter,
    label: chapter.label,
    phase: chapter.phase,
    value: chapter[signalId],
    words: chapter.words,
  }))
}

export function phaseRows(book, signalId) {
  return PHASES.map((phase) => {
    const chapters = book.chapters.filter((chapter) => chapter.phase === phase.id)
    return {
      phase: phase.label,
      score: round(mean(chapters.map((chapter) => chapter[signalId]))),
      fill: phase.color,
    }
  })
}

export function topChapterFor(book, signalId) {
  return book.chapters.reduce((best, chapter) =>
    chapter[signalId] > best[signalId] ? chapter : best
  )
}

export function signalById(id) {
  return SIGNALS.find((signal) => signal.id === id) || SIGNALS[0]
}
