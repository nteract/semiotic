/**
 * A deliberately small, inspectable Latent Dirichlet Allocation assay.
 *
 * The corpus is purpose-written for this example. It borrows the questions,
 * not the prose, of the Journal of Digital Humanities special issue co-guest
 * edited by Elijah Meeks and Scott B. Weingart: how can humanists inspect,
 * interpret, and criticize topic models? It is much too small for scholarship;
 * its job is to keep every token and every Gibbs update visible.
 */

export const LDA_TOPIC_MODEL_SOURCE = {
  title: "The Digital Humanities Contribution to Topic Modeling",
  publication: "Journal of Digital Humanities",
  issue: "2.1",
  year: 2012,
  editor: "Elijah Meeks and Scott B. Weingart",
  editorNames: ["Elijah Meeks", "Scott B. Weingart"],
  editors: [
    { name: "Elijah Meeks", role: "co-guest editor" },
    { name: "Scott B. Weingart", role: "co-guest editor" },
  ],
  url: "https://journalofdigitalhumanities.org/2-1/dh-contribution-to-topic-modeling/",
  relationship:
    "Context and inspiration only. Every miniature document below is original to this example; no article prose is reproduced.",
}

export const LDA_MINIATURE_CORPUS = [
  {
    id: "map-argument",
    label: "The map makes an argument",
    text: "A map selects a place, a border, and a scale. Each layer makes a spatial argument. A route crosses the border while the map frames the region and hides another place.",
  },
  {
    id: "projection-scale",
    label: "Projection and scale",
    text: "Projection bends distance on the map. Scale changes the region, the border, and the visible route. Spatial layers compare one place with another place and make distance debatable.",
  },
  {
    id: "railway-time",
    label: "Railway time",
    text: "A railway station joins route, distance, and time. The network orders each station and carries travelers across a region. A map turns movement into lines between places.",
  },
  {
    id: "archive-shelf",
    label: "The archive shelf",
    text: "An archive preserves a letter, a page, and a catalog record. The collection orders each document on a shelf. An editor reads the margin and restores a missing page.",
  },
  {
    id: "newspaper-edition",
    label: "A newspaper edition",
    text: "A newspaper prints an edition for many readers. Each page carries an article, a date, and a record. The archive binds print into a collection that later readers search.",
  },
  {
    id: "editorial-margin",
    label: "The editorial margin",
    text: "An editor assembles an issue from essay, article, and review. Scholars annotate words in the margin. The journal becomes an archive of arguments, pages, and changing editions.",
  },
  {
    id: "letter-network",
    label: "A network of letters",
    text: "A letter moves from sender to recipient along a postal route. Repeated correspondence makes a network. The archive records each address, date, connection, and journey.",
  },
  {
    id: "citation-path",
    label: "A citation path",
    text: "A citation connects article to article and scholar to scholar. The network reveals clusters, bridges, and paths through a journal. An editor may follow a link across many issues.",
  },
  {
    id: "topic-mixture",
    label: "Documents as mixtures",
    text: "A topic model treats each document as a mixture. A topic gives probability to every word. Counts connect document, topic, and word without declaring a single permanent meaning.",
  },
  {
    id: "gibbs-sampler",
    label: "Inside a Gibbs sweep",
    text: "The sampler removes one token, weighs every topic, and draws a new assignment. Iteration changes counts. Repeated sampling lets topic and document mixtures congeal without naming them.",
  },
  {
    id: "modeled-archive",
    label: "Modeling an archive",
    text: "A scholar turns archive pages into a corpus. The model counts every word in every document. Topics offer patterns for reading, while the editor returns to the collection and tests the pattern.",
  },
  {
    id: "spatial-model",
    label: "A spatial model",
    text: "A model compares map layers as documents. Place words gather into topics while routes cross topic boundaries. Probability links scale, region, document, and spatial pattern without erasing ambiguity.",
  },
]

export const LDA_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "be",
  "between",
  "by",
  "each",
  "every",
  "for",
  "from",
  "in",
  "into",
  "it",
  "later",
  "many",
  "may",
  "of",
  "on",
  "one",
  "that",
  "the",
  "them",
  "through",
  "to",
  "while",
  "with",
  "without",
])

export const LDA_CHECKPOINTS = [0, 1, 2, 4, 8, 16, 32, 64]

