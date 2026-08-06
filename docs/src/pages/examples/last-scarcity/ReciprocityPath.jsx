import React, { useCallback, useMemo, useState } from "react"
import { DifferenceChart, TooltipRoot, XYCustomChart } from "semiotic/xy"
import { hitTargetPoint, unwrapDatum } from "semiotic/recipes"
import useResponsiveWidth from "../../../hooks/useResponsiveWidth"
import {
  COMPANION_ASSOCIATIONS,
  COMPANION_PROMISE_VS_ASSOCIATION,
} from "./lastScarcityData"

const DOMAIN = [-0.8, 0.15]

const BEINGS = [
  {
    id: "agreeable",
    label: "Always agrees",
    mark: "Ⅰ",
    note: "An AI companion engineered never to refuse you",
  },
  {
    id: "strategic",
    label: "Sometimes resists",
    mark: "Ⅱ",
    note: "An AI that sometimes says no because resistance keeps you engaged",
  },
  {
    id: "human",
    label: "May genuinely refuse",
    mark: "Ⅲ",
    note: "A person whose no is not a product feature",
  },
]

const QUESTIONS = [
  { id: "love", label: "Which can love you?" },
  { id: "care", label: "Which can care for you?" },
  { id: "prefer", label: "Which do you prefer day to day?" },
]

const DIFFERENCE_TICKS = COMPANION_PROMISE_VS_ASSOCIATION.map((row) => row.x)

