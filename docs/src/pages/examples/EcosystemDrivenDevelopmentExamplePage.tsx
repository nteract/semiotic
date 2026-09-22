import React, { useState } from "react"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  affectedOutputs,
  changes,
  promises,
  surfaces,
  renderingStory,
} from "./ecosystem-driven-development/scenes"
import type { RenderingStep } from "./ecosystem-driven-development/scenes"
import NicheExplorer, {
  UnderstandingProblem,
  LibraryInEcology,
} from "./ecosystem-driven-development/NicheExplorer"
import { niches } from "./ecosystem-driven-development/niches"
import "./EcosystemDrivenDevelopmentExamplePage.css"

// This page is a product storyboard. Controls select authored mock states;
// they do not run the lifecycle, render/export a real chart, or evaluate evidence.
function LatencySketch({
  corrected = false,
  violet = false,
}: {
  corrected?: boolean
  violet?: boolean
}) {
  return (
    <svg
      className="edd-chart"
      viewBox="0 0 560 230"
      role="img"
      aria-label={`Mean latency by one-second window: ${corrected ? "300" : "200"}, 240, missing, 260, and 220 milliseconds. The missing interval is not zero.`}
    >
      <g className="edd-grid" stroke="currentColor" strokeWidth="1">
        <path d="M48 36H526 M48 84H526 M48 132H526 M48 180H526" />
      </g>
      <g className="edd-axis" fill="currentColor" fontSize="12">
        <text x="12" y="40">
          300
        </text>
        <text x="12" y="88">
          200
        </text>
        <text x="12" y="136">
          100
        </text>
        <text x="28" y="184">
          0
        </text>
        <text x="48" y="210">
          0–1 s
        </text>
        <text x="154" y="210">
          1–2 s
        </text>
        <text x="267" y="210">
          2–3 s
        </text>
        <text x="374" y="210">
          3–4 s
        </text>
        <text x="480" y="210">
          4–5 s
        </text>
      </g>
      <rect x="255" y="26" width="73" height="155" rx="4" className="edd-gap" />
      <text
        x="291"
        y="111"
        textAnchor="middle"
        className="edd-axis"
        fill="currentColor"
        fontSize="12"
      >
        No data
      </text>
      <g fill="none" stroke={violet ? "var(--edd-violet)" : "var(--edd-teal)"} strokeWidth="3">
        <path d={`M70 ${corrected ? 36 : 84} L180 65 M400 55 L510 74`} />
        {[
          [70, corrected ? 36 : 84],
          [180, 65],
          [400, 55],
          [510, 74],
        ].map(([cx, cy]) => (
          <circle key={cx} cx={cx} cy={cy} r="5" fill="var(--edd-paper)" />
        ))}
      </g>
      {corrected && (
        <g stroke="var(--edd-rust)" fill="none">
          <circle cx="70" cy="84" r="5" strokeDasharray="2 2" />
          <path d="M70 72V49" strokeDasharray="3 3" />
        </g>
      )}
    </svg>
  )
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`edd-badge edd-badge--${tone}`}>{children}</span>
}

