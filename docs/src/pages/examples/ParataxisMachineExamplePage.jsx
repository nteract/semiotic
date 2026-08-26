import React, { useEffect, useMemo, useState } from "react"
import { LinkedCharts, useSelectionActions } from "semiotic"
import useExplainerMotion from "../../hooks/useExplainerMotion"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  AmbiguityMatrix,
  AphorismDebtChart,
  ClauseConstellation,
  GenreSignatureChart,
} from "./parataxis-machine/ParataxisCharts"
import {
  APHORISM_LEDGER,
  CLAUSE_PAIRS,
  PARATAXIS_SPECTRUM,
  RELATION_META,
  SANDBOX_GENRES,
  buildMachineText,
} from "./parataxis-machine/parataxisData"
import "./ParataxisMachineExamplePage.css"

const SCENES = [
  ["gap", "DEFINITION"],
  ["collapse", "STRUCTURE"],
  ["field", "AMBIGUITY"],
  ["debt", "STYLE & EVIDENCE"],
  ["interface", "AI & INTERFACES"],
  ["machine", "TRY IT"],
]

const SYNTAX_MODES = {
  declared: {
    label: "Declared relation",
    connector: "because",
    units: ["She took the stairs", "the elevator was broken."],
    note: "The word “because” states that the broken elevator is the reason she took the stairs.",
  },
  adjacent: {
    label: "Paratactic",
    connector: "?",
    units: ["She took the stairs.", "The elevator was broken."],
    note: "Both clauses are complete. A reader can infer the reason, but the grammar does not state it.",
  },
  scattered: {
    label: "Fragmented",
    connector: "∅",
    units: ["Up the stairs.", "A broken elevator."],
    note: "Fragments remove parts of the clauses themselves. Fragmentation can accompany parataxis, but the two are not the same thing.",
  },
}

