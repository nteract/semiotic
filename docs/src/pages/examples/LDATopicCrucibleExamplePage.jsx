import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { OrdinalCustomChart } from "semiotic/ordinal"
import { CrucibleChart } from "semiotic/physics"
import { wordTrailsLayout, wordTrailsProgressiveReveal } from "semiotic/recipes"
import { useReducedMotion } from "semiotic/utils"
import ExamplePageLayout from "./ExamplePageLayout"
import { LDA_TOPIC_CRUCIBLE_MODEL } from "./data/ldaTopicCrucible"
import "./LDATopicCrucibleExamplePage.css"

const PACE_OPTIONS = [
  { value: 5200, label: "Close reading · 5.2 s" },
  { value: 2400, label: "Seminar pace · 2.4 s" },
  { value: 1500, label: "Notebook pace · 1.5 s" },
  { value: 850, label: "Bench pace · 0.85 s" },
  { value: 400, label: "Machine pace · 0.4 s" },
]

const percent = (value, digits = 0) =>
  ((Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0) * 100).toFixed(digits) + "%"

const probability = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0)

const TRAIL_TOPIC_COLOR = {
  "topic-1": "var(--ltc-trail-topic-1)",
  "topic-2": "var(--ltc-trail-topic-2)",
  "topic-3": "var(--ltc-trail-topic-3)",
  "topic-4": "var(--ltc-trail-topic-4)",
}

export function normalizedTopicExclusivity(topicProbability, probabilityAcrossTopics, topicCount) {
  const count = Math.max(1, Number(topicCount) || 1)
  const total = probability(probabilityAcrossTopics)
  const share = total > 0 ? probability(topicProbability) / total : 0
  const uniformShare = 1 / count
  const distinctiveness =
    count === 1 ? 1 : Math.max(0, Math.min(1, (share - uniformShare) / (1 - uniformShare)))
  return { share, distinctiveness }
}

export function distinctivenessTint(distinctiveness) {
  const value = Math.max(0, Math.min(1, probability(distinctiveness)))
  if (value <= 0.25) return 0
  if (value <= 0.5) return 0.25
  if (value <= 0.75) return 0.5
  return 1
}

function trailTintColor(resolvedTopicColor, tint) {
  const topicColor = resolvedTopicColor ?? "var(--ltc-trail-ink)"
  if (tint === 0) return "var(--ltc-trail-neutral)"
  if (tint === 1) return topicColor
  return `color-mix(in srgb, ${topicColor} ${tint * 100}%, var(--ltc-trail-neutral))`
}

function topicWordsAt(iteration, topicId) {
  const rows = iteration?.topicWords?.[topicId]
  if (Array.isArray(rows)) return rows
  return iteration?.topics?.find((item) => item.id === topicId)?.topWords ?? []
}

function mixtureAt(iteration, documentId) {
  return (
    iteration?.documentMixtures?.[documentId] ??
    iteration?.documents?.find((item) => item.id === documentId)?.mixture ??
    {}
  )
}

function SectionHeading({ index, title, children }) {
  return (
    <div className="ltc-section-heading">
      <span className="ltc-section-index" aria-hidden="true">
        {index}
      </span>
      <div>
        <h2>{title}</h2>
        {children && <p>{children}</p>}
      </div>
    </div>
  )
}

function GenerativeRecipe() {
  return (
    <div className="ltc-recipe" role="group" aria-label="The LDA generative model in four steps">
      <article>
        <span className="ltc-recipe-number">01</span>
        <div className="ltc-formula" aria-label="phi k is drawn from a Dirichlet distribution">
          φ<sub>k</sub> ∼ Dirichlet(β)
        </div>
        <h3>Mix each topic</h3>
        <p>Every topic receives probabilities over the same vocabulary.</p>
      </article>
      <article>
        <span className="ltc-recipe-number">02</span>
        <div className="ltc-formula" aria-label="theta d is drawn from a Dirichlet distribution">
          θ<sub>d</sub> ∼ Dirichlet(α)
        </div>
        <h3>Mix a document</h3>
        <p>Each document receives proportions over the same fixed set of topics.</p>
      </article>
      <article>
        <span className="ltc-recipe-number">03</span>
        <div className="ltc-formula" aria-label="z d n is drawn from document d's topic mixture">
          z<sub>dn</sub> ∼ Categorical(θ<sub>d</sub>)
        </div>
        <h3>Choose a topic</h3>
        <p>For each token position, choose one latent topic from that document’s mixture.</p>
      </article>
      <article>
        <span className="ltc-recipe-number">04</span>
        <div className="ltc-formula" aria-label="w d n is drawn from topic z's word distribution">
          w<sub>dn</sub> ∼ Categorical(φ<sub>z</sub>)
        </div>
        <h3>Choose a word</h3>
        <p>Each topic is itself a probability distribution over the vocabulary.</p>
      </article>
    </div>
  )
}

