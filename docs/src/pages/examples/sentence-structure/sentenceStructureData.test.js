import { describe, expect, it } from "vitest"
import {
  CORPUS_OPTIONS,
  CORPUS_SENTENCES,
  SPECIMENS,
  SUBJECT_OPTIONS,
  VIEW_OPTIONS,
  applyTokenRewrites,
  buildPhraseRelationships,
  buildSelectionRelations,
  buildVariantGraph,
  buildWordTree,
  filterCorpusSentences,
  getSpecimen,
  getStructuralSummary,
  phraseRelatedEntities,
  relatedEntityCount,
  recoverPhraseRelationshipSources,
  recoverWordTreeSources,
  resolveCorpusSelection,
  selectSpecimenForFilters,
  tokenRelatedEntities,
} from "./sentenceStructureData"

const REQUIRED_TEXTS = [
  "I saw the man with the telescope.",
  "The old man the boats.",
  "Visiting relatives can be annoying.",
  "Colorless green ideas sleep furiously.",
  "Buffalo buffalo Buffalo buffalo buffalo buffalo Buffalo buffalo.",
  "The analyst distrusted the result because the sample was small, although the effect appeared dramatic.",
]

function expectValidTokenSpan(text, token) {
  expect(token.id).toMatch(/:t\d+$/)
  expect(token.lemma).toBeTruthy()
  expect(token.partOfSpeech).toBeTruthy()
  expect(token.characterStart).toBeGreaterThanOrEqual(0)
  expect(token.characterEnd).toBeGreaterThan(token.characterStart)
  expect(text.slice(token.characterStart, token.characterEnd)).toBe(token.text)
}

