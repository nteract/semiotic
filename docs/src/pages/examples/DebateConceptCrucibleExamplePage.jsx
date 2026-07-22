import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { OrdinalCustomChart } from "semiotic/ordinal"
import { CrucibleChart } from "semiotic/physics"
import { wordTrailsLayout } from "semiotic/recipes"
import { useReducedMotion } from "semiotic/utils"
import ExamplePageLayout from "./ExamplePageLayout"
import { DEBATE_WORD_TRAILS, SEGMENTS } from "../../examples/recipes/data/debateWordTrails"
import { DEBATE_CONCEPT_ASSAYS, TRANSCRIPT_ARTIFACTS } from "./data/debateConceptCrucible"
import "./DebateConceptCrucibleExamplePage.css"

const ROLE_COLOR = {
  dem: "var(--rc-trail-dem)",
  rep: "var(--rc-trail-rep)",
  host: "var(--rc-trail-host)",
}

const PLAYBACK_RATES = [
  { value: 0.25, label: "Quarter speed" },
  { value: 0.5, label: "Half speed" },
  { value: 0.75, label: "Three-quarter speed" },
  { value: 1, label: "Normal speed" },
]

const RERUN_OPTIONS = [
  { value: "none", label: "Do not rerun" },
  { value: "1500", label: "Rerun after 1.5 s" },
  { value: "3000", label: "Rerun after 3 s" },
  { value: "6000", label: "Rerun after 6 s" },
]

function mixPartyColor(counts = [0, 0, 0]) {
  const [rep, dem, host] = counts
  const weightedColors = [
    [ROLE_COLOR.rep, rep],
    [ROLE_COLOR.dem, dem],
    [ROLE_COLOR.host, host],
  ].filter(([, weight]) => weight > 0)
  if (!weightedColors.length) return "var(--rc-trail-neutral)"
  const [first, ...rest] = weightedColors
  return rest.reduce(
    (mixture, [color, weight]) => ({
      color: `color-mix(in srgb, ${mixture.color} ${(
        (mixture.weight / (mixture.weight + weight)) *
        100
      ).toFixed(2)}%, ${color})`,
      weight: mixture.weight + weight,
    }),
    { color: first[0], weight: first[1] },
  ).color
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value || 0))
}

function SectionHeading({ number, title, children }) {
  return (
    <div className="rc-section-heading">
      <span className="rc-section-number" aria-hidden="true">
        {number}
      </span>
      <div>
        <h2>{title}</h2>
        {children && <p className="rc-section-intro">{children}</p>}
      </div>
    </div>
  )
}

function dispositionForWord(candidate, word) {
  return candidate.ledger.find((entry) => entry.word === word) ?? null
}

function FollowWordCard({ candidates, word }) {
  const sides = candidates.map((candidate) => ({
    candidate,
    entry: dispositionForWord(candidate, word),
  }))

  return (
    <div className="rc-follow-card" aria-label={`Disposition of ${word} for both candidates`}>
      <FollowWordSide {...sides[0]} />
      <div className="rc-follow-word">
        <div>
          <span className="rc-small-caps">Follow one word</span>
          <strong>{word.toUpperCase()}</strong>
          <p>Same spelling. Different temporal company.</p>
        </div>
      </div>
      <FollowWordSide {...sides[1]} />
    </div>
  )
}

function FollowWordSide({ candidate, entry }) {
  if (!candidate) return null
  return (
    <div className="rc-follow-side" data-role={candidate.role}>
      <span className="rc-candidate-tag">{candidate.speaker}</span>
      <p>
        {entry?.disposition === "alloyed" ? (
          <>
            leaves in <strong>{entry.destinationLabel}</strong>
          </>
        ) : (
          <>
            leaves <strong>unalloyed</strong>
          </>
        )}
      </p>
      <p>{entry?.reason ?? "The word was not admitted to this candidate’s charge."}</p>
    </div>
  )
}

function ProductCard({ candidate, product }) {
  const members = candidate.data
    .filter((datum) => datum.productId === product.id)
    .map((datum) => datum.word)
  return (
    <article className="rc-product-card" style={{ "--card-color": candidate.color }}>
      <span className="rc-docket-label">{candidate.speaker} · temporal alloy</span>
      <h3>{product.label}</h3>
      <p>{members.join(" · ")}</p>
      <span className="rc-assay-stamp">
        {members.length} words · {product.amount} uses
      </span>
    </article>
  )
}