function SpecimenStrip({ model }) {
  const settings = [
    { label: "documents", value: model.documents.length },
    { label: "retained tokens", value: model.tokenCount },
    { label: "vocabulary V", value: model.vocabularySize },
    { label: "topics K", value: model.algorithm.topicCount },
    { label: "alpha α", value: model.algorithm.alpha },
    { label: "beta β", value: model.algorithm.beta },
    { label: "sweeps", value: model.algorithm.iterations },
    { label: "seed", value: "fixed" },
  ]
  return (
    <aside className="ltc-specimen">
      <div className="ltc-specimen-strip" role="group" aria-label="Model specimen settings">
        {settings.map((setting) => (
          <span key={setting.label}>
            <small>{setting.label}</small>
            <strong>{setting.value}</strong>
          </span>
        ))}
      </div>
      <p>
        <strong>Preprocessing docket:</strong> purpose-written corpus; lowercase word tokens with
        internal apostrophes retained; explicit stoplist; no stemming; systematic document-and-token
        scan order. These are model decisions, not clerical preliminaries.
      </p>
    </aside>
  )
}

function CorpusCards({ documents, topics, iteration }) {
  const topicById = new Map(topics.map((topic) => [topic.id, topic]))
  return (
    <div className="ltc-document-grid">
      {documents.map((document, documentIndex) => {
        const assignments = (iteration.tokenAssignments ?? []).filter(
          (token) => token.documentId === document.id,
        )
        return (
          <article className="ltc-document" key={document.id}>
            <header>
              <span>DOC {String(documentIndex + 1).padStart(2, "0")}</span>
              <h3>{document.label}</h3>
            </header>
            <p className="ltc-token-line">
              {assignments.map((token) => {
                const topic = topicById.get(token.topicId)
                return (
                  <span
                    className="ltc-token"
                    key={token.tokenId}
                    aria-label={token.word + " — " + (topic?.label ?? token.topicId)}
                    data-topic={topic?.id}
                    style={{ "--token-color": topic?.color ?? "#52606b" }}
                    title={
                      token.word + ": currently assigned to " + (topic?.label ?? token.topicId)
                    }
                  >
                    {token.word}
                  </span>
                )
              })}
            </p>
          </article>
        )
      })}
    </div>
  )
}

function TopicMixtureBars({ documents, topics, iteration }) {
  return (
    <div className="ltc-mixtures">
      <div className="ltc-mixture-legend" role="group" aria-label="Topic color legend">
        {topics.map((topic) => (
          <span key={topic.id}>
            <i style={{ "--topic-color": topic.color }} /> {topic.label}
          </span>
        ))}
      </div>
      {documents.map((document) => {
        const mixture = mixtureAt(iteration, document.id)
        const spoken = topics
          .map((topic) => topic.label + " " + percent(mixture[topic.id]))
          .join(", ")
        const major = topics
          .slice()
          .sort((left, right) => probability(mixture[right.id]) - probability(mixture[left.id]))[0]
        return (
          <div className="ltc-mixture-row" key={document.id}>
            <strong>{document.label}</strong>
            <div className="ltc-mixture-bar" role="img" aria-label={spoken}>
              {topics.map((topic) => (
                <span
                  key={topic.id}
                  style={{
                    "--topic-color": topic.color,
                    width: percent(mixture[topic.id]),
                  }}
                  title={topic.label + ": " + percent(mixture[topic.id], 1)}
                />
              ))}
            </div>
            <span className="ltc-mixture-major">{major?.label ?? "—"}</span>
          </div>
        )
      })}
    </div>
  )
}

function TopicCards({ topics, iteration }) {
  return (
    <div className="ltc-topic-grid">
      {topics.map((topic, topicIndex) => {
        const words = topicWordsAt(iteration, topic.id).slice(0, 7)
        const largest = Math.max(...words.map((item) => probability(item.probability)), 0.001)
        return (
          <article
            className="ltc-topic-card"
            key={topic.id}
            style={{ "--topic-color": topic.color }}
          >
            <header>
              <span>TOPIC {topicIndex + 1}</span>
              <h3>{topic.label}</h3>
            </header>
            <ol>
              {words.map((item) => (
                <li key={item.word}>
                  <span className="ltc-topic-word">{item.word}</span>
                  <span className="ltc-topic-probability">
                    <i style={{ width: percent(probability(item.probability) / largest) }} />
                  </span>
                  <span>{percent(item.probability, 1)}</span>
                </li>
              ))}
            </ol>
            <p>{topic.interpretation}</p>
          </article>
        )
      })}
    </div>
  )
}

