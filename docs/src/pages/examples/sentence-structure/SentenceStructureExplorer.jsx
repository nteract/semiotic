import React, { useCallback, useMemo, useRef, useState } from "react"
import { SentenceFilter } from "semiotic/controls"
import { useReducedMotion } from "semiotic/utils"
import useElementSize from "../../../hooks/useElementSize"
import {
  CORPUS_OPTIONS,
  DIRECTION_OPTIONS,
  PHRASE_PATTERN_OPTIONS,
  SPECIMENS,
  SUBJECT_OPTIONS,
  VIEW_OPTIONS,
  applyTokenRewrites,
  buildPhraseRelationships,
  buildWordTree,
  getStructuralSummary,
  relatedEntityCount,
  resolveCorpusSelection,
  selectSpecimenForFilters,
  surfaceText,
  tokenRelatedEntities,
} from "./sentenceStructureData"
import SentenceStructureStage from "./SentenceStructureStage"
import "./sentence-structure.css"

const VIEW_COPY = {
  "reed-kellogg": {
    number: "01",
    short: "diagram",
    eyebrow: "Grammar as architecture",
    question: "Who does what to whom—and where do the modifiers live?",
    explanation:
      "A curated Reed–Kellogg plate turns grammatical roles into a baseline, dividers, and sloping modifier rails. It is intentionally fixture-driven: the geometry is an editorial explanation, not a general-purpose parser.",
    frame: "XYCustomChart",
  },
  constituency: {
    number: "02",
    short: "phrases",
    eyebrow: "Words that act together",
    question: "Which words form a unit?",
    explanation:
      "The same tokens gather into nested noun, verb, and prepositional phrases. Select any word below and every containing phrase stays legible as you move to another view.",
    frame: "NetworkCustomChart",
  },
  dependency: {
    number: "03",
    short: "relations",
    eyebrow: "Grammar as directed relations",
    question: "Which word depends on which other word?",
    explanation:
      "Dependency arcs return the words to a line and expose the invisible government between them. In the telescope sentence, only one attachment needs to move for the meaning to change.",
    frame: "XYCustomChart",
  },
  ambiguity: {
    number: "04",
    short: "ambiguity",
    eyebrow: "One string, several structures",
    question: "How many defensible sentences are hiding in this sentence?",
    explanation:
      "The parse forest overlays authored alternatives. Shared relationships remain solid; disputed relationships branch, and choosing an interpretation collapses the forest without changing the words.",
    frame: "XYCustomChart",
  },
  semantics: {
    number: "05",
    short: "meaning",
    eyebrow: "Syntax becomes a claim",
    question: "What claim does the sentence make?",
    explanation:
      "Concepts can merge several words, introduce an inferred role, or resolve a reference that syntax leaves implicit. Thin alignment threads keep those concepts accountable to the surface text.",
    frame: "NetworkCustomChart",
  },
  rhetoric: {
    number: "06",
    short: "rhetoric",
    eyebrow: "Claims need support",
    question: "Which span carries the claim, and which spans qualify it?",
    explanation:
      "Rhetorical structure treats clauses as nucleus and satellites—cause, evidence, contrast, concession, and elaboration. The analyst specimen contains the richest authored plate.",
    frame: "NetworkCustomChart",
  },
  "word-tree": {
    number: "07",
    short: "paths",
    eyebrow: "A sentence enters a corpus",
    question: "What tends to come before or after this phrase?",
    explanation:
      "A weighted trie branches from the selected word or subject. Every leaf retains its source sentence, so frequency never severs the path back to reading.",
    frame: "NetworkCustomChart",
  },
  "phrase-net": {
    number: "08",
    short: "phrases",
    eyebrow: "The phrase is the unit",
    question: "Which words repeatedly meet inside the same construction?",
    explanation:
      "Phrase relationships preserve patterns such as X and Y or X of Y. An edge carries its complete source phrases—not just an abstract count.",
    frame: "NetworkCustomChart",
  },
  variants: {
    number: "09",
    short: "variants",
    eyebrow: "Wording is a route, not a verdict",
    question: "Where do editions, paraphrases, and rewrites converge?",
    explanation:
      "Shared words and meanings converge while substitutions open parallel paths. Rewriting one selected word adds a local route without erasing the authored original.",
    frame: "NetworkCustomChart",
  },
}