describe("sentence structure authored specimens", () => {
  it("ships exactly the six required specimens with stable normalized identities", () => {
    expect(SPECIMENS.map((specimen) => specimen.text)).toEqual(REQUIRED_TEXTS)
    expect(new Set(SPECIMENS.map((specimen) => specimen.id)).size).toBe(6)

    const allEntityIds = new Set()
    for (const specimen of SPECIMENS) {
      expect(getSpecimen(specimen.id)).toBe(specimen)
      expect(specimen.tokens.length).toBeGreaterThan(0)
      expect(specimen.tokens.map((token) => token.index)).toEqual(
        specimen.tokens.map((_, index) => index),
      )
      expect(specimen.tokens.some((token) => token.id === specimen.rootTokenId)).toBe(true)

      for (const token of specimen.tokens) {
        expectValidTokenSpan(specimen.text, token)
        expect(allEntityIds.has(token.id)).toBe(false)
        allEntityIds.add(token.id)
      }
      for (const phrase of specimen.phrases) {
        expect(phrase.id).toContain(`${specimen.id}:phrase:`)
        expect(phrase.tokenStart).toBeGreaterThanOrEqual(0)
        expect(phrase.tokenEnd).toBeGreaterThan(phrase.tokenStart)
        expect(phrase.tokenEnd).toBeLessThanOrEqual(specimen.tokens.length)
        expect(allEntityIds.has(phrase.id)).toBe(false)
        allEntityIds.add(phrase.id)
      }
    }
  })

  it("contains no dangling dependency, semantic, rhetoric, or variant alignments", () => {
    for (const specimen of SPECIMENS) {
      const tokenIds = new Set(specimen.tokens.map((token) => token.id))
      const phraseIds = new Set(specimen.phrases.map((phrase) => phrase.id))
      const semanticNodeIds = new Set(specimen.semantics.nodes.map((node) => node.id))

      for (const phrase of specimen.phrases) {
        if (phrase.parentId) expect(phraseIds.has(phrase.parentId)).toBe(true)
      }
      for (const edge of [
        ...specimen.dependencies,
        ...specimen.alternateDependencies.flatMap((parse) => parse.edges),
      ]) {
        expect(tokenIds.has(edge.sourceTokenId), edge.id).toBe(true)
        expect(tokenIds.has(edge.targetTokenId), edge.id).toBe(true)
      }
      for (const edge of specimen.semantics.edges) {
        expect(semanticNodeIds.has(edge.source), edge.id).toBe(true)
        expect(semanticNodeIds.has(edge.target), edge.id).toBe(true)
      }
      for (const alignment of specimen.semantics.tokenAlignments) {
        expect(tokenIds.has(alignment.tokenId)).toBe(true)
        expect(semanticNodeIds.has(alignment.nodeId)).toBe(true)
      }
      if (specimen.rhetoric) {
        const rhetoricIds = new Set(specimen.rhetoric.nodes.map((node) => node.id))
        expect(rhetoricIds.has(specimen.rhetoric.rootId)).toBe(true)
        for (const edge of specimen.rhetoric.edges) {
          expect(rhetoricIds.has(edge.source), edge.id).toBe(true)
          expect(rhetoricIds.has(edge.target), edge.id).toBe(true)
        }
      }
      for (const variant of specimen.variants) {
        const variantTokenIds = new Set(variant.tokens.map((token) => token.id))
        for (const token of variant.tokens) expectValidTokenSpan(variant.text, token)
        for (const alignment of variant.alignments) {
          expect(variantTokenIds.has(alignment.variantTokenId)).toBe(true)
          expect(tokenIds.has(alignment.tokenId)).toBe(true)
        }
      }
    }
  })

  it("authors the intended ambiguity and category distinctions", () => {
    const attachment = getSpecimen("attachment-ambiguity")
    expect(attachment.alternateDependencies.map((parse) => parse.label)).toEqual([
      "I used the telescope",
      "The man had the telescope",
    ])
    expect(
      attachment.alternateDependencies.reduce((sum, parse) => sum + parse.probability, 0),
    ).toBe(1)

    const gardenPath = getSpecimen("garden-path")
    expect(gardenPath.tokens.find((token) => token.text === "old").partOfSpeech).toBe("NOUN")
    expect(gardenPath.tokens.find((token) => token.text === "man").partOfSpeech).toBe("VERB")
    expect(gardenPath.lexicalAlternatives).toHaveLength(2)

    const buffalo = getSpecimen("buffalo")
    expect(buffalo.tokens.filter((token) => token.partOfSpeech === "PROPN")).toHaveLength(3)
    expect(buffalo.tokens.filter((token) => token.partOfSpeech === "NOUN")).toHaveLength(3)
    expect(buffalo.tokens.filter((token) => token.partOfSpeech === "VERB")).toHaveLength(2)

    const rhetoric = getSpecimen("rhetorical-claim")
    expect(rhetoric.rhetoric.nodes.map((node) => node.role)).toEqual([
      "root",
      "nucleus",
      "satellite",
      "satellite",
    ])
    expect(rhetoric.rhetoric.edges.map((edge) => edge.relation)).toContain("concession")
  })
})