function SamplerReadout({ iteration, tokenCount }) {
  const initialized = iteration.iteration === 0
  return (
    <div className="ltc-readout" role="group" aria-label="Current sampler diagnostics">
      <div>
        <span>assignments changed</span>
        <strong>{iteration.movedTokens}</strong>
        <small>
          {initialized
            ? "seeded initial charge"
            : percent(iteration.changeRate, 1) + " since the prior checkpoint"}
        </small>
      </div>
      <div>
        <span>{initialized ? "moves before sampling" : "moves during sweep R"}</span>
        <strong>{iteration.sweepMoves}</strong>
        <small>
          {initialized ? "no Gibbs visits yet" : "among " + tokenCount + " token visits"}
        </small>
      </div>
      <div>
        <span>training reconstruction proxy</span>
        <strong>{iteration.trainingPerplexityProxy?.toFixed(2) ?? "—"}</strong>
        <small>in-sample description, not a truth meter</small>
      </div>
    </div>
  )
}

function TrackedToken({ model, iterationIndex }) {
  const checkpoint = model.trackedToken.checkpoints[iterationIndex]
  const assignment = model.topics.find((topic) => topic.id === checkpoint.assignmentTopicId)
  const largest = model.topics
    .slice()
    .sort(
      (left, right) =>
        checkpoint.conditionalProbabilities[right.id] -
        checkpoint.conditionalProbabilities[left.id],
    )[0]
  const sampled = checkpoint.sampled !== false
  const notArgmax = sampled && largest?.id !== assignment?.id
  return (
    <aside className="ltc-tracked-token">
      <div>
        <span>ONE TOKEN UNDER THE LENS</span>
        <strong>“{model.trackedToken.word}”</strong>
        <small>
          {model.trackedToken.documentLabel} · token position {model.trackedToken.position + 1}
        </small>
        <span className="ltc-draw-chip">
          {sampled ? "SEEDED u = " + checkpoint.sampledUnit.toFixed(3) : "INITIAL RANDOM CHARGE"}
        </span>
      </div>
      <div className="ltc-conditional-bars">
        {model.topics.map((topic) => (
          <div key={topic.id}>
            <span>{topic.label}</span>
            <i>
              <b
                style={{
                  "--topic-color": topic.color,
                  width: percent(checkpoint.conditionalProbabilities[topic.id]),
                }}
              />
            </i>
            <strong>{percent(checkpoint.conditionalProbabilities[topic.id], 1)}</strong>
          </div>
        ))}
      </div>
      <p>
        {sampled ? (
          <>
            During the sweep ending at R={checkpoint.iteration}, the sampler removed this
            occurrence, calculated the probabilities above, and used its seeded random draw to
            assign <strong style={{ color: assignment?.color }}>{assignment?.label}</strong>.{" "}
            {notArgmax ? (
              <>
                Notice the useful scandal: <strong>{largest.label}</strong> had the largest
                individual probability (
                {percent(checkpoint.conditionalProbabilities[largest.id], 1)}), but the draw
                selected a different topic. Sampling is not argmax.
              </>
            ) : (
              <>The selected topic also had the largest individual probability on this visit.</>
            )}
          </>
        ) : (
          <>
            R=0 is the seeded random initialization, not a Gibbs draw. The bars preview the
            conditional probabilities obtained by temporarily removing this initial assignment; the
            token remains in{" "}
            <strong style={{ color: assignment?.color }}>{assignment?.label}</strong> until the
            first complete sweep.
          </>
        )}
      </p>
    </aside>
  )
}

function CaveatCard({ mark, title, children }) {
  return (
    <article className="ltc-caveat">
      <span aria-hidden="true">{mark}</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </article>
  )
}