export const LDA_DEFAULT_CONFIG = {
  topicCount: 4,
  alpha: 0.3,
  beta: 0.15,
  seed: "jdh-2-1-inspectable-gibbs",
  iterations: 64,
  checkpoints: LDA_CHECKPOINTS,
  trailWordsPerTopic: 7,
}

const TOPIC_COLORS = ["#8f3b2f", "#1f6675", "#8a590e", "#5e4a7f"]
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"]

const sum = (values) => values.reduce((total, value) => total + value, 0)

const round = (value, digits = 12) => Number(value.toFixed(digits))

function hashSeed(seed) {
  if (typeof seed === "number" && Number.isFinite(seed)) return seed >>> 0
  let hash = 2166136261
  for (const character of String(seed)) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function tokenizeLDADocument(text, stopWords = LDA_STOP_WORDS) {
  return (
    String(text)
      .toLowerCase()
      .match(/[a-z]+(?:'[a-z]+)?/g)
      ?.filter((word) => word.length > 1 && !stopWords.has(word)) ?? []
  )
}

function normalizeConfig(options = {}) {
  const config = { ...LDA_DEFAULT_CONFIG, ...options }
  if (!Number.isInteger(config.topicCount) || config.topicCount < 2) {
    throw new Error("topicCount must be an integer of at least 2")
  }
  if (!Number.isInteger(config.iterations) || config.iterations < 1) {
    throw new Error("iterations must be a positive integer")
  }
  if (!(config.alpha > 0) || !(config.beta > 0)) {
    throw new Error("alpha and beta must both be positive")
  }
  const checkpoints = [...new Set(config.checkpoints)]
    .filter((iteration) => Number.isInteger(iteration) && iteration >= 0)
    .sort((left, right) => left - right)
  if (checkpoints.at(-1) > config.iterations) {
    throw new Error("checkpoints cannot exceed iterations")
  }
  if (!checkpoints.includes(0)) checkpoints.unshift(0)
  if (!checkpoints.includes(config.iterations)) checkpoints.push(config.iterations)
  return { ...config, checkpoints }
}

function prepareCorpus(corpus) {
  const documents = corpus.map((document) => ({
    ...document,
    tokens: tokenizeLDADocument(document.text),
  }))
  if (documents.some((document) => document.tokens.length === 0)) {
    throw new Error("Every LDA document must retain at least one token")
  }
  const vocabulary = [...new Set(documents.flatMap((document) => document.tokens))].sort()
  const vocabularyIndex = new Map(vocabulary.map((word, index) => [word, index]))
  const tokens = documents.flatMap((document, documentIndex) =>
    document.tokens.map((word, position) => ({
      id: `${document.id}-token-${position}`,
      documentId: document.id,
      documentIndex,
      position,
      word,
      wordIndex: vocabularyIndex.get(word),
    })),
  )
  return { documents, vocabulary, tokens }
}

function fullConditional(model, tokenIndex) {
  const token = model.tokens[tokenIndex]
  const weights = Array.from({ length: model.topicCount }, (_, topicIndex) => {
    const documentTerm = model.documentTopicCounts[token.documentIndex][topicIndex] + model.alpha
    const wordTerm = model.topicWordCounts[topicIndex][token.wordIndex] + model.beta
    const topicTerm = model.topicTotals[topicIndex] + model.vocabulary.length * model.beta
    return (documentTerm * wordTerm) / topicTerm
  })
  const total = sum(weights)
  return weights.map((weight) => weight / total)
}

function sampleCategorical(probabilities, randomUnit) {
  let cumulative = 0
  for (let index = 0; index < probabilities.length; index += 1) {
    cumulative += probabilities[index]
    if (randomUnit < cumulative || index === probabilities.length - 1) return index
  }
  return probabilities.length - 1
}

function decrementToken(model, tokenIndex, topicIndex) {
  const token = model.tokens[tokenIndex]
  model.documentTopicCounts[token.documentIndex][topicIndex] -= 1
  model.topicWordCounts[topicIndex][token.wordIndex] -= 1
  model.topicTotals[topicIndex] -= 1
}

function incrementToken(model, tokenIndex, topicIndex) {
  const token = model.tokens[tokenIndex]
  model.documentTopicCounts[token.documentIndex][topicIndex] += 1
  model.topicWordCounts[topicIndex][token.wordIndex] += 1
  model.topicTotals[topicIndex] += 1
}

function topicId(topicIndex) {
  return `topic-${topicIndex + 1}`
}

function topicWordRows(model, topicIndex) {
  const denominator = model.topicTotals[topicIndex] + model.vocabulary.length * model.beta
  return model.vocabulary
    .map((word, wordIndex) => ({
      word,
      count: model.topicWordCounts[topicIndex][wordIndex],
      probability: (model.topicWordCounts[topicIndex][wordIndex] + model.beta) / denominator,
    }))
    .sort(
      (left, right) => right.probability - left.probability || left.word.localeCompare(right.word),
    )
    .map((row, rank) => ({ ...row, rank: rank + 1 }))
}

function snapshotModel(model, iteration, movement, trackedVisit) {
  const topicWords = {}
  const topicWordCounts = {}
  const topicWordProbabilities = {}
  const documentTopicCounts = {}
  const documentMixtures = {}
  const topics = []

  for (let topicIndex = 0; topicIndex < model.topicCount; topicIndex += 1) {
    const id = topicId(topicIndex)
    const rows = topicWordRows(model, topicIndex)
    topicWords[id] = rows
      .slice(0, 12)
      .map((row) => ({ ...row, probability: round(row.probability) }))
    topicWordCounts[id] = Object.fromEntries(
      model.vocabulary.map((word, wordIndex) => [
        word,
        model.topicWordCounts[topicIndex][wordIndex],
      ]),
    )
    topicWordProbabilities[id] = Object.fromEntries(
      rows.map((row) => [row.word, round(row.probability)]),
    )
    topics.push({
      id,
      tokenCount: model.topicTotals[topicIndex],
      topWords: topicWords[id],
    })
  }

  for (let documentIndex = 0; documentIndex < model.documents.length; documentIndex += 1) {
    const document = model.documents[documentIndex]
    const denominator = document.tokens.length + model.topicCount * model.alpha
    documentTopicCounts[document.id] = Object.fromEntries(
      model.documentTopicCounts[documentIndex].map((count, index) => [topicId(index), count]),
    )
    documentMixtures[document.id] = Object.fromEntries(
      model.documentTopicCounts[documentIndex].map((count, index) => [
        topicId(index),
        round((count + model.alpha) / denominator),
      ]),
    )
  }

  let tokenLogScore = 0
  for (let tokenIndex = 0; tokenIndex < model.tokens.length; tokenIndex += 1) {
    const token = model.tokens[tokenIndex]
    const probability = Array.from({ length: model.topicCount }, (_, index) => {
      const theta = documentMixtures[token.documentId][topicId(index)]
      const phi = topicWordProbabilities[topicId(index)][token.word]
      return theta * phi
    }).reduce((total, value) => total + value, 0)
    tokenLogScore += Math.log(probability)
  }

  return {
    index: iteration,
    iteration,
    label: iteration === 0 ? "Random charge" : `Sweep ${iteration}`,
    movedTokens: movement.netMoved,
    movedTokensSincePreviousCheckpoint: movement.netMoved,
    sweepMoves: movement.sweepMoves,
    changeRate: round(movement.netMoved / model.tokens.length),
    tokenLogScore: round(tokenLogScore),
    trainingPerplexityProxy: round(Math.exp(-tokenLogScore / model.tokens.length)),
    assignmentTopicIds: model.assignments.map(topicId),
    tokenAssignments: model.tokens.map((token, tokenIndex) => ({
      tokenId: token.id,
      documentId: token.documentId,
      position: token.position,
      word: token.word,
      topicId: topicId(model.assignments[tokenIndex]),
    })),
    topicWords,
    topicWordCounts,
    topicWordProbabilities,
    documentTopicCounts,
    documentMixtures,
    topics,
    topicTokenTotals: Object.fromEntries(
      model.topicTotals.map((count, index) => [topicId(index), count]),
    ),
    trackedTokenVisit: trackedVisit,
  }
}

function trackedVisitAtInitialization(model, trackedTokenIndex) {
  const fromTopicIndex = model.assignments[trackedTokenIndex]
  decrementToken(model, trackedTokenIndex, fromTopicIndex)
  const probabilities = fullConditional(model, trackedTokenIndex)
  incrementToken(model, trackedTokenIndex, fromTopicIndex)
  return {
    iteration: 0,
    fromTopicId: topicId(fromTopicIndex),
    toTopicId: topicId(fromTopicIndex),
    assignmentTopicId: topicId(fromTopicIndex),
    conditionalProbabilities: Object.fromEntries(
      probabilities.map((probability, index) => [topicId(index), round(probability)]),
    ),
    sampledUnit: null,
    sampled: false,
  }
}

/**
 * Run a seeded collapsed Gibbs sampler for LDA.
 *
 * For token i in document d with word w, each sweep removes i and samples:
 *   p(z_i=k | z_-i,w) ∝ (n_dk + alpha)(n_kw + beta)/(n_k + V beta)
 */
export function runCollapsedGibbsLDA(corpus = LDA_MINIATURE_CORPUS, options = {}) {
  const config = normalizeConfig(options)
  const prepared = prepareCorpus(corpus)
  const random = mulberry32(hashSeed(config.seed))
  const model = {
    ...prepared,
    topicCount: config.topicCount,
    alpha: config.alpha,
    beta: config.beta,
    assignments: Array(prepared.tokens.length).fill(0),
    documentTopicCounts: prepared.documents.map(() => Array(config.topicCount).fill(0)),
    topicWordCounts: Array.from({ length: config.topicCount }, () =>
      Array(prepared.vocabulary.length).fill(0),
    ),
    topicTotals: Array(config.topicCount).fill(0),
  }

  for (let tokenIndex = 0; tokenIndex < model.tokens.length; tokenIndex += 1) {
    const assignment = Math.floor(random() * config.topicCount)
    model.assignments[tokenIndex] = assignment
    incrementToken(model, tokenIndex, assignment)
  }

  const trackedTokenIndex = model.tokens.findIndex(
    (token) => token.documentId === "spatial-model" && token.word === "document",
  )
  const resolvedTrackedTokenIndex = trackedTokenIndex >= 0 ? trackedTokenIndex : 0
  const checkpointSet = new Set(config.checkpoints)
  const snapshots = []
  const trackedVisits = new Map()
  const initialAssignments = [...model.assignments]
  const initialVisit = trackedVisitAtInitialization(model, resolvedTrackedTokenIndex)
  trackedVisits.set(0, initialVisit)
  snapshots.push(snapshotModel(model, 0, { netMoved: 0, sweepMoves: 0 }, initialVisit))

  let previousCheckpointAssignments = initialAssignments
  for (let iteration = 1; iteration <= config.iterations; iteration += 1) {
    let sweepMoves = 0
    let trackedVisit = null
    for (let tokenIndex = 0; tokenIndex < model.tokens.length; tokenIndex += 1) {
      const fromTopicIndex = model.assignments[tokenIndex]
      decrementToken(model, tokenIndex, fromTopicIndex)
      const probabilities = fullConditional(model, tokenIndex)
      const sampledUnit = random()
      const toTopicIndex = sampleCategorical(probabilities, sampledUnit)
      model.assignments[tokenIndex] = toTopicIndex
      incrementToken(model, tokenIndex, toTopicIndex)
      if (toTopicIndex !== fromTopicIndex) sweepMoves += 1

      if (tokenIndex === resolvedTrackedTokenIndex) {
        trackedVisit = {
          iteration,
          fromTopicId: topicId(fromTopicIndex),
          toTopicId: topicId(toTopicIndex),
          assignmentTopicId: topicId(toTopicIndex),
          conditionalProbabilities: Object.fromEntries(
            probabilities.map((probability, index) => [topicId(index), round(probability)]),
          ),
          sampledUnit: round(sampledUnit),
          sampled: true,
        }
      }
    }

    if (checkpointSet.has(iteration)) {
      const netMoved = model.assignments.reduce(
        (count, assignment, index) =>
          count + Number(assignment !== previousCheckpointAssignments[index]),
        0,
      )
      trackedVisits.set(iteration, trackedVisit)
      snapshots.push(snapshotModel(model, iteration, { netMoved, sweepMoves }, trackedVisit))
      previousCheckpointAssignments = [...model.assignments]
    }
  }

  const topics = Array.from({ length: config.topicCount }, (_, index) => {
    const finalSnapshot = snapshots.at(-1)
    const id = topicId(index)
    const topWords = finalSnapshot.topicWords[id]
    return {
      id,
      index,
      label: `Topic ${ROMAN[index] ?? index + 1}`,
      color: TOPIC_COLORS[index % TOPIC_COLORS.length],
      interpretation: `Anonymous topic; its terminal high-probability words are ${topWords
        .slice(0, 3)
        .map((row) => row.word)
        .join(", ")}.`,
      words: topWords,
    }
  })

  const topicById = new Map(topics.map((topic) => [topic.id, topic]))
  const documents = model.documents.map((document) => {
    const finalTopicMixture = snapshots.at(-1).documentMixtures[document.id]
    const dominantTopicId = Object.entries(finalTopicMixture).sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )[0][0]
    return {
      id: document.id,
      label: document.label,
      text: document.text,
      tokens: document.tokens,
      tokenCount: document.tokens.length,
      finalTopicMixture,
      dominantTopicId,
    }
  })

  const wordTrails = snapshots.flatMap((snapshot) =>
    topics.flatMap((topic) =>
      snapshot.topicWords[topic.id].slice(0, config.trailWordsPerTopic).map((row) => ({
        id: `${snapshot.iteration}-${topic.id}-${row.word}`,
        word: row.word,
        topicId: topic.id,
        topicLabel: topic.label,
        iteration: snapshot.iteration,
        segment: snapshot.iteration,
        count: row.count,
        probability: row.probability,
        rank: row.rank,
        weight: row.probability,
      })),
    ),
  )

  const finalSnapshot = snapshots.at(-1)
  const crucibleData = topics.flatMap((topic) =>
    model.vocabulary
      .map((word) => ({
        id: `${topic.id}-${word}`,
        label: word,
        word,
        topicId: topic.id,
        topicLabel: topic.label,
        category: "terminal-word-allocation",
        amount: finalSnapshot.topicWordCounts[topic.id][word],
        probability: finalSnapshot.topicWordProbabilities[topic.id][word],
        metrics: { probability: finalSnapshot.topicWordProbabilities[topic.id][word] },
      }))
      .filter((row) => row.amount > 0),
  )
  // This is a short presentation tape for the already-recorded terminal
  // state—not a replay of the Gibbs checkpoints. Its duration and event
  // spacing make the four fixed topic allocations readable without implying
  // that Crucible performs or repeats inference.
  const phases = [
    {
      id: "recorded-terminal-charge",
      label: `Recorded R=${config.iterations} charge`,
      description:
        "Load the already-recorded terminal word-topic counts into the presentation vessel; no token is resampled.",
      duration: 0.6,
      motion: "charge",
      intensity: 0.2,
      metrics: {
        iteration: config.iterations,
        movedTokens: finalSnapshot.movedTokens,
        trainingPerplexityProxy: finalSnapshot.trainingPerplexityProxy,
      },
    },
    {
      id: "allocate-terminal-topics",
      label: "Allocate fixed topic counts",
      description:
        "Aggregate the fixed terminal word-topic counts into four topic products for inspection.",
      duration: 2.3,
      motion: "mix",
      intensity: 0.65,
      metrics: {
        iteration: config.iterations,
        allocatedTokens: model.tokens.length,
      },
    },
    {
      id: "quench-terminal-projection",
      label: "Quench projection",
      description:
        "Hold the completed terminal projection long enough to inspect conservation and provenance.",
      duration: 1.3,
      motion: "quench",
      intensity: 0.25,
      metrics: {
        iteration: config.iterations,
        projectedTopics: topics.length,
      },
    },
  ]
  const products = topics.map((topic) => ({
    id: topic.id,
    label: topic.label,
    description: topic.interpretation,
    category: "terminal-topic",
    color: topic.color,
    amount: finalSnapshot.topicTokenTotals[topic.id],
    outletId: "terminal-state",
  }))
  const events = topics.map((topic, index) => ({
    id: `allocate-${topic.id}`,
    at: {
      phaseId: "allocate-terminal-topics",
      progress: topics.length === 1 ? 0.46 : 0.12 + index * (0.69 / Math.max(1, topics.length - 1)),
    },
    label: `${topic.label} allocation forms`,
    description:
      "The presentation aggregates token occurrences by their already-sampled terminal topic. It does not resample or infer an assignment.",
    effects: [
      {
        type: "combine",
        sourceIds: crucibleData.filter((row) => row.topicId === topic.id).map((row) => row.id),
        productId: topic.id,
      },
    ],
  }))
  events.push({
    id: "terminal-state-outcome",
    at: { phaseId: "quench-terminal-projection", progress: 0.72 },
    label: "Terminal chain state retained",
    description:
      "The recorded topics remain anonymous probability distributions over the vocabulary; this teaching run does not establish convergence.",
    effects: [
      {
        type: "set-outcome",
        outcome: "terminal-chain-state",
        summary: `A seeded ${config.iterations}-sweep Gibbs trace over ${model.tokens.length} tokens.`,
      },
    ],
  })

  const trackedToken = model.tokens[resolvedTrackedTokenIndex]
  return {
    source: LDA_TOPIC_MODEL_SOURCE,
    warning:
      "This purpose-written miniature corpus is too small for substantive interpretation. It exists only to expose the mechanics of inference.",
    algorithm: {
      id: "collapsed-gibbs-lda",
      label: "Collapsed Gibbs sampling for LDA",
      formula: "p(z_i=k | z_-i,w) ∝ (n_dk^-i + α)(n_kw^-i + β)/(n_k^-i + Vβ)",
      seed: config.seed,
      topicCount: config.topicCount,
      alpha: config.alpha,
      beta: config.beta,
      iterations: config.iterations,
      checkpoints: config.checkpoints,
      inferenceUnit: "token occurrence",
      scanOrder: "Systematic corpus order, then token order, repeated once per sweep.",
      anonymousTopics: true,
      labelSwitchingNote:
        "Topic numbers are anonymous and exchangeable. Another seed can permute or reorganize them; Topic I is not an intrinsic concept name.",
      metricDefinitions: {
        tokenLogScore:
          "For the training tokens, the sum of log Σₖ theta(document,k) × phi(k,word) under the current smoothed count estimates.",
        trainingPerplexityProxy:
          "exp(−tokenLogScore/tokenCount), evaluated on the same miniature training corpus. It is a descriptive reconstruction proxy, not exact or held-out likelihood.",
      },
      likelihoodNote:
        "The training perplexity proxy is an in-sample descriptive trace. It is not held-out validation or proof of convergence.",
    },
    tokenCount: model.tokens.length,
    vocabulary: model.vocabulary,
    vocabularySize: model.vocabulary.length,
    topics,
    documents,
    iterations: snapshots,
    wordTrails,
    trackedToken: {
      id: trackedToken.id,
      word: trackedToken.word,
      documentId: trackedToken.documentId,
      documentLabel: documents.find((document) => document.id === trackedToken.documentId).label,
      position: trackedToken.position,
      checkpoints: config.checkpoints.map((iteration) => trackedVisits.get(iteration)),
      note: "R=0 records the conditional that would follow removal from the random charge but performs no Gibbs draw. Later checkpoints record the actual conditional used when the sampler removed, weighed, and resampled this token during that sweep.",
    },
    crucible: {
      data: crucibleData,
      phases,
      products,
      outlets: [
        {
          id: "terminal-state",
          label: "Terminal topic state",
          description:
            "One recorded Gibbs state, not a validated posterior draw or a claim that the chain has proved a meaning.",
          side: "bottom",
          color: "#2d2924",
        },
      ],
      events,
      accessors: {
        idAccessor: "id",
        labelAccessor: "label",
        categoryAccessor: "category",
        amountAccessor: "amount",
        metricsAccessor: "metrics",
      },
      conservation: true,
      playbackRate: 0.65,
      note: "Crucible runs a short three-phase presentation tape over the fixed terminal allocation because its products are exclusive; it does not replay Gibbs inference. Word Trails carries top topic-word probability estimates at recorded Gibbs checkpoints; those estimates are derived from repeated token reassignments.",
    },
  }
}

/** Auditable builder alias used by the example and downstream experiments. */
export const buildLDATopicCrucibleModel = runCollapsedGibbsLDA

export const LDA_TOPIC_CRUCIBLE_MODEL = runCollapsedGibbsLDA()
