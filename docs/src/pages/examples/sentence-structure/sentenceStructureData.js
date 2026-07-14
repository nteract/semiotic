/**
 * Authored, deterministic language structures for "The Sentence Is Not the Words".
 *
 * This is intentionally a teaching corpus, not a general-purpose parser. The six
 * specimens keep stable IDs across every representation so a selection can move
 * from a token to a phrase, dependency, concept, rhetorical span, or variant.
 */

export const VIEW_OPTIONS = Object.freeze([
  { value: "reed-kellogg", label: "a sentence diagram", shortLabel: "Sentence diagram" },
  { value: "constituency", label: "phrase structure", shortLabel: "Phrase structure" },
  { value: "dependency", label: "word relationships", shortLabel: "Dependency arcs" },
  { value: "ambiguity", label: "possible interpretations", shortLabel: "Ambiguity" },
  { value: "semantics", label: "a meaning graph", shortLabel: "Meaning graph" },
  { value: "rhetoric", label: "an argument structure", shortLabel: "Rhetorical structure" },
  { value: "word-tree", label: "word paths", shortLabel: "Word paths" },
  {
    value: "phrase-net",
    label: "phrase relationships",
    shortLabel: "Phrase relationships",
  },
  { value: "variants", label: "textual variants", shortLabel: "Textual variants" },
])

export const SUBJECT_OPTIONS = Object.freeze([
  { value: "all", label: "many subjects" },
  { value: "love", label: "love" },
  { value: "death", label: "death" },
  { value: "power", label: "power" },
  { value: "nature", label: "nature" },
  { value: "time", label: "time" },
  { value: "identity", label: "identity" },
  { value: "ambiguity", label: "ambiguity" },
  { value: "rhetoric", label: "rhetoric" },
])

export const CORPUS_OPTIONS = Object.freeze([
  { value: "all", label: "the curated corpus" },
  { value: "shakespeare", label: "Shakespeare" },
  { value: "nineteenth-century-fiction", label: "nineteenth-century fiction" },
  { value: "grammar-lab", label: "the grammar lab" },
  { value: "demonstration", label: "the demonstration corpus" },
])

export const AMOUNT_OPTIONS = Object.freeze([5, 10, 20, 30])

export const DIRECTION_OPTIONS = Object.freeze([
  { value: "forward", label: "forward" },
  { value: "backward", label: "backward" },
])

export const PHRASE_PATTERN_OPTIONS = Object.freeze([
  { value: "X and Y", label: "X and Y", connector: "and" },
  { value: "X or Y", label: "X or Y", connector: "or" },
  { value: "X of Y", label: "X of Y", connector: "of" },
  { value: "X is Y", label: "X is Y", connector: "is" },
  { value: "X versus Y", label: "X versus Y", connector: "versus" },
  { value: "X becomes Y", label: "X becomes Y", connector: "becomes" },
])

export const POS_LABELS = Object.freeze({
  ADJ: "adjective",
  ADP: "adposition",
  ADV: "adverb",
  AUX: "auxiliary",
  CCONJ: "coordinating conjunction",
  DET: "determiner",
  NOUN: "noun",
  PART: "particle",
  PRON: "pronoun",
  PROPN: "proper noun",
  PUNCT: "punctuation",
  SCONJ: "subordinating conjunction",
  VERB: "verb",
})