describe("sentence structure cross-view selection", () => {
  it("carries telescope through phrase, dependency, meaning, and variant identities", () => {
    const related = tokenRelatedEntities("attachment-ambiguity", "attachment-ambiguity:t6")
    expect(related.token.text).toBe("telescope")
    expect(related.phraseIds).toContain("attachment-ambiguity:phrase:with-phrase")
    expect(related.dependencyIds).toContain("attachment-ambiguity:dependency:prepositional-object")
    expect(related.parseIds).toHaveLength(2)
    expect(related.semanticNodeIds).toEqual(["attachment-ambiguity:semantic:telescope"])
    expect(related.variantIds).toHaveLength(2)
    expect(related.semanticIds).toContain("token:attachment-ambiguity:6")

    expect(tokenRelatedEntities("attachment-ambiguity:t6")).toEqual(related)
  })

  it("expands phrase selections and indexes every token once", () => {
    const specimen = getSpecimen("rhetorical-claim")
    const cause = phraseRelatedEntities(specimen, "rhetorical-claim:phrase:cause-clause")
    expect(cause.tokenIds).toEqual([
      "rhetorical-claim:t5",
      "rhetorical-claim:t6",
      "rhetorical-claim:t7",
      "rhetorical-claim:t8",
      "rhetorical-claim:t9",
    ])
    expect(cause.rhetoricSpanIds).toContain("rhetorical-claim:rhetoric:cause")

    const index = buildSelectionRelations(specimen)
    expect(Object.keys(index.byTokenId)).toHaveLength(specimen.tokens.length)
    expect(Object.keys(index.byPhraseId)).toHaveLength(specimen.phrases.length)
  })

  it("builds converging variant paths only for unchanged aligned words", () => {
    const graph = buildVariantGraph("attachment-ambiguity")
    expect(graph.paths).toHaveLength(3)
    expect(new Set(graph.nodes.map((node) => node.id)).size).toBe(graph.nodes.length)

    const sharedI = graph.nodes.find((node) => node.canonicalTokenId === "attachment-ambiguity:t0")
    expect(sharedI.pathIds).toHaveLength(3)
    const changedVerb = graph.nodes.find((node) => node.label === "followed")
    expect(changedVerb.canonicalTokenId).toBe("attachment-ambiguity:t1")
    expect(changedVerb.pathIds).toEqual(["attachment-ambiguity:variant:followed"])
  })
})