export default function ParataxisMachineExamplePage() {
  const { reducedMotion, systemReducedMotion, toggleReaderReducedMotion } = useExplainerMotion()
  const [heroConnectors, setHeroConnectors] = useState(false)
  const [pairId, setPairId] = useState(CLAUSE_PAIRS[0].id)
  const [selectedRelation, setSelectedRelation] = useState(null)
  const [syntaxMode, setSyntaxMode] = useState("adjacent")
  const [spectrumId, setSpectrumId] = useState("paratactic")
  const [readerRelation, setReaderRelation] = useState(null)
  const [ledgerId, setLedgerId] = useState(APHORISM_LEDGER[1].id)
  const [genreMetric, setGenreMetric] = useState("connectorSuppression")
  const [showInterfaceLinks, setShowInterfaceLinks] = useState(false)
  const [sandboxGenre, setSandboxGenre] = useState("model")
  const [clauseCount, setClauseCount] = useState(3)
  const [explicitness, setExplicitness] = useState(18)
  const [sandboxSeed, setSandboxSeed] = useState(0)
  const [showSandboxBridge, setShowSandboxBridge] = useState(false)

  const pair = CLAUSE_PAIRS.find((item) => item.id === pairId) ?? CLAUSE_PAIRS[0]
  const ledgerEntry = APHORISM_LEDGER.find((item) => item.id === ledgerId) ?? APHORISM_LEDGER[0]
  const spectrumEntry =
    PARATAXIS_SPECTRUM.find((item) => item.id === spectrumId) ?? PARATAXIS_SPECTRUM[2]
  const machineText = useMemo(
    () =>
      buildMachineText({
        genre: sandboxGenre,
        clauseCount,
        explicitness,
        seed: sandboxSeed,
      }),
    [clauseCount, explicitness, sandboxGenre, sandboxSeed],
  )
  const machineLines = useMemo(() => machineText.split("\n"), [machineText])
  const sandboxDanger = Math.round(Math.min(96, 34 + clauseCount * 9 + (100 - explicitness) * 0.34))

  const choosePair = (nextPair) => {
    setPairId(nextPair.id)
    setSelectedRelation(null)
  }

  return (
    <ExamplePageLayout title="Parataxis Machine">
      <LinkedCharts showLegend={false} selections={{ "parataxis-pair": { resolution: "union" } }}>
        <PairSelectionSync pairId={pair.id} />
      <div className={`parataxis-machine ${reducedMotion ? "is-reduced-motion" : ""}`}>
        <a className="pm-skip-link" href="#pm-narrative">
          Skip to the argument
        </a>

        <header className="pm-hero">
          <div className="pm-hero-grid" aria-hidden="true" />
          <div className="pm-hero-status">
            <span>INTERACTIVE EXPLAINER</span>
            <span>{heroConnectors ? "CONNECTORS SHOWN" : "CONNECTORS HIDDEN"}</span>
          </div>
          <div className="pm-orbit pm-orbit-a" aria-hidden="true" />
          <div className="pm-orbit pm-orbit-b" aria-hidden="true" />
          <p className="pm-eyebrow">LANGUAGE, RHETORIC AND AI</p>
          <h2>
            How sentences
            <br />
            <span>make connections</span>
          </h2>
          <p className="pm-hero-subtitle">
            Parataxis puts clauses next to one another and leaves their relationship unstated.
          </p>

          <div className="pm-hero-sentence" aria-live="polite">
            <ClauseCard index="01">I came.</ClauseCard>
            <GhostConnector visible={heroConnectors}>then</GhostConnector>
            <ClauseCard index="02">I saw.</ClauseCard>
            <GhostConnector visible={heroConnectors}>therefore</GhostConnector>
            <ClauseCard index="03">I left.</ClauseCard>
          </div>

          <button
            type="button"
            className="pm-main-switch"
            aria-pressed={heroConnectors}
            onClick={() => setHeroConnectors((current) => !current)}
          >
            <span aria-hidden="true">{heroConnectors ? "●" : "○"}</span>
            {heroConnectors ? "Hide connectors" : "Show connectors"}
          </button>

          <p className="pm-hero-declaration">
            Writers use parataxis to move quickly, create emphasis or preserve ambiguity. It also
            appears frequently in slogans, interfaces and AI-generated prose. This explainer shows
            how it works—and where it can mislead.
          </p>
          <div className="pm-definition">
            <span>PARATAXIS</span>
            <p>
              The placement of words, phrases or clauses side by side without language that fully
              explains how they are related. The units are not random; the reader infers part of the
              connection.
            </p>
          </div>
        </header>

        <nav className="pm-scene-rail" aria-label="Parataxis machine scenes">
          {SCENES.map(([id, label], index) => (
            <a key={id} href={`#${id}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {label}
            </a>
          ))}
          <button
            type="button"
            aria-pressed={reducedMotion}
            disabled={systemReducedMotion}
            onClick={toggleReaderReducedMotion}
          >
            {reducedMotion ? "MOTION: STILL" : "MOTION: LIVE"}
          </button>
        </nav>

        <div id="pm-narrative">
          <section id="gap" className="pm-section pm-section-gap">
            <SectionHeading
              number="01"
              kicker="WHAT THE TERM MEANS"
              title="Parataxis leaves the relationship between clauses unstated."
            >
              Select a pair of clauses, then add a possible connecting word. The clauses stay the
              same, but the interpretation changes.
            </SectionHeading>

            <div className="pm-specimen-selector" role="group" aria-label="Clause specimens">
              {CLAUSE_PAIRS.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={item.id === pair.id ? "is-active" : ""}
                  aria-pressed={item.id === pair.id}
                  onClick={() => choosePair(item)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{item.effect}</strong>
                  <small>{item.genre}</small>
                </button>
              ))}
            </div>

            <div className="pm-gap-console">
              <div className="pm-gap-console__sentence">
                <p>{pair.clauses[0]}</p>
                <div className={selectedRelation ? "pm-gap is-active" : "pm-gap"}>
                  <span>{selectedRelation ? RELATION_META[selectedRelation].connector : "?"}</span>
                  <small>UNSTATED RELATION</small>
                </div>
                <p>{pair.clauses[1]}</p>
              </div>
              <div className="pm-relation-bank" role="group" aria-label="Insert a relation">
                {Object.entries(pair.candidates)
                  .sort((left, right) => right[1] - left[1])
                  .map(([relation, confidence]) => (
                    <button
                      key={relation}
                      type="button"
                      aria-pressed={selectedRelation === relation}
                      className={selectedRelation === relation ? "is-active" : ""}
                      style={{ "--relation-color": RELATION_META[relation].color }}
                      onClick={() =>
                        setSelectedRelation((current) => (current === relation ? null : relation))
                      }
                    >
                      <span>{RELATION_META[relation].connector}</span>
                      <small>
                        {relation} · {confidence}/100
                      </small>
                    </button>
                  ))}
              </div>
              <p className="pm-gap-console__reading" aria-live="polite">
                <strong>
                  {selectedRelation ? RELATION_META[selectedRelation].label : "undeclared"}
                </strong>
                {selectedRelation
                  ? RELATION_META[selectedRelation].meaning
                  : "Several connecting words could fit. Parataxis leaves that choice to the reader."}
              </p>
            </div>

            <ClauseConstellation
              pair={pair}
              selectedRelation={selectedRelation}
              reducedMotion={reducedMotion}
            />
          </section>

          <section id="collapse" className="pm-section pm-section-collapse">
            <SectionHeading
              number="02"
              kicker="HOW THE STRUCTURE CHANGES"
              title="Parataxis is different from both subordination and fragments."
            >
              In a hypotactic sentence, words such as “because,” “although” or “when” state how one
              clause depends on another. Parataxis keeps the clauses separate and asks the reader to
              infer the relationship. Fragmentation goes further by using incomplete clauses.
            </SectionHeading>

            <div className="pm-mode-switch" role="group" aria-label="Syntax transformation">
              {Object.entries(SYNTAX_MODES).map(([id, mode]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={syntaxMode === id}
                  className={syntaxMode === id ? "is-active" : ""}
                  onClick={() => setSyntaxMode(id)}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <div className={`pm-collapse-stage mode-${syntaxMode}`} aria-live="polite">
              <div className="pm-collapse-node node-reason">
                <small>{syntaxMode === "scattered" ? "FRAGMENT A" : "CLAUSE A"}</small>
                <strong>{SYNTAX_MODES[syntaxMode].units[0]}</strong>
              </div>
              <div className="pm-collapse-link" aria-hidden="true">
                <span>{SYNTAX_MODES[syntaxMode].connector}</span>
              </div>
              <div className="pm-collapse-node node-action">
                <small>{syntaxMode === "scattered" ? "FRAGMENT B" : "CLAUSE B"}</small>
                <strong>{SYNTAX_MODES[syntaxMode].units[1]}</strong>
              </div>
              <svg viewBox="0 0 800 250" preserveAspectRatio="none" aria-hidden="true">
                <path className="pm-tree-trunk" d="M400 34V91" />
                <path className="pm-tree-left" d="M400 90Q280 100 190 179" />
                <path className="pm-tree-right" d="M400 90Q520 100 610 179" />
              </svg>
            </div>
            <p className="pm-stage-note">
              <span>{syntaxMode.toUpperCase()}</span>
              {SYNTAX_MODES[syntaxMode].note}
            </p>

            <div className="pm-spectrum">
              <div className="pm-spectrum__track" aria-hidden="true">
                <i style={{ width: `${spectrumEntry.score}%` }} />
                <b style={{ left: `${spectrumEntry.score}%` }} />
              </div>
              <div className="pm-spectrum__labels" aria-hidden="true">
                <span>declared</span>
                <span>inferred</span>
                <span>fragmented</span>
                <span>incoherent</span>
              </div>
              <div className="pm-spectrum__choices" role="group" aria-label="Parataxis spectrum">
                {PARATAXIS_SPECTRUM.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={item.id === spectrumEntry.id}
                    className={item.id === spectrumEntry.id ? "is-active" : ""}
                    onClick={() => setSpectrumId(item.id)}
                  >
                    <span>{item.score}</span>
                    {item.label}
                  </button>
                ))}
              </div>
              <blockquote>
                {spectrumEntry.example}
                <footer>{spectrumEntry.diagnosis}</footer>
              </blockquote>
            </div>
          </section>

          <section id="field" className="pm-section pm-section-field">
            <SectionHeading
              number="03"
              kicker="HOW READERS INTERPRET IT"
              title="The same pair of clauses can support more than one reading."
            >
              Context usually makes some interpretations more likely than others, but parataxis can
              preserve real ambiguity. The heatmap below shows editorial judgments about several
              synthetic examples; it is not a survey of readers.
            </SectionHeading>

            <AmbiguityMatrix selectedPairId={pair.id} />

            <div className="pm-reader-lab">
              <div>
                <span>TRY AN INTERPRETATION</span>
                <blockquote>She smiled. The ambulance arrived.</blockquote>
                <p>Choose the reading you find most plausible. Your response stays in this page.</p>
              </div>
              <div className="pm-reader-choices" role="group" aria-label="Choose your inference">
                {["relief", "menace", "irony", "coincidence", "uneasy contrast"].map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    aria-pressed={readerRelation === choice}
                    className={readerRelation === choice ? "is-active" : ""}
                    onClick={() => setReaderRelation(choice)}
                  >
                    {choice}
                  </button>
                ))}
              </div>
              <div className="pm-reader-result" aria-live="polite">
                <span>YOUR INFERENCE</span>
                <strong>{readerRelation ?? "no selection"}</strong>
                <p>
                  {readerRelation
                    ? `You read the pair as ${readerRelation}. That interpretation is plausible, but it is not stated in either clause.`
                    : "The sentence is grammatically complete, but its emotional meaning remains open."}
                </p>
              </div>
            </div>
          </section>

          <section id="debt" className="pm-section pm-section-debt">
            <SectionHeading
              number="04"
              kicker="STYLE, EMPHASIS AND EVIDENCE"
              title="Compression can sharpen an argument—or hide a weak one."
            >
              Short, adjacent statements often sound confident because they omit qualifications and
              explanations. “Aphorism debt” is an editing test used here: the more a line
              compresses, the more evidence the surrounding argument should provide.
            </SectionHeading>

            <div className="pm-debt-layout">
              <AphorismDebtChart selectedId={ledgerId} onSelect={setLedgerId} />
              <aside className={`pm-debt-ticket risk-${ledgerEntry.risk}`} aria-live="polite">
                <div>
                  <span>EVIDENCE CHECK / {ledgerEntry.risk.toUpperCase()}</span>
                  <b>{ledgerEntry.evidence - ledgerEntry.compression}</b>
                </div>
                <blockquote>{ledgerEntry.label}</blockquote>
                <dl>
                  <div>
                    <dt>compression</dt>
                    <dd>{ledgerEntry.compression}</dd>
                  </div>
                  <div>
                    <dt>support</dt>
                    <dd>{ledgerEntry.evidence}</dd>
                  </div>
                </dl>
                <p>{ledgerEntry.note}</p>
                <div className="pm-debt-list" role="group" aria-label="Select ledger specimen">
                  {APHORISM_LEDGER.map((entry, index) => (
                    <button
                      key={entry.id}
                      type="button"
                      aria-label={`Select ledger specimen ${index + 1}`}
                      aria-pressed={entry.id === ledgerEntry.id}
                      onClick={() => setLedgerId(entry.id)}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </button>
                  ))}
                </div>
              </aside>
            </div>

            <div className="pm-atlas">
              <div className="pm-atlas-controls">
                <span>ILLUSTRATIVE STYLE COMPARISON</span>
                <p>
                  These purpose-written examples show what to look for in six styles. The scores are
                  editorial judgments, not estimates from a corpus.
                </p>
                <div role="group" aria-label="Choose genre signature metric">
                  {[
                    ["connectorSuppression", "suppression"],
                    ["ambiguity", "openness"],
                    ["pressure", "pressure"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={genreMetric === value}
                      className={genreMetric === value ? "is-active" : ""}
                      onClick={() => setGenreMetric(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <GenreSignatureChart metric={genreMetric} />
            </div>
          </section>

          <section id="interface" className="pm-section pm-section-interface">
            <SectionHeading
              number="05"
              kicker="LANGUAGE MODELS AND INTERFACE DESIGN"
              title="Why parataxis appears in AI writing"
            >
              Chatbots often produce strings of short, self-contained statements. That pattern is
              not unique to AI, and it cannot identify a text as machine-written. But several parts
              of language-model training and use make it likely to recur.
            </SectionHeading>

            <div className="pm-ai-explainer">
              <p className="pm-ai-explainer__lead">
                Parataxis was common long before language models. It appears in scripture, speeches,
                crime fiction, advertising and ordinary conversation. AI systems reproduce those
                human patterns; they do not own the style. The difference is scale and repetition:
                one model can produce the same polished cadence across thousands of subjects.
              </p>
              <div className="pm-ai-reasons">
                <article>
                  <span>01</span>
                  <h3>Generation is local</h3>
                  <p>
                    A language model generates text one token at a time. A sequence of complete,
                    topically related sentences can remain coherent without committing to a precise
                    logical link such as cause, concession or consequence.
                  </p>
                </article>
                <article>
                  <span>02</span>
                  <h3>The model learns recurring forms</h3>
                  <p>
                    Training text contains headlines, slogans, bullet lists, marketing copy and
                    compressed explanations. Models learn those patterns and can reproduce their
                    syntax as well as their vocabulary.
                  </p>
                </article>
                <article>
                  <span>03</span>
                  <h3>Instruction tuning favors readable answers</h3>
                  <p>
                    Many assistants are further trained on demonstrations and human rankings. Clear,
                    confident and easy-to-scan answers often fare well in that process. Short
                    declarative units are one reliable way to produce that effect.
                  </p>
                </article>
                <article>
                  <span>04</span>
                  <h3>Prompts and interfaces reinforce it</h3>
                  <p>
                    Users ask for concise answers, bullets and strong takeaways. Research also shows
                    that the syntax of examples in a prompt can influence the syntax of a model’s
                    response. The interface helps select the style.
                  </p>
                </article>
              </div>
              <aside className="pm-ai-caution">
                <strong>What to watch for</strong>
                <p>
                  Separate sentences can imply a causal link without defending it: “Adoption rose.
                  Productivity improved.” When AI prose uses this pattern repeatedly, check whether
                  the missing word is merely <em>and</em> or a much stronger claim such as
                  <em> because</em> or <em>therefore</em>.
                </p>
              </aside>
              <p className="pm-ai-sources">
                Research basis: next-token prediction and instruction tuning are described in the
                <a
                  href="https://arxiv.org/abs/2203.02155"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  InstructGPT paper
                </a>
                . Recent ACL studies have measured
                <a
                  href="https://aclanthology.org/2025.acl-long.443/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  syntactic differences between human and LLM-written news
                </a>
                ,
                <a
                  href="https://aclanthology.org/2025.findings-acl.120/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  reduced variation when models recreate text domains
                </a>
                , and
                <a
                  href="https://aclanthology.org/2026.starsem-conference.2/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  syntactic priming from prompt examples
                </a>
                . These are population-level findings, not a method for identifying the author of a
                particular passage.
              </p>
            </div>

            <div className="pm-interface-intro">
              <h3>The same principle shapes interfaces</h3>
              <p>
                Dashboards, feeds and homepages place modules next to one another without explaining
                every relationship. Readers still infer a sequence and an argument from position,
                scale and reading order.
              </p>
            </div>

            <div className={`pm-dashboard ${showInterfaceLinks ? "show-links" : ""}`}>
              <svg viewBox="0 0 1000 560" preserveAspectRatio="none" aria-hidden="true">
                <path d="M170 150Q500 20 830 150" />
                <path d="M170 150Q250 360 500 410" />
                <path d="M830 150Q750 360 500 410" />
                <path d="M170 150Q500 290 830 150" />
              </svg>
              <article className="module-a">
                <span>01 / KPI</span>
                <strong>94%</strong>
                <p>Tasks marked complete</p>
              </article>
              <article className="module-b">
                <span>02 / ALERT</span>
                <strong>17</strong>
                <p>Open customer complaints</p>
              </article>
              <article className="module-c">
                <span>03 / TREND</span>
                <div className="pm-sparkline" aria-hidden="true">
                  ⌁⌁⌁╱╲╱
                </div>
                <p>Engagement keeps rising</p>
              </article>
              <article className="module-d">
                <span>04 / DECISION</span>
                <strong>SHIP</strong>
                <p>The layout encourages a decision without stating how the measures relate.</p>
              </article>
            </div>
            <button
              type="button"
              className="pm-interface-switch"
              aria-pressed={showInterfaceLinks}
              onClick={() => setShowInterfaceLinks((current) => !current)}
            >
              {showInterfaceLinks ? "Hide implied argument" : "Reveal implied argument"}
            </button>
            <p className="pm-interface-thesis">
              Put two cards together and readers assume there is a reason. That assumption may come
              from evidence, or it may come only from proximity. Good interface design makes the
              distinction clear.
            </p>
          </section>

          <section id="machine" className="pm-section pm-section-machine">
            <SectionHeading
              number="06"
              kicker="TEST THE EFFECT"
              title="Build a short passage and change how explicit it is."
            >
              Choose a style, change the number of clauses and adjust the explicitness control. The
              text is synthetic; the point is to compare structures, not to rate the quality of the
              writing.
            </SectionHeading>

            <div className="pm-machine-console">
              <div className="pm-machine-controls">
                <fieldset>
                  <legend>Register</legend>
                  <div className="pm-register-grid">
                    {Object.entries(SANDBOX_GENRES).map(([id, genre]) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={sandboxGenre === id}
                        className={sandboxGenre === id ? "is-active" : ""}
                        onClick={() => setSandboxGenre(id)}
                      >
                        {genre.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label>
                  <span>
                    Clauses <output>{clauseCount}</output>
                  </span>
                  <input
                    type="range"
                    min="2"
                    max="4"
                    step="1"
                    value={clauseCount}
                    onChange={(event) => setClauseCount(Number(event.target.value))}
                  />
                </label>
                <label>
                  <span>
                    Explicitness <output>{explicitness}%</output>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={explicitness}
                    onChange={(event) => setExplicitness(Number(event.target.value))}
                  />
                </label>
                <button
                  type="button"
                  className="pm-regenerate"
                  onClick={() => setSandboxSeed((current) => current + 1)}
                >
                  Reorder clauses ↻
                </button>
              </div>

              <div className="pm-machine-output">
                <div className="pm-machine-output__status">
                  <span>OUTPUT / {SANDBOX_GENRES[sandboxGenre].label.toUpperCase()}</span>
                  <span>COMPRESSION RISK {sandboxDanger}</span>
                </div>
                <blockquote>
                  {machineLines.map((line, index) => (
                    <React.Fragment key={`${sandboxSeed}-${index}`}>
                      <span>{line}</span>
                      {index < machineLines.length - 1 &&
                        (showSandboxBridge ? (
                          <i>{["then", "but", "therefore"][index % 3]}</i>
                        ) : (
                          <b aria-hidden="true">· · ·</b>
                        ))}
                    </React.Fragment>
                  ))}
                </blockquote>
                <div
                  className="pm-danger-meter"
                  aria-label={`Compression risk ${sandboxDanger} out of 100`}
                >
                  <i style={{ width: `${sandboxDanger}%` }} />
                </div>
                <button
                  type="button"
                  aria-pressed={showSandboxBridge}
                  onClick={() => setShowSandboxBridge((current) => !current)}
                >
                  {showSandboxBridge ? "Hide possible connectors" : "Show possible connectors"}
                </button>
                <p>
                  <strong>SYNTHETIC TEXT.</strong> The compression score rises when the passage uses
                  more clauses and fewer connectors. It does not measure truth, authorship or
                  literary quality.
                </p>
              </div>
            </div>
          </section>

          <section className="pm-final">
            <span>WHAT TO TAKE AWAY</span>
            <h2>Parataxis asks the reader to supply part of the argument.</h2>
            <ul>
              <li>It can make prose faster, sharper and more open to interpretation.</li>
              <li>It is common in human writing, AI output and modular interface design.</li>
              <li>
                It deserves scrutiny when adjacent claims imply causation or equivalence that the
                evidence does not support.
              </li>
            </ul>
            <p>
              The relationship between two statements may be reasonable. It may even be obvious.
              Parataxis simply means that the sentence does not state it for you.
            </p>
          </section>

          <details className="pm-method">
            <summary>Method, evidence, and interpretive limits</summary>
            <div>
              <p>
                Every clause pair, genre signature, plausibility value, and aphorism ledger entry on
                this page is purpose-written editorial material. “Plausibility” means a reading the
                authors consider useful for demonstration; it is not a survey result, language-model
                probability, or corpus statistic.
              </p>
              <p>
                The explanation of AI writing distinguishes documented training methods and research
                findings from editorial interpretation. Parataxis is not presented as an AI
                detector. Reader choices remain in component state and are neither stored nor
                transmitted. The visualizations expose accessible summaries and tables; motion
                follows the reduced-motion preference and can also be stopped with the page control.
              </p>
            </div>
          </details>
        </div>
      </div>
      </LinkedCharts>
    </ExamplePageLayout>
  )
}

function ClauseCard({ index, children }) {
  return (
    <span className="pm-clause-card">
      <small>CLAUSE {index}</small>
      <strong>{children}</strong>
    </span>
  )
}

function GhostConnector({ visible, children }) {
  return (
    <span className={visible ? "pm-ghost-connector is-visible" : "pm-ghost-connector"}>
      {visible ? children : "· · ·"}
    </span>
  )
}

function SectionHeading({ number, kicker, title, children }) {
  return (
    <header className="pm-section-heading">
      <div>
        <span>{number}</span>
        <i />
      </div>
      <p>{kicker}</p>
      <h2>{title}</h2>
      <blockquote>{children}</blockquote>
    </header>
  )
}

function PairSelectionSync({ pairId }) {
  const { selectPoints } = useSelectionActions("parataxis-pair", "parataxis-pair-selector")

  useEffect(() => {
    selectPoints({ pair: [pairId] })
  }, [pairId, selectPoints])

  return null
}