function formatAssociation(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return "—"
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}`
}

/** DifferenceChart multi-tooltip with fixed 2-decimal values (no float junk). */
function differenceTooltip(hover) {
  const rowByX = (xVal) =>
    COMPANION_PROMISE_VS_ASSOCIATION.find((row) => row.x === xVal) ??
    COMPANION_PROMISE_VS_ASSOCIATION.find((row) => Math.abs(row.x - Number(xVal)) < 0.01)

  const allSeries = hover?.allSeries
  const xVal = hover?.xValue ?? hover?.data?.__x
  const fromSeries = (group) => {
    const hit = Array.isArray(allSeries) ? allSeries.find((s) => s.group === group) : null
    return hit?.value
  }
  let aVal = fromSeries("line-A") ?? hover?.data?.__valA
  let bVal = fromSeries("line-B") ?? hover?.data?.__valB
  const row = rowByX(xVal)
  if (row) {
    if (aVal == null || !Number.isFinite(Number(aVal))) aVal = row.promise
    if (bVal == null || !Number.isFinite(Number(bVal))) bVal = row.associated
  }

  return (
    <TooltipRoot chrome="css" className="ls-chart-tooltip">
      <span>{row?.label ?? "Story step"}</span>
      <strong>Link with {row?.id === "network" ? "social life / well-being" : "self-reported well-being"}</strong>
      <small>Product promise (scenario): {formatAssociation(aVal)}</small>
      <small>Survey association: {formatAssociation(bVal)}</small>
      <small>Scale: about −1 to +1. Negative = linked with worse on that measure.</small>
    </TooltipRoot>
  )
}

function describeAnswers(answers) {
  const love = answers.love
  const care = answers.care
  const prefer = answers.prefer
  if (!love && !care && !prefer) {
    return "Answer the three questions. Your choices will show up here as a short reading, not a score."
  }
  const parts = []
  if (love) parts.push(`Love: ${BEINGS.find((b) => b.id === love)?.label.toLowerCase()}`)
  if (care) parts.push(`Care: ${BEINGS.find((b) => b.id === care)?.label.toLowerCase()}`)
  if (prefer) parts.push(`Prefer: ${BEINGS.find((b) => b.id === prefer)?.label.toLowerCase()}`)
  let tension = ""
  if (prefer === "agreeable" && (love === "human" || care === "human")) {
    tension =
      " You separated what you want day to day from what you think only a free person can give."
  } else if (prefer === "human" && love === "human" && care === "human") {
    tension = " You kept love, care, and preference aligned with someone who can refuse."
  } else if (prefer === "agreeable" && love === "agreeable") {
    tension =
      " You accepted a companion that cannot refuse as enough for both preference and love."
  } else if (prefer === "strategic") {
    tension =
      " You left room for resistance, but still as a designed product behavior."
  }
  return `${parts.join(" · ")}.${tension}`
}

export default function ReciprocityPath({ onChoice }) {
  const [width, hostRef] = useResponsiveWidth(320, 720)
  const [selectedAssociation, setSelectedAssociation] = useState(COMPANION_ASSOCIATIONS[1])
  const [answers, setAnswers] = useState({ love: null, care: null, prefer: null })
  const chartHeight = width < 500 ? 390 : 330
  const differenceHeight = width < 500 ? 300 : 280

  const layout = useMemo(() => associationLayout, [])
  const handleObservation = useCallback((event) => {
    if (event.type === "hover" && event.datum) {
      const datum = unwrapDatum(event.datum)
      if (datum?.beta != null) setSelectedAssociation(datum)
    }
  }, [])

  const answer = useCallback(
    (questionId, beingId) => {
      setAnswers((current) => ({ ...current, [questionId]: beingId }))
      onChoice?.(`companion-${questionId}`, beingId)
    },
    [onChoice],
  )

  const reading = useMemo(() => describeAnswers(answers), [answers])
  const answeredCount = Object.values(answers).filter(Boolean).length

  return (
    <div ref={hostRef} className="ls-reciprocity">
      <div className="ls-difference-block">
        <div className="ls-difference-block__head">
          <span>PROMISE VS. ASSOCIATION</span>
          <h3>What the product story sells · what the survey finds</h3>
          <p>
            Vertical axis is <strong>how strongly companionship use is linked with how people said
            they felt</strong> (or offline social life, for the first step)—a standardized survey
            link on a roughly −1 to +1 scale, not a happiness score out of 100. Positive = linked
            with better; negative = linked with worse. Rose is a marketing promise (made up for
            contrast). Sage is the published survey link. Numbers show two decimals only.
          </p>
        </div>
        <div className="ls-reciprocity__difference">
          <DifferenceChart
            data={COMPANION_PROMISE_VS_ASSOCIATION}
            xAccessor="x"
            seriesAAccessor="promise"
            seriesBAccessor="associated"
            seriesALabel="Product promise (scenario)"
            seriesBLabel="Survey link with well-being"
            seriesAColor="var(--ls-series-rose, #a85555)"
            seriesBColor="var(--ls-series-sage, #4f705a)"
            width={Math.max(320, width)}
            height={differenceHeight}
            margin={{ top: 18, right: 18, bottom: 48, left: 52 }}
            xExtent={[-0.15, 3.15]}
            yExtent={[-0.7, 0.55]}
            areaOpacity={0.55}
            showLines
            lineWidth={2}
            showPoints
            pointRadius={4}
            showLegend
            legendPosition="bottom"
            enableHover
            tooltip={differenceTooltip}
            accessibleTable
            description="DifferenceChart of product-promise scenario versus published survey associations with self-reported well-being. Units are standardized association strength on about a −1 to +1 scale."
            summary="At well-being, the promise is +0.42 while the survey link is −0.48."
            chartId="last-scarcity-companion-difference"
            xFormat={(value) =>
              COMPANION_PROMISE_VS_ASSOCIATION.find((row) => row.x === value)?.label ?? String(value)
            }
            yFormat={(value) => formatAssociation(value)}
            yLabel="Link with well-being (−1 to +1)"
            frameProps={{
              background: "transparent",
              axes: [
                {
                  orient: "bottom",
                  tickValues: DIFFERENCE_TICKS,
                  tickFormat: (value) =>
                    COMPANION_PROMISE_VS_ASSOCIATION.find((row) => row.x === value)?.label ?? "",
                },
                {
                  orient: "left",
                  tickFormat: (value) => formatAssociation(value),
                },
              ],
            }}
          />
        </div>
        <ul className="ls-difference-notes">
          {COMPANION_PROMISE_VS_ASSOCIATION.map((row) => (
            <li key={row.id}>
              <strong>{row.label}</strong>
              <span>
                {row.note} (promise {formatAssociation(row.promise)}, survey{" "}
                {formatAssociation(row.associated)})
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="ls-association-warning">
        <span aria-hidden="true">≠</span>
        <div>
          <strong>Association, not proof of cause</strong>
          <p>
            Below: the same survey, as dots with uncertainty ranges. The number is a{" "}
            <strong>standardized link with {selectedAssociation.outcome}</strong>—mostly how well
            people said they felt, not a happiness score out of 100. Zero = no measured link. Left
            of zero = companionship use went with worse on that measure.
          </p>
        </div>
      </div>

      <div className="ls-reciprocity__chart">
        <XYCustomChart
          data={COMPANION_ASSOCIATIONS}
          layout={layout}
          width={Math.max(320, width)}
          height={chartHeight}
          xExtent={DOMAIN}
          yExtent={[0, COMPANION_ASSOCIATIONS.length]}
          margin={{ top: 28, right: 18, bottom: 44, left: width < 500 ? 24 : 36 }}
          chartId="last-scarcity-reciprocity-path"
          enableHover
          onObservation={handleObservation}
          accessibleTable
          description="Four survey associations for Character.AI users. The number is a standardized link with self-reported well-being (or offline network size). Left of zero means linked with worse."
          summary="All four intervals lie left of zero. The largest is companionship use and lower self-reported well-being, −0.48."
          tooltip={(datum) => {
            const row = unwrapDatum(datum)
            if (!row) return null
            return (
              <TooltipRoot chrome="css" className="ls-chart-tooltip">
                <span>{row.sample}</span>
                <strong>{row.label}</strong>
                <small>
                  Link with {row.outcome}: {formatAssociation(row.beta)}
                </small>
                <small>
                  Plausible range {formatAssociation(row.low)} to {formatAssociation(row.high)}
                </small>
                <small>{row.reading}</small>
              </TooltipRoot>
            )
          }}
          frameProps={{ background: "transparent" }}
        />
      </div>

      <div className="ls-association-readout" aria-live="polite">
        <span>Selected survey link · with {selectedAssociation.outcome}</span>
        <strong>{selectedAssociation.plainLabel}</strong>
        <p>
          Link strength {formatAssociation(selectedAssociation.beta)} · range{" "}
          {formatAssociation(selectedAssociation.low)} to{" "}
          {formatAssociation(selectedAssociation.high)} · {selectedAssociation.sample}
        </p>
        <small>
          {selectedAssociation.detail} {selectedAssociation.reading}
        </small>
      </div>

      <div className="ls-companion-encounter">
        <div className="ls-companion-encounter__intro">
          <span>THE HARDER QUESTION</span>
          <p>
            Even if every association flipped tomorrow, one distinction would remain. These three
            kinds of companion are not the same thing, and the questions need not share an answer.
          </p>
        </div>
        <div className="ls-companion-beings" aria-label="Three kinds of companion">
          {BEINGS.map((being) => {
            const selectedFor = Object.entries(answers)
              .filter(([, id]) => id === being.id)
              .map(([q]) => q)
            return (
              <article
                key={being.id}
                className={selectedFor.length ? "is-chosen" : ""}
                data-chosen={selectedFor.join(",") || undefined}
              >
                <span aria-hidden="true">{being.mark}</span>
                <h3>{being.label}</h3>
                <p>{being.note}</p>
                {selectedFor.length > 0 && (
                  <small>
                    You chose this for:{" "}
                    {selectedFor
                      .map((q) => QUESTIONS.find((item) => item.id === q)?.label.replace(/\?$/, ""))
                      .join(", ")}
                  </small>
                )}
              </article>
            )
          })}
        </div>

        <div className="ls-companion-questions">
          {QUESTIONS.map((question) => (
            <fieldset key={question.id}>
              <legend>{question.label}</legend>
              <div>
                {BEINGS.map((being) => (
                  <button
                    type="button"
                    key={being.id}
                    aria-pressed={answers[question.id] === being.id}
                    onClick={() => answer(question.id, being.id)}
                  >
                    {being.mark} <span>{being.label}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="ls-companion-choice-readout" aria-live="polite">
          <span>
            Your reading · {answeredCount} of 3 answered
          </span>
          <p>{reading}</p>
        </div>
        <p className="ls-companion-encounter__note">
          No answer produces a morality score. Preference is allowed to diverge from metaphysics.
        </p>
      </div>

      <div className="ls-companion-source-stats">
        <div>
          <strong>1,131</strong>
          <span>survey participants</span>
        </div>
        <div>
          <strong>237</strong>
          <span>chat-history donors</span>
        </div>
        <div>
          <strong>4,664</strong>
          <span>sessions</span>
        </div>
        <div>
          <strong>464,687</strong>
          <span>messages analyzed; none reproduced here</span>
        </div>
      </div>

      <details className="ls-data-fallback">
        <summary>Open coefficients, intervals, and caveats as a table</summary>
        <table>
          <caption>Survey associations (standardized estimates)</caption>
          <thead>
            <tr>
              <th>What was linked</th>
              <th>Estimate</th>
              <th>Plausible range</th>
              <th>Sample</th>
            </tr>
          </thead>
          <tbody>
            {COMPANION_ASSOCIATIONS.map((row) => (
              <tr key={row.id}>
                <td>{row.plainLabel}</td>
                <td>{formatAssociation(row.beta)}</td>
                <td>
                  {formatAssociation(row.low)} to {formatAssociation(row.high)}
                </td>
                <td>{row.sample}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="ls-data-fallback__note">
          The DifferenceChart “product promise” series is an authored scenario for contrast. Only
          the association series and forest-plot coefficients come from the preprint.
        </p>
      </details>
    </div>
  )
}

function associationLayout(ctx) {
  if (!ctx.data.length) return { nodes: [] }

  const { plot } = ctx.dimensions
  const x = (value) => ((value - DOMAIN[0]) / (DOMAIN[1] - DOMAIN[0])) * plot.width
  const rowHeight = plot.height / COMPANION_ASSOCIATIONS.length
  const zero = x(0)
  const nodes = ctx.data.map((row) => {
    const index = COMPANION_ASSOCIATIONS.findIndex((item) => item.id === row.id)
    const y = rowHeight * index + rowHeight / 2
    // Curated datum only — avoid dumping raw beta keys into default tooltips.
    return hitTargetPoint({
      x: x(row.beta),
      y,
      r: 9,
      datum: {
        id: row.id,
        label: row.label,
        plainLabel: row.plainLabel,
        outcome: row.outcome,
        beta: row.beta,
        low: row.low,
        high: row.high,
        sample: row.sample,
        detail: row.detail,
        reading: row.reading,
      },
      id: `association-${row.id}`,
    })
  })
  return {
    nodes,
    overlays: (
      <g pointerEvents="none" className="ls-association-svg">
        <line
          x1={zero}
          x2={zero}
          y1="0"
          y2={plot.height}
          stroke="var(--ls-chart-ink-soft, #6e7b72)"
          strokeWidth="1"
          strokeDasharray="3 5"
        />
        <text
          x={zero - 5}
          y="12"
          textAnchor="end"
          fill="var(--ls-chart-ink-soft, #68746b)"
          fontSize="8"
          letterSpacing="0.4"
        >
          ZERO · NO LINK
        </text>
        <text
          x={4}
          y={plot.height - 4}
          fill="var(--ls-chart-ink-soft, #68746b)"
          fontSize="8"
        >
          ← worse well-being / thinner social life
        </text>
        <text
          x={plot.width - 4}
          y={plot.height - 4}
          textAnchor="end"
          fill="var(--ls-chart-ink-soft, #68746b)"
          fontSize="8"
        >
          better on that measure →
        </text>
        {ctx.data.map((row) => {
          const index = COMPANION_ASSOCIATIONS.findIndex((item) => item.id === row.id)
          const y = rowHeight * index + rowHeight / 2
          return (
            <g key={row.id}>
              {index % 2 === 0 && (
                <rect
                  x="0"
                  y={y - rowHeight / 2}
                  width={plot.width}
                  height={rowHeight}
                  fill="var(--ls-chart-ink-soft, #74887b)"
                  opacity="0.035"
                />
              )}
              <line
                x1={x(row.low)}
                x2={x(row.high)}
                y1={y}
                y2={y}
                stroke="#9a5e67"
                strokeWidth="5"
                strokeLinecap="round"
                opacity="0.54"
              />
              <line x1={x(row.low)} x2={x(row.low)} y1={y - 7} y2={y + 7} stroke="#7e4e59" />
              <line x1={x(row.high)} x2={x(row.high)} y1={y - 7} y2={y + 7} stroke="#7e4e59" />
              <circle
                cx={x(row.beta)}
                cy={y}
                r="6.5"
                fill="#8e5260"
                stroke="var(--ls-chart-paper, #fffefa)"
                strokeWidth="2"
              />
              <text
                x="4"
                y={y - 12}
                fill="var(--ls-chart-ink, #30483f)"
                fontSize="9"
                fontWeight="700"
              >
                {row.label.toUpperCase()}
              </text>
              <text
                x={plot.width - 4}
                y={y + 15}
                textAnchor="end"
                fill="var(--ls-chart-ink-soft, #6f756f)"
                fontSize="8"
              >
                {formatAssociation(row.beta)} · range {formatAssociation(row.low)} to{" "}
                {formatAssociation(row.high)}
              </text>
            </g>
          )
        })}
        {[-0.8, -0.6, -0.4, -0.2, 0].map((tick) => (
          <g key={tick} transform={`translate(${x(tick)},${plot.height})`}>
            <line y2="6" stroke="var(--ls-chart-ink-soft, #738078)" />
            <text
              y="19"
              textAnchor="middle"
              fill="var(--ls-chart-ink-soft, #657168)"
              fontSize="8"
            >
              {formatAssociation(tick)}
            </text>
          </g>
        ))}
      </g>
    ),
  }
}