const POS_HELP = {
  ADJ: "adjective — describes a noun",
  ADP: "adposition — introduces a relationship",
  ADV: "adverb — modifies a verb or description",
  AUX: "auxiliary — helps form a verb phrase",
  CCONJ: "coordinating conjunction — joins equal units",
  DET: "determiner — specifies a noun",
  NOUN: "noun — names an entity or idea",
  PART: "particle — adds grammatical meaning",
  PRON: "pronoun — stands for an entity",
  PROPN: "proper noun — names a particular entity",
  PUNCT: "punctuation",
  SCONJ: "subordinating conjunction — introduces a dependent clause",
  VERB: "verb — expresses an action or state",
}

const REWRITE_SUGGESTIONS = {
  saw: ["followed", "noticed", "remembered"],
  man: ["woman", "astronomer", "traveler"],
  telescope: ["notebook", "camera", "lantern"],
  old: ["young", "tired", "quiet"],
  boats: ["ferries", "skiffs", "vessels"],
  relatives: ["friends", "scholars", "neighbors"],
  ideas: ["dreams", "theories", "rumors"],
  analyst: ["editor", "reviewer", "scientist"],
}

const DEFAULT_REQUESTED_AMOUNT = 20
const DEFAULT_FILTERS = Object.freeze({
  amount: DEFAULT_REQUESTED_AMOUNT,
  subject: "love",
  corpus: "shakespeare",
  view: "word-tree",
})
const DEFAULT_SELECTION = resolveCorpusSelection(DEFAULT_FILTERS, {
  requestedAmount: DEFAULT_REQUESTED_AMOUNT,
})
const DEFAULT_SPECIMEN = selectSpecimenForFilters(DEFAULT_SELECTION.filters, DEFAULT_SELECTION.rows)

function optionLabel(options, value) {
  return options.find((option) => option.value === value)?.label ?? value
}

function normalizedOption(option) {
  if (typeof option === "string") return { value: option, label: option }
  return option
}