const WORD_OR_PUNCTUATION = /[\p{L}\p{N}]+(?:[’'][\p{L}\p{N}]+)*|[^\s\p{L}\p{N}]/gu
const WORD_ONLY = /[\p{L}\p{N}]+(?:[’'][\p{L}\p{N}]+)*/gu

function tokenId(specimenId, index) {
  return `${specimenId}:t${index}`
}

function phraseId(specimenId, suffix) {
  return `${specimenId}:phrase:${suffix}`
}

function semanticNodeId(specimenId, suffix) {
  return `${specimenId}:semantic:${suffix}`
}

function makeTokens(namespace, text, authoredTokens) {
  const matches = [...text.matchAll(WORD_OR_PUNCTUATION)]
  if (matches.length !== authoredTokens.length) {
    throw new Error(
      `${namespace} has ${matches.length} surface tokens but ${authoredTokens.length} analyses`,
    )
  }

  return Object.freeze(
    matches.map((match, index) => {
      const [surface, lemma, partOfSpeech, role, diagramRow = 0, diagramParent = null] =
        authoredTokens[index]
      if (surface !== match[0]) {
        throw new Error(`${namespace} token ${index} expected “${surface}” but found “${match[0]}”`)
      }
      return Object.freeze({
        id: `${namespace}:t${index}`,
        index,
        text: match[0],
        lemma,
        partOfSpeech,
        posLabel: POS_LABELS[partOfSpeech] || partOfSpeech,
        role,
        characterStart: match.index,
        characterEnd: match.index + match[0].length,
        semanticId: `token:${namespace}:${index}`,
        diagramRow,
        diagramParent:
          diagramParent === null || diagramParent === undefined
            ? null
            : `${namespace}:t${diagramParent}`,
      })
    }),
  )
}

function makePhrase(specimenId, suffix, label, tokenStart, tokenEnd, children = [], description) {
  return Object.freeze({
    id: phraseId(specimenId, suffix),
    semanticId: `phrase:${specimenId}:${suffix}`,
    label,
    tokenStart,
    tokenEnd,
    ...(description ? { description } : {}),
    ...(children.length ? { children: Object.freeze(children) } : {}),
  })
}

function flattenPhrases(root) {
  const result = []
  function visit(node, parentId = null, depth = 0) {
    result.push(Object.freeze({ ...node, parentId, depth }))
    for (const child of node.children || []) visit(child, node.id, depth + 1)
  }
  visit(root)
  return Object.freeze(result)
}

function makeDependencyEdges(specimenId, specs) {
  return Object.freeze(
    specs.map(([suffix, sourceIndex, targetIndex, relation, label, confidence = 1, description]) =>
      Object.freeze({
        id: `${specimenId}:dependency:${suffix}`,
        semanticId: `dependency:${specimenId}:${suffix}`,
        sourceTokenId: tokenId(specimenId, sourceIndex),
        targetTokenId: tokenId(specimenId, targetIndex),
        relation,
        label: label || relation,
        confidence,
        ...(description ? { description } : {}),
      }),
    ),
  )
}

function makeParse(specimenId, config) {
  return Object.freeze({
    id: `${specimenId}:parse:${config.id}`,
    label: config.label,
    interpretation: config.interpretation,
    probability: config.probability,
    rootTokenId: tokenId(specimenId, config.rootIndex),
    edges: makeDependencyEdges(specimenId, config.edges),
  })
}

function makeSemanticGraph(specimenId, nodeSpecs, edgeSpecs, extra = {}) {
  const nodes = nodeSpecs.map(({ id, tokenIndexes = [], ...node }) =>
    Object.freeze({
      id: semanticNodeId(specimenId, id),
      semanticId: `concept:${specimenId}:${id}`,
      ...node,
      tokenIds: Object.freeze(tokenIndexes.map((index) => tokenId(specimenId, index))),
    }),
  )
  const tokenAlignments = nodes.flatMap((node) =>
    node.tokenIds.map((alignedTokenId) =>
      Object.freeze({ tokenId: alignedTokenId, nodeId: node.id }),
    ),
  )
  const edges = edgeSpecs.map(([id, source, target, relation, label]) =>
    Object.freeze({
      id: `${specimenId}:semantic-edge:${id}`,
      semanticId: `semantic-edge:${specimenId}:${id}`,
      source: semanticNodeId(specimenId, source),
      target: semanticNodeId(specimenId, target),
      relation,
      label: label || relation,
    }),
  )
  return Object.freeze({
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
    tokenAlignments: Object.freeze(tokenAlignments),
    ...extra,
  })
}

function makeRhetoric(specimenId, nodeSpecs, edgeSpecs, rootSuffix) {
  const nodes = nodeSpecs.map(({ id, ...node }) =>
    Object.freeze({
      id: `${specimenId}:rhetoric:${id}`,
      semanticId: `rhetoric:${specimenId}:${id}`,
      ...node,
    }),
  )
  const edges = edgeSpecs.map(([id, source, target, relation, label]) =>
    Object.freeze({
      id: `${specimenId}:rhetoric-edge:${id}`,
      source: `${specimenId}:rhetoric:${source}`,
      target: `${specimenId}:rhetoric:${target}`,
      relation,
      label: label || relation,
    }),
  )
  return Object.freeze({
    rootId: `${specimenId}:rhetoric:${rootSuffix}`,
    nodes: Object.freeze(nodes),
    edges: Object.freeze(edges),
  })
}

function makeVariant(specimenId, config) {
  const namespace = `${specimenId}:variant:${config.id}`
  const tokens = makeTokens(namespace, config.text, config.tokens)
  const alignments = Object.entries(config.alignments || {}).map(([variantIndex, canonicalIndex]) =>
    Object.freeze({
      variantTokenId: tokens[Number(variantIndex)].id,
      tokenId: tokenId(specimenId, canonicalIndex),
    }),
  )
  return Object.freeze({
    id: `${specimenId}:variant:${config.id}`,
    label: config.label,
    text: config.text,
    kind: config.kind || "clarification",
    tokens,
    alignments: Object.freeze(alignments),
  })
}

function makeSentenceDiagram(specimenId, tokens, dependencies) {
  const visibleTokens = tokens.filter((token) => token.partOfSpeech !== "PUNCT")
  const nodes = visibleTokens.map((token) =>
    Object.freeze({
      id: `${specimenId}:diagram:${token.index}`,
      tokenId: token.id,
      semanticId: token.semanticId,
      label: token.text,
      role: token.role,
      x: 48 + token.index * 82,
      y: 76 + token.diagramRow * 48,
      baseline: token.diagramRow === 0,
    }),
  )
  const visibleIds = new Set(visibleTokens.map((token) => token.id))
  const edges = dependencies
    .filter((edge) => visibleIds.has(edge.sourceTokenId) && visibleIds.has(edge.targetTokenId))
    .map((edge) =>
      Object.freeze({
        id: `${edge.id}:diagram`,
        source: `${specimenId}:diagram:${edge.sourceTokenId.split(":t").at(-1)}`,
        target: `${specimenId}:diagram:${edge.targetTokenId.split(":t").at(-1)}`,
        relation: edge.relation,
        label: edge.label,
        semanticId: edge.semanticId,
      }),
    )
  return Object.freeze({ nodes: Object.freeze(nodes), edges: Object.freeze(edges) })
}

function createSpecimen(config) {
  const tokens = makeTokens(config.id, config.text, config.tokenSpecs)
  const dependencies = makeDependencyEdges(config.id, config.dependencySpecs)
  const variants = (config.variantSpecs || []).map((variant) => makeVariant(config.id, variant))
  return Object.freeze({
    id: config.id,
    label: config.label,
    kind: config.kind,
    text: config.text,
    source: Object.freeze(config.source),
    subjects: Object.freeze(config.subjects),
    note: config.note,
    challenge: config.challenge,
    tokens,
    rootTokenId: tokenId(config.id, config.rootIndex),
    constituency: config.constituency,
    phrases: flattenPhrases(config.constituency),
    dependencies,
    alternateDependencies: Object.freeze(
      (config.alternateParses || []).map((parse) => makeParse(config.id, parse)),
    ),
    semantics: config.semantics,
    rhetoric: config.rhetoric || null,
    variants: Object.freeze(variants),
    sentenceDiagram: makeSentenceDiagram(config.id, tokens, dependencies),
    lexicalAlternatives: Object.freeze(config.lexicalAlternatives || []),
  })
}

const attachmentConstituency = makePhrase("attachment-ambiguity", "s", "S", 0, 8, [
  makePhrase("attachment-ambiguity", "subject", "NP", 0, 1, [], "speaker"),
  makePhrase("attachment-ambiguity", "predicate", "VP", 1, 7, [
    makePhrase("attachment-ambiguity", "verb", "V", 1, 2),
    makePhrase("attachment-ambiguity", "object", "NP", 2, 4, [
      makePhrase("attachment-ambiguity", "object-det", "Det", 2, 3),
      makePhrase("attachment-ambiguity", "object-noun", "N", 3, 4),
    ]),
    makePhrase(
      "attachment-ambiguity",
      "with-phrase",
      "PP",
      4,
      7,
      [
        makePhrase("attachment-ambiguity", "preposition", "P", 4, 5),
        makePhrase("attachment-ambiguity", "telescope-np", "NP", 5, 7),
      ],
      "attaches either to the seeing event or to the man",
    ),
  ]),
  makePhrase("attachment-ambiguity", "punctuation", ".", 7, 8),
])

const attachmentDependencySpecs = [
  ["subject", 1, 0, "nsubj", "subject"],
  ["object", 1, 3, "obj", "object"],
  ["man-determiner", 3, 2, "det", "determiner"],
  [
    "instrument-attachment",
    1,
    4,
    "obl:instrument",
    "instrument",
    0.57,
    "the telescope is used to see",
  ],
  ["prepositional-object", 4, 6, "pobj", "object of with"],
  ["telescope-determiner", 6, 5, "det", "determiner"],
  ["punctuation", 1, 7, "punct", "punctuation"],
]

const attachmentSemantics = makeSemanticGraph(
  "attachment-ambiguity",
  [
    { id: "speaker", label: "speaker", type: "entity", tokenIndexes: [0] },
    { id: "seeing", label: "seeing", type: "event", tokenIndexes: [1] },
    { id: "man", label: "man", type: "entity", tokenIndexes: [3] },
    { id: "telescope", label: "telescope", type: "instrument", tokenIndexes: [6] },
    { id: "possession", label: "having", type: "inferred-event", tokenIndexes: [], inferred: true },
  ],
  [
    ["seer", "speaker", "seeing", "agent", "sees"],
    ["seen", "seeing", "man", "patient", "sees"],
    ["instrument", "seeing", "telescope", "instrument", "using"],
    ["possessor", "man", "possession", "possessor", "may possess"],
    ["possessed", "possession", "telescope", "theme", "may have"],
  ],
  {
    readings: Object.freeze([
      Object.freeze({
        id: "instrument",
        label: "I used the telescope",
        activeEdgeIds: Object.freeze([
          "attachment-ambiguity:semantic-edge:seer",
          "attachment-ambiguity:semantic-edge:seen",
          "attachment-ambiguity:semantic-edge:instrument",
        ]),
      }),
      Object.freeze({
        id: "possession",
        label: "the man had the telescope",
        activeEdgeIds: Object.freeze([
          "attachment-ambiguity:semantic-edge:seer",
          "attachment-ambiguity:semantic-edge:seen",
          "attachment-ambiguity:semantic-edge:possessor",
          "attachment-ambiguity:semantic-edge:possessed",
        ]),
      }),
    ]),
  },
)

const gardenPathConstituency = makePhrase("garden-path", "s", "S", 0, 6, [
  makePhrase("garden-path", "subject", "NP", 0, 2, [
    makePhrase("garden-path", "determiner", "Det", 0, 1),
    makePhrase("garden-path", "old-head", "N", 1, 2, [], "old people"),
  ]),
  makePhrase("garden-path", "predicate", "VP", 2, 5, [
    makePhrase("garden-path", "verb", "V", 2, 3, [], "staff or operate"),
    makePhrase("garden-path", "object", "NP", 3, 5),
  ]),
  makePhrase("garden-path", "punctuation", ".", 5, 6),
])

const gardenPathSemantics = makeSemanticGraph(
  "garden-path",
  [
    { id: "older-people", label: "older people", type: "group", tokenIndexes: [0, 1] },
    { id: "staffing", label: "operating", type: "event", tokenIndexes: [2] },
    { id: "boats", label: "boats", type: "vehicle-group", tokenIndexes: [3, 4] },
  ],
  [
    ["operators", "older-people", "staffing", "agent", "operate"],
    ["operated", "staffing", "boats", "patient", "operate"],
  ],
)

const gerundConstituency = makePhrase("gerund-ambiguity", "s", "S", 0, 6, [
  makePhrase(
    "gerund-ambiguity",
    "activity-subject",
    "GerundP",
    0,
    2,
    [
      makePhrase("gerund-ambiguity", "visiting", "V-ing", 0, 1),
      makePhrase("gerund-ambiguity", "relatives-object", "NP", 1, 2),
    ],
    "the activity of visiting relatives",
  ),
  makePhrase("gerund-ambiguity", "predicate", "VP", 2, 5, [
    makePhrase("gerund-ambiguity", "modal", "Modal", 2, 3),
    makePhrase("gerund-ambiguity", "copula", "V", 3, 4),
    makePhrase("gerund-ambiguity", "annoying", "AdjP", 4, 5),
  ]),
  makePhrase("gerund-ambiguity", "punctuation", ".", 5, 6),
])

const gerundSemantics = makeSemanticGraph(
  "gerund-ambiguity",
  [
    { id: "visit", label: "visiting", type: "event", tokenIndexes: [0] },
    { id: "relatives", label: "relatives", type: "people", tokenIndexes: [1] },
    { id: "annoy", label: "potential annoyance", type: "property", tokenIndexes: [2, 3, 4] },
  ],
  [
    ["visit-object", "visit", "relatives", "patient", "visits"],
    ["activity-quality", "visit", "annoy", "possible-property", "can be"],
    ["people-quality", "relatives", "annoy", "possible-property", "can be"],
  ],
  {
    readings: Object.freeze([
      Object.freeze({ id: "activity", label: "the visit can annoy" }),
      Object.freeze({ id: "people", label: "relatives who visit can annoy" }),
    ]),
  },
)

const colorlessConstituency = makePhrase("colorless-green", "s", "S", 0, 6, [
  makePhrase("colorless-green", "subject", "NP", 0, 3, [
    makePhrase("colorless-green", "colorless", "Adj", 0, 1),
    makePhrase("colorless-green", "green", "Adj", 1, 2),
    makePhrase("colorless-green", "ideas", "N", 2, 3),
  ]),
  makePhrase("colorless-green", "predicate", "VP", 3, 5, [
    makePhrase("colorless-green", "sleep", "V", 3, 4),
    makePhrase("colorless-green", "furiously", "Adv", 4, 5),
  ]),
  makePhrase("colorless-green", "punctuation", ".", 5, 6),
])

const colorlessSemantics = makeSemanticGraph(
  "colorless-green",
  [
    { id: "ideas", label: "ideas", type: "abstract-entity", tokenIndexes: [2] },
    { id: "colorless", label: "without color", type: "property", tokenIndexes: [0] },
    { id: "green", label: "green", type: "property", tokenIndexes: [1] },
    { id: "sleep", label: "sleeping", type: "event", tokenIndexes: [3] },
    { id: "fury", label: "furiously", type: "manner", tokenIndexes: [4] },
    {
      id: "conflict",
      label: "semantic tension",
      type: "inference",
      tokenIndexes: [],
      inferred: true,
    },
  ],
  [
    ["without-color", "ideas", "colorless", "property", "are"],
    ["green-property", "ideas", "green", "property", "are"],
    ["sleeper", "ideas", "sleep", "agent", "sleep"],
    ["manner", "sleep", "fury", "manner", "how"],
    ["contradiction-a", "colorless", "conflict", "tension", "conflicts with"],
    ["contradiction-b", "green", "conflict", "tension", "conflicts with"],
  ],
  { plausibility: 0.04 },
)

const buffaloConstituency = makePhrase("buffalo", "s", "S", 0, 9, [
  makePhrase("buffalo", "subject-with-relative", "NP", 0, 5, [
    makePhrase("buffalo", "main-subject", "NP", 0, 2, [], "bison from Buffalo"),
    makePhrase("buffalo", "reduced-relative", "RelClause", 2, 5, [], "that Buffalo bison bully"),
  ]),
  makePhrase("buffalo", "predicate", "VP", 5, 8, [
    makePhrase("buffalo", "main-verb", "V", 5, 6, [], "bully"),
    makePhrase("buffalo", "main-object", "NP", 6, 8, [], "Buffalo bison"),
  ]),
  makePhrase("buffalo", "punctuation", ".", 8, 9),
])

const buffaloSemantics = makeSemanticGraph(
  "buffalo",
  [
    { id: "patient-herd", label: "Buffalo bison", type: "group", tokenIndexes: [0, 1] },
    { id: "relative-herd", label: "other Buffalo bison", type: "group", tokenIndexes: [2, 3] },
    { id: "relative-bullying", label: "bully", type: "event", tokenIndexes: [4] },
    { id: "main-bullying", label: "bully", type: "event", tokenIndexes: [5] },
    { id: "object-herd", label: "Buffalo bison", type: "group", tokenIndexes: [6, 7] },
  ],
  [
    ["relative-agent", "relative-herd", "relative-bullying", "agent", "bully"],
    ["relative-patient", "relative-bullying", "patient-herd", "patient", "bully"],
    ["main-agent", "patient-herd", "main-bullying", "agent", "bully"],
    ["main-patient", "main-bullying", "object-herd", "patient", "bully"],
  ],
)

const rhetoricConstituency = makePhrase("rhetorical-claim", "s", "S", 0, 17, [
  makePhrase("rhetorical-claim", "main-clause", "MainClause", 0, 5, [
    makePhrase("rhetorical-claim", "analyst", "NP", 0, 2),
    makePhrase("rhetorical-claim", "distrust", "VP", 2, 5),
  ]),
  makePhrase(
    "rhetorical-claim",
    "cause-clause",
    "CauseClause",
    5,
    10,
    [],
    "reason for the distrust",
  ),
  makePhrase("rhetorical-claim", "comma", ",", 10, 11),
  makePhrase(
    "rhetorical-claim",
    "concession-clause",
    "ConcessionClause",
    11,
    16,
    [],
    "a fact that might have supported trust",
  ),
  makePhrase("rhetorical-claim", "punctuation", ".", 16, 17),
])

const rhetoricSemantics = makeSemanticGraph(
  "rhetorical-claim",
  [
    { id: "analyst", label: "analyst", type: "person", tokenIndexes: [0, 1] },
    { id: "distrust", label: "distrust", type: "stance", tokenIndexes: [2] },
    { id: "result", label: "result", type: "claim", tokenIndexes: [3, 4] },
    { id: "sample", label: "sample", type: "evidence", tokenIndexes: [6, 7] },
    { id: "small", label: "small", type: "property", tokenIndexes: [8, 9] },
    { id: "effect", label: "effect", type: "finding", tokenIndexes: [12, 13] },
    { id: "dramatic", label: "dramatic appearance", type: "property", tokenIndexes: [14, 15] },
  ],
  [
    ["holder", "analyst", "distrust", "experiencer", "holds"],
    ["stance-target", "distrust", "result", "target", "toward"],
    ["sample-size", "sample", "small", "property", "is"],
    ["reason", "small", "distrust", "cause", "because"],
    ["appearance", "effect", "dramatic", "property", "appears"],
    ["counterweight", "dramatic", "distrust", "concession", "although"],
  ],
)

const rhetoricStructure = makeRhetoric(
  "rhetorical-claim",
  [
    {
      id: "whole",
      label: "Distrust despite a dramatic effect",
      role: "root",
      tokenStart: 0,
      tokenEnd: 16,
    },
    {
      id: "claim",
      label: "The analyst distrusted the result",
      role: "nucleus",
      tokenStart: 0,
      tokenEnd: 5,
    },
    {
      id: "cause",
      label: "because the sample was small",
      role: "satellite",
      relation: "cause",
      tokenStart: 5,
      tokenEnd: 10,
    },
    {
      id: "concession",
      label: "although the effect appeared dramatic",
      role: "satellite",
      relation: "concession",
      tokenStart: 11,
      tokenEnd: 16,
    },
  ],
  [
    ["whole-claim", "whole", "claim", "nucleus", "central claim"],
    ["cause-support", "cause", "claim", "cause", "reason"],
    ["concession-counter", "concession", "claim", "concession", "counterweight"],
  ],
  "whole",
)

export const SPECIMENS = Object.freeze([
  createSpecimen({
    id: "attachment-ambiguity",
    label: "Who has the telescope?",
    kind: "Attachment ambiguity",
    text: "I saw the man with the telescope.",
    source: {
      corpus: "grammar-lab",
      work: "Curated ambiguity specimen",
      location: "prepositional-phrase attachment",
    },
    subjects: ["ambiguity", "identity"],
    note: "Only one attachment changes: the prepositional phrase can describe the instrument of seeing or the man being seen.",
    challenge: "Does the telescope belong to the observer or to the man?",
    tokenSpecs: [
      ["I", "I", "PRON", "subject", 0, 1],
      ["saw", "see", "VERB", "predicate", 0, null],
      ["the", "the", "DET", "modifier", 2, 3],
      ["man", "man", "NOUN", "direct object", 0, 1],
      ["with", "with", "ADP", "attachment", 1, 1],
      ["the", "the", "DET", "modifier", 3, 6],
      ["telescope", "telescope", "NOUN", "prepositional object", 1, 4],
      [".", ".", "PUNCT", "punctuation", 0, 1],
    ],
    rootIndex: 1,
    constituency: attachmentConstituency,
    dependencySpecs: attachmentDependencySpecs,
    alternateParses: [
      {
        id: "instrument",
        label: "I used the telescope",
        interpretation: "The prepositional phrase modifies “saw”; the telescope is an instrument.",
        probability: 0.57,
        rootIndex: 1,
        edges: attachmentDependencySpecs,
      },
      {
        id: "possession",
        label: "The man had the telescope",
        interpretation:
          "The prepositional phrase modifies “man”; it identifies which man was seen.",
        probability: 0.43,
        rootIndex: 1,
        edges: [
          ["subject", 1, 0, "nsubj", "subject"],
          ["object", 1, 3, "obj", "object"],
          ["man-determiner", 3, 2, "det", "determiner"],
          [
            "possession-attachment",
            3,
            4,
            "nmod:with",
            "possessed description",
            0.43,
            "the telescope distinguishes the man",
          ],
          ["prepositional-object", 4, 6, "pobj", "object of with"],
          ["telescope-determiner", 6, 5, "det", "determiner"],
          ["punctuation", 1, 7, "punct", "punctuation"],
        ],
      },
    ],
    semantics: attachmentSemantics,
    variantSpecs: [
      {
        id: "followed",
        label: "Change the seeing event",
        text: "I followed the man with the telescope.",
        tokens: [
          ["I", "I", "PRON", "subject"],
          ["followed", "follow", "VERB", "predicate"],
          ["the", "the", "DET", "modifier"],
          ["man", "man", "NOUN", "direct object"],
          ["with", "with", "ADP", "attachment"],
          ["the", "the", "DET", "modifier"],
          ["telescope", "telescope", "NOUN", "prepositional object"],
          [".", ".", "PUNCT", "punctuation"],
        ],
        alignments: { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7 },
      },
      {
        id: "woman-near",
        label: "Rewrite two content words",
        text: "I saw the woman near the telescope.",
        tokens: [
          ["I", "I", "PRON", "subject"],
          ["saw", "see", "VERB", "predicate"],
          ["the", "the", "DET", "modifier"],
          ["woman", "woman", "NOUN", "direct object"],
          ["near", "near", "ADP", "attachment"],
          ["the", "the", "DET", "modifier"],
          ["telescope", "telescope", "NOUN", "prepositional object"],
          [".", ".", "PUNCT", "punctuation"],
        ],
        alignments: { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7 },
      },
    ],
  }),
  createSpecimen({
    id: "garden-path",
    label: "The verb hiding in plain sight",
    kind: "Garden path",
    text: "The old man the boats.",
    source: {
      corpus: "grammar-lab",
      work: "Curated garden-path specimen",
      location: "lexical-category reanalysis",
    },
    subjects: ["ambiguity", "identity"],
    note: "Readers commonly group “old man” as a noun phrase, then must recategorize old as a noun and man as a verb.",
    challenge: "Which word becomes the verb after the sentence forces a reanalysis?",
    tokenSpecs: [
      ["The", "the", "DET", "determiner", 1, 1],
      ["old", "old", "NOUN", "subject head", 0, 2],
      ["man", "man", "VERB", "predicate", 0, null],
      ["the", "the", "DET", "modifier", 2, 4],
      ["boats", "boat", "NOUN", "direct object", 0, 2],
      [".", ".", "PUNCT", "punctuation", 0, 2],
    ],
    rootIndex: 2,
    constituency: gardenPathConstituency,
    dependencySpecs: [
      ["subject", 2, 1, "nsubj", "subject"],
      ["old-determiner", 1, 0, "det", "determiner"],
      ["object", 2, 4, "obj", "object"],
      ["boats-determiner", 4, 3, "det", "determiner"],
      ["punctuation", 2, 5, "punct", "punctuation"],
    ],
    alternateParses: [
      {
        id: "resolved",
        label: "Older people operate the boats",
        interpretation: "Old is the subject noun and man is the finite verb.",
        probability: 1,
        rootIndex: 2,
        edges: [
          ["subject", 2, 1, "nsubj", "subject"],
          ["old-determiner", 1, 0, "det", "determiner"],
          ["object", 2, 4, "obj", "object"],
          ["boats-determiner", 4, 3, "det", "determiner"],
          ["punctuation", 2, 5, "punct", "punctuation"],
        ],
      },
      {
        id: "temporary",
        label: "The old man …",
        interpretation:
          "The temporary parse treats old as an adjective and man as a noun, leaving “the boats” unattached.",
        probability: 0,
        rootIndex: 2,
        edges: [
          ["expected-determiner", 2, 0, "det", "expected determiner"],
          ["expected-modifier", 2, 1, "amod", "expected adjective"],
          ["reanalysis-trigger", 2, 4, "reanalysis", "forces reanalysis"],
          ["boats-determiner", 4, 3, "det", "determiner"],
          ["punctuation", 2, 5, "punct", "punctuation"],
        ],
      },
    ],
    semantics: gardenPathSemantics,
    lexicalAlternatives: [
      {
        tokenId: "garden-path:t1",
        analyses: [
          { partOfSpeech: "ADJ", label: "old as a modifier", stage: "temporary" },
          { partOfSpeech: "NOUN", label: "old people", stage: "resolved" },
        ],
      },
      {
        tokenId: "garden-path:t2",
        analyses: [
          { partOfSpeech: "NOUN", label: "an older man", stage: "temporary" },
          { partOfSpeech: "VERB", label: "staff or operate", stage: "resolved" },
        ],
      },
    ],
    variantSpecs: [
      {
        id: "explicit",
        label: "Make the lexical categories explicit",
        text: "The elderly people staff the boats.",
        tokens: [
          ["The", "the", "DET", "determiner"],
          ["elderly", "elderly", "ADJ", "modifier"],
          ["people", "person", "NOUN", "subject"],
          ["staff", "staff", "VERB", "predicate"],
          ["the", "the", "DET", "modifier"],
          ["boats", "boat", "NOUN", "direct object"],
          [".", ".", "PUNCT", "punctuation"],
        ],
        alignments: { 0: 0, 1: 1, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 },
      },
    ],
  }),
  createSpecimen({
    id: "gerund-ambiguity",
    label: "An activity or some people?",
    kind: "Gerund ambiguity",
    text: "Visiting relatives can be annoying.",
    source: {
      corpus: "grammar-lab",
      work: "Curated gerund specimen",
      location: "gerund-participle ambiguity",
    },
    subjects: ["ambiguity", "identity"],
    note: "Visiting can head an activity phrase or modify relatives; the same words describe an annoying visit or annoying visitors.",
    challenge: "What is annoying: the visit, or the relatives who visit?",
    tokenSpecs: [
      ["Visiting", "visit", "VERB", "gerund head", 0, 4],
      ["relatives", "relative", "NOUN", "gerund object", 1, 0],
      ["can", "can", "AUX", "modal", 1, 4],
      ["be", "be", "AUX", "copula", 0, 4],
      ["annoying", "annoying", "ADJ", "predicate complement", 0, null],
      [".", ".", "PUNCT", "punctuation", 0, 4],
    ],
    rootIndex: 4,
    constituency: gerundConstituency,
    dependencySpecs: [
      ["activity-subject", 4, 0, "csubj", "activity as subject", 0.54],
      ["visit-object", 0, 1, "obj", "object of visiting"],
      ["modal", 4, 2, "aux", "modal"],
      ["copula", 4, 3, "cop", "copula"],
      ["punctuation", 4, 5, "punct", "punctuation"],
    ],
    alternateParses: [
      {
        id: "activity",
        label: "The visit can be annoying",
        interpretation: "Visiting relatives is a gerund phrase naming an activity.",
        probability: 0.54,
        rootIndex: 4,
        edges: [
          ["activity-subject", 4, 0, "csubj", "activity as subject", 0.54],
          ["visit-object", 0, 1, "obj", "object of visiting"],
          ["modal", 4, 2, "aux", "modal"],
          ["copula", 4, 3, "cop", "copula"],
          ["punctuation", 4, 5, "punct", "punctuation"],
        ],
      },
      {
        id: "people",
        label: "The relatives can be annoying",
        interpretation: "Visiting modifies relatives: they are relatives who visit.",
        probability: 0.46,
        rootIndex: 4,
        edges: [
          ["people-subject", 4, 1, "nsubj", "people as subject", 0.46],
          ["visitor-modifier", 1, 0, "acl", "relatives who visit"],
          ["modal", 4, 2, "aux", "modal"],
          ["copula", 4, 3, "cop", "copula"],
          ["punctuation", 4, 5, "punct", "punctuation"],
        ],
      },
    ],
    semantics: gerundSemantics,
    lexicalAlternatives: [
      {
        tokenId: "gerund-ambiguity:t0",
        analyses: [
          { partOfSpeech: "VERB", label: "gerund naming an activity" },
          { partOfSpeech: "VERB", label: "participial modifier of relatives" },
        ],
      },
    ],
    variantSpecs: [
      {
        id: "activity",
        label: "Resolve toward the activity",
        text: "To visit relatives can be annoying.",
        tokens: [
          ["To", "to", "PART", "infinitive marker"],
          ["visit", "visit", "VERB", "subject head"],
          ["relatives", "relative", "NOUN", "object"],
          ["can", "can", "AUX", "modal"],
          ["be", "be", "AUX", "copula"],
          ["annoying", "annoying", "ADJ", "predicate complement"],
          [".", ".", "PUNCT", "punctuation"],
        ],
        alignments: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 },
      },
      {
        id: "people",
        label: "Resolve toward the people",
        text: "Relatives who visit can be annoying.",
        tokens: [
          ["Relatives", "relative", "NOUN", "subject"],
          ["who", "who", "PRON", "relative pronoun"],
          ["visit", "visit", "VERB", "relative clause"],
          ["can", "can", "AUX", "modal"],
          ["be", "be", "AUX", "copula"],
          ["annoying", "annoying", "ADJ", "predicate complement"],
          [".", ".", "PUNCT", "punctuation"],
        ],
        alignments: { 0: 1, 2: 0, 3: 2, 4: 3, 5: 4, 6: 5 },
      },
    ],
  }),
  createSpecimen({
    id: "colorless-green",
    label: "Grammar without ordinary sense",
    kind: "Semantic anomaly",
    text: "Colorless green ideas sleep furiously.",
    source: {
      corpus: "grammar-lab",
      work: "Syntactic Structures",
      author: "Noam Chomsky",
      location: "famous grammaticality example",
    },
    subjects: ["nature", "ambiguity"],
    note: "The syntax is ordinary and complete even though the concepts resist a plausible literal interpretation.",
    challenge: "Can a structure be grammatical while its claim is implausible?",
    tokenSpecs: [
      ["Colorless", "colorless", "ADJ", "modifier", 2, 2],
      ["green", "green", "ADJ", "modifier", 1, 2],
      ["ideas", "idea", "NOUN", "subject", 0, 3],
      ["sleep", "sleep", "VERB", "predicate", 0, null],
      ["furiously", "furiously", "ADV", "manner", 1, 3],
      [".", ".", "PUNCT", "punctuation", 0, 3],
    ],
    rootIndex: 3,
    constituency: colorlessConstituency,
    dependencySpecs: [
      ["subject", 3, 2, "nsubj", "subject"],
      ["colorless-modifier", 2, 0, "amod", "adjective"],
      ["green-modifier", 2, 1, "amod", "adjective"],
      ["manner", 3, 4, "advmod", "manner"],
      ["punctuation", 3, 5, "punct", "punctuation"],
    ],
    semantics: colorlessSemantics,
    variantSpecs: [
      {
        id: "plausible",
        label: "Keep the grammar; change the claim",
        text: "Restless green birds sleep fitfully.",
        tokens: [
          ["Restless", "restless", "ADJ", "modifier"],
          ["green", "green", "ADJ", "modifier"],
          ["birds", "bird", "NOUN", "subject"],
          ["sleep", "sleep", "VERB", "predicate"],
          ["fitfully", "fitfully", "ADV", "manner"],
          [".", ".", "PUNCT", "punctuation"],
        ],
        alignments: { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 },
      },
    ],
  }),
  createSpecimen({
    id: "buffalo",
    label: "Buffalo mode",
    kind: "Lexical-category boss level",
    text: "Buffalo buffalo Buffalo buffalo buffalo buffalo Buffalo buffalo.",
    source: {
      corpus: "grammar-lab",
      work: "Popular linguistic example",
      location: "homonym and reduced-relative demonstration",
    },
    subjects: ["power", "identity", "ambiguity"],
    note: "Capitalization, position, and structure make the same surface form serve as a place modifier, a bison noun, and a bullying verb.",
    challenge: "Find the two bullying events hidden among eight copies of one word.",
    tokenSpecs: [
      ["Buffalo", "Buffalo", "PROPN", "place modifier", 2, 1],
      ["buffalo", "buffalo", "NOUN", "main subject", 0, 5],
      ["Buffalo", "Buffalo", "PROPN", "place modifier", 3, 3],
      ["buffalo", "buffalo", "NOUN", "relative-clause subject", 1, 4],
      ["buffalo", "buffalo", "VERB", "relative-clause predicate", 1, 1],
      ["buffalo", "buffalo", "VERB", "main predicate", 0, null],
      ["Buffalo", "Buffalo", "PROPN", "place modifier", 2, 7],
      ["buffalo", "buffalo", "NOUN", "direct object", 0, 5],
      [".", ".", "PUNCT", "punctuation", 0, 5],
    ],
    rootIndex: 5,
    constituency: buffaloConstituency,
    dependencySpecs: [
      ["subject-place", 1, 0, "compound", "from Buffalo"],
      ["main-subject", 5, 1, "nsubj", "subject"],
      ["relative-subject-place", 3, 2, "compound", "from Buffalo"],
      ["relative-subject", 4, 3, "nsubj", "relative subject"],
      ["relative-clause", 1, 4, "acl:relcl", "that are bullied"],
      ["main-object", 5, 7, "obj", "object"],
      ["object-place", 7, 6, "compound", "from Buffalo"],
      ["punctuation", 5, 8, "punct", "punctuation"],
    ],
    semantics: buffaloSemantics,
    lexicalAlternatives: [
      {
        tokenId: "buffalo:t0",
        surface: "Buffalo",
        analyses: [
          { partOfSpeech: "PROPN", label: "the city used as a modifier", indexes: [0, 2, 6] },
          { partOfSpeech: "NOUN", label: "bison", indexes: [1, 3, 7] },
          { partOfSpeech: "VERB", label: "to bully", indexes: [4, 5] },
        ],
      },
    ],
    variantSpecs: [
      {
        id: "gloss",
        label: "Expand the hidden relative clause",
        text: "Buffalo bison that Buffalo bison bully bully Buffalo bison.",
        tokens: [
          ["Buffalo", "Buffalo", "PROPN", "place modifier"],
          ["bison", "bison", "NOUN", "main subject"],
          ["that", "that", "PRON", "relative pronoun"],
          ["Buffalo", "Buffalo", "PROPN", "place modifier"],
          ["bison", "bison", "NOUN", "relative subject"],
          ["bully", "bully", "VERB", "relative predicate"],
          ["bully", "bully", "VERB", "main predicate"],
          ["Buffalo", "Buffalo", "PROPN", "place modifier"],
          ["bison", "bison", "NOUN", "direct object"],
          [".", ".", "PUNCT", "punctuation"],
        ],
        alignments: { 0: 0, 1: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8 },
      },
    ],
  }),
  createSpecimen({
    id: "rhetorical-claim",
    label: "Evidence, claim, and concession",
    kind: "Rhetorical structure",
    text: "The analyst distrusted the result because the sample was small, although the effect appeared dramatic.",
    source: {
      corpus: "grammar-lab",
      work: "Semiotic demonstration passage",
      author: "Semiotic",
      location: "authored rhetorical specimen",
    },
    subjects: ["power", "rhetoric"],
    note: "The cause supports the central distrust claim; the concession acknowledges evidence that points in the other direction.",
    challenge: "Which span is the claim, which gives its reason, and which pushes back?",
    tokenSpecs: [
      ["The", "the", "DET", "modifier", 2, 1],
      ["analyst", "analyst", "NOUN", "subject", 0, 2],
      ["distrusted", "distrust", "VERB", "main predicate", 0, null],
      ["the", "the", "DET", "modifier", 2, 4],
      ["result", "result", "NOUN", "direct object", 0, 2],
      ["because", "because", "SCONJ", "cause marker", 2, 9],
      ["the", "the", "DET", "modifier", 3, 7],
      ["sample", "sample", "NOUN", "cause subject", 1, 9],
      ["was", "be", "AUX", "copula", 2, 9],
      ["small", "small", "ADJ", "cause predicate", 1, 2],
      [",", ",", "PUNCT", "punctuation", 0, 2],
      ["although", "although", "SCONJ", "concession marker", 2, 14],
      ["the", "the", "DET", "modifier", 3, 13],
      ["effect", "effect", "NOUN", "concession subject", 1, 14],
      ["appeared", "appear", "VERB", "concession predicate", 1, 2],
      ["dramatic", "dramatic", "ADJ", "predicate complement", 2, 14],
      [".", ".", "PUNCT", "punctuation", 0, 2],
    ],
    rootIndex: 2,
    constituency: rhetoricConstituency,
    dependencySpecs: [
      ["main-subject", 2, 1, "nsubj", "subject"],
      ["analyst-determiner", 1, 0, "det", "determiner"],
      ["main-object", 2, 4, "obj", "object"],
      ["result-determiner", 4, 3, "det", "determiner"],
      ["cause", 2, 9, "advcl:cause", "because"],
      ["cause-marker", 9, 5, "mark", "cause marker"],
      ["cause-subject", 9, 7, "nsubj", "cause subject"],
      ["sample-determiner", 7, 6, "det", "determiner"],
      ["cause-copula", 9, 8, "cop", "copula"],
      ["concession", 2, 14, "advcl:concession", "although"],
      ["concession-marker", 14, 11, "mark", "concession marker"],
      ["effect-subject", 14, 13, "nsubj", "concession subject"],
      ["effect-determiner", 13, 12, "det", "determiner"],
      ["dramatic-complement", 14, 15, "xcomp", "appears"],
      ["comma", 2, 10, "punct", "comma"],
      ["punctuation", 2, 16, "punct", "punctuation"],
    ],
    semantics: rhetoricSemantics,
    rhetoric: rhetoricStructure,
    variantSpecs: [
      {
        id: "concession-first",
        label: "Move the concession first",
        kind: "reordering",
        text: "Although the effect appeared dramatic, the analyst distrusted the result because the sample was small.",
        tokens: [
          ["Although", "although", "SCONJ", "concession marker"],
          ["the", "the", "DET", "modifier"],
          ["effect", "effect", "NOUN", "concession subject"],
          ["appeared", "appear", "VERB", "concession predicate"],
          ["dramatic", "dramatic", "ADJ", "predicate complement"],
          [",", ",", "PUNCT", "punctuation"],
          ["the", "the", "DET", "modifier"],
          ["analyst", "analyst", "NOUN", "subject"],
          ["distrusted", "distrust", "VERB", "main predicate"],
          ["the", "the", "DET", "modifier"],
          ["result", "result", "NOUN", "direct object"],
          ["because", "because", "SCONJ", "cause marker"],
          ["the", "the", "DET", "modifier"],
          ["sample", "sample", "NOUN", "cause subject"],
          ["was", "be", "AUX", "copula"],
          ["small", "small", "ADJ", "cause predicate"],
          [".", ".", "PUNCT", "punctuation"],
        ],
        alignments: {
          0: 11,
          1: 12,
          2: 13,
          3: 14,
          4: 15,
          5: 10,
          6: 0,
          7: 1,
          8: 2,
          9: 3,
          10: 4,
          11: 5,
          12: 6,
          13: 7,
          14: 8,
          15: 9,
          16: 16,
        },
      },
    ],
  }),
])

export const SPECIMEN_BY_ID = Object.freeze(
  Object.fromEntries(SPECIMENS.map((specimen) => [specimen.id, specimen])),
)

export function getSpecimen(id) {
  return SPECIMEN_BY_ID[id] || null
}

function normalizeWord(value) {
  return String(value).toLocaleLowerCase("en-US").replaceAll("’", "'")
}

const REWRITE_LEMMAS = Object.freeze({
  followed: "follow",
  noticed: "notice",
  remembered: "remember",
  woman: "woman",
  astronomer: "astronomer",
  traveler: "traveler",
  notebook: "notebook",
  camera: "camera",
  lantern: "lantern",
  young: "young",
  tired: "tired",
  quiet: "quiet",
  ferries: "ferry",
  skiffs: "skiff",
  vessels: "vessel",
  friends: "friend",
  scholars: "scholar",
  neighbors: "neighbor",
  dreams: "dream",
  theories: "theory",
  rumors: "rumor",
  editor: "editor",
  reviewer: "reviewer",
  scientist: "scientist",
  different: "different",
  unexpected: "unexpected",
})

export function effectiveLemmaForRewrite(replacement, authoredToken) {
  const words = tokenizeCorpusText(String(replacement || ""), "rewrite-lemma")
  if (!words.length) return authoredToken?.lemma || ""
  if (words.length > 1) return words.map((word) => word.normalized).join(" ")
  const normalized = words[0].normalized
  if (normalized === normalizeWord(authoredToken?.text || "")) {
    return authoredToken?.lemma || normalized
  }
  if (REWRITE_LEMMAS[normalized]) return REWRITE_LEMMAS[normalized]
  if (normalized.endsWith("ies") && normalized.length > 4) return `${normalized.slice(0, -3)}y`
  if (normalized.endsWith("ing") && normalized.length > 5) {
    const stem = normalized.slice(0, -3)
    return stem.at(-1) === stem.at(-2) ? stem.slice(0, -1) : stem
  }
  if (normalized.endsWith("ed") && normalized.length > 4) return normalized.slice(0, -2)
  if (normalized.endsWith("s") && !normalized.endsWith("ss") && normalized.length > 3) {
    return normalized.slice(0, -1)
  }
  return normalized
}

/** Apply local rewrites without changing the authored token/source identity. */
export function applyTokenRewrites(tokens, rewrites = {}) {
  return tokens.map((token) => {
    const replacement = rewrites[token.id]?.trim()
    const rewritten = Boolean(replacement && replacement !== token.text)
    const text = rewritten ? replacement : token.text
    const effectiveLemma = rewritten
      ? effectiveLemmaForRewrite(text, token)
      : token.lemma || normalizeWord(token.text)
    return {
      ...token,
      id: token.id,
      sourceTokenId: token.sourceTokenId || token.id,
      authoredText: token.authoredText || token.text,
      authoredLemma: token.authoredLemma || token.lemma,
      text,
      lemma: effectiveLemma,
      effectiveLemma,
      pathQuery: effectiveLemma,
      rewritten,
    }
  })
}

export function tokenizeCorpusText(text, namespace = "corpus") {
  return Object.freeze(
    [...String(text).matchAll(WORD_ONLY)].map((match, index) =>
      Object.freeze({
        id: `${namespace}:word:${index}`,
        index,
        text: match[0],
        normalized: normalizeWord(match[0]),
        characterStart: match.index,
        characterEnd: match.index + match[0].length,
      }),
    ),
  )
}

function makeCorpusSentence(id, text, corpus, subjects, source = {}) {
  return Object.freeze({
    id,
    text,
    corpus,
    subjects: Object.freeze(subjects),
    source: Object.freeze({ corpus, ...source }),
    tokens: tokenizeCorpusText(text, id),
  })
}

const specimenCorpusSentences = SPECIMENS.map((specimen) =>
  makeCorpusSentence(
    `specimen:${specimen.id}`,
    specimen.text,
    specimen.source.corpus,
    specimen.subjects,
    { ...specimen.source, specimenId: specimen.id },
  ),
)

const shakespeareSentences = [
  makeCorpusSentence(
    "shakespeare:romeo-and-juliet:1-1:love-smoke",
    "Love is a smoke made with the fume of sighs.",
    "shakespeare",
    ["love"],
    { author: "William Shakespeare", work: "Romeo and Juliet", location: "1.1" },
  ),
  makeCorpusSentence(
    "shakespeare:midsummer:1-1:true-love",
    "The course of true love never did run smooth.",
    "shakespeare",
    ["love", "time"],
    { author: "William Shakespeare", work: "A Midsummer Night's Dream", location: "1.1" },
  ),
  makeCorpusSentence(
    "shakespeare:twelfth-night:1-1:food-of-love",
    "If music be the food of love, play on.",
    "shakespeare",
    ["love"],
    { author: "William Shakespeare", work: "Twelfth Night", location: "1.1" },
  ),
  makeCorpusSentence(
    "shakespeare:alls-well:1-1:love-all",
    "Love all, trust a few, do wrong to none.",
    "shakespeare",
    ["love", "power"],
    { author: "William Shakespeare", work: "All's Well That Ends Well", location: "1.1" },
  ),
  makeCorpusSentence(
    "shakespeare:julius-caesar:2-2:cowards",
    "Cowards die many times before their deaths.",
    "shakespeare",
    ["death", "time"],
    { author: "William Shakespeare", work: "Julius Caesar", location: "2.2" },
  ),
  makeCorpusSentence(
    "shakespeare:julius-caesar:4-3:tide",
    "There is a tide in the affairs of men.",
    "shakespeare",
    ["nature", "time", "power"],
    { author: "William Shakespeare", work: "Julius Caesar", location: "4.3" },
  ),
  makeCorpusSentence(
    "shakespeare:tempest:4-1:stuff-of-dreams",
    "We are such stuff as dreams are made on.",
    "shakespeare",
    ["identity", "nature"],
    { author: "William Shakespeare", work: "The Tempest", location: "4.1" },
  ),
  makeCorpusSentence(
    "shakespeare:as-you-like-it:3-2:time-travels",
    "Time travels in divers paces with divers persons.",
    "shakespeare",
    ["time", "identity"],
    { author: "William Shakespeare", work: "As You Like It", location: "3.2" },
  ),
  makeCorpusSentence(
    "shakespeare:twelfth-night:2-5:greatness",
    "Some are born great, some achieve greatness, and some have greatness thrust upon them.",
    "shakespeare",
    ["power", "identity"],
    { author: "William Shakespeare", work: "Twelfth Night", location: "2.5" },
  ),
  makeCorpusSentence(
    "shakespeare:henry-iv-2:3-1:uneasy-crown",
    "Uneasy lies the head that wears a crown.",
    "shakespeare",
    ["power"],
    { author: "William Shakespeare", work: "Henry IV, Part 2", location: "3.1" },
  ),
  makeCorpusSentence(
    "shakespeare:tempest:2-1:prologue",
    "What's past is prologue.",
    "shakespeare",
    ["time"],
    { author: "William Shakespeare", work: "The Tempest", location: "2.1" },
  ),
  makeCorpusSentence(
    "shakespeare:henry-iv-1:5-4:discretion",
    "The better part of valour is discretion.",
    "shakespeare",
    ["power", "identity"],
    { author: "William Shakespeare", work: "Henry IV, Part 1", location: "5.4" },
  ),
  makeCorpusSentence(
    "shakespeare:as-you-like-it:2-7:stage",
    "All the world's a stage, and all the men and women merely players.",
    "shakespeare",
    ["identity", "time"],
    { author: "William Shakespeare", work: "As You Like It", location: "2.7" },
  ),
  makeCorpusSentence(
    "shakespeare:hamlet:1-3:borrower",
    "Neither a borrower nor a lender be.",
    "shakespeare",
    ["power", "identity"],
    { author: "William Shakespeare", work: "Hamlet", location: "1.3" },
  ),
  makeCorpusSentence(
    "shakespeare:hamlet:1-3:true-self",
    "To thine own self be true.",
    "shakespeare",
    ["identity"],
    { author: "William Shakespeare", work: "Hamlet", location: "1.3" },
  ),
  makeCorpusSentence(
    "shakespeare:hamlet:2-2:brevity",
    "Brevity is the soul of wit.",
    "shakespeare",
    ["identity", "power"],
    { author: "William Shakespeare", work: "Hamlet", location: "2.2" },
  ),
  makeCorpusSentence(
    "shakespeare:hamlet:3-2:protest",
    "The lady doth protest too much, methinks.",
    "shakespeare",
    ["power", "identity"],
    { author: "William Shakespeare", work: "Hamlet", location: "3.2" },
  ),
  makeCorpusSentence(
    "shakespeare:hamlet:4-5:what-we-may-be",
    "We know what we are, but know not what we may be.",
    "shakespeare",
    ["identity", "time"],
    { author: "William Shakespeare", work: "Hamlet", location: "4.5" },
  ),
  makeCorpusSentence(
    "shakespeare:measure-for-measure:1-4:doubts",
    "Our doubts are traitors, and make us lose the good we oft might win, by fearing to attempt.",
    "shakespeare",
    ["power", "identity"],
    { author: "William Shakespeare", work: "Measure for Measure", location: "1.4" },
  ),
  makeCorpusSentence(
    "shakespeare:julius-caesar:1-2:fault",
    "The fault, dear Brutus, is not in our stars, but in ourselves.",
    "shakespeare",
    ["identity", "nature", "power"],
    { author: "William Shakespeare", work: "Julius Caesar", location: "1.2" },
  ),
  makeCorpusSentence(
    "shakespeare:midsummer:1-1:love-looks",
    "Love looks not with the eyes, but with the mind, and therefore is winged Cupid painted blind.",
    "shakespeare",
    ["love"],
    { author: "William Shakespeare", work: "A Midsummer Night's Dream", location: "1.1" },
  ),
  makeCorpusSentence(
    "shakespeare:as-you-like-it:3-5:first-sight",
    "Who ever loved that loved not at first sight?",
    "shakespeare",
    ["love"],
    { author: "William Shakespeare", work: "As You Like It", location: "3.5" },
  ),
  makeCorpusSentence(
    "shakespeare:as-you-like-it:2-4:folly",
    "If thou remember'st not the slightest folly that ever love did make thee run into, thou hast not loved.",
    "shakespeare",
    ["love"],
    { author: "William Shakespeare", work: "As You Like It", location: "2.4" },
  ),
  makeCorpusSentence(
    "shakespeare:as-you-like-it:3-2:madness",
    "Love is merely a madness.",
    "shakespeare",
    ["love"],
    { author: "William Shakespeare", work: "As You Like It", location: "3.2" },
  ),
  makeCorpusSentence(
    "shakespeare:as-you-like-it:4-1:not-for-love",
    "Men have died from time to time, and worms have eaten them, but not for love.",
    "shakespeare",
    ["love", "death", "time"],
    { author: "William Shakespeare", work: "As You Like It", location: "4.1" },
  ),
  makeCorpusSentence(
    "shakespeare:twelfth-night:3-1:love-sought",
    "Love sought is good, but given unsought is better.",
    "shakespeare",
    ["love"],
    { author: "William Shakespeare", work: "Twelfth Night", location: "3.1" },
  ),
  makeCorpusSentence(
    "shakespeare:twelfth-night:2-3:lovers-meeting",
    "Journeys end in lovers meeting.",
    "shakespeare",
    ["love", "time"],
    { author: "William Shakespeare", work: "Twelfth Night", location: "2.3" },
  ),
  makeCorpusSentence(
    "shakespeare:twelfth-night:2-4:never-told",
    "She never told her love, but let concealment, like a worm in the bud, feed on her damask cheek.",
    "shakespeare",
    ["love"],
    { author: "William Shakespeare", work: "Twelfth Night", location: "2.4" },
  ),
  makeCorpusSentence(
    "shakespeare:much-ado:4-1:love-nothing",
    "I do love nothing in the world so well as you.",
    "shakespeare",
    ["love"],
    { author: "William Shakespeare", work: "Much Ado About Nothing", location: "4.1" },
  ),
  makeCorpusSentence(
    "shakespeare:much-ado:2-1:speak-love",
    "Speak low, if you speak love.",
    "shakespeare",
    ["love"],
    { author: "William Shakespeare", work: "Much Ado About Nothing", location: "2.1" },
  ),
  makeCorpusSentence(
    "shakespeare:midsummer:1-1:transpose",
    "Things base and vile, holding no quantity, love can transpose to form and dignity.",
    "shakespeare",
    ["love", "identity"],
    { author: "William Shakespeare", work: "A Midsummer Night's Dream", location: "1.1" },
  ),
  makeCorpusSentence(
    "shakespeare:merchant:2-6:love-blind",
    "But love is blind, and lovers cannot see the pretty follies that themselves commit.",
    "shakespeare",
    ["love"],
    { author: "William Shakespeare", work: "The Merchant of Venice", location: "2.6" },
  ),
  makeCorpusSentence(
    "shakespeare:sonnet-116:love-is-not-love",
    "Love is not love which alters when it alteration finds.",
    "shakespeare",
    ["love", "time"],
    { author: "William Shakespeare", work: "Sonnet 116", location: "line 2" },
  ),
  makeCorpusSentence(
    "shakespeare:hamlet:2-2:never-doubt",
    "Doubt thou the stars are fire, doubt that the sun doth move, doubt truth to be a liar, but never doubt I love.",
    "shakespeare",
    ["love", "nature"],
    { author: "William Shakespeare", work: "Hamlet", location: "2.2" },
  ),
  makeCorpusSentence(
    "shakespeare:romeo-and-juliet:2-2:bounty",
    "My bounty is as boundless as the sea, my love as deep.",
    "shakespeare",
    ["love", "nature"],
    { author: "William Shakespeare", work: "Romeo and Juliet", location: "2.2" },
  ),
  makeCorpusSentence(
    "shakespeare:henry-v:5-2:love-directly",
    "I know no ways to mince it in love, but directly to say, I love you.",
    "shakespeare",
    ["love"],
    { author: "William Shakespeare", work: "Henry V", location: "5.2" },
  ),
]

const fictionSentences = [
  makeCorpusSentence(
    "fiction:austen:pride-and-prejudice:opening",
    "It is a truth universally acknowledged that a single man in possession of a good fortune must be in want of a wife.",
    "nineteenth-century-fiction",
    ["love", "power"],
    { author: "Jane Austen", work: "Pride and Prejudice", location: "chapter 1" },
  ),
  makeCorpusSentence(
    "fiction:bronte:jane-eyre:walk",
    "There was no possibility of taking a walk that day.",
    "nineteenth-century-fiction",
    ["nature", "time"],
    { author: "Charlotte Brontë", work: "Jane Eyre", location: "chapter 1" },
  ),
  makeCorpusSentence(
    "fiction:melville:moby-dick:call-me",
    "Call me Ishmael.",
    "nineteenth-century-fiction",
    ["identity", "nature"],
    { author: "Herman Melville", work: "Moby-Dick", location: "chapter 1" },
  ),
  makeCorpusSentence(
    "fiction:dickens:tale-of-two-cities:opening",
    "It was the best of times, it was the worst of times.",
    "nineteenth-century-fiction",
    ["time", "power"],
    { author: "Charles Dickens", work: "A Tale of Two Cities", location: "book 1, chapter 1" },
  ),
  makeCorpusSentence(
    "fiction:dickens:david-copperfield:hero",
    "Whether I shall turn out to be the hero of my own life, or whether that station will be held by anybody else, these pages must show.",
    "nineteenth-century-fiction",
    ["identity", "power"],
    { author: "Charles Dickens", work: "David Copperfield", location: "chapter 1" },
  ),
  makeCorpusSentence(
    "fiction:shelley:frankenstein:rejoice",
    "You will rejoice to hear that no disaster has accompanied the commencement of an enterprise which you have regarded with such evil forebodings.",
    "nineteenth-century-fiction",
    ["nature", "power"],
    { author: "Mary Shelley", work: "Frankenstein", location: "letter 1" },
  ),
  makeCorpusSentence(
    "fiction:bronte:jane-eyre:no-bird",
    "I am no bird, and no net ensnares me; I am a free human being with an independent will.",
    "nineteenth-century-fiction",
    ["identity", "power", "nature"],
    { author: "Charlotte Brontë", work: "Jane Eyre", location: "chapter 23" },
  ),
  makeCorpusSentence(
    "fiction:bronte:wuthering-heights:souls",
    "Whatever our souls are made of, his and mine are the same.",
    "nineteenth-century-fiction",
    ["love", "identity"],
    { author: "Emily Brontë", work: "Wuthering Heights", location: "chapter 9" },
  ),
]

const demonstrationSentences = [
  ["i-saw-moon", "I saw the moon through the branches.", ["nature"]],
  ["i-saw-harbor", "I saw the harbor after rain.", ["nature", "time"]],
  ["i-saw-power", "I saw the shape of power in the empty chair.", ["power"]],
  ["i-saw-argument", "I saw the old argument become new.", ["time", "identity"]],
  ["love-and-time", "Love and time test every promise.", ["love", "time"]],
  ["power-and-fear", "Power and fear can govern a room.", ["power"]],
  ["nature-and-memory", "Nature and memory return in spring.", ["nature", "time"]],
  ["death-and-time", "Death and time share no calendar.", ["death", "time"]],
  ["identity-and-power", "Identity and power shape the story.", ["identity", "power"]],
  ["love-or-duty", "Love or duty can direct the choice.", ["love", "power"]],
  ["power-or-mercy", "Power or mercy decides the ending.", ["power"]],
  ["language-of-love", "The language of love changes with time.", ["love", "time"]],
  ["shadow-of-death", "The shadow of death crossed the valley.", ["death", "nature"]],
  ["memory-is-identity", "Memory is identity in another tense.", ["identity", "time"]],
  ["love-is-time", "Love is time made visible.", ["love", "time"]],
  ["fear-becomes-power", "Fear becomes power when no one speaks.", ["power"]],
  ["stranger-becomes-family", "A stranger becomes family through care.", ["love", "identity"]],
  ["power-versus-love", "Power versus love is a familiar argument.", ["power", "love"]],
].map(([id, text, subjects]) =>
  makeCorpusSentence(`demonstration:${id}`, text, "demonstration", subjects, {
    author: "Semiotic",
    work: "Authored demonstration corpus",
  }),
)

export const CORPUS_SENTENCES = Object.freeze([
  ...specimenCorpusSentences,
  ...shakespeareSentences,
  ...fictionSentences,
  ...demonstrationSentences,
])

export const CORPUS_SENTENCE_BY_ID = Object.freeze(
  Object.fromEntries(CORPUS_SENTENCES.map((sentence) => [sentence.id, sentence])),
)

export function filterCorpusSentences({
  corpus = "all",
  subject = "all",
  amount = CORPUS_SENTENCES.length,
  sentences = CORPUS_SENTENCES,
} = {}) {
  const safeAmount = Math.max(
    0,
    Number.isFinite(Number(amount)) ? Number(amount) : sentences.length,
  )
  return sentences
    .filter((sentence) => corpus === "all" || sentence.corpus === corpus)
    .filter((sentence) => subject === "all" || sentence.subjects.includes(subject))
    .slice(0, safeAmount)
}

/**
 * Resolve the exact corpus intersection and clamp the displayed amount to the
 * number of real rows. An empty intersection stays empty; this helper never
 * widens a subject or corpus behind the user's back.
 */
export function resolveCorpusSelection(
  filters = {},
  { sentences = CORPUS_SENTENCES, requestedAmount = filters.amount, preferredSpecimenId } = {},
) {
  const corpus = filters.corpus || "all"
  const subject = filters.subject || "all"
  const matchingRows = sentences
    .filter((sentence) => corpus === "all" || sentence.corpus === corpus)
    .filter((sentence) => subject === "all" || sentence.subjects.includes(subject))
  const numericAmount = Number(requestedAmount)
  const requested = Math.max(
    0,
    Number.isFinite(numericAmount) ? Math.floor(numericAmount) : matchingRows.length,
  )
  const orderedRows = preferredSpecimenId
    ? [...matchingRows].sort(
        (left, right) =>
          Number(right.source?.specimenId === preferredSpecimenId) -
          Number(left.source?.specimenId === preferredSpecimenId),
      )
    : matchingRows
  const rows = orderedRows.slice(0, requested)
  return {
    filters: { ...filters, corpus, subject, amount: rows.length },
    rows,
    availableCount: matchingRows.length,
    requestedAmount: requested,
    empty: rows.length === 0,
    limited: requested < matchingRows.length,
  }
}

const SPECIMENS_BY_SUBJECT = Object.freeze({
  all: SPECIMENS.map((specimen) => specimen.id),
  love: ["attachment-ambiguity", "gerund-ambiguity"],
  death: ["rhetorical-claim", "colorless-green"],
  power: ["buffalo", "rhetorical-claim"],
  nature: ["colorless-green", "garden-path"],
  time: ["garden-path", "rhetorical-claim"],
  identity: ["gerund-ambiguity", "buffalo", "garden-path"],
  ambiguity: ["attachment-ambiguity", "gerund-ambiguity", "garden-path"],
  rhetoric: ["rhetorical-claim", "attachment-ambiguity"],
})

const CORPUS_SPECIMEN_OFFSETS = Object.freeze({
  all: 0,
  shakespeare: 0,
  "nineteenth-century-fiction": 1,
  "grammar-lab": 0,
  demonstration: 1,
})

/** Pick the authored plate deterministically from the same active filter state. */
export function selectSpecimenForFilters(filters = {}, rows) {
  const workingRows =
    rows || resolveCorpusSelection(filters, { requestedAmount: filters.amount }).rows
  if (!workingRows.length) return null
  const candidates = SPECIMENS_BY_SUBJECT[filters.subject] || SPECIMENS_BY_SUBJECT.all
  const authoredCandidateIds = [
    ...new Set(
      workingRows
        .map((row) => row.source?.specimenId)
        .filter((id) => id && candidates.includes(id)),
    ),
  ]
  if (authoredCandidateIds.length === 1) return getSpecimen(authoredCandidateIds[0])
  const corpusOffset = CORPUS_SPECIMEN_OFFSETS[filters.corpus] || 0
  const amountOffset = Math.max(0, Math.floor(Number(filters.amount) || 0))
  const id = candidates[(corpusOffset + amountOffset) % candidates.length]
  return getSpecimen(id)
}

export function recoverSourceSentences(sourceIds, sentences = CORPUS_SENTENCES) {
  const wanted = new Set(Array.isArray(sourceIds) ? sourceIds : [sourceIds])
  return sentences.filter((sentence) => wanted.has(sentence.id))
}

function resolveSpecimen(specimenOrId, relatedId) {
  if (specimenOrId && typeof specimenOrId === "object" && Array.isArray(specimenOrId.tokens)) {
    return specimenOrId
  }
  if (typeof specimenOrId === "string" && SPECIMEN_BY_ID[specimenOrId]) {
    return SPECIMEN_BY_ID[specimenOrId]
  }
  const entityId = relatedId || specimenOrId
  if (typeof entityId !== "string") return null
  return (
    SPECIMENS.find((specimen) =>
      [
        ...specimen.tokens.map((token) => token.id),
        ...specimen.phrases.map((phrase) => phrase.id),
        ...specimen.dependencies.map((edge) => edge.id),
      ].includes(entityId),
    ) || null
  )
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

/**
 * Return every authored entity aligned to a token. The preferred call is
 * `tokenRelatedEntities(specimenOrId, tokenId)`; passing only a stable token ID
 * also works and is useful for interaction callbacks.
 */
export function tokenRelatedEntities(specimenOrId, selectedTokenId) {
  let tokenIdToFind = selectedTokenId
  let specimen = resolveSpecimen(specimenOrId, selectedTokenId)
  if (selectedTokenId === undefined && typeof specimenOrId === "string") {
    tokenIdToFind = specimenOrId
    specimen = resolveSpecimen(null, tokenIdToFind)
  }
  if (!specimen) return null

  const token = specimen.tokens.find((candidate) => candidate.id === tokenIdToFind)
  if (!token) return null

  const phrases = specimen.phrases.filter(
    (phrase) => token.index >= phrase.tokenStart && token.index < phrase.tokenEnd,
  )
  const directDependencies = specimen.dependencies.filter(
    (edge) => edge.sourceTokenId === token.id || edge.targetTokenId === token.id,
  )
  const parseDependencies = specimen.alternateDependencies.flatMap((parse) =>
    parse.edges
      .filter((edge) => edge.sourceTokenId === token.id || edge.targetTokenId === token.id)
      .map((edge) => ({ parseId: parse.id, edge })),
  )
  const semanticNodeIds = specimen.semantics.tokenAlignments
    .filter((alignment) => alignment.tokenId === token.id)
    .map((alignment) => alignment.nodeId)
  const rhetoricNodes = (specimen.rhetoric?.nodes || []).filter(
    (node) => token.index >= node.tokenStart && token.index < node.tokenEnd,
  )
  const variants = specimen.variants.filter((variant) =>
    variant.alignments.some((alignment) => alignment.tokenId === token.id),
  )
  const lexicalAnalysisIds = specimen.lexicalAlternatives
    .filter(
      (alternative) =>
        alternative.tokenId === token.id ||
        alternative.analyses.some((entry) => entry.indexes?.includes(token.index)),
    )
    .flatMap((alternative, alternativeIndex) =>
      alternative.analyses.map(
        (_, analysisIndex) => `${specimen.id}:lexical:${alternativeIndex}:${analysisIndex}`,
      ),
    )

  const phraseIds = phrases.map((phrase) => phrase.id)
  const dependencyIds = unique([
    ...directDependencies.map((edge) => edge.id),
    ...parseDependencies.map(({ edge }) => edge.id),
  ])
  const parseIds = unique(parseDependencies.map(({ parseId }) => parseId))
  const rhetoricSpanIds = rhetoricNodes.map((node) => node.id)
  const variantIds = variants.map((variant) => variant.id)
  const semanticIds = unique([
    token.semanticId,
    ...phrases.map((phrase) => phrase.semanticId),
    ...directDependencies.map((edge) => edge.semanticId),
    ...parseDependencies.map(({ edge }) => edge.semanticId),
    ...semanticNodeIds.map(
      (nodeId) => specimen.semantics.nodes.find((node) => node.id === nodeId)?.semanticId,
    ),
    ...rhetoricNodes.map((node) => node.semanticId),
  ])

  return Object.freeze({
    specimenId: specimen.id,
    token,
    tokenIds: Object.freeze([token.id]),
    phraseIds: Object.freeze(phraseIds),
    dependencyIds: Object.freeze(dependencyIds),
    parseIds: Object.freeze(parseIds),
    semanticNodeIds: Object.freeze(unique(semanticNodeIds)),
    rhetoricSpanIds: Object.freeze(rhetoricSpanIds),
    variantIds: Object.freeze(variantIds),
    lexicalAnalysisIds: Object.freeze(lexicalAnalysisIds),
    semanticIds: Object.freeze(semanticIds),
    allEntityIds: Object.freeze(
      unique([
        token.id,
        ...phraseIds,
        ...dependencyIds,
        ...parseIds,
        ...semanticNodeIds,
        ...rhetoricSpanIds,
        ...variantIds,
        ...lexicalAnalysisIds,
      ]),
    ),
  })
}

export function phraseRelatedEntities(specimenOrId, selectedPhraseId) {
  let phraseIdToFind = selectedPhraseId
  let specimen = resolveSpecimen(specimenOrId, selectedPhraseId)
  if (selectedPhraseId === undefined && typeof specimenOrId === "string") {
    phraseIdToFind = specimenOrId
    specimen = resolveSpecimen(null, phraseIdToFind)
  }
  if (!specimen) return null
  const phrase = specimen.phrases.find((candidate) => candidate.id === phraseIdToFind)
  if (!phrase) return null
  const tokens = specimen.tokens.filter(
    (token) => token.index >= phrase.tokenStart && token.index < phrase.tokenEnd,
  )
  const tokenRelations = tokens.map((token) => tokenRelatedEntities(specimen, token.id))
  return Object.freeze({
    specimenId: specimen.id,
    phrase,
    tokenIds: Object.freeze(tokens.map((token) => token.id)),
    phraseIds: Object.freeze(unique(tokenRelations.flatMap((relations) => relations.phraseIds))),
    dependencyIds: Object.freeze(
      unique(tokenRelations.flatMap((relations) => relations.dependencyIds)),
    ),
    parseIds: Object.freeze(unique(tokenRelations.flatMap((relations) => relations.parseIds))),
    semanticNodeIds: Object.freeze(
      unique(tokenRelations.flatMap((relations) => relations.semanticNodeIds)),
    ),
    rhetoricSpanIds: Object.freeze(
      unique(tokenRelations.flatMap((relations) => relations.rhetoricSpanIds)),
    ),
    variantIds: Object.freeze(unique(tokenRelations.flatMap((relations) => relations.variantIds))),
  })
}

export function buildSelectionRelations(specimenOrId) {
  const specimen = resolveSpecimen(specimenOrId)
  if (!specimen) return null
  return Object.freeze({
    specimenId: specimen.id,
    byTokenId: Object.freeze(
      Object.fromEntries(
        specimen.tokens.map((token) => [token.id, tokenRelatedEntities(specimen, token.id)]),
      ),
    ),
    byPhraseId: Object.freeze(
      Object.fromEntries(
        specimen.phrases.map((phrase) => [phrase.id, phraseRelatedEntities(specimen, phrase.id)]),
      ),
    ),
  })
}

export function constituencyToNetwork(specimenOrId) {
  const specimen = resolveSpecimen(specimenOrId)
  if (!specimen) return { nodes: [], edges: [] }
  const nodes = specimen.phrases.map((phrase) => ({
    ...phrase,
    tokenIds: specimen.tokens.slice(phrase.tokenStart, phrase.tokenEnd).map((token) => token.id),
  }))
  const edges = specimen.phrases
    .filter((phrase) => phrase.parentId)
    .map((phrase) => ({
      id: `${phrase.parentId}->${phrase.id}`,
      source: phrase.parentId,
      target: phrase.id,
      relation: "contains",
      semanticId: phrase.semanticId,
    }))
  return { nodes, edges }
}

export function getDependencyParse(specimenOrId, parseId) {
  const specimen = resolveSpecimen(specimenOrId)
  if (!specimen) return null
  if (!parseId || parseId === "canonical") {
    return {
      id: `${specimen.id}:parse:canonical`,
      label: "Authored reading",
      rootTokenId: specimen.rootTokenId,
      edges: specimen.dependencies,
    }
  }
  return (
    specimen.alternateDependencies.find(
      (parse) => parse.id === parseId || parse.id.endsWith(`:parse:${parseId}`),
    ) || null
  )
}

const VIEW_TITLES = Object.freeze({
  "reed-kellogg": "Sentence diagram",
  constituency: "Phrase structure",
  dependency: "Word relationships",
  ambiguity: "Possible interpretations",
  semantics: "Meaning graph",
  rhetoric: "Rhetorical structure",
  "word-tree": "Word paths",
  "phrase-net": "Phrase relationships",
  variants: "Textual variants",
})

/** Create an accessible, plain-language account of the current structure. */
export function getStructuralSummary(specimenOrId, view = "dependency", options = {}) {
  const specimen = resolveSpecimen(specimenOrId)
  if (!specimen) return null
  const normalizedView = VIEW_TITLES[view] ? view : "dependency"
  const root = specimen.tokens.find((token) => token.id === specimen.rootTokenId)
  let text = ""
  let items = []

  if (normalizedView === "reed-kellogg") {
    const baseline = specimen.sentenceDiagram.nodes
      .filter((node) => node.baseline)
      .map((node) => node.label)
    text = `${specimen.text} places ${baseline.join(", ")} on the main line and suspends modifiers beneath the words they describe.`
    items = specimen.sentenceDiagram.nodes.map(
      (node) => `${node.label}: ${node.role}${node.baseline ? ", main line" : ", modifier line"}`,
    )
  } else if (normalizedView === "constituency") {
    const majorPhrases = specimen.phrases.filter((phrase) => phrase.depth === 1)
    text = `${specimen.text} is authored as ${specimen.phrases.length} nested phrase spans. Its largest units are ${majorPhrases.map((phrase) => phrase.label).join(", ")}.`
    items = majorPhrases.map((phrase) => {
      const words = specimen.tokens
        .slice(phrase.tokenStart, phrase.tokenEnd)
        .map((token) => token.text)
        .join(" ")
      return `${phrase.label}: ${words}`
    })
  } else if (normalizedView === "dependency") {
    text = `${root.text} is the authored root. ${specimen.dependencies.length} directed relationships connect governors to dependents without changing the visible word order.`
    items = specimen.dependencies
      .filter((edge) => edge.relation !== "punct")
      .map((edge) => {
        const source = specimen.tokens.find((token) => token.id === edge.sourceTokenId)?.text
        const target = specimen.tokens.find((token) => token.id === edge.targetTokenId)?.text
        return `${source} → ${target}: ${edge.label}`
      })
  } else if (normalizedView === "ambiguity") {
    if (specimen.alternateDependencies.length) {
      text = `${specimen.text} has ${specimen.alternateDependencies.length} authored interpretations in this demonstration.`
      items = specimen.alternateDependencies.map(
        (parse) =>
          `${parse.label}${Number.isFinite(parse.probability) ? ` (${Math.round(parse.probability * 100)}%)` : ""}: ${parse.interpretation}`,
      )
    } else {
      text = `${specimen.text} has one canonical syntactic reading here; its difficulty comes from lexical roles or semantic plausibility instead of a competing dependency tree.`
      items = specimen.lexicalAlternatives.flatMap((alternative) =>
        alternative.analyses.map((analysis) => analysis.label),
      )
    }
  } else if (normalizedView === "semantics") {
    const inferredCount = specimen.semantics.nodes.filter((node) => node.inferred).length
    text = `${specimen.semantics.nodes.length} concepts and ${specimen.semantics.edges.length} labeled relations express the claim. ${inferredCount ? `${inferredCount} concept${inferredCount === 1 ? " is" : "s are"} inferred rather than printed as a word.` : "Every concept is aligned to printed words."}`
    items = specimen.semantics.edges.map((edge) => {
      const source = specimen.semantics.nodes.find((node) => node.id === edge.source)?.label
      const target = specimen.semantics.nodes.find((node) => node.id === edge.target)?.label
      return `${source} —${edge.label}→ ${target}`
    })
  } else if (normalizedView === "rhetoric") {
    if (specimen.rhetoric) {
      const nucleus = specimen.rhetoric.nodes.find((node) => node.role === "nucleus")
      text = `The nucleus is “${nucleus?.label}.” Satellite spans explain its cause and acknowledge a concession.`
      items = specimen.rhetoric.edges.map((edge) => {
        const source = specimen.rhetoric.nodes.find((node) => node.id === edge.source)?.label
        const target = specimen.rhetoric.nodes.find((node) => node.id === edge.target)?.label
        return `${source} —${edge.relation}: ${edge.label}→ ${target}`
      })
    } else {
      text = `${specimen.text} is a single-sentence grammatical specimen and has no authored discourse-level rhetorical decomposition.`
    }
  } else if (normalizedView === "variants") {
    text = `${specimen.variants.length} authored rewrite${specimen.variants.length === 1 ? "" : "s"} preserve alignments back to the canonical sentence.`
    items = specimen.variants.map((variant) => `${variant.label}: ${variant.text}`)
  } else if (normalizedView === "word-tree") {
    const anchor = options.anchor || root.lemma
    const tree = options.wordTree
    const pathNodes = (tree?.nodes || []).filter((node) => node.depth > 0)
    text = tree
      ? `${tree.matches?.length || 0} corpus use${tree.matches?.length === 1 ? "" : "s"} of “${anchor}” form ${pathNodes.length} context branch${pathNodes.length === 1 ? "" : "es"}; every branch retains its complete source sentence.`
      : `Corpus sentences containing “${anchor}” can branch outward while retaining source IDs for every path.`
    items = pathNodes.length
      ? pathNodes.map(
          (node) =>
            `${node.path.join(" → ")} — ${node.count} use${node.count === 1 ? "" : "s"}; ${node.sourceIds.length} source${node.sourceIds.length === 1 ? "" : "s"}`,
        )
      : ["No matching word paths in the current corpus selection."]
  } else if (normalizedView === "phrase-net") {
    const pattern = options.pattern || "X and Y"
    const graph = options.phraseNet
    text = graph
      ? `${graph.edges?.length || 0} relationship${graph.edges?.length === 1 ? "" : "s"} connect the words occupying X and Y in “${pattern}.” Every edge retains its complete source phrases.`
      : `The corpus view connects the words occupying X and Y in the authored pattern “${pattern},” with complete source phrases attached to every edge.`
    items = graph?.edges?.length
      ? graph.edges.map(
          (edge) =>
            `${graph.nodes.find((node) => node.id === edge.source)?.label || edge.source} —${edge.label}→ ${graph.nodes.find((node) => node.id === edge.target)?.label || edge.target}: ${edge.count} example${edge.count === 1 ? "" : "s"} (${edge.phrases.join("; ")})`,
        )
      : ["No matching phrase relationships in the current corpus selection."]
  }

  return Object.freeze({
    specimenId: specimen.id,
    view: normalizedView,
    title: VIEW_TITLES[normalizedView],
    text,
    items: Object.freeze(items),
  })
}

export function buildVariantGraph(specimenOrId) {
  const specimen = resolveSpecimen(specimenOrId)
  if (!specimen) return { nodes: [], edges: [], paths: [] }
  const nodeMap = new Map()
  const edgeMap = new Map()
  const paths = []

  function addPath(pathId, label, tokens, alignmentByVariantId = new Map()) {
    const nodeIds = []
    for (const token of tokens) {
      const canonicalTokenId = alignmentByVariantId.get(token.id) || token.id
      const canonicalToken = specimen.tokens.find((candidate) => candidate.id === canonicalTokenId)
      const isShared =
        canonicalToken && normalizeWord(canonicalToken.text) === normalizeWord(token.text)
      const id = isShared
        ? `${specimen.id}:variant-node:${canonicalToken.id}`
        : `${specimen.id}:variant-node:${pathId}:${token.index}`
      if (!nodeMap.has(id)) {
        nodeMap.set(id, {
          id,
          label: token.text,
          tokenId: token.id,
          canonicalTokenId: canonicalToken?.id || null,
          pathIds: new Set(),
          semanticId: canonicalToken?.semanticId || `variant-token:${pathId}:${token.index}`,
        })
      }
      nodeMap.get(id).pathIds.add(pathId)
      nodeIds.push(id)
    }
    for (let index = 1; index < nodeIds.length; index += 1) {
      const edgeId = `${nodeIds[index - 1]}->${nodeIds[index]}`
      if (!edgeMap.has(edgeId)) {
        edgeMap.set(edgeId, {
          id: edgeId,
          source: nodeIds[index - 1],
          target: nodeIds[index],
          pathIds: new Set(),
        })
      }
      edgeMap.get(edgeId).pathIds.add(pathId)
    }
    paths.push({ id: pathId, label, nodeIds })
  }

  addPath(`${specimen.id}:variant:canonical`, "Canonical sentence", specimen.tokens)
  for (const variant of specimen.variants) {
    addPath(
      variant.id,
      variant.label,
      variant.tokens,
      new Map(variant.alignments.map((alignment) => [alignment.variantTokenId, alignment.tokenId])),
    )
  }

  return {
    nodes: [...nodeMap.values()].map((node) => ({ ...node, pathIds: [...node.pathIds] })),
    edges: [...edgeMap.values()].map((edge) => ({
      ...edge,
      pathIds: [...edge.pathIds],
      weight: edge.pathIds.size,
    })),
    paths,
  }
}

function coerceCorpusRows(sentences) {
  return (sentences || []).map((sentence, index) => {
    if (typeof sentence !== "string") {
      return sentence.tokens?.every((token) => token.normalized)
        ? sentence
        : {
            ...sentence,
            tokens: tokenizeCorpusText(sentence.text, sentence.id || `local:${index}`),
          }
    }
    return {
      id: `local:${index}`,
      text: sentence,
      corpus: "local",
      subjects: [],
      source: { corpus: "local" },
      tokens: tokenizeCorpusText(sentence, `local:${index}`),
    }
  })
}

function normalizeWordTreeOptions(input, anchor, direction, amount) {
  if (Array.isArray(input)) return { sentences: input, anchor, direction, amount }
  if (typeof input === "string") {
    return { sentences: CORPUS_SENTENCES, anchor: input, direction: anchor, amount: direction }
  }
  return input || {}
}

function encodedPath(parts) {
  return parts
    .map((part) =>
      encodeURIComponent(typeof part === "object" ? (part.normalized ?? part.label) : part),
    )
    .join("/")
}

/**
 * Build a weighted forward or backward context trie. Each node retains all of
 * the source sentence IDs that pass through it, and `sources` contains the
 * corresponding complete records.
 */
export function buildWordTree(input = {}, anchorArgument, directionArgument, amountArgument) {
  const options = normalizeWordTreeOptions(input, anchorArgument, directionArgument, amountArgument)
  const sentences = coerceCorpusRows(options.sentences || CORPUS_SENTENCES)
  const anchor = String(options.anchor || "love").trim()
  const direction = options.direction === "backward" ? "backward" : "forward"
  const amount = Math.max(
    0,
    Number.isFinite(Number(options.amount)) ? Math.floor(Number(options.amount)) : sentences.length,
  )
  const maxDepth = Math.max(
    1,
    Number.isFinite(Number(options.maxDepth)) ? Math.floor(Number(options.maxDepth)) : 5,
  )
  const minFrequency = Math.max(
    1,
    Number.isFinite(Number(options.minFrequency)) ? Math.floor(Number(options.minFrequency)) : 1,
  )
  const anchorTokens = tokenizeCorpusText(anchor, "word-tree-anchor").map(
    (token) => token.normalized,
  )
  if (!anchorTokens.length || amount === 0) {
    return {
      anchor,
      anchorTokens,
      direction,
      root: null,
      nodes: [],
      edges: [],
      matches: [],
      sources: [],
    }
  }

  const matches = []
  for (const sentence of sentences) {
    const normalizedTokens = sentence.tokens.map((token) => token.normalized)
    for (let index = 0; index <= normalizedTokens.length - anchorTokens.length; index += 1) {
      const candidate = normalizedTokens.slice(index, index + anchorTokens.length)
      if (!candidate.every((token, tokenIndex) => token === anchorTokens[tokenIndex])) continue
      const context =
        direction === "forward"
          ? sentence.tokens.slice(
              index + anchorTokens.length,
              index + anchorTokens.length + maxDepth,
            )
          : sentence.tokens.slice(Math.max(0, index - maxDepth), index).reverse()
      matches.push({
        id: `${sentence.id}:occurrence:${index}:${direction}`,
        sourceId: sentence.id,
        source: sentence,
        text: sentence.text,
        anchorStart: index,
        anchorEnd: index + anchorTokens.length,
        contextTokens: context,
      })
      if (matches.length >= amount) break
    }
    if (matches.length >= amount) break
  }

  if (!matches.length) {
    return {
      anchor,
      anchorTokens,
      direction,
      root: null,
      nodes: [],
      edges: [],
      matches: [],
      sources: [],
    }
  }

  function internalNode(label, normalized, depth) {
    return {
      label,
      token: label,
      normalized,
      depth,
      count: 0,
      terminalCount: 0,
      sourceIds: new Set(),
      terminalSourceIds: new Set(),
      children: new Map(),
    }
  }

  const rootInternal = internalNode(anchor, anchorTokens.join(" "), 0)
  for (const match of matches) {
    rootInternal.count += 1
    rootInternal.sourceIds.add(match.sourceId)
    let current = rootInternal
    for (const contextToken of match.contextTokens) {
      if (!current.children.has(contextToken.normalized)) {
        current.children.set(
          contextToken.normalized,
          internalNode(contextToken.text, contextToken.normalized, current.depth + 1),
        )
      }
      current = current.children.get(contextToken.normalized)
      current.count += 1
      current.sourceIds.add(match.sourceId)
    }
    current.terminalCount += 1
    current.terminalSourceIds.add(match.sourceId)
  }

  const rootId = `word-tree:${direction}:${encodedPath(anchorTokens)}`
  const nodes = []
  const edges = []

  function serializeNode(internal, parentId = null, path = []) {
    const id = parentId ? `${rootId}/${encodedPath(path)}` : rootId
    const publicNode = {
      id,
      label: internal.label,
      token: internal.token,
      normalized: internal.normalized,
      depth: internal.depth,
      parentId,
      count: internal.count,
      terminalCount: internal.terminalCount,
      sourceIds: [...internal.sourceIds],
      sourceId: [...internal.terminalSourceIds][0] || [...internal.sourceIds][0] || null,
      terminalSourceIds: [...internal.terminalSourceIds],
      path: [anchor, ...path.map((part) => part.label)],
      leaf: internal.children.size === 0,
      children: [],
    }
    nodes.push(publicNode)
    const children = [...internal.children.values()]
      .filter((child) => child.count >= minFrequency)
      .sort(
        (left, right) =>
          right.count - left.count || left.normalized.localeCompare(right.normalized),
      )
    for (const child of children) {
      const childPath = [...path, { label: child.label, normalized: child.normalized }]
      const childNode = serializeNode(child, id, childPath)
      publicNode.children.push(childNode)
      edges.push({
        id: `${id}->${childNode.id}`,
        source: id,
        target: childNode.id,
        count: child.count,
        weight: child.count,
        sourceIds: childNode.sourceIds,
        sourceId: childNode.sourceId,
      })
    }
    return publicNode
  }

  const root = serializeNode(rootInternal)
  const sourceIds = unique(matches.map((match) => match.sourceId))
  return {
    anchor,
    anchorTokens,
    direction,
    root,
    nodes,
    edges,
    matches,
    sources: sentences.filter((sentence) => sourceIds.includes(sentence.id)),
  }
}

export function recoverWordTreeSources(wordTree, nodeId) {
  const node = wordTree?.nodes?.find((candidate) => candidate.id === nodeId)
  if (!node) return []
  const sourceIds = new Set(node.sourceIds || [])
  return (wordTree.sources || []).filter((source) => sourceIds.has(source.id))
}

function normalizePhraseOptions(input, pattern, amount) {
  if (Array.isArray(input)) return { sentences: input, pattern, amount }
  if (typeof input === "string") {
    return { sentences: CORPUS_SENTENCES, pattern: input, amount: pattern }
  }
  return input || {}
}

function patternConnector(pattern) {
  const known = PHRASE_PATTERN_OPTIONS.find(
    (option) => option.value.toLocaleLowerCase("en-US") === pattern.toLocaleLowerCase("en-US"),
  )
  if (known) return known.connector
  const match = pattern.match(/^X\s+(.+?)\s+Y$/i)
  return match?.[1]?.toLocaleLowerCase("en-US") || null
}

/** Aggregate X-and-Y-style constructions without discarding their sources. */
export function buildPhraseRelationships(input = {}, patternArgument, amountArgument) {
  const options = normalizePhraseOptions(input, patternArgument, amountArgument)
  const pattern = String(options.pattern || "X and Y")
  const connector = patternConnector(pattern)
  const amount = Math.max(
    0,
    Number.isFinite(Number(options.amount))
      ? Math.floor(Number(options.amount))
      : CORPUS_SENTENCES.length,
  )
  const minFrequency = Math.max(
    1,
    Number.isFinite(Number(options.minFrequency)) ? Math.floor(Number(options.minFrequency)) : 1,
  )
  const sentences = coerceCorpusRows(options.sentences || CORPUS_SENTENCES).slice(0, amount)
  if (!connector || !amount) {
    return { pattern, connector, nodes: [], edges: [], matches: [], sources: [] }
  }

  const matchRows = []
  const nodeMap = new Map()
  const edgeMap = new Map()
  for (const sentence of sentences) {
    for (let index = 1; index < sentence.tokens.length - 1; index += 1) {
      const connectorToken = sentence.tokens[index]
      if (connectorToken.normalized !== connector) continue
      const left = sentence.tokens[index - 1]
      const right = sentence.tokens[index + 1]
      const phrase = `${left.text} ${connectorToken.text} ${right.text}`
      const match = {
        id: `${sentence.id}:phrase:${index - 1}-${index + 1}`,
        pattern,
        connector,
        left: left.normalized,
        right: right.normalized,
        phrase,
        sourceId: sentence.id,
        source: sentence,
        text: sentence.text,
        tokenIndexes: [index - 1, index, index + 1],
      }
      matchRows.push(match)

      for (const token of [left, right]) {
        if (!nodeMap.has(token.normalized)) {
          nodeMap.set(token.normalized, {
            id: `phrase-node:${encodeURIComponent(token.normalized)}`,
            label: token.text,
            word: token.normalized,
            count: 0,
            sourceIds: new Set(),
          })
        }
        const node = nodeMap.get(token.normalized)
        node.count += 1
        node.sourceIds.add(sentence.id)
      }

      const edgeKey = `${left.normalized}\u0000${right.normalized}`
      if (!edgeMap.has(edgeKey)) {
        edgeMap.set(edgeKey, {
          id: `phrase-edge:${encodeURIComponent(left.normalized)}:${encodeURIComponent(connector)}:${encodeURIComponent(right.normalized)}`,
          source: `phrase-node:${encodeURIComponent(left.normalized)}`,
          target: `phrase-node:${encodeURIComponent(right.normalized)}`,
          relation: connector,
          pattern,
          label: pattern,
          count: 0,
          weight: 0,
          sourceIds: new Set(),
          phrases: new Set(),
          examples: [],
        })
      }
      const edge = edgeMap.get(edgeKey)
      edge.count += 1
      edge.weight = edge.count
      edge.sourceIds.add(sentence.id)
      edge.phrases.add(phrase)
      edge.examples.push({ phrase, sourceId: sentence.id, text: sentence.text })
    }
  }

  const retainedEdges = [...edgeMap.values()]
    .filter((edge) => edge.count >= minFrequency)
    .sort(
      (left, right) =>
        right.count - left.count ||
        left.source.localeCompare(right.source) ||
        left.target.localeCompare(right.target),
    )
  const retainedNodeIds = new Set(retainedEdges.flatMap((edge) => [edge.source, edge.target]))
  const nodes = [...nodeMap.values()]
    .filter((node) => retainedNodeIds.has(node.id))
    .sort((left, right) => right.count - left.count || left.word.localeCompare(right.word))
    .map((node) => ({
      ...node,
      sourceIds: [...node.sourceIds],
      sourceId: [...node.sourceIds][0] || null,
    }))
  const edges = retainedEdges.map((edge) => ({
    ...edge,
    sourceIds: [...edge.sourceIds],
    sourceId: [...edge.sourceIds][0] || null,
    phrases: [...edge.phrases],
  }))
  const retainedEdgeIds = new Set(edges.map((edge) => edge.id))
  const matches = matchRows.filter((match) =>
    retainedEdgeIds.has(
      `phrase-edge:${encodeURIComponent(match.left)}:${encodeURIComponent(connector)}:${encodeURIComponent(match.right)}`,
    ),
  )
  const sourceIds = unique(matches.map((match) => match.sourceId))
  return {
    pattern,
    connector,
    nodes,
    edges,
    matches,
    sources: sentences.filter((sentence) => sourceIds.includes(sentence.id)),
  }
}

export function recoverPhraseRelationshipSources(phraseGraph, entityId) {
  const entity = [...(phraseGraph?.nodes || []), ...(phraseGraph?.edges || [])].find(
    (candidate) => candidate.id === entityId,
  )
  if (!entity) return []
  const sourceIds = new Set(entity.sourceIds || [])
  return (phraseGraph.sources || []).filter((source) => sourceIds.has(source.id))
}