describe("sentence structure corpus transforms", () => {
  const localSentences = [
    { id: "a", text: "I saw the man with a telescope." },
    { id: "b", text: "I saw the moon through clouds." },
    { id: "c", text: "Yesterday I saw the man leave." },
  ]

  it("builds a deterministic weighted trie in either direction and recovers sources", () => {
    const options = {
      sentences: localSentences,
      anchor: "I saw the",
      direction: "forward",
      amount: 10,
      maxDepth: 2,
    }
    const first = buildWordTree(options)
    const second = buildWordTree(options)
    expect(first).toEqual(second)
    expect(first.root.count).toBe(3)
    expect(first.root.children.map((child) => [child.normalized, child.count])).toEqual([
      ["man", 2],
      ["moon", 1],
    ])
    expect(new Set(first.nodes.map((node) => node.id)).size).toBe(first.nodes.length)

    const man = first.nodes.find((node) => node.depth === 1 && node.normalized === "man")
    expect(recoverWordTreeSources(first, man.id).map((source) => source.id)).toEqual(["a", "c"])

    const backward = buildWordTree({ ...options, direction: "backward", maxDepth: 1 })
    expect(backward.nodes.find((node) => node.normalized === "yesterday").count).toBe(1)
    expect(backward.root.terminalCount).toBe(2)
  })

  it("extracts phrase-pattern edges with complete examples and source recovery", () => {
    const graph = buildPhraseRelationships({
      sentences: [
        { id: "one", text: "Love and time test every promise." },
        { id: "two", text: "Power and time alter the choice." },
        { id: "three", text: "Love and time return." },
      ],
      pattern: "X and Y",
      amount: 3,
    })
    expect(graph.matches).toHaveLength(3)
    expect(graph.nodes.find((node) => node.word === "time").count).toBe(3)
    const loveAndTime = graph.edges.find(
      (edge) => edge.source === "phrase-node:love" && edge.target === "phrase-node:time",
    )
    expect(loveAndTime.count).toBe(2)
    expect(loveAndTime.phrases).toEqual(["Love and time"])
    expect(loveAndTime.examples).toHaveLength(2)
    expect(recoverPhraseRelationshipSources(graph, loveAndTime.id).map((row) => row.id)).toEqual([
      "one",
      "three",
    ])
  })

  it("provides enough local material and readable filter options for every corpus view", () => {
    expect(CORPUS_SENTENCES.length).toBeGreaterThanOrEqual(50)
    expect(filterCorpusSentences({ corpus: "shakespeare", amount: 20 })).toHaveLength(20)
    expect(
      filterCorpusSentences({ corpus: "demonstration", subject: "love" }).length,
    ).toBeGreaterThan(3)
    expect(VIEW_OPTIONS).toHaveLength(9)
    expect(SUBJECT_OPTIONS.some((option) => option.value === "love")).toBe(true)
    expect(CORPUS_OPTIONS.some((option) => option.value === "shakespeare")).toBe(true)
  })

  it("resolves the default title to twenty real love rows with a nonempty phrase net", () => {
    const selection = resolveCorpusSelection({
      amount: 20,
      subject: "love",
      corpus: "shakespeare",
      view: "word-tree",
    })
    expect(selection.filters.amount).toBe(20)
    expect(selection.rows).toHaveLength(20)
    expect(selection.availableCount).toBe(20)
    expect(
      selection.rows.every((row) => row.corpus === "shakespeare" && row.subjects.includes("love")),
    ).toBe(true)

    const phraseNet = buildPhraseRelationships({
      sentences: selection.rows,
      pattern: "X and Y",
      amount: selection.filters.amount,
    })
    expect(phraseNet.edges.length).toBeGreaterThan(0)
    expect(phraseNet.sources.length).toBeGreaterThan(0)
  })

  it("clamps to exact intersections and never widens an empty selection", () => {
    const sparse = resolveCorpusSelection(
      { amount: 20, subject: "rhetoric", corpus: "grammar-lab" },
      { requestedAmount: 20 },
    )
    expect(sparse.filters.amount).toBe(1)
    expect(sparse.rows.map((row) => row.source.specimenId)).toEqual(["rhetorical-claim"])
    expect(sparse.availableCount).toBe(1)

    const empty = resolveCorpusSelection(
      { amount: 20, subject: "ambiguity", corpus: "shakespeare" },
      { requestedAmount: 20 },
    )
    expect(empty.filters.amount).toBe(0)
    expect(empty.rows).toEqual([])
    expect(empty.availableCount).toBe(0)
    expect(empty.empty).toBe(true)
    expect(selectSpecimenForFilters(empty.filters, empty.rows)).toBeNull()
  })

  it("selects authored plates deterministically from primary filter state", () => {
    const initial = resolveCorpusSelection({
      amount: 20,
      subject: "love",
      corpus: "shakespeare",
    })
    expect(selectSpecimenForFilters(initial.filters, initial.rows).id).toBe("attachment-ambiguity")

    const fiveLoveRows = resolveCorpusSelection({
      amount: 5,
      subject: "love",
      corpus: "shakespeare",
    })
    expect(selectSpecimenForFilters(fiveLoveRows.filters, fiveLoveRows.rows).id).toBe(
      "gerund-ambiguity",
    )

    const rhetoric = resolveCorpusSelection({
      amount: 20,
      subject: "rhetoric",
      corpus: "grammar-lab",
    })
    expect(selectSpecimenForFilters(rhetoric.filters, rhetoric.rows).id).toBe("rhetorical-claim")

    const manuallyChosenRhetoric = resolveCorpusSelection(
      { amount: 1, subject: "power", corpus: "grammar-lab" },
      { requestedAmount: 1, preferredSpecimenId: "rhetorical-claim" },
    )
    expect(manuallyChosenRhetoric.rows).toHaveLength(1)
    expect(manuallyChosenRhetoric.rows[0].source.specimenId).toBe("rhetorical-claim")

    const fictionLove = resolveCorpusSelection({
      amount: 20,
      subject: "love",
      corpus: "nineteenth-century-fiction",
    })
    expect(selectSpecimenForFilters(fictionLove.filters, fictionLove.rows).id).toBe(
      "gerund-ambiguity",
    )
  })
})