function HandoffScene() {
  const [surfaceId, setSurfaceId] = useState<string>("svg")
  const surface = surfaces.find((item) => item.id === surfaceId) ?? surfaces[2]
  const stripped = surface.id === "stripped"
  return (
    <div className="edd-scene">
      <div className="edd-scene-intro">
        <p className="edd-kicker">Representations and context</p>
        <h3>“What can their product actually rely on?”</h3>
        <p>
          A side panel needs live interaction. A communications reader needs an honest snapshot.
          Inspect what each representation establishes for those uses. These formats are technical
          evidence within niches, not niches themselves.
        </p>
      </div>
      <div className="edd-choices" role="group" aria-label="Choose a handoff representation">
        {surfaces.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={surfaceId === item.id}
            onClick={() => setSurfaceId(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="edd-workspace">
        <div className="edd-artifact">
          <div className="edd-card-top">
            <span>
              {surface.id === "react" ? "Implementation brief" : "Checkout service / latency"}
            </span>
            <Badge>{surface.id === "react" ? "Implementation" : "Snapshot"}</Badge>
          </div>
          {surface.id === "react" ? (
            <div className="edd-code-brief">
              <p className="edd-kicker">Intended public import</p>
              <pre>
                <code>{'import { RealtimeLineChart }\n  from "semiotic/realtime"'}</code>
              </pre>
              <dl className="edd-facts">
                <div>
                  <dt>Measure</dt>
                  <dd>Mean request latency · ms</dd>
                </div>
                <div>
                  <dt>Checkpoint</dt>
                  <dd>Two observations · 200 ms</dd>
                </div>
                <div>
                  <dt>Build identity</dt>
                  <dd>Resolve the package and adapter revisions</dd>
                </div>
                <div>
                  <dt>Required check</dt>
                  <dd>Compile and execute against that build</dd>
                </div>
              </dl>
            </div>
          ) : (
            <>
              <div className="edd-number">
                <strong>
                  200<span> ms</span>
                </strong>
                <span>Mean request latency</span>
              </div>
              <LatencySketch />
              {!stripped && (
                <div className="edd-artifact-caption">
                  <Badge tone="amber">Provisional</Badge>
                  <span>As of replay +5.2 s · selected window [0, 1) s</span>
                </div>
              )}
              <p className="edd-small">
                Synthetic service latency. The first window is selected; later windows show the
                surrounding pattern.
              </p>
            </>
          )}
          <div className={`edd-context-strip ${stripped ? "edd-context-strip--lost" : ""}`}>
            <span aria-hidden="true">{stripped ? "!" : "↳"}</span>
            <div>
              <strong>{stripped ? "Context did not arrive" : "Context travels alongside"}</strong>
              <p>
                {stripped
                  ? "This copy has no time state or source reference."
                  : "100 ms + 300 ms, divided by 2 observations. Missing intervals stay missing. Revision A preserves this reading."}
              </p>
            </div>
          </div>
        </div>
        <aside className="edd-inspector" aria-live="polite" aria-atomic="true">
          <p className="edd-kicker">{surface.recipient}</p>
          <h4>{surface.title}</h4>
          <dl>
            <div>
              <dt>What arrives</dt>
              <dd>{surface.retained}</dd>
            </div>
            <div>
              <dt>What it cannot establish</dt>
              <dd>{surface.limitation}</dd>
            </div>
            <div>
              <dt>The next useful check</dt>
              <dd>{surface.next}</dd>
            </div>
          </dl>
          <p className="edd-payoff">
            A reliable handoff carries an inspectable case for the receiving task: what holds, why
            it holds, and which checks that use requires.
          </p>
        </aside>
      </div>
    </div>
  )
}

function ChangeScene() {
  const [changeId, setChangeId] = useState<string>("layout")
  const change = changes.find((item) => item.id === changeId) ?? changes[0]
  return (
    <div className="edd-scene">
      <div className="edd-scene-intro">
        <p className="edd-kicker">Which checks does a change affect?</p>
        <h3>“Does the evidence still support their use?”</h3>
        <p>
          A change can reopen a behavioral claim, a useful task, or a support obligation. Choose a
          change to inspect the evidence decisions. A new audience or context also requires a fresh
          assessment of intent and obligations.
        </p>
      </div>
      <div className="edd-choices" role="group" aria-label="Choose a change">
        {changes.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={changeId === item.id}
            onClick={() => setChangeId(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="edd-workspace">
        <div className="edd-artifact">
          <div className="edd-card-top">
            <span>Candidate change</span>
            <Badge>Change impact</Badge>
          </div>
          <div className="edd-diff">
            <span>{change.before}</span>
            <span aria-hidden="true">→</span>
            <strong>{change.after}</strong>
          </div>
          <LatencySketch violet={changeId === "color"} />
          <p className="edd-small">
            {changeId === "meaning"
              ? "The chart retains the old mean values. A sum requires new marks and meaning checks."
              : "The chart makes the affected claim visible. The review must follow its meaning and dependencies."}
          </p>
          <div className="edd-context-strip">
            <span aria-hidden="true">↳</span>
            <div>
              <strong>{change.summary}</strong>
              <p>A useful decision names its scope, inputs, and reason.</p>
            </div>
          </div>
        </div>
        <aside className="edd-inspector" aria-live="polite" aria-atomic="true">
          <p className="edd-kicker">Evidence decisions</p>
          <h4>Make the reason visible.</h4>
          <div className="edd-decisions">
            {change.decisions.map(([status, title, reason]) => (
              <div key={title}>
                <Badge
                  tone={status === "Reuse" ? "teal" : status === "Regenerate" ? "rust" : "amber"}
                >
                  {status}
                </Badge>
                <strong>{title}</strong>
                <p>{reason}</p>
              </div>
            ))}
          </div>
          <p className="edd-payoff">
            Reuse means “still relevant.” A reused failing result is still failing.
          </p>
        </aside>
      </div>
    </div>
  )
}

function CorrectionScene() {
  const [corrected, setCorrected] = useState(false)
  return (
    <div className="edd-scene">
      <div className="edd-scene-intro">
        <p className="edd-kicker">Time state and follow-through</p>
        <h3>A provisional reading is revised.</h3>
        <p>
          A 500 ms observation arrives late but belongs to the original window. The qualified
          reading changes from 200 ms to 300 ms. New data does not make the earlier reading a
          failure. An output needs correction if it hides that provisional status or misstates its
          time.
        </p>
      </div>
      <div className="edd-choices" role="group" aria-label="Choose a revision">
        <button type="button" aria-pressed={!corrected} onClick={() => setCorrected(false)}>
          A · Before the late observation
        </button>
        <button type="button" aria-pressed={corrected} onClick={() => setCorrected(true)}>
          B · Include the late observation
        </button>
      </div>
      <div className="edd-workspace">
        <div className="edd-artifact">
          <div className="edd-card-top">
            <span>Same window / a new reading</span>
            <Badge tone={corrected ? "teal" : "amber"}>
              {corrected ? "Revised · revision B" : "Provisional · revision A"}
            </Badge>
          </div>
          <div className="edd-number" aria-live="polite">
            <strong>
              {corrected ? "300" : "200"}
              <span> ms</span>
            </strong>
            <span>
              {corrected
                ? "3 observations · as of replay +5.8 s"
                : "2 observations · as of replay +5.2 s"}
            </span>
          </div>
          <LatencySketch corrected={corrected} />
          <div className="edd-equation">
            {corrected ? "(100 + 300 + 500) ÷ 3 = 300 ms" : "(100 + 300) ÷ 2 = 200 ms"}
          </div>
          <div className="edd-context-strip">
            <span aria-hidden="true">↳</span>
            <div>
              <strong>
                {corrected
                  ? "The earlier reading remains inspectable."
                  : "Provisional is part of the meaning."}
              </strong>
              <p>
                {corrected
                  ? "Revision B supersedes the selected aggregate. Revision A still says what was known at +5.2 s."
                  : "The chosen policy admits this retained late observation. A dropped observation is reported without changing the mean."}
              </p>
            </div>
          </div>
        </div>
        <aside className="edd-inspector">
          <p className="edd-kicker">Example reader question</p>
          <h4>Does this snapshot say what was known at the time?</h4>
          <blockquote>
            “The shared image still says 200 ms. Does it include the late request?”
          </blockquote>
          <p className="edd-small">Authored observation · dated report · revision A</p>
          <ol className="edd-trace">
            <li>
              <strong>Locate</strong>
              <span>Revision A · SVG · first window</span>
            </li>
            <li>
              <strong>Reproduce</strong>
              <span>A named late-arrival checkpoint</span>
            </li>
            <li>
              <strong>Revise</strong>
              <span>New reading, new revision, preserved history</span>
            </li>
            <li>
              <strong>Follow through</strong>
              <span>Reachable outputs, their meaning, and the agreed support or fallback</span>
            </li>
          </ol>
        </aside>
      </div>
      <div className="edd-followup" aria-live="polite">
        <div className="edd-followup-heading">
          <h4>
            {corrected ? "Follow-up to assess" : "Inspect the revised reading’s implications"}
          </h4>
          <Badge>
            {corrected ? "Example actions · no delivery" : "Select revision B to inspect"}
          </Badge>
        </div>
        {corrected ? (
          <ul>
            {affectedOutputs.map(([output, action, reason]) => (
              <li key={output}>
                <strong>{output}</strong>
                <Badge
                  tone={
                    action === "Unknown" ? "amber" : action === "Unaffected" ? "neutral" : "rust"
                  }
                >
                  {action}
                </Badge>
                <p>{reason}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p>
            Once the reading changes, the record identifies what must be revisited, what is
            unrelated, and what lies beyond its visibility.
          </p>
        )}
      </div>
    </div>
  )
}

// Both charts below are authored SVG illustrations, not executions of SSR or CSR.
// The layout comparison keeps the values and the +5.2 s checkpoint fixed.
function LayoutSketch({
  width,
  spaced,
  abbreviated = false,
  label,
}: {
  width: number
  spaced: boolean
  abbreviated?: boolean
  label: string
}) {
  const x = (index: number) => 42 + (index * (width - 84)) / 4
  const y = (value: number) => 164 - value * 0.36
  const visibleTicks = spaced && width < 400 ? [0, 2, 4] : [0, 1, 2, 3, 4]
  return (
    <svg
      className="edd-layout-chart"
      viewBox={`0 0 ${width} 225`}
      role="img"
      aria-label={`${label}. Mean latency: 200, 240, missing, 260, 220 milliseconds. ${width} pixel layout; ${abbreviated ? "five abbreviated time labels" : spaced && width < 400 ? "three spaced time labels" : "five full time labels"}.`}
    >
      <g stroke="currentColor" className="edd-grid">
        {[0, 100, 200, 300].map((value) => (
          <path key={value} d={`M32 ${y(value)}H${width - 22}`} />
        ))}
      </g>
      <g fill="currentColor" className="edd-axis" fontSize="10">
        {[0, 100, 200, 300].map((value) => (
          <text key={value} x="27" y={y(value) + 3} textAnchor="end">
            {value}
          </text>
        ))}
        <text x="32" y="30">
          Mean latency · ms
        </text>
      </g>
      <rect className="edd-gap" x={x(2) - 21} y="48" width="42" height="117" rx="3" />
      <text
        className="edd-axis"
        fill="currentColor"
        x={x(2)}
        y="115"
        textAnchor="middle"
        fontSize="10"
      >
        No data
      </text>
      <g fill="none" stroke="var(--edd-teal)" strokeWidth="2.5">
        <path d={`M${x(0)} ${y(200)}L${x(1)} ${y(240)}M${x(3)} ${y(260)}L${x(4)} ${y(220)}`} />
        {[
          [0, 200],
          [1, 240],
          [3, 260],
          [4, 220],
        ].map(([index, value]) => (
          <circle key={index} cx={x(index)} cy={y(value)} r="4" fill="var(--edd-card)" />
        ))}
      </g>
      <g fill="currentColor" className="edd-axis" fontSize="11">
        {visibleTicks.map((index) => (
          <text key={index} x={x(index)} y="188" textAnchor="middle">
            {abbreviated ? `${index} s` : `00:0${index}–00:0${index + 1}`}
          </text>
        ))}
        <text x={width / 2} y="215" textAnchor="middle" fontSize="10">
          One-second windows · elapsed time
        </text>
      </g>
    </svg>
  )
}

function RenderingPair({
  step,
  width,
  improved = false,
}: {
  step: RenderingStep
  width: number
  improved?: boolean
}) {
  const scene = renderingStory.find((item) => item.id === step) ?? renderingStory[0]
  return (
    <div className="edd-rendering-pair">
      {(
        [
          [
            "static",
            "Static chart for a design task",
            "Compose a service card",
            scene.staticDescription,
          ],
          [
            "browser",
            "Interactive chart for an application",
            "Compare service behavior",
            scene.browserDescription,
          ],
        ] as const
      ).map(([id, title, task, description]) => {
        const abbreviated = step === "encounter" && id === "static"
        const spaced = step === "improvement" && improved
        const crowded = !abbreviated && !spaced && width < 400
        return (
          <figure className="edd-artifact edd-render-card" key={id}>
            <div className="edd-card-top">
              <span>{title}</span>
              <Badge>{id === "static" ? "SSR illustration" : "CSR illustration"}</Badge>
            </div>
            <div className="edd-render-task">
              <p className="edd-kicker">{task}</p>
              <strong>Checkout service</strong>
              <span>Same observations · as of replay +5.2 s</span>
            </div>
            <div className="edd-chart-mount" style={{ maxWidth: width }}>
              <LayoutSketch
                width={width}
                spaced={spaced}
                abbreviated={abbreviated}
                label={`${title}, ${step === "improvement" ? (improved ? "after layout change" : "before layout change") : scene.status}`}
              />
            </div>
            <div className="edd-layout-state">
              <Badge tone={abbreviated ? "amber" : crowded ? "rust" : "teal"}>
                {abbreviated
                  ? "A different label format"
                  : crowded
                    ? "Labels crowd at this width"
                    : "Time labels have room"}
              </Badge>
            </div>
            <figcaption>
              {step === "improvement" && !improved
                ? "Before the change: both representations use a label for every interval, even when the panel is narrow."
                : width >= 400 && step === "feedback"
                  ? "At this wider size, the full labels fit. Return to the narrow panel to inspect the layout constraint."
                  : description}
            </figcaption>
          </figure>
        )
      })}
    </div>
  )
}

function SceneIntroduction({ step }: { step: RenderingStep }) {
  const scene = renderingStory.find((item) => item.id === step) ?? renderingStory[0]
  return (
    <div className="edd-scene-intro">
      <p className="edd-kicker">
        {scene.number} / {scene.status}
      </p>
      <h3>{scene.headline}</h3>
      <p>{scene.task}</p>
    </div>
  )
}

function WidthChoices({ width, onChange }: { width: number; onChange: (width: number) => void }) {
  return (
    <div className="edd-choices" role="group" aria-label="Compare the same chart width">
      <button type="button" aria-pressed={width === 280} onClick={() => onChange(280)}>
        Narrow panel · 280 px
      </button>
      <button type="button" aria-pressed={width === 440} onClick={() => onChange(440)}>
        Wider panel · 440 px
      </button>
    </div>
  )
}

function EncounterScene() {
  const [width, setWidth] = useState(280)
  return (
    <div className="edd-scene">
      <SceneIntroduction step="encounter" />
      <WidthChoices width={width} onChange={setWidth} />
      <RenderingPair step="encounter" width={width} />
      <div className="edd-finding">
        <p className="edd-kicker">The missing connection</p>
        <p>{renderingStory[0].finding}</p>
        <p className="edd-small">
          This deliberately divergent pair reconstructs the problem. It is not a historical
          screenshot or a measured defect in today’s package.
        </p>
      </div>
    </div>
  )
}

function FeedbackScene() {
  const [width, setWidth] = useState(280)
  return (
    <div className="edd-scene">
      <SceneIntroduction step="feedback" />
      <WidthChoices width={width} onChange={setWidth} />
      <RenderingPair step="feedback" width={width} />
      <div className="edd-finding">
        <p className="edd-kicker">Example design observation</p>
        <blockquote>“{renderingStory[1].finding}”</blockquote>
        <p>{renderingStory[1].sharedChange}</p>
      </div>
      <p className="edd-scene-footnote">
        Shared properties: labels, scale, dimensions, observations, missing interval, and
        checkpoint. Hover, keyboard navigation, and live updates still need checks in the
        application.
      </p>
    </div>
  )
}

function ImprovementScene() {
  const [improved, setImproved] = useState(true)
  return (
    <div className="edd-scene">
      <SceneIntroduction step="improvement" />
      <div className="edd-choices" role="group" aria-label="Inspect the shared layout change">
        <button type="button" aria-pressed={!improved} onClick={() => setImproved(false)}>
          Before · crowded labels
        </button>
        <button type="button" aria-pressed={improved} onClick={() => setImproved(true)}>
          After · labels fit the width
        </button>
      </div>
      <RenderingPair step="improvement" width={280} improved={improved} />
      <div className="edd-finding">
        <p className="edd-kicker">One change, several useful results</p>
        <p>{renderingStory[2].downstreamBenefit}</p>
        <p className="edd-small">
          Only tick selection changes. The same 200, 240, missing, 260, and 220 ms readings remain
          at the same checkpoint.
        </p>
      </div>
    </div>
  )
}

function ProductMap() {
  return (
    <div
      className="edd-journey"
      aria-label="Useful products exchange findings and improvements through a shared chart capability."
    >
      <p className="edd-kicker">Several useful products / one learning loop</p>
      <div className="edd-journey-source">
        <div>
          <span className="edd-node-mark" aria-hidden="true">
            ⌁
          </span>
          <strong>Shared chart capability</strong>
          <span>Behavior · examples · understanding</span>
        </div>
      </div>
      <div className="edd-map-exchange">
        <span>↓ Improvements reach products</span>
        <span>Findings return to the library ↑</span>
      </div>
      <div className="edd-journey-outputs edd-journey-niches">
        {niches
          .filter((niche) =>
            ["plugins", "communications", "prototype", "examples"].includes(niche.id),
          )
          .map((niche) => (
            <div key={niche.id}>
              <strong>{niche.label}</strong>
              <span>{niche.task}</span>
            </div>
          ))}
      </div>
      <div className="edd-production-boundary">
        <strong>Supported production use ↔ shared learning</strong>
        <span>Stronger expectations. More informed review.</span>
      </div>
    </div>
  )
}

function DevelopmentHistory() {
  return (
    <section className="edd-packet" aria-labelledby="edd-packet-title">
      <div>
        <p className="edd-kicker">More than a persuasive prototype</p>
        <h2 id="edd-packet-title">What the next team inherits.</h2>
        <p>
          A reviewer starts with a useful task, an investigated problem, and a reason for the
          change. They can focus on what remains uncertain in their application.
        </p>
        <p>
          Keep this history close to the issue, example, test, and pull request. A short,
          discoverable record is enough to begin.
        </p>
        <details className="edd-disclosure">
          <summary>Who can maintain it?</summary>
          <div
            className="edd-authorship"
            aria-label="Created does not imply read; read does not imply understood"
          >
            <span>Created</span>
            <b aria-hidden="true">≠</b>
            <span>Read</span>
            <b aria-hidden="true">≠</b>
            <span>Understood</span>
          </div>
          <p>
            When AI wrote code the creator has not read, authorship cannot establish understanding.
            A meaningful Bus Factor is impossible to infer from creator identity or contributor
            counts: the missing knowledge may never have been held by anyone.
          </p>
          <p>
            Ask another maintainer to explain the behavior, reproduce the failure, and carry out a
            bounded repair. Demonstrated maintenance tells us more than a speculative score.
          </p>
        </details>
      </div>
      <div className="edd-packet-sheet">
        <div className="edd-card-top">
          <span>A short development history</span>
          <Badge>Illustrative layout case</Badge>
        </div>
        <dl>
          <div>
            <dt>Useful task</dt>
            <dd>
              Compose a readable service card at 280 px; use the same chart in an application panel.
            </dd>
          </div>
          <div>
            <dt>Finding</dt>
            <dd>
              Full interval labels collide at that width. Faithful representations make the concern
              relevant to both products.
            </dd>
          </div>
          <div>
            <dt>Shared change</dt>
            <dd>
              Choose time ticks for the available width. Preserve all observations, units, the
              scale, and the missing interval.
            </dd>
          </div>
          <div>
            <dt>Supporting checks</dt>
            <dd>
              The drawings show the intended comparison. Real SSR/CSR renders, matched-width checks,
              and installed-package verification are the next executable work; no runs are reported
              here.
            </dd>
          </div>
          <div>
            <dt>Application questions</dt>
            <dd>
              Does the actual host preserve the layout? Do hover, keyboard access, live updates, and
              the user’s task work? Who supports the feature?
            </dd>
          </div>
        </dl>
        <div className="edd-packet-bottom">
          <strong>Task → finding → shared change → relevant checks</strong>
        </div>
      </div>
    </section>
  )
}

export default function EcosystemDrivenDevelopmentExamplePage() {
  const [step, setStep] = useState<RenderingStep>("encounter")
  const activeScene = renderingStory.find((scene) => scene.id === step) ?? renderingStory[0]
  return (
    <ExamplePageLayout
      title="Ecosystem Driven Development"
      prevPage={undefined}
      nextPage={undefined}
      showPageHeader={false}
      showViewToggle={false}
      showContractPanels={false}
    >
      <div className="edd-story">
        <header className="edd-opening">
          <div>
            <p className="edd-kicker">Developing software in the age of AI</p>
            <h1>
              Ecosystem
              <br />
              Driven <em>Development</em>
            </h1>
            <p className="edd-deck">
              Code is getting cheaper.
              <br />
              Understanding still takes work.
            </p>
            <a className="edd-primary-link" href="#edd-rendering-story">
              See how this changed Semiotic <span aria-hidden="true">↓</span>
            </a>
          </div>
          <div className="edd-opening-argument">
            <p>
              Designers, PMs, and engineers can now produce working prototypes faster than teams can
              review them. Every new prototype adds questions about its code, its usefulness, and
              what will happen when people depend on it.
            </p>
            <p>
              <strong>
                Ecosystem Driven Development uses that same cheap implementation to create useful
                places for a shared capability to develop:
              </strong>{" "}
              design tools, internal applications, examples, reports, and experimental products.
              Each has an audience, a job to do, and a service commitment suited to its use.
            </p>
            <p>
              What people learn there returns to the shared implementation. By the time a feature
              reaches a high-stakes audience, the team has more than a persuasive prototype: it has
              a history of useful work, discovered limitations, and improvements that later
              reviewers can inspect.
            </p>
          </div>
        </header>
        <UnderstandingProblem />
        <LibraryInEcology />
        <section className="edd-workbench" id="edd-workbench" aria-labelledby="edd-workbench-title">
          <div className="edd-section-heading">
            <div>
              <p className="edd-kicker">Follow the finding</p>
              <h2 id="edd-workbench-title">A design task improves an application.</h2>
            </div>
            <p>
              One chart. Two useful products.
              <br />A shared reason to improve it.
            </p>
          </div>
          <ol className="edd-story-outline">
            <li>
              <strong>Useful products reveal a gap.</strong>
              <p>
                A static chart helps a designer compose a screen, but rendering differences limit
                what the application team learns from that use.
              </p>
            </li>
            <li>
              <strong>Fidelity connects the feedback.</strong>
              <p>
                Once relevant chart properties match, a crowded-label finding can be investigated in
                both the design and the browser panel.
              </p>
            </li>
            <li>
              <strong>A shared change returns value.</strong>
              <p>
                Width-aware tick selection improves both products. Later reviewers inherit the
                finding, the reason for the change, and the checks still needed.
              </p>
            </li>
          </ol>
          <div className="edd-prototype-note">
            <Badge>Illustrative walkthrough</Badge>
            <p>These controls show authored states.</p>
          </div>
          <div className="edd-step-nav" role="group" aria-label="Story chapters">
            {renderingStory.map((scene) => (
              <button
                type="button"
                key={scene.id}
                aria-pressed={step === scene.id}
                aria-controls="edd-active-scene"
                onClick={() => setStep(scene.id)}
              >
                <span>{scene.number}</span>
                <span>
                  <strong>{scene.label}</strong>
                  <small>
                    {scene.id === "encounter"
                      ? "Products create a requirement"
                      : scene.id === "feedback"
                        ? "The finding can transfer"
                        : "The benefit travels back"}
                  </small>
                </span>
                <span aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
          <p className="edd-sr-only" role="status">
            Showing chapter {activeScene.number}: {activeScene.headline}.
          </p>
          <div id="edd-active-scene" role="region" aria-label={activeScene.headline}>
            {step === "encounter" ? (
              <EncounterScene />
            ) : step === "feedback" ? (
              <FeedbackScene />
            ) : (
              <ImprovementScene />
            )}
          </div>
          <p className="edd-scene-footnote">
            The SSR/CSR motivation comes from the maintainer’s account. The label problem and repair
            are illustrative follow-ups. These drawings do not execute Semiotic or run Figma, Slack,
            or email integrations.
          </p>
        </section>
        <NicheExplorer />
        <div className="edd-ecosystem-context">
          <div>
            <p className="edd-kicker">A branching ecosystem</p>
            <h2>Useful destinations, connected by learning.</h2>
            <p>
              A design plugin and a reporting tool can grow alongside each other. Either can remain
              useful indefinitely. Findings move back to the shared capability; improvements move
              out to the products that need them.
            </p>
            <p>
              Two well-connected products are enough to begin. The library supplies the shared
              behavior, while each product owns its workflow, support, and release decisions.
            </p>
          </div>
          <ProductMap />
        </div>
        <DevelopmentHistory />
        <section className="edd-technical" id="edd-details" aria-labelledby="edd-details-title">
          <div className="edd-section-heading">
            <div>
              <p className="edd-kicker">Optional technical material</p>
              <h2 id="edd-details-title">Inspect the details.</h2>
            </div>
            <p>
              The story starts with useful work. These details make its findings easier to
              investigate.
            </p>
          </div>
          <details className="edd-disclosure">
            <summary>Rendering fidelity, build identity, and the next executable check</summary>
            <div className="edd-detail-copy">
              <p>
                Compare actual server and browser output from the same identified package, fixture,
                checkpoint, dimensions, fonts, and theme. Check the labels, scale, layout, values,
                and missing interval that make this particular observation transferable.
              </p>
              <p>
                Reopen the server-produced artifact. A screenshot of the browser is not an SSR run.
                Check hover, keyboard interaction, and live updates separately in the application.
              </p>
              <p>
                The executable follow-up connects an ordinary issue or fixture note to a shared
                change, records its checks, and lets another maintainer reproduce it. Reuse
                Semiotic’s existing artifact, evidence, and access contracts where they help; the
                page requires no new workflow platform.
              </p>
            </div>
          </details>
          <details className="edd-disclosure">
            <summary>What arrives in a snapshot or a React handoff?</summary>
            <HandoffScene />
          </details>
          <details className="edd-disclosure">
            <summary>Which checks need to change with the feature?</summary>
            <ChangeScene />
          </details>
          <details className="edd-disclosure">
            <summary>When late data revises a provisional reading</summary>
            <CorrectionScene />
          </details>
        </section>
        <section className="edd-promises" id="edd-promises" aria-labelledby="edd-promises-title">
          <div className="edd-section-heading">
            <div>
              <p className="edd-kicker">Evaluate the approach</p>
              <h2 id="edd-promises-title">What makes the ecosystem worth building?</h2>
            </div>
            <p>
              Six claims to investigate.
              <br />
              Open each to inspect its test.
            </p>
          </div>
          <div className="edd-promise-grid">
            {promises.map((promise) => (
              <details key={promise.number}>
                <summary>
                  <span className="edd-promise-number">{promise.number}</span>
                  <span>
                    <strong>{promise.title}</strong>
                    <span>{promise.value}</span>
                  </span>
                  <span className="edd-expand" aria-hidden="true">
                    +
                  </span>
                </summary>
                <div className="edd-proof">
                  <p className="edd-kicker">How to test this claim</p>
                  <p>{promise.proof}</p>
                  <p className="edd-small">{promise.contribution}</p>
                </div>
              </details>
            ))}
          </div>
        </section>
        <section className="edd-cost" aria-labelledby="edd-cost-title">
          <div>
            <p className="edd-kicker">The economics of understanding</p>
            <h2 id="edd-cost-title">More useful software. A sustainable review burden.</h2>
          </div>
          <div>
            <p>
              Are the tools worth using? Do their findings improve other products? Do later
              reviewers have less to reconstruct?
            </p>
            <p>
              Count engineering review, design and domain participation, coordination, adapter
              upkeep, support, and late rework together. Earlier learning earns its cost when it
              resolves questions, improves useful behavior, or identifies an idea that is not worth
              taking further.
            </p>
            <p className="edd-cost-rule">
              If tools attract no useful work, feedback does not transfer, or upkeep overwhelms the
              benefit, narrow the ecosystem. No percentage saving follows from the storyboard.
            </p>
          </div>
        </section>
        <aside className="edd-roots" aria-labelledby="edd-roots-title">
          <p className="edd-kicker">An open-source idea, extended through products</p>
          <h2 id="edd-roots-title">Give people a reason to bring their eyes.</h2>
          <p>
            EDD extends the idea behind Linus’s Law: more people working with shared code can make
            its problems easier to understand and fix. EDD extends that participation through useful
            products: a designer, a report reader, and an engineer each have different reasons to
            engage. Service commitments make those encounters practical and define what each
            audience can expect.
          </p>
          <details className="edd-disclosure">
            <summary>Intent, adab, and a finite repertoire</summary>
            <div className="edd-detail-copy">
              <p>
                Intent-Driven Information Design asks what a tool helps its audience understand or
                do. Adab asks what we owe participants, evidence, and future uses: truthful
                representation, accessible participation, proportionate promises, and
                follow-through.
              </p>
              <p>
                The ark asks which capabilities, examples, and practices we will keep maintaining
                amid unlimited alternatives. Together these ideas give the ecosystem a purpose and a
                limit.
              </p>
            </div>
          </details>
        </aside>
        <footer className="edd-closing">
          <p className="edd-kicker">Ecosystem Driven Development</p>
          <p>Use cheap implementation to create useful places for understanding to grow.</p>
          <span>
            Shared capabilities connect different audiences, so later review begins with what their
            work has already taught us.
          </span>
        </footer>
      </div>
    </ExamplePageLayout>
  )
}