export default function LDATopicCrucibleExamplePage() {
  const model = LDA_TOPIC_CRUCIBLE_MODEL
  const reducedMotion = useReducedMotion()
  const crucibleRef = useRef(null)
  const [iterationIndex, setIterationIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [paceMS, setPaceMS] = useState(1500)
  const [mediaReady, setMediaReady] = useState(false)
  const [documentVisible, setDocumentVisible] = useState(
    () => typeof document === "undefined" || !document.hidden,
  )
  const [compactLayout, setCompactLayout] = useState(false)
  const effectiveReducedMotion = mediaReady && reducedMotion
  const lastIndex = model.iterations.length - 1
  const iteration = model.iterations[iterationIndex]
  const atTerminal = iterationIndex === lastIndex

  useEffect(() => {
    setMediaReady(true)
  }, [])

  useEffect(() => {
    if (!effectiveReducedMotion) return
    setIterationIndex(lastIndex)
    setPaused(true)
  }, [effectiveReducedMotion, lastIndex])

  useEffect(() => {
    const updateVisibility = () => setDocumentVisible(!document.hidden)
    document.addEventListener("visibilitychange", updateVisibility)
    return () => document.removeEventListener("visibilitychange", updateVisibility)
  }, [])

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined
    const media = window.matchMedia("(max-width: 640px)")
    const updateCompactLayout = () => setCompactLayout(media.matches)
    updateCompactLayout()
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", updateCompactLayout)
      return () => media.removeEventListener("change", updateCompactLayout)
    }
    media.addListener(updateCompactLayout)
    return () => media.removeListener(updateCompactLayout)
  }, [])

  useEffect(() => {
    if (paused || effectiveReducedMotion || atTerminal || !documentVisible) return undefined
    const timer = window.setTimeout(
      () => setIterationIndex((current) => Math.min(lastIndex, current + 1)),
      paceMS,
    )
    return () => window.clearTimeout(timer)
  }, [
    atTerminal,
    documentVisible,
    effectiveReducedMotion,
    iterationIndex,
    lastIndex,
    paceMS,
    paused,
  ])

  useEffect(() => {
    if (atTerminal) setPaused(true)
  }, [atTerminal])

  const restart = useCallback(() => {
    setIterationIndex(0)
    setPaused(effectiveReducedMotion)
  }, [effectiveReducedMotion])

  const step = useCallback(() => {
    setPaused(true)
    setIterationIndex((current) => Math.min(lastIndex, current + 1))
  }, [lastIndex])

  const settle = useCallback(() => {
    setIterationIndex(lastIndex)
    setPaused(true)
  }, [lastIndex])

  const topicColumnById = useMemo(
    () => new Map(model.topics.map((topic) => [topic.id, topic.label.replace(/^Topic\s+/i, "")])),
    [model.topics],
  )
  const checkpointIndexByIteration = useMemo(
    () =>
      new Map(model.iterations.map((checkpoint, index) => [Number(checkpoint.iteration), index])),
    [model.iterations],
  )

  const topicByColumn = useMemo(
    () => new Map(model.topics.map((topic) => [topicColumnById.get(topic.id), topic])),
    [model.topics, topicColumnById],
  )

  const trailRows = useMemo(
    () =>
      model.wordTrails.map((row) => {
        const checkpointIndex = checkpointIndexByIteration.get(Number(row.iteration ?? row.segment))
        const checkpoint = model.iterations[checkpointIndex]
        const probabilityAcrossTopics = model.topics.reduce(
          (total, topic) =>
            total + probability(checkpoint?.topicWordProbabilities?.[topic.id]?.[row.word]),
          0,
        )
        const { share, distinctiveness } = normalizedTopicExclusivity(
          checkpoint?.topicWordProbabilities?.[row.topicId]?.[row.word],
          probabilityAcrossTopics,
          model.topics.length,
        )
        return {
          ...row,
          topicColumn: topicColumnById.get(row.topicId),
          checkpointIndex,
          share,
          distinctiveness,
          tint: distinctivenessTint(distinctiveness),
        }
      }),
    [checkpointIndexByIteration, model.iterations, model.topics, model.wordTrails, topicColumnById],
  )

  const wordTrailsConfig = useMemo(
    () => ({
      textAccessor: "word",
      weightAccessor: "weight",
      columnAccessor: "topicColumn",
      segmentAccessor: "checkpointIndex",
      segmentDomain: [0, lastIndex],
      columnOrder: model.topics.map((topic) => topicColumnById.get(topic.id)),
      minFontSize: 9,
      maxFontSize: 29,
      collisionPadding: 1,
      repeatWords: true,
      scaleToFit: true,
      packingDensity: 0.68,
      segmentTickCount: model.iterations.length,
      segmentAxisLabel: "R · complete Gibbs sweeps →",
      segmentTickFormat: (value) => "R=" + model.iterations[Math.round(value)]?.iteration,
      columnColor: (column) => TRAIL_TOPIC_COLOR[topicByColumn.get(column)?.id],
      wordColor: ({ datum, resolvedColumnColor }) =>
        trailTintColor(resolvedColumnColor, datum.tint ?? 0),
      ...wordTrailsProgressiveReveal({
        currentSegment: iterationIndex,
        segmentDomain: [0, lastIndex],
      }),
    }),
    [iterationIndex, lastIndex, model.iterations, model.topics, topicByColumn, topicColumnById],
  )

  const trailTooltip = useCallback(
    (hover) => {
      const datum = hover?.data ?? {}
      const checkpointIndex = Math.round(Number(datum.checkpointIndex ?? datum.segment ?? 0))
      const checkpoint = model.iterations[checkpointIndex]
      const topic = topicByColumn.get(String(datum.topicColumn ?? datum.column))
      return (
        <div className="ltc-trail-tooltip">
          <strong>{datum.word}</strong>
          <span>{topic?.label ?? "Topic " + datum.column}</span>
          <span>φ = {percent(datum.weight, 1)}</span>
          <span>topic share = {percent(datum.share, 1)}</span>
          <span>exclusivity = {percent(datum.distinctiveness, 1)}</span>
          <span>recorded at R={checkpoint?.iteration ?? "—"}</span>
        </div>
      )
    },
    [model.iterations, topicByColumn],
  )

  const firstPhase = model.crucible.phases[0]
  const lastPhase = model.crucible.phases[model.crucible.phases.length - 1]
  const crucibleSnapshot = atTerminal
    ? { phaseId: lastPhase.id, progress: 1 }
    : { phaseId: firstPhase.id, progress: 1 }
  const cruciblePlayback = atTerminal && !effectiveReducedMotion ? "replay" : "snapshot"
  const status = effectiveReducedMotion
    ? "Motion reduced · static checkpoint R=" + iteration.iteration
    : atTerminal
      ? "Fit held at R=" + iteration.iteration
      : paused
        ? "Paused at R=" + iteration.iteration
        : "Sampling · R=" + iteration.iteration

  return (
    <ExamplePageLayout title="The Latent Crucible">
      <div className="latent-topic-crucible">
        <header className="ltc-hero">
          <div className="ltc-binder-holes" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className="ltc-hero-copy">
            <p className="ltc-eyebrow">LDA topic modeling × Word Trails · model notebook 02.1</p>
            <h2>
              The Latent
              <span>Crucible</span>
            </h2>
            <p className="ltc-lede">
              We observe the words. We do not observe the topics. LDA proposes that documents are
              mixtures, topics are distributions, and every token is a small act of probabilistic
              allegiance. Then inference begins the long business of revising its guesses.
            </p>
          </div>
          <aside className="ltc-hero-note">
            <span>LAB NOTE / READ FIRST</span>
            <strong>Topics do not lurk in the corpus like ore.</strong>
            <p>
              They are fitted statistical components. Their names are ours; their uncertainty is the
              model’s; their usefulness remains an argument.
            </p>
          </aside>
        </header>

        <main className="ltc-body">
          <blockquote className="ltc-method-quote">
            <p>“Tools are enshrined methodologies.”</p>
            <cite>
              Elijah Meeks and Scott B. Weingart, co-guest editors,{" "}
              <a
                href="https://journalofdigitalhumanities.org/2-1/dh-contribution-to-topic-modeling/"
                target="_blank"
                rel="noreferrer"
              >
                Journal of Digital Humanities 2.1
              </a>
            </cite>
          </blockquote>

          <section className="ltc-section">
            <SectionHeading index="A" title="The model’s wager">
              LDA tells a generative story and inference runs that story backward. The computer sees
              the words below and repeatedly asks which latent assignment would be plausible given
              all the other assignments.
            </SectionHeading>
            <GenerativeRecipe />
            <div className="ltc-margin-note">
              <strong>Forward story:</strong> proportions → topic → word. <strong>Our task:</strong>{" "}
              words → plausible topic assignments and proportions. The arrow reverses; the
              uncertainty does not disappear.
            </div>
          </section>

          <section className="ltc-section">
            <SectionHeading index="B" title="A deliberately tiny corpus">
              This miniature is small enough to inspect token by token. It is a seeded teaching run,
              not a result about literature, politics, or any other world outside this notebook.
            </SectionHeading>
            <SpecimenStrip model={model} />
            <CorpusCards documents={model.documents} topics={model.topics} iteration={iteration} />
          </section>

          <section className="ltc-section ltc-section--instrument">
            <SectionHeading index="C" title="Run the sampler">
              One R is one complete Gibbs sweep: visit every retained token, temporarily remove its
              assignment, calculate its conditional topic probabilities, and draw a replacement. The
              recorded R values are front-loaded—0, 1, 2, 4—so early turbulence remains inspectable
              before the trace takes longer jumps.
            </SectionHeading>

            <div className="ltc-console" role="group" aria-label="LDA iteration controls">
              <div className="ltc-console-topline">
                <div>
                  <span>ACTIVE CHECKPOINT</span>
                  <strong>R = {iteration.iteration}</strong>
                </div>
                <label htmlFor="ltc-pace">
                  Pace
                  <select
                    id="ltc-pace"
                    value={paceMS}
                    onChange={(event) => setPaceMS(Number(event.target.value))}
                    disabled={effectiveReducedMotion}
                  >
                    {PACE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="ltc-transport">
                  <button
                    type="button"
                    onClick={() => setPaused((value) => !value)}
                    disabled={effectiveReducedMotion || atTerminal}
                  >
                    {paused ? "Resume" : "Pause"}
                  </button>
                  <button type="button" onClick={restart}>
                    Restart
                  </button>
                  <button type="button" onClick={step} disabled={atTerminal}>
                    Next checkpoint
                  </button>
                  <button type="button" onClick={settle} disabled={atTerminal}>
                    Settle
                  </button>
                </div>
              </div>

              <label className="ltc-scrubber" htmlFor="ltc-iteration">
                <span className="ltc-visually-hidden">Model iteration checkpoint</span>
                <input
                  id="ltc-iteration"
                  type="range"
                  min="0"
                  max={lastIndex}
                  step="1"
                  value={iterationIndex}
                  aria-valuetext={"Gibbs sweep " + iteration.iteration}
                  onChange={(event) => {
                    setPaused(true)
                    setIterationIndex(Number(event.target.value))
                  }}
                />
                <span className="ltc-checkpoints" aria-hidden="true">
                  {model.iterations.map((checkpoint, index) => (
                    <i
                      key={checkpoint.iteration}
                      className={index <= iterationIndex ? "is-past" : ""}
                    >
                      {checkpoint.iteration}
                    </i>
                  ))}
                </span>
              </label>
              <p className="ltc-status" role="status" aria-live="polite">
                {status}
              </p>
            </div>

            <div className="ltc-sampler-formula">
              <span>THE WEIGHING RULE</span>
              <code>{model.algorithm.formula}</code>
              <p>
                In plain language: the document’s affinity for a topic × the word’s affinity for
                that topic ÷ the topic’s size, with α and β smoothing the counts; then normalize
                across K and sample.
              </p>
            </div>
            <SamplerReadout iteration={iteration} tokenCount={model.tokenCount} />
            <TrackedToken model={model} iterationIndex={iterationIndex} />
          </section>

          <section className="ltc-section">
            <SectionHeading index="D" title="Watch the topics congeal">
              Each Word Trails column is a topic. The vertical axis is not historical time: it is R,
              the sampler’s iteration count. A word’s size is its estimated probability at that
              checkpoint. Hue identifies the topic; tint measures topic exclusivity independently of
              time. Divide that word’s probability in this topic by its summed probability across
              all four topics, subtract the uniform 25% baseline, and rescale the remainder from
              zero to one. The result is binned into neutral ink, 25%, 50%, or 100% of the column
              color. Neutral is white on the dark plot and dark ink on the light plot, so shared
              words remain legible in either theme. Opacity carries recency: the active checkpoint
              is fully present, fading linearly to 25% for the oldest visible R. Recorded
              checkpoints are evenly spaced for legibility, while their labels retain the actual R;
              no unrecorded intermediate states are implied.
            </SectionHeading>
            <div className="ltc-trails-key">
              {model.topics.map((topic) => (
                <span key={topic.id}>
                  <i style={{ "--topic-color": TRAIL_TOPIC_COLOR[topic.id] }} /> {topic.label}
                </span>
              ))}
            </div>
            <div className="ltc-trails-encoding" aria-label="Topic-word color and opacity legend">
              <div>
                <strong>EXCLUSIVITY</strong>
                <span className="ltc-distinctiveness-ramp" aria-hidden="true">
                  {[0, 0.25, 0.5, 1].map((tint) => (
                    <i
                      key={tint}
                      style={{ background: trailTintColor(TRAIL_TOPIC_COLOR["topic-2"], tint) }}
                    />
                  ))}
                </span>
                <span>neutral/shared → topic-exclusive</span>
              </div>
              <div>
                <strong>RECENCY</strong>
                <span className="ltc-recency-ramp" aria-hidden="true">
                  {[0.25, 0.5, 0.75, 1].map((opacity) => (
                    <i key={opacity} style={{ opacity }} />
                  ))}
                </span>
                <span>oldest visible R → current R</span>
              </div>
            </div>
            <p className="ltc-mobile-scroll-hint">
              Scroll sideways to inspect all four topic columns.
            </p>
            <div
              className="ltc-chart-paper"
              role="region"
              aria-label="Scrollable topic-word trace"
              tabIndex={compactLayout ? 0 : undefined}
            >
              <OrdinalCustomChart
                data={trailRows}
                layout={wordTrailsLayout}
                layoutConfig={wordTrailsConfig}
                categoryAccessor="topicColumn"
                valueAccessor="weight"
                width={1010}
                height={650}
                responsiveWidth
                enableHover
                frameProps={{ tooltipContent: trailTooltip }}
                margin={{ top: 18, right: 18, bottom: 14, left: 28 }}
                title={"Topic-word trace · R=" + iteration.iteration}
                description="Columns represent topics; vertical position represents evenly spaced recorded Gibbs checkpoints labeled with their actual iteration R; font size represents estimated word probability at that checkpoint."
              />
              <span className="ltc-plot-label">RECORDED SAMPLER TRACE / TOP-WORD SLICE</span>
            </div>
            <p className="ltc-caption">
              A word type may appear in several columns because topics are distributions over a
              shared vocabulary. Repetition is not a bug to tidy away; it is the model. Unreached
              checkpoints reserve layout space but emit no glyph or hit target, so earlier words do
              not jump when the next R appears. Tint compares the same word across topics; size
              remains its within-topic probability.
            </p>
          </section>

          <section className="ltc-section">
            <SectionHeading index="E" title="Read both distributions">
              LDA’s output has two complementary faces. The cards rank words within each topic (φ,
              “phi”); the bars divide each document across topics (θ, “theta”). Neither face is
              adequately summarized by assigning one label to one document.
            </SectionHeading>
            <TopicCards topics={model.topics} iteration={iteration} />
            <TopicMixtureBars
              documents={model.documents}
              topics={model.topics}
              iteration={iteration}
            />
          </section>

          <section className="ltc-section">
            <SectionHeading index="F" title="Quench the final assignment">
              The Crucible below does not run Gibbs sampling. It receives the recorded word-topic
              counts from R={model.iterations[lastIndex].iteration} and pours those allocations into
              final topic products. Before the final checkpoint it stays charged but unpoured,
              making the boundary between inference and presentation explicit. Its replay is a
              separate three-beat presentation—recorded charge, allocate fixed counts, quench:
              restarting the sampler is neither required nor implied.
            </SectionHeading>
            <div className="ltc-quench-transport" role="group" aria-label="Final pour controls">
              <button
                type="button"
                onClick={() => crucibleRef.current?.replay()}
                disabled={!atTerminal || effectiveReducedMotion}
              >
                Replay final pour
              </button>
              <span role="status">
                {!atTerminal
                  ? `Available when the sampler reaches R=${model.iterations[lastIndex].iteration}.`
                  : effectiveReducedMotion
                    ? "Reduced motion is active; the terminal allocation is shown as a snapshot."
                    : "Replays the recorded terminal allocation without rerunning inference."}
              </span>
            </div>
            <div className={"ltc-crucible-shell " + (atTerminal ? "is-quenched" : "is-waiting")}>
              {!atTerminal && (
                <div className="ltc-quench-lock">
                  <span>FINAL POUR HELD</span>
                  <strong>Continue to R={model.iterations[lastIndex].iteration}</strong>
                </div>
              )}
              <CrucibleChart
                key={`lda-terminal-${atTerminal ? "pour" : "held"}`}
                ref={crucibleRef}
                data={model.crucible.data}
                phases={model.crucible.phases}
                products={model.crucible.products}
                outlets={model.crucible.outlets}
                events={model.crucible.events}
                idAccessor="id"
                labelAccessor="label"
                categoryAccessor="category"
                amountAccessor="amount"
                metricsAccessor="metrics"
                amountLabel="token occurrences"
                conservation
                size={[1010, 520]}
                responsiveWidth
                playback={cruciblePlayback}
                snapshotAt={cruciblePlayback === "snapshot" ? crucibleSnapshot : undefined}
                paused={!documentVisible}
                playbackRate={model.crucible.playbackRate}
                controls={false}
                projection={{ groupBy: "product", measure: "amount" }}
                colorBy="product"
                bodyRadius={5}
                showBonds={false}
                showChrome
                showProjection={!compactLayout}
                seed="lda-terminal-quench"
                title="Final topic allocation"
                description="A deterministic projection of recorded terminal word-topic counts into topic products. The Crucible does not perform the statistical inference."
              />
            </div>
            <div className="ltc-boundary-stamp">
              <strong>COMPUTATION</strong> collapsed Gibbs sampler
              <span aria-hidden="true">→</span>
              <strong>PROJECTION</strong> bounded Crucible event tape
            </div>
          </section>

          <section className="ltc-section">
            <SectionHeading index="G" title="Six notes against enchantment">
              Coherent-looking columns arrive quickly; warranted interpretation does not. Keep these
              six penciled objections beside every polished topic display.
            </SectionHeading>
            <div className="ltc-caveat-grid">
              <CaveatCard mark="K" title="We chose the number of topics">
                The model did not discover that this corpus contains exactly {model.topics.length}{" "}
                subjects. K was fixed before inference, and another K would make another account.
              </CaveatCard>
              <CaveatCard mark="≋" title="Word order is absent">
                Standard LDA treats a document as an exchangeable bag of tokens. Syntax, negation,
                voice, irony, and sequence do not enter this likelihood.
              </CaveatCard>
              <CaveatCard mark="αβ" title="Priors exert pressure">
                Dirichlet hyperparameters reward some kinds of sparsity and mixture. Tokenization,
                stopword removal, vocabulary limits, and the random seed also shape the result.
              </CaveatCard>
              <CaveatCard mark="R" title="Stability is not truth">
                Fewer moving assignments suggest this chain is settling. They do not certify that
                its topics are unique, meaningful, or adequate to a scholarly question.
              </CaveatCard>
              <CaveatCard mark="Aa" title="Labels are annotations">
                These topic numbers are anonymous exchangeable handles. Their terse interpretations
                were added after inspecting high-weight words; LDA does not name concepts.
              </CaveatCard>
              <CaveatCard mark="…" title="The display is a top slice">
                Each topic assigns probability to the whole retained vocabulary. Word Trails shows a
                legible leading subset, while the complete count state remains in the model.
              </CaveatCard>
            </div>
          </section>

          <footer className="ltc-sources">
            <strong>Notebook sources &amp; further reading</strong>
            <p>
              This example takes its methodological cue from the topic-modeling special issue of the{" "}
              <em>Journal of Digital Humanities</em>, co-guest-edited by Elijah Meeks and Scott B.
              Weingart. See their{" "}
              <a
                href="https://journalofdigitalhumanities.org/2-1/dh-contribution-to-topic-modeling/"
                target="_blank"
                rel="noreferrer"
              >
                editorial introduction
              </a>
              ; David Blei’s{" "}
              <a
                href="https://journalofdigitalhumanities.org/2-1/topic-modeling-and-digital-humanities-by-david-m-blei/"
                target="_blank"
                rel="noreferrer"
              >
                account of probabilistic topic models
              </a>
              ; and Griffiths and Steyvers’{" "}
              <a
                href="https://www.pnas.org/doi/10.1073/pnas.0307752101"
                target="_blank"
                rel="noreferrer"
              >
                Gibbs-sampling paper
              </a>
              . For the boundary between the model and this implementation, compare Blei, Ng, and
              Jordan’s{" "}
              <a
                href="https://www.jmlr.org/papers/v3/blei03a.html"
                target="_blank"
                rel="noreferrer"
              >
                original LDA paper and its variational route
              </a>{" "}
              with the{" "}
              <a href="https://mimno.github.io/Mallet/topics" target="_blank" rel="noreferrer">
                MALLET topic-modeling guide
              </a>
              —a familiar Gibbs implementation. The corpus and trace here are a purpose-written
              didactic miniature generated with a fixed seed. The visual grammar recasts{" "}
              <a
                href="https://gist.github.com/emeeks/19a1d77fc6ad812faedb648218b7ad60"
                target="_blank"
                rel="noreferrer"
              >
                Elijah Meeks’s 2016 Word Trails
              </a>{" "}
              from speaker columns and debate position into topic columns and inference checkpoints.
              Learn the display primitives in <Link to="/recipes/word-trails">Word Trails</Link> and
              the <Link to="/charts/crucible-chart">CrucibleChart API</Link>.
            </p>
          </footer>
        </main>
      </div>
    </ExamplePageLayout>
  )
}