describe("sentence structure local rewrites", () => {
  it("updates surface, effective lemma, and path query while preserving source IDs", () => {
    const specimen = getSpecimen("attachment-ambiguity")
    const rewritten = applyTokenRewrites(specimen.tokens, {
      "attachment-ambiguity:t1": "followed",
      "attachment-ambiguity:t6": "notebook",
    })
    const followed = rewritten[1]
    const notebook = rewritten[6]

    expect(followed).toMatchObject({
      id: "attachment-ambiguity:t1",
      sourceTokenId: "attachment-ambiguity:t1",
      authoredText: "saw",
      authoredLemma: "see",
      text: "followed",
      lemma: "follow",
      effectiveLemma: "follow",
      pathQuery: "follow",
      rewritten: true,
    })
    expect(notebook).toMatchObject({
      id: "attachment-ambiguity:t6",
      sourceTokenId: "attachment-ambiguity:t6",
      text: "notebook",
      effectiveLemma: "notebook",
    })
    expect(rewritten[0].id).toBe(specimen.tokens[0].id)
    expect(rewritten[0].effectiveLemma).toBe("I")
    expect(specimen.tokens[1].text).toBe("saw")
    expect(specimen.tokens[1].lemma).toBe("see")
  })
})

describe("sentence structure accessible summaries", () => {
  it("describes every view with a title, text, and relationship list", () => {
    for (const view of VIEW_OPTIONS) {
      const specimen = view.value === "rhetoric" ? "rhetorical-claim" : "attachment-ambiguity"
      const summary = getStructuralSummary(specimen, view.value, {
        anchor: "love",
        pattern: "X and Y",
      })
      expect(summary.title).toBeTruthy()
      expect(summary.text.length).toBeGreaterThan(40)
      expect(Array.isArray(summary.items)).toBe(true)
    }
  })

  it("names competing readings and the rhetorical nucleus in plain language", () => {
    const ambiguity = getStructuralSummary("attachment-ambiguity", "ambiguity")
    expect(ambiguity.items).toEqual([
      expect.stringContaining("I used the telescope"),
      expect.stringContaining("The man had the telescope"),
    ])

    const rhetoric = getStructuralSummary("rhetorical-claim", "rhetoric")
    expect(rhetoric.text).toContain("The analyst distrusted the result")
    expect(rhetoric.items).toEqual(expect.arrayContaining([expect.stringContaining("concession")]))
  })

  it("keeps summaries synchronized with interpretation, pattern, and reader rewrites", () => {
    const possession = getStructuralSummary("attachment-ambiguity", "dependency", {
      interpretationId: "attachment-ambiguity:parse:possession",
    })
    expect(possession.text).toContain("The man had the telescope")

    const phraseNet = getStructuralSummary("attachment-ambiguity", "phrase-net", {
      pattern: "X of Y",
    })
    expect(phraseNet.text).toContain("X of Y")

    const specimen = getSpecimen("attachment-ambiguity")
    const tokens = applyTokenRewrites(specimen.tokens, {
      "attachment-ambiguity:t6": "notebook",
    })
    const variants = getStructuralSummary(specimen, "variants", {
      tokens,
      alignment: "lemma",
    })
    expect(variants.text).toContain("aligned by lemma")
    expect(variants.text).toContain("notebook")
    expect(variants.items).toContainEqual(expect.stringContaining("Your rewrite"))

    const dependency = getStructuralSummary(specimen, "dependency", { tokens })
    expect(dependency.items.join(" ")).toContain("notebook")
    const constituency = getStructuralSummary(specimen, "constituency", { tokens })
    expect(constituency.text).toContain("notebook")
    expect(constituency.items.join(" ")).toContain("notebook")
  })

  it("counts canonical related entities without token or metadata duplication", () => {
    const related = tokenRelatedEntities("attachment-ambiguity:t6")
    const expected = new Set(
      related.allEntityIds.filter((id) => !related.tokenIds.includes(id)),
    ).size
    expect(relatedEntityCount(related)).toBe(expected)
    expect(relatedEntityCount(null)).toBe(0)
  })
})