export default function SentenceStructureExplorer() {
  const reducedMotion = useReducedMotion()
  const [filterDockRef, filterDockSize] = useElementSize({ height: 64 })
  const normalizedViews = useMemo(() => VIEW_OPTIONS.map(normalizedOption), [])
  const normalizedSubjects = useMemo(() => SUBJECT_OPTIONS.map(normalizedOption), [])
  const normalizedCorpora = useMemo(() => CORPUS_OPTIONS.map(normalizedOption), [])
  const requestedAmountRef = useRef(DEFAULT_REQUESTED_AMOUNT)
  const [filters, setFilters] = useState(DEFAULT_SELECTION.filters)
  const [specimenId, setSpecimenId] = useState(DEFAULT_SPECIMEN?.id ?? null)
  const [selectedTokenIds, setSelectedTokenIds] = useState([])
  const [selectedInterpretationId, setSelectedInterpretationId] = useState(
    DEFAULT_SPECIMEN?.alternateDependencies?.[0]?.id ?? "default",
  )
  const [direction, setDirection] = useState("forward")
  const [phrasePattern, setPhrasePattern] = useState("X and Y")
  const [alignment, setAlignment] = useState("meaning")
  const [rewrites, setRewrites] = useState({})
  const [selectedSourceId, setSelectedSourceId] = useState(null)
  const [announcement, setAnnouncement] = useState("")
  const [challengeAnswer, setChallengeAnswer] = useState(null)
  const [challengeScore, setChallengeScore] = useState(0)

  const specimen = useMemo(
    () => SPECIMENS.find((candidate) => candidate.id === specimenId) ?? null,
    [specimenId],
  )
  const activeTokens = useMemo(
    () => applyTokenRewrites(specimen?.tokens ?? [], rewrites),
    [rewrites, specimen],
  )
  const selectedTokens = useMemo(
    () => activeTokens.filter((token) => selectedTokenIds.includes(token.id)),
    [activeTokens, selectedTokenIds],
  )
  const anchor =
    selectedTokens[0]?.effectiveLemma ??
    selectedTokens[0]?.lemma ??
    selectedTokens[0]?.text ??
    filters.subject
  const corpusSelection = useMemo(
    () =>
      resolveCorpusSelection(filters, {
        requestedAmount: filters.amount,
        preferredSpecimenId: specimenId,
      }),
    [filters, specimenId],
  )
  const corpusRows = corpusSelection.rows
  const wordTree = useMemo(
    () =>
      buildWordTree({
        sentences: corpusRows,
        anchor,
        direction,
        amount: filters.amount,
        maxDepth: 5,
      }),
    [anchor, corpusRows, direction, filters.amount],
  )
  const phraseNet = useMemo(
    () =>
      buildPhraseRelationships({
        sentences: corpusRows,
        pattern: phrasePattern,
        amount: filters.amount,
      }),
    [corpusRows, filters.amount, phrasePattern],
  )
  const summary = useMemo(() => {
    if (!specimen) {
      const emptyViewText =
        filters.view === "phrase-net"
          ? "No matching phrase relationships in the current corpus selection."
          : filters.view === "word-tree"
            ? "No matching word paths in the current corpus selection."
            : `No sentences about ${optionLabel(normalizedSubjects, filters.subject)} are available in ${optionLabel(normalizedCorpora, filters.corpus)}. The selection remains empty instead of substituting another corpus.`
      return {
        title: "No matching sentences",
        text: emptyViewText,
        items: ["Choose another subject or corpus to continue."],
      }
    }
    const base = getStructuralSummary(specimen, filters.view, {
      interpretationId: selectedInterpretationId,
      direction,
      anchor,
      wordTree,
      phraseNet,
      pattern: phrasePattern,
      tokens: activeTokens,
      alignment,
    })
    if (base?.items?.length) return base
    const corpusItems =
      filters.view === "word-tree"
        ? (wordTree?.sources ?? corpusRows)
            .slice(0, 8)
            .map(
              (row) =>
                `${row.text} — ${row.source?.work ?? row.source?.author ?? "curated source"}`,
            )
        : filters.view === "phrase-net"
          ? (phraseNet?.edges ?? [])
              .slice(0, 10)
              .map(
                (edge) =>
                  `${edge.source} ${edge.label ?? phrasePattern} ${edge.target}: ${edge.count ?? edge.weight ?? 1} source phrase${(edge.count ?? edge.weight) === 1 ? "" : "s"}`,
              )
          : []
    return { ...base, items: corpusItems }
  }, [
    activeTokens,
    alignment,
    anchor,
    corpusRows,
    direction,
    filters.corpus,
    filters.subject,
    filters.view,
    normalizedCorpora,
    normalizedSubjects,
    phraseNet,
    phrasePattern,
    selectedInterpretationId,
    specimen,
    wordTree,
  ])
  const selectedSource = useMemo(
    () =>
      corpusRows.find((row) => row.id === selectedSourceId) ??
      wordTree?.sources?.find((row) => row.id === selectedSourceId) ??
      phraseNet?.sources?.find((row) => row.id === selectedSourceId),
    [corpusRows, phraseNet?.sources, selectedSourceId, wordTree?.sources],
  )
  const viewCopy = VIEW_COPY[filters.view] ?? VIEW_COPY["word-tree"]
  const buffaloMode = /Buffalo buffalo/.test(specimen?.text ?? "")

  const definitions = useMemo(
    () => ({
      amount: {
        type: "number",
        label: "Number of sentences",
        min: 1,
        max: 100,
        step: 1,
        inputMode: "both",
        accent: "var(--sentence-coral)",
      },
      subject: {
        type: "select",
        label: "Subject",
        searchable: true,
        options: normalizedSubjects,
        accent: "var(--sentence-teal)",
      },
      corpus: {
        type: "select",
        label: "Corpus",
        options: normalizedCorpora,
        accent: "var(--sentence-gold)",
      },
      view: {
        type: "select",
        label: "Structural view",
        options: normalizedViews,
        accent: "var(--sentence-violet)",
      },
    }),
    [normalizedCorpora, normalizedSubjects, normalizedViews],
  )

  const handleFilterChange = useCallback(
    (nextFilters, meta) => {
      const primaryChanged = ["amount", "subject", "corpus"].includes(meta?.key)
      if (meta?.key === "amount") {
        requestedAmountRef.current = Math.max(0, Number(nextFilters.amount) || 0)
      } else if (["subject", "corpus"].includes(meta?.key) && requestedAmountRef.current === 0) {
        requestedAmountRef.current = DEFAULT_REQUESTED_AMOUNT
      }
      const selection = resolveCorpusSelection(nextFilters, {
        requestedAmount: requestedAmountRef.current,
      })
      setFilters(selection.filters)

      if (primaryChanged) {
        const nextSpecimen = selectSpecimenForFilters(selection.filters, selection.rows)
        setSpecimenId(nextSpecimen?.id ?? null)
        setSelectedTokenIds([])
        setRewrites({})
        setSelectedSourceId(null)
        setChallengeAnswer(null)
        setSelectedInterpretationId(nextSpecimen?.alternateDependencies?.[0]?.id ?? "default")
        setAnnouncement(
          selection.empty
            ? `No matching sentences about ${optionLabel(normalizedSubjects, selection.filters.subject)} in ${optionLabel(normalizedCorpora, selection.filters.corpus)}.`
            : `${selection.rows.length} matching sentence${selection.rows.length === 1 ? "" : "s"} loaded with ${nextSpecimen?.label ?? "an authored structural plate"}.`,
        )
      } else if (meta?.key === "view") {
        const label = optionLabel(normalizedViews, meta.value)
        setAnnouncement(`View changed to ${label}. Structural token selections were preserved.`)
      }
    },
    [normalizedCorpora, normalizedSubjects, normalizedViews],
  )

  const toggleToken = useCallback(
    (tokenId) => {
      setSelectedTokenIds((current) => {
        const selected = current.includes(tokenId)
        const next = selected ? current.filter((id) => id !== tokenId) : [...current, tokenId]
        const token = activeTokens.find((candidate) => candidate.id === tokenId)
        const related = tokenRelatedEntities(specimen, tokenId)
        const relatedCount = relatedEntityCount(related)
        setAnnouncement(
          selected
            ? `${token?.text ?? "Token"} is no longer being followed.`
            : `${token?.text ?? "Token"} selected. ${relatedCount} related structures can follow it between views.`,
        )
        return next
      })
    },
    [activeTokens, specimen],
  )

  const chooseSpecimen = useCallback(
    (nextSpecimen) => {
      const nextCorpus = nextSpecimen.source?.corpus || "all"
      const nextSubject = nextSpecimen.subjects?.[0] || "all"
      const selection = resolveCorpusSelection(
        { ...filters, corpus: nextCorpus, subject: nextSubject },
        {
          requestedAmount: requestedAmountRef.current,
          preferredSpecimenId: nextSpecimen.id,
        },
      )
      setFilters(selection.filters)
      setSpecimenId(nextSpecimen.id)
      setSelectedTokenIds([])
      setRewrites({})
      setSelectedSourceId(null)
      setSelectedInterpretationId(nextSpecimen.alternateDependencies?.[0]?.id ?? "default")
      setChallengeAnswer(null)
      setAnnouncement(
        `${nextSpecimen.label ?? "Sentence specimen"} loaded with ${selection.rows.length} matching sentence${selection.rows.length === 1 ? "" : "s"} from ${optionLabel(normalizedCorpora, nextCorpus)}. Structural selections were cleared.`,
      )
    },
    [filters, normalizedCorpora],
  )

  const rewriteToken = useCallback(
    (tokenId, replacement) => {
      const token = activeTokens.find((candidate) => candidate.id === tokenId)
      if (!replacement.trim()) return
      setRewrites((current) => ({ ...current, [tokenId]: replacement.trim() }))
      setSelectedTokenIds((current) =>
        current.includes(tokenId) ? current : [...current, tokenId],
      )
      setAnnouncement(
        `${token?.text ?? "Word"} changed to ${replacement.trim()}. Word form and the variant route changed; unaffected authored relationships remain stable.`,
      )
    },
    [activeTokens],
  )

  const answerChallenge = useCallback(
    (answer) => {
      setChallengeAnswer(answer)
      const correct = answer === "instrument"
      if (correct && challengeAnswer === null) setChallengeScore((score) => score + 1)
      const authoredParse = specimen?.alternateDependencies?.find(
        (parse) => parse.id === answer || parse.id.endsWith(`:${answer}`),
      )
      if (specimen?.id === "attachment-ambiguity") {
        setSelectedInterpretationId(authoredParse?.id ?? answer)
      }
      setAnnouncement(
        correct
          ? "Correct. Attaching with to saw means the telescope was the instrument of seeing."
          : "That is the other valid parse: attaching with to man means the man possessed the telescope.",
      )
    },
    [challengeAnswer, specimen],
  )

  const chooseInterpretation = useCallback(
    (parseId) => {
      setSelectedInterpretationId(parseId)
      const parse = specimen?.alternateDependencies?.find((candidate) => candidate.id === parseId)
      if (specimen?.id === "attachment-ambiguity") {
        if (parseId.endsWith(":instrument")) setChallengeAnswer("instrument")
        else if (parseId.endsWith(":possession")) setChallengeAnswer("possession")
      }
      setAnnouncement(`Interpretation changed to ${parse?.label ?? "the selected reading"}.`)
    },
    [specimen],
  )

  const copySummary = useCallback(async () => {
    const text = `${summary.title}\n${summary.text}\n${(summary.items ?? []).join("\n")}`
    try {
      await navigator.clipboard.writeText(text)
      setAnnouncement("Accessible structural summary copied.")
    } catch {
      setAnnouncement("The structural summary is available below for manual copying.")
    }
  }, [summary])

  return (
    <div
      className="sentence-explorer"
      style={{ "--sentence-filter-dock-height": `${filterDockSize.height}px` }}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-buffalo-mode={buffaloMode ? "true" : "false"}
      data-corpus-count={corpusRows.length}
      data-specimen-id={specimen?.id ?? "none"}
    >
      <p className="sentence-explorer__lede">
        Written language arrives one word after another. Grammar does not. Follow the same sentence
        through nine structures and watch the relationships—not the vocabulary—become the subject.
      </p>

      <section className="sentence-hero" aria-labelledby="sentence-thesis">
        <div className="sentence-hero__ghost" aria-hidden="true">
          WORDS / PHRASES / CLAIMS / PATHS
        </div>
        <div className="sentence-hero__content">
          <p className="sentence-kicker">A field guide to invisible structure</p>
          <h2 id="sentence-thesis">
            The words are visible. The sentence is the structure between them.
          </h2>
          <div className="sentence-hero__rule" aria-hidden="true" />
          <p className="sentence-hero__hint">
            The underlined words in the sentence below are the controls. Try them before reaching
            for a toolbar.
          </p>
        </div>
      </section>

      <div ref={filterDockRef} className="sentence-filter-dock">
        <div className="sentence-filter-dock__inner">
          <span className="sentence-filter-dock__label" aria-hidden="true">
            Live sentence
          </span>
          <SentenceFilter
            className="sentence-explorer__filter"
            as="h3"
            sentence={`Explore {amount} ${filters.amount === 1 ? "sentence" : "sentences"} about {subject} from {corpus}, shown as {view}.`}
            filters={filters}
            definitions={definitions}
            onChange={handleFilterChange}
            size="inherit"
          />
        </div>
      </div>

      <section className="sentence-workbench" aria-labelledby="structure-stage-title">
        <header className="sentence-workbench__header">
          <div>
            <p className="sentence-kicker">{viewCopy.eyebrow}</p>
            <h2 id="structure-stage-title">{viewCopy.question}</h2>
          </div>
          <div className="sentence-workbench__status">
            <span>{viewCopy.frame}</span>
            <span>
              {corpusRows.length} corpus {corpusRows.length === 1 ? "row" : "rows"}
            </span>
            <span>
              {selectedTokenIds.length ? `${selectedTokenIds.length} followed` : "no word followed"}
            </span>
            {buffaloMode ? <strong>BUFFALO MODE</strong> : null}
          </div>
        </header>

        <div className="sentence-workbench__body">
          <nav className="sentence-view-rail" aria-label="Sentence structures">
            {normalizedViews.map((view, index) => {
              const copy = VIEW_COPY[view.value] ?? {
                number: String(index + 1).padStart(2, "0"),
                short: view.label,
              }
              return (
                <button
                  key={view.value}
                  type="button"
                  className={filters.view === view.value ? "is-active" : ""}
                  aria-current={filters.view === view.value ? "step" : undefined}
                  onClick={() =>
                    handleFilterChange(
                      { ...filters, view: view.value },
                      {
                        key: "view",
                        previousValue: filters.view,
                        value: view.value,
                        source: "pointer",
                      },
                    )
                  }
                >
                  <span>{copy.number}</span>
                  <strong>{copy.short}</strong>
                  <small>{view.label}</small>
                </button>
              )
            })}
          </nav>

          <div className="sentence-stage-column">
            <div className="sentence-stage" data-view={filters.view}>
              {specimen ? (
                <SentenceStructureStage
                  view={filters.view}
                  specimen={specimen}
                  tokens={activeTokens}
                  selectedTokenIds={selectedTokenIds}
                  interpretationId={selectedInterpretationId}
                  wordTree={wordTree}
                  phraseNet={phraseNet}
                  direction={direction}
                  alignment={alignment}
                  rewrites={rewrites}
                  reducedMotion={reducedMotion}
                  onSelectToken={toggleToken}
                  onSelectInterpretation={chooseInterpretation}
                  onSelectSource={setSelectedSourceId}
                />
              ) : (
                <div className="sentence-stage__empty" role="status">
                  <strong>No matching sentences</strong>
                  <span>
                    This subject and corpus have an empty intersection. Choose another filter to
                    continue.
                  </span>
                </div>
              )}
            </div>

            <div className="sentence-token-ribbon" aria-label="Follow words across structures">
              <span className="sentence-token-ribbon__label">Follow a word</span>
              <div className="sentence-token-ribbon__tokens">
                {activeTokens.map((token) => {
                  const selected = selectedTokenIds.includes(token.id)
                  return (
                    <button
                      key={token.id}
                      type="button"
                      className={selected ? "is-selected" : ""}
                      aria-pressed={selected}
                      aria-label={`${token.text}, ${token.posLabel ?? POS_HELP[token.partOfSpeech ?? token.pos] ?? token.partOfSpeech ?? token.pos ?? "token"}. ${selected ? "Selected; activate to stop following." : "Activate to follow across structures."}`}
                      title={
                        POS_HELP[token.partOfSpeech ?? token.pos] ?? token.partOfSpeech ?? token.pos
                      }
                      onClick={() => toggleToken(token.id)}
                    >
                      <span>{token.text}</span>
                      <small>{token.partOfSpeech ?? token.pos ?? "token"}</small>
                    </button>
                  )
                })}
              </div>
            </div>

            {filters.view === "word-tree" ? (
              <div
                className="sentence-secondary-controls"
                role="group"
                aria-label="Word path direction"
              >
                <span>Branch</span>
                {DIRECTION_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={direction === value}
                    onClick={() => setDirection(value)}
                  >
                    {label}
                  </button>
                ))}
                <em>from “{anchor}”</em>
              </div>
            ) : null}

            {filters.view === "phrase-net" ? (
              <div
                className="sentence-secondary-controls sentence-secondary-controls--scroll"
                role="group"
                aria-label="Phrase pattern"
              >
                <span>Pattern</span>
                {PHRASE_PATTERN_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={phrasePattern === value}
                    onClick={() => setPhrasePattern(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}

            {filters.view === "variants" ? (
              <div
                className="sentence-secondary-controls"
                role="group"
                aria-label="Variant alignment"
              >
                <span>Align by</span>
                {["token", "lemma", "phrase", "meaning"].map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={alignment === value}
                    onClick={() => setAlignment(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            ) : null}

            {(filters.view === "dependency" || filters.view === "ambiguity") &&
            specimen?.alternateDependencies?.length > 1 ? (
              <div
                className="sentence-interpretations"
                role="group"
                aria-label="Choose an interpretation"
              >
                {specimen.alternateDependencies.map((parse, index) => (
                  <button
                    key={parse.id}
                    type="button"
                    className={selectedInterpretationId === parse.id ? "is-active" : ""}
                    aria-pressed={selectedInterpretationId === parse.id}
                    onClick={() => chooseInterpretation(parse.id)}
                  >
                    <span>0{index + 1}</span>
                    <strong>{parse.label}</strong>
                    <small>{parse.interpretation ?? parse.meaning ?? parse.description}</small>
                    {parse.probability != null ? (
                      <em>{Math.round(parse.probability * 100)}%</em>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <aside className="sentence-reading-note" aria-label="How to read this structure">
            <span className="sentence-reading-note__number">{viewCopy.number}</span>
            <p>{viewCopy.explanation}</p>
            {selectedTokens.length ? (
              <div className="sentence-reading-note__selection">
                <small>Following across views</small>
                <strong>{selectedTokens.map((token) => token.text).join(" + ")}</strong>
                <ul>
                  {selectedTokens.slice(0, 2).map((token) => {
                    const related = tokenRelatedEntities(specimen, token.id)
                    const count = relatedEntityCount(related)
                    return (
                      <li key={token.id}>{count} authored relationships retain this identity</li>
                    )
                  })}
                </ul>
              </div>
            ) : (
              <p className="sentence-reading-note__prompt">
                Select a word in the ribbon or diagram, then change views.
              </p>
            )}
            {filters.view === "rhetoric" && !/analyst distrusted/i.test(specimen?.text ?? "") ? (
              <button
                type="button"
                className="sentence-text-link"
                onClick={() => {
                  const rhetorical = SPECIMENS.find((candidate) =>
                    /analyst distrusted/i.test(candidate.text),
                  )
                  if (rhetorical) chooseSpecimen(rhetorical)
                }}
              >
                Load the full rhetorical specimen →
              </button>
            ) : null}
          </aside>
        </div>

        {selectedSource ? (
          <blockquote className="sentence-source-recovery" aria-live="polite">
            <span>Recovered source</span>“{selectedSource.text}”
            <cite>
              {selectedSource.source?.work ??
                selectedSource.work ??
                selectedSource.source?.author ??
                "Curated local corpus"}
            </cite>
          </blockquote>
        ) : null}
      </section>

      <section className="sentence-summary" aria-labelledby="structural-summary-title">
        <div>
          <p className="sentence-kicker">Nonvisual structure</p>
          <h2 id="structural-summary-title">{summary.title ?? "Structural summary"}</h2>
          <p>{summary.text}</p>
        </div>
        <button type="button" onClick={copySummary}>
          Copy accessible summary
        </button>
        <details>
          <summary>Read every relationship</summary>
          <ol>
            {(summary.items ?? []).map((item, index) => (
              <li key={`${index}-${typeof item === "string" ? item : item.label}`}>
                {typeof item === "string"
                  ? item
                  : (item.label ?? item.text ?? JSON.stringify(item))}
              </li>
            ))}
          </ol>
        </details>
      </section>

      <section className="sentence-specimens" aria-labelledby="specimen-title">
        <header>
          <div>
            <p className="sentence-kicker">Six authored stress tests</p>
            <h2 id="specimen-title">Choose a sentence that refuses to stay flat.</h2>
          </div>
          <p>
            Every canonical structure is checked in. No runtime model decides what the demonstration
            means.
          </p>
        </header>
        <div className="sentence-specimens__grid">
          {SPECIMENS.map((candidate, index) => (
            <button
              key={candidate.id}
              type="button"
              className={candidate.id === specimen?.id ? "is-active" : ""}
              aria-pressed={candidate.id === specimen?.id}
              onClick={() => chooseSpecimen(candidate)}
            >
              <span>0{index + 1}</span>
              <strong>{candidate.label ?? candidate.title}</strong>
              <q>{candidate.text}</q>
              <small>
                {candidate.challenge ?? candidate.note ?? "Authored linguistic specimen"}
              </small>
            </button>
          ))}
        </div>
      </section>

      <section className="sentence-lab" aria-labelledby="rewrite-title">
        <div className="sentence-lab__intro">
          <p className="sentence-kicker">Signature interaction</p>
          <h2 id="rewrite-title">Rewrite one word. Audit the consequences.</h2>
          <p>
            Select a word, choose a replacement, and the new wording becomes a variant route. Stable
            IDs keep everything else in place so the diagram can say what changed and what did not.
          </p>
        </div>
        <div className="sentence-rewrite">
          <p className="sentence-rewrite__before">{specimen?.text}</p>
          <p className="sentence-rewrite__after">{surfaceText(activeTokens)}</p>
          <div className="sentence-rewrite__choices">
            {selectedTokens.length ? (
              selectedTokens.slice(0, 1).map((token) => {
                const choices = REWRITE_SUGGESTIONS[
                  String(token.lemma ?? token.text).toLowerCase()
                ] ?? ["different", "unexpected", "remembered"]
                return (
                  <React.Fragment key={token.id}>
                    <span>
                      Replace <strong>{token.text}</strong> with
                    </span>
                    {choices.map((choice) => (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => rewriteToken(token.id, choice)}
                      >
                        {choice}
                      </button>
                    ))}
                  </React.Fragment>
                )
              })
            ) : (
              <span>Select a word in the token ribbon to reveal authored rewrite choices.</span>
            )}
          </div>
          {Object.keys(rewrites).length ? (
            <div className="sentence-change-ledger">
              <div>
                <strong>Changed</strong>
                <span>surface word · lemma · local variant path</span>
              </div>
              <div>
                <strong>Rechecked</strong>
                <span>part of speech · phrase span · semantic alignment</span>
              </div>
              <div>
                <strong>Stable</strong>
                <span>
                  {Math.max(0, activeTokens.length - Object.keys(rewrites).length)} token identities
                  · unaffected dependencies
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="sentence-challenge" aria-labelledby="ambiguity-challenge-title">
        <div className="sentence-challenge__diagram" aria-hidden="true">
          <span>I</span>
          <span>saw</span>
          <span>the man</span>
          <span>with the telescope</span>
          <svg viewBox="0 0 520 120">
            <path d="M110 102Q260 2 430 102" />
            <path d="M276 102Q355 43 430 102" />
          </svg>
        </div>
        <div>
          <p className="sentence-kicker">Ambiguity challenge · score {challengeScore}</p>
          <h2 id="ambiguity-challenge-title">Which attachment means “I used the telescope”?</h2>
          <div className="sentence-challenge__answers">
            <button
              type="button"
              aria-pressed={challengeAnswer === "instrument"}
              onClick={() => answerChallenge("instrument")}
            >
              with → saw
            </button>
            <button
              type="button"
              aria-pressed={challengeAnswer === "possession"}
              onClick={() => answerChallenge("possession")}
            >
              with → man
            </button>
          </div>
          {challengeAnswer ? (
            <p className="sentence-challenge__feedback" role="status">
              {challengeAnswer === "instrument"
                ? "Yes. The prepositional phrase modifies the act of seeing, so it supplies the instrument."
                : "That valid structure says the man had the telescope. The words stay fixed; only the attachment moves."}
            </p>
          ) : (
            <p>Choose a relationship, not a paraphrase.</p>
          )}
        </div>
      </section>

      <section className="sentence-implementation" aria-labelledby="implementation-title">
        <div>
          <p className="sentence-kicker">How this example stays honest</p>
          <h2 id="implementation-title">
            One controlled sentence. Two frame families. Stable semantic IDs.
          </h2>
        </div>
        <div className="sentence-implementation__grid">
          <article>
            <span>CONTROL</span>
            <h3>SentenceFilter</h3>
            <p>
              Public from <code>semiotic/controls</code>. The title owns no application state; every
              edit returns a complete next filter record and change metadata.
            </p>
          </article>
          <article>
            <span>GEOMETRY</span>
            <h3>XYCustomChart</h3>
            <p>
              Curated sentence baselines, Reed–Kellogg rails, dependency arcs, and interpretation
              forests retain keyboard-readable marks.
            </p>
          </article>
          <article>
            <span>RELATIONSHIPS</span>
            <h3>NetworkCustomChart</h3>
            <p>
              Phrase, concept, rhetoric, corpus, and variant structures keep the same token-aligned
              identities in new layouts.
            </p>
          </article>
          <article>
            <span>ACCESS</span>
            <h3>Structure, not a word list</h3>
            <p>
              Every view supplies a plain-language summary, full relationship list, native controls,
              source recovery, and live state announcements.
            </p>
          </article>
        </div>
      </section>

      <div className="sentence-sr-status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </div>
  )
}