function CandidateLedger({ candidates }) {
  const rows = candidates.flatMap((candidate) =>
    candidate.ledger.map((entry) => ({ ...entry, candidate })),
  )
  return (
    <details className="rc-ledger">
      <summary>Open the complete disposition ledger · {rows.length} admitted words</summary>
      <div className="rc-table-scroll">
        <table className="rc-table">
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Rank</th>
              <th>Word</th>
              <th>Uses</th>
              <th>Disposition</th>
              <th>Destination</th>
              <th>Recorded basis</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.candidate.speaker}</td>
                <td>{entry.admissionRank}</td>
                <td>
                  <strong>{entry.word}</strong>
                </td>
                <td>{entry.total}</td>
                <td>{entry.disposition}</td>
                <td>{entry.destinationLabel}</td>
                <td>{entry.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

export default function DebateConceptCrucibleExamplePage() {
  const reducedMotion = useReducedMotion()
  const [debateId, setDebateId] = useState("2016")
  const [followWord, setFollowWord] = useState("jobs")
  const [playbackRate, setPlaybackRate] = useState(0.75)
  const [rerunMS, setRerunMS] = useState(3000)
  const [paused, setPaused] = useState(false)
  const [chartStates, setChartStates] = useState({})
  const chartRefs = useRef({})

  const assay = useMemo(
    () => DEBATE_CONCEPT_ASSAYS.find((item) => item.debate.id === debateId),
    [debateId],
  )
  const debate = useMemo(() => DEBATE_WORD_TRAILS.find((item) => item.id === debateId), [debateId])

  useEffect(() => {
    setFollowWord(assay.defaultFollowWord)
    setChartStates({})
    setPaused(reducedMotion)
  }, [assay, reducedMotion])

  const setChartRef = useCallback((candidateId, handle) => {
    if (handle) chartRefs.current[candidateId] = handle
    else delete chartRefs.current[candidateId]
  }, [])

  const updateChartState = useCallback((candidateId, state) => {
    setChartStates((current) => {
      const previous = current[candidateId]
      if (
        previous &&
        previous.phaseIndex === state.phaseIndex &&
        previous.complete === state.complete &&
        Math.abs(previous.elapsed - state.elapsed) < 0.12
      ) {
        return current
      }
      return { ...current, [candidateId]: state }
    })
  }, [])

  const resetRun = useCallback(() => {
    setChartStates({})
    setPaused(reducedMotion)
    Object.values(chartRefs.current).forEach((handle) => handle?.replay?.())
  }, [reducedMotion])

  const settleRun = useCallback(() => {
    Object.values(chartRefs.current).forEach((handle) => handle?.settle?.())
    setPaused(true)
  }, [])

  const stepRun = useCallback(() => {
    setPaused(true)
    Object.values(chartRefs.current).forEach((handle) => handle?.stepPhase?.())
  }, [])

  const selectDebate = useCallback((nextDebateId) => {
    setDebateId(nextDebateId)
  }, [])

  const changePlaybackRate = useCallback((event) => {
    setPlaybackRate(Number(event.target.value))
    setChartStates({})
    setPaused(false)
    Object.values(chartRefs.current).forEach((handle) => handle?.replay?.())
  }, [])

  const primaryState = chartStates[assay.candidates[0]?.id]
  const totalDuration = assay.phases.reduce((total, phase) => total + phase.duration, 0)
  const progress = reducedMotion
    ? 1
    : clamp01((primaryState?.elapsed ?? 0) / Math.max(1, totalDuration))
  const activePhase =
    assay.phases[primaryState?.phaseIndex ?? 0] ?? assay.phases[assay.phases.length - 1]
  const status = reducedMotion
    ? "Motion reduced · terminal assay shown"
    : primaryState?.complete
      ? paused
        ? "Assay complete · auto-rerun paused"
        : rerunMS == null
          ? "Assay complete"
          : `Assay complete · reruns in ${(rerunMS / 1000).toFixed(1)} s`
      : paused
        ? `Paused · ${activePhase.label}`
        : `Running · ${activePhase.label}`

  const galleyData = useMemo(
    () =>
      debate.words
        .filter((row) => !TRANSCRIPT_ARTIFACTS.has(row.word))
        .map((row) => ({
          ...row,
          mixtureColor: mixPartyColor(debate.wordParty[row.word]),
        })),
    [debate],
  )

  const wordTrailsConfig = useMemo(
    () => ({
      textAccessor: "word",
      weightAccessor: "weight",
      columnAccessor: "speaker",
      segmentAccessor: "segment",
      segmentDomain: [0, SEGMENTS - 1],
      columnOrder: debate.columnOrder,
      minFontSize: 10,
      maxFontSize: 42,
      collisionPadding: 2,
      repeatWords: false,
      scaleToFit: true,
      packingDensity: 0.52,
      segmentAxisLabel: "Debate position →",
      segmentTickFormat: (value) => `${Math.round((value / (SEGMENTS - 1)) * 100)}%`,
      columnColor: (speaker) => ROLE_COLOR[debate.parties[speaker]],
      wordColor: ({ word, datum }) =>
        word === followWord
          ? "var(--rc-trail-highlight)"
          : (datum.mixtureColor ?? "var(--rc-trail-neutral)"),
    }),
    [debate, followWord],
  )

  const terminalSnapshot = useMemo(
    () => ({
      phaseId: assay.phases[assay.phases.length - 1].id,
      progress: 1,
    }),
    [assay],
  )

  return (
    <ExamplePageLayout title="The Rhetorical Crucible">
      <div className="rhetorical-crucible">
        <header className="rc-masthead">
          <div>
            <p className="rc-kicker">A lexical assay in three presidential debates</p>
            <h2 className="rc-display-title">
              The Rhetorical <span>Crucible</span>
            </h2>
            <p className="rc-deck">
              A debate is commonly advertised as an exchange of ideas, a description so hygienic as
              to miss the smoke. Here the words enter separately, endure the same hour, and leave
              either in company or in the tray reserved for the rhetorically unattached.
            </p>
          </div>
          <aside className="rc-issue-box">
            <strong>Method, briefly</strong>
            Twenty equal token-position bins. Twelve admitted words per candidate. Full-profile
            cosine similarity. Three alloys at most. Every disposition accounted for.
          </aside>
        </header>

        <div className="rc-body">
          <div className="rc-editorial-note">
            <p>
              Each candidate receives a separate retort. The apparatus therefore observes temporal
              companionship, not political agreement, and it emphatically does not award a winner.
              The physics supplies the commotion; the ledger, less theatrically, supplies the truth.
            </p>
          </div>

          <div className="rc-controls" aria-label="Debate assay controls">
            <div className="rc-control-row">
              <span className="rc-control-label">Debate</span>
              {DEBATE_CONCEPT_ASSAYS.map((item) => (
                <button
                  className="rc-tab"
                  type="button"
                  key={item.debate.id}
                  aria-pressed={item.debate.id === debateId}
                  onClick={() => selectDebate(item.debate.id)}
                >
                  {item.debate.id}
                </button>
              ))}
              <span className="rc-status">{assay.debate.label}</span>
            </div>

            <div className="rc-control-row">
              <label className="rc-control-label" htmlFor="rc-follow-word">
                Follow word
              </label>
              <select
                className="rc-select"
                id="rc-follow-word"
                value={followWord}
                onChange={(event) => setFollowWord(event.target.value)}
              >
                {assay.sharedWords.map((item) => (
                  <option value={item.word} key={item.word}>
                    {item.word}
                  </option>
                ))}
              </select>
              <label className="rc-control-label" htmlFor="rc-playback-rate">
                Furnace pace
              </label>
              <select
                className="rc-select"
                id="rc-playback-rate"
                value={playbackRate}
                onChange={changePlaybackRate}
                disabled={reducedMotion}
              >
                {PLAYBACK_RATES.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <label className="rc-control-label" htmlFor="rc-rerun-delay">
                Auto-rerun
              </label>
              <select
                className="rc-select"
                id="rc-rerun-delay"
                value={rerunMS == null ? "none" : String(rerunMS)}
                onChange={(event) =>
                  setRerunMS(event.target.value === "none" ? null : Number(event.target.value))
                }
                disabled={reducedMotion}
              >
                {RERUN_OPTIONS.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="rc-control-row">
              <span className="rc-control-label">Transport</span>
              <button
                className="rc-button"
                type="button"
                onClick={() => setPaused((value) => !value)}
                disabled={reducedMotion}
              >
                {paused ? "Resume" : "Pause"}
              </button>
              <button className="rc-button" type="button" onClick={resetRun}>
                Restart now
              </button>
              <button
                className="rc-button"
                type="button"
                onClick={stepRun}
                disabled={reducedMotion}
              >
                Next phase
              </button>
              <button className="rc-button" type="button" onClick={settleRun}>
                Show result
              </button>
              <span className="rc-status" role="status" aria-live="polite">
                {status}
              </span>
            </div>
          </div>

          <section className="rc-section">
            <SectionHeading number="I" title="The charge enters in public">
              The Word Trails galley retains chronology: a word’s height is where it peaked in the
              transcript, its size is that peak-bin count, and its hue records which voices used it.
              The brass word is the one followed through both candidate retorts below.
            </SectionHeading>
            <div className="rc-encoding-key" aria-label="Word Trails encoding key">
              <span>
                <i className="rc-swatch" style={{ "--swatch": ROLE_COLOR.dem }} /> Democrat
              </span>
              <span>
                <i className="rc-swatch" style={{ "--swatch": ROLE_COLOR.rep }} /> Republican
              </span>
              <span>
                <i className="rc-swatch" style={{ "--swatch": ROLE_COLOR.host }} /> Moderator
              </span>
              <span>
                <i className="rc-swatch rc-swatch--shared" /> Mixed hue = shared usage
              </span>
            </div>
            <div className="rc-galley">
              <div className="rc-word-trails">
                <OrdinalCustomChart
                  key={`${debateId}-${followWord}`}
                  data={galleyData}
                  layout={wordTrailsLayout}
                  layoutConfig={wordTrailsConfig}
                  categoryAccessor="speaker"
                  valueAccessor="weight"
                  width={980}
                  height={555}
                  responsiveWidth
                  margin={{ top: 16, right: 14, bottom: 12, left: 18 }}
                  title={`Lexical chronology · ${assay.debate.label}`}
                  description="Words are arranged by speaker and peak position in the debate. Size represents the retained peak-bin count; color represents usage across the candidates and moderator."
                />
              </div>
            </div>
            <div className="rc-playhead-readout">
              <span>Opening</span>
              <div className="rc-playhead-track" style={{ "--progress": progress }}>
                <span />
              </div>
              <span>Closing</span>
            </div>
          </section>

          <section className="rc-section">
            <SectionHeading number="II" title="Two retorts, one clock">
              Candidate vocabularies are processed independently against the same five-part
              chronology. Near-matching 20-bin profiles open an alloy; later words may join only
              when their mean similarity clears the declared threshold.
            </SectionHeading>
            <div className="rc-furnace-shell">
              <div className="rc-double-retort">
                {assay.candidates.map((candidate) => (
                  <article className="rc-retort" data-role={candidate.role} key={candidate.id}>
                    <header className="rc-retort-header">
                      <strong>{candidate.speaker}</strong>
                      <span className="rc-candidate-tag">{candidate.roleLabel} retort</span>
                    </header>
                    <div className="rc-retort-viz">
                      <CrucibleChart
                        ref={(handle) => setChartRef(candidate.id, handle)}
                        data={candidate.data}
                        phases={candidate.phases}
                        products={candidate.products}
                        outlets={candidate.outlets}
                        events={candidate.events}
                        idAccessor="id"
                        labelAccessor="label"
                        categoryAccessor="disposition"
                        amountAccessor="amount"
                        amountLabel="uses"
                        conservation
                        size={[490, 410]}
                        responsiveWidth
                        playback={reducedMotion ? "snapshot" : "replay"}
                        snapshotAt={reducedMotion ? terminalSnapshot : undefined}
                        paused={reducedMotion || paused}
                        playbackRate={playbackRate}
                        rerunMS={reducedMotion ? null : rerunMS}
                        controls={false}
                        projection={{ groupBy: "product", measure: "amount" }}
                        colorBy="product"
                        showBonds
                        showChrome
                        showProjection
                        seed={`debate-${candidate.id}`}
                        title={`${candidate.speaker} lexical assay`}
                        description={`${candidate.speaker}'s twelve admitted words are routed into temporal alloys or an unalloyed outlet using a deterministic event tape.`}
                        onStateChange={
                          candidate.id === assay.candidates[0].id
                            ? (state) => updateChartState(candidate.id, state)
                            : undefined
                        }
                      />
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <FollowWordCard candidates={assay.candidates} word={followWord} />
            <p className="rc-section-intro">
              That is a pattern in this transcript, not an affidavit of motive. “Company” here means
              only that the words rose and fell at similar points in the debate.
            </p>
          </section>

          <section className="rc-section">
            <SectionHeading number="III" title="What survived the heat">
              The names below are deliberately unromantic: they contain only the words that formed
              them. No topic label, ideological diagnosis, or victory was smuggled in by the
              animation.
            </SectionHeading>
            <div className="rc-product-grid">
              {assay.candidates.flatMap((candidate) =>
                candidate.products.map((product) => (
                  <ProductCard candidate={candidate} product={product} key={product.id} />
                )),
              )}
            </div>
            <CandidateLedger candidates={assay.candidates} />
          </section>

          <section className="rc-section">
            <SectionHeading number="IV" title="The assayer’s fine print">
              A metaphor earns its keep by clarifying the rules under which it may be trusted. These
              are the rules, including the rather important ones that keep the furnace from
              manufacturing its own evidence.
            </SectionHeading>
            <div className="rc-method-columns">
              <p>
                The transcript is tokenized, common stopwords are removed, and each speaker’s
                remaining words are counted in twenty equal token-position bins. These are positions
                in a transcript, not minutes on a clock. The twelve most-used non-artifact words for
                each candidate constitute the admitted charge.
              </p>
              <p>
                Every admitted pair is compared by cosine similarity across all twenty bins. An
                unassigned pair scoring at least 0.65 may open an alloy. At most two more words may
                join when their mean similarity to its present members is at least 0.55. Each source
                word belongs to one destination only; no word is quietly duplicated for dramatic
                effect.
              </p>
              <p>
                Three products per candidate is the declared maximum. Whatever cannot qualify, or
                arrives after that limit closes, remains unalloyed with a recorded reason.
                “Crosstalk” and “nbsp” are transcript artifacts and are excluded before admission,
                rather than paraded as rhetorical waste.
              </p>
              <p>
                The same authored program is compiled afresh for 2012, 2016, and 2020. Selecting
                another debate does not repaint a previous conclusion; it reruns the assay on that
                debate’s own profiles. The chart animates assignments already present in the data
                compiler. It does not discover topics by collision.
              </p>
            </div>

            <div className="rc-docket-grid">
              <article className="rc-docket-card">
                <span className="rc-docket-label">Pre-charge exclusions</span>
                <h3>{assay.excludedArtifacts.length} transcript-artifact profiles</h3>
                <p>
                  {assay.excludedArtifacts.length
                    ? [...new Set(assay.excludedArtifacts.map((item) => item.word))].join(" · ")
                    : "None in this debate’s retained profiles."}
                </p>
              </article>
              <article className="rc-docket-card">
                <span className="rc-docket-label">Conservation</span>
                <h3>Twenty-four admitted sources</h3>
                <p>
                  Twelve per candidate; each closes in one alloy or one unalloyed outlet. The amount
                  ledger remains the original word-use count.
                </p>
              </article>
              <article className="rc-docket-card">
                <span className="rc-docket-label">Claim boundary</span>
                <h3>Timing, not meaning</h3>
                <p>{assay.summary.method}</p>
              </article>
            </div>

            <footer className="rc-source-note">
              Transcript sources in the generated fixture: 2012 and 2016, Commission on Presidential
              Debates transcripts via debates.org; 2020, the m-arg multimodal argumentation dataset.
              Read the <Link to="/recipes/word-trails">Word Trails recipe</Link> or the{" "}
              <Link to="/charts/crucible-chart">CrucibleChart API</Link>. This example’s
              deterministic compiler and complete ledger are included with the page source.
            </footer>
          </section>
        </div>
      </div>
    </ExamplePageLayout>
  )
}
