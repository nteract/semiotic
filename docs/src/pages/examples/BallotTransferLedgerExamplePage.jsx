import React, { useMemo, useState } from "react"
import { ProcessSankey } from "semiotic"
import { unwrapDatum } from "semiotic/recipes"
import CodeBlock from "../../components/CodeBlock"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  NYC_RCV_AXIS_TICKS,
  NYC_RCV_COLORS,
  NYC_RCV_DOMAIN,
  NYC_RCV_METRICS,
  NYC_RCV_PROCESS_EDGES,
  NYC_RCV_PROCESS_NODES,
  NYC_RCV_SOURCE,
  ROUND_FIVE_TALLY,
  TRANSFER_ANALYSIS,
  TRANSFER_POOLS,
  candidateLabel,
  formatVotes,
  transferPoolById,
} from "./data/nycMayoralRcvFlow"
import "./BallotTransferLedgerExamplePage.css"

const implementationCode = `import { ProcessSankey } from "semiotic"

<ProcessSankey
  nodes={nodes}
  edges={certifiedTransfers}
  domain={[4, 7.6]}
  axisTicks={roundTicks}
  nodeLabel="label"
  colorBy="category"
  colorScheme={candidateColors}
  pairing="temporal"
  packing="reuse"
  laneOrder="crossing-min+inside-out"
  maxValueScale={0.00038}
  lanePlacement="hug"
  ribbonLane="both"
  lifetimeMode="half"
  showLaneRails
  edgeOpacity={(edge) =>
    edge.poolId === selectedPoolId ? 0.92 : edge.poolId ? 0.1 : 0.26
  }
  accessibleTable
/>

// One edge is one certified destination total—not an inferred voter path.
{
  source: "WILEY",
  target: "GARCIA",
  value: 130384,
  startTime: 6.85,
  endTime: 7.15,
  poolId: "wiley"
}`

const FINAL_ROWS = Object.freeze([
  {
    id: "ADAMS",
    label: "Eric Adams",
    roundFive: 295798,
    final: NYC_RCV_METRICS.finalAdams,
    color: NYC_RCV_COLORS.adams,
  },
  {
    id: "GARCIA",
    label: "Kathryn Garcia",
    roundFive: 191876,
    final: NYC_RCV_METRICS.finalGarcia,
    color: NYC_RCV_COLORS.garcia,
  },
  {
    id: "INACTIVE",
    label: "Inactive ballots",
    roundFive: 8062,
    final: NYC_RCV_METRICS.finalInactive,
    color: NYC_RCV_COLORS.inactive,
  },
])

function percent(value) {
  return `${(value * 100).toFixed(1)}%`
}

function roundLabel(value) {
  return value === 8 ? "Final" : `Round ${value}`
}

function categoryColor(target) {
  const category = ROUND_FIVE_TALLY.find((row) => row.id === target)?.category
  return NYC_RCV_COLORS[category] ?? NYC_RCV_COLORS.baseline
}

function transferEdgeOpacity(edge, selectedPoolId) {
  if (!edge.poolId) return 0.26
  return edge.poolId === selectedPoolId ? 0.92 : 0.1
}

export function BallotTransferTooltip({ hover }) {
  const datum = unwrapDatum(hover)
  if (!datum) return null

  if (datum.kind === "transfer") {
    return (
      <div className="semiotic-tooltip ballot-ledger__tooltip">
        <span>{datum.poolLabel}</span>
        <strong>{datum.sourceLabel} → {datum.targetLabel}</strong>
        <b>{formatVotes(datum.value)} ballots</b>
        <small>{percent(datum.share)} of the {formatVotes(datum.poolTotal)}-ballot pool</small>
      </div>
    )
  }

  if (datum.kind === "opening-tally") {
    return (
      <div className="semiotic-tooltip ballot-ledger__tooltip">
        <span>Round 5 position</span>
        <strong>{datum.targetLabel}</strong>
        <b>{formatVotes(datum.value)} ballots</b>
        <small>The starting ledger for this analysis.</small>
      </div>
    )
  }

  if (!datum.id) return null
  return (
    <div className="semiotic-tooltip ballot-ledger__tooltip">
      <span>Ledger account</span>
      <strong>{datum.label ?? candidateLabel(datum.id)}</strong>
      <p>{datum.description ?? "A continuing account in the certified count."}</p>
    </div>
  )
}

function Metric({ value, label, note }) {
  return (
    <div className="ballot-ledger__metric">
      <strong>{value}</strong>
      <span>{label}</span>
      <small>{note}</small>
    </div>
  )
}

function TransferInspector({ pool }) {
  const analysis = TRANSFER_ANALYSIS.find((row) => row.id === pool.id)
  const maxTransfer = Math.max(...pool.transfers.map((row) => row.value))

  return (
    <section className="ballot-ledger__inspector" aria-live="polite" aria-labelledby="transfer-inspector-title">
      <div className="ballot-ledger__inspector-heading">
        <div>
          <span>{roundLabel(pool.roundFrom)} → {roundLabel(pool.roundTo)}</span>
          <h3 id="transfer-inspector-title">{pool.label}</h3>
        </div>
        <strong>{formatVotes(pool.sourceTotal)} ballots</strong>
      </div>
      <div className="ballot-ledger__transfer-bars">
        {pool.transfers.map((transfer) => (
          <div className="ballot-ledger__transfer-row" key={transfer.target}>
            <span>{candidateLabel(transfer.target)}</span>
            <div>
              <i
                style={{
                  "--transfer-color": categoryColor(transfer.target),
                  "--transfer-width": `${(transfer.value / maxTransfer) * 100}%`,
                }}
              />
            </div>
            <strong>{formatVotes(transfer.value)}</strong>
            <small>{percent(transfer.value / pool.sourceTotal)}</small>
          </div>
        ))}
      </div>
      <div className="ballot-ledger__gap-readout">
        <span>Adams lead</span>
        <strong>{formatVotes(analysis.gapBefore)} <i aria-hidden="true">→</i> {formatVotes(analysis.gapAfter)}</strong>
        <small>Garcia closes {formatVotes(analysis.netClosing)} votes in this transfer.</small>
      </div>
    </section>
  )
}

export default function BallotTransferLedgerExamplePage() {
  const [selectedPoolId, setSelectedPoolId] = useState("wiley")
  const [chartWidth, chartRef] = useResponsiveWidth(300, 1120)
  const selectedPool = useMemo(() => transferPoolById(selectedPoolId), [selectedPoolId])
  const compact = chartWidth < 700

  function inspectChartDatum(hover) {
    const datum = unwrapDatum(hover)
    if (datum?.poolId) setSelectedPoolId(datum.poolId)
  }

  return (
    <ExamplePageLayout title="The 7,197-Vote Corridor">
      <div className="ballot-ledger">
        <header className="ballot-ledger__masthead">
          <div className="ballot-ledger__title-block">
            <span>NYC DEMOCRATIC MAYORAL PRIMARY / CERTIFIED 2021</span>
            <h2>THE<br />7,197-VOTE<br />CORRIDOR</h2>
            <p>
              Eric Adams entered Round 5 ahead of Kathryn Garcia by 103,922 votes. Three transfer pools
              narrowed that lead almost to zero—without ever reversing it.
            </p>
          </div>
          <div className="ballot-ledger__hero-number" aria-label="Final margin: 7,197 votes">
            <small>FINAL MARGIN</small>
            <strong>7,197</strong>
            <span>votes</span>
            <div>
              <i style={{ "--closed": `${NYC_RCV_METRICS.gapClosedShare * 100}%` }} />
            </div>
            <p>{(NYC_RCV_METRICS.gapClosedShare * 100).toFixed(1)}% of the Round 5 gap closed</p>
          </div>
        </header>

        <section className="ballot-ledger__metrics" aria-label="Late-round election summary">
          <Metric value="103,922" label="votes behind" note="Garcia after Round 5" />
          <Metric value="205,440" label="late votes gained" note="Garcia across three pools" />
          <Metric value="108,715" label="late votes gained" note="Adams across three pools" />
          <Metric value="140,202" label="inactive at finish" note="14.9% of the Round 5 ledger" />
        </section>

        <section className="ballot-ledger__brief" aria-labelledby="ballot-question-title">
          <span>01 / The question</span>
          <div>
            <h3 id="ballot-question-title">How can a six-figure lead nearly vanish without changing hands?</h3>
            <p>
              A round-by-round scoreboard shows the narrowing margin. The transfer ledger shows its mechanism:
              which eliminated tally released each batch, where that batch landed, and how many ballots stopped
              participating before the final comparison.
            </p>
          </div>
          <aside>
            <span>Reading rule</span>
            <p>Band width is the account balance. A ribbon is a certified transfer. Every ballot has one destination in each elimination.</p>
          </aside>
        </section>

        <section className="ballot-ledger__chart-section" aria-labelledby="ballot-chart-title">
          <div className="ballot-ledger__chart-heading">
            <div>
              <span>02 / Follow the ledger</span>
              <h3 id="ballot-chart-title">942,031 ballots through the final three eliminations</h3>
              <p>
                The count begins at Round 5. Read left to right; select a pool below or click a transfer ribbon to keep
                that transfer saturated while the others recede.
              </p>
            </div>
            <div className="ballot-ledger__legend" aria-label="Candidate color key">
              {FINAL_ROWS.map((row) => <span key={row.id}><i style={{ background: row.color }} />{row.label}</span>)}
            </div>
          </div>

          <div className="ballot-ledger__pool-selector" role="group" aria-label="Inspect a transfer pool">
            {TRANSFER_POOLS.map((pool) => (
              <button
                type="button"
                key={pool.id}
                aria-pressed={selectedPoolId === pool.id}
                onClick={() => setSelectedPoolId(pool.id)}
              >
                <small>{roundLabel(pool.roundFrom)} → {roundLabel(pool.roundTo)}</small>
                <strong>{pool.shortLabel}</strong>
                <span>{formatVotes(pool.sourceTotal)} ballots</span>
              </button>
            ))}
          </div>

          <div
            className="ballot-ledger__chart-shell"
            data-selected-pool={selectedPoolId}
            data-transfer-edge-opacities={JSON.stringify(
              Object.fromEntries(
                NYC_RCV_PROCESS_EDGES.map((edge) => [
                  edge.id,
                  transferEdgeOpacity(edge, selectedPoolId),
                ]),
              ),
            )}
            ref={chartRef}
          >
            <ProcessSankey
              nodes={NYC_RCV_PROCESS_NODES}
              edges={NYC_RCV_PROCESS_EDGES}
              domain={NYC_RCV_DOMAIN}
              axisTicks={NYC_RCV_AXIS_TICKS}
              nodeLabel="label"
              width={Math.max(300, chartWidth)}
              height={compact ? 500 : 580}
              margin={{ top: 28, right: compact ? 20 : 108, bottom: 48, left: compact ? 74 : 112 }}
              colorBy="category"
              colorScheme={NYC_RCV_COLORS}
              showLegend={false}
              pairing="temporal"
              packing="reuse"
              laneOrder="crossing-min+inside-out"
              maxValueScale={0.00038}
              lanePlacement="hug"
              ribbonLane="both"
              lifetimeMode="half"
              showLaneRails
              showLabels
              edgeOpacity={(edge) => transferEdgeOpacity(edge, selectedPoolId)}
              tooltip={(hover) => <BallotTransferTooltip hover={hover} />}
              onClick={inspectChartDatum}
              timeFormat={(value) => roundLabel(Math.round(Number(value)))}
              valueFormat={(value) => `${formatVotes(value)} ballots`}
              accessibleTable
              description="Certified NYC mayoral primary ballots moving from the Round 5 tally through the joint field, Andrew Yang, and Maya Wiley elimination pools to Eric Adams, Kathryn Garcia, or inactive status."
              summary="Garcia receives more ballots than Adams from every late transfer pool, closing 96,725 votes of a 103,922-vote deficit. Adams finishes 7,197 votes ahead; 140,202 ballots are inactive."
              chartId="nyc-mayoral-transfer-ledger"
            />
          </div>
          <p className="ballot-ledger__chart-caption">
            The first fan records the Round 5 balances. Later ribbons are the Board of Elections’ published transfers.
            The three-candidate joint elimination remains combined because the certified recap does not publish separate destinations for it.
          </p>
        </section>

        <TransferInspector pool={selectedPool} />

        <section className="ballot-ledger__findings" aria-labelledby="ballot-findings-title">
          <div className="ballot-ledger__findings-heading">
            <span>03 / What moved the margin</span>
            <h3 id="ballot-findings-title">The largest pool was also the most directional.</h3>
          </div>
          <div className="ballot-ledger__finding-grid">
            <article>
              <span>Consistent direction</span>
              <strong>3 of 3</strong>
              <h4>Every late pool sent more ballots to Garcia.</h4>
              <p>That pattern is small in the first two transfers, then becomes decisive when Wiley’s tally is redistributed.</p>
              <button type="button" onClick={() => setSelectedPoolId("field")}>Inspect the first pool</button>
            </article>
            <article className="is-emphasis">
              <span>Wiley transfer</span>
              <strong>80,528</strong>
              <h4>One pool erased 77.5% of the starting deficit.</h4>
              <p>Garcia received 130,384 of Wiley’s 254,728 ballots; Adams received 49,856. The gap fell from 87,725 to 7,197.</p>
              <button type="button" onClick={() => setSelectedPoolId("wiley")}>Inspect Wiley’s pool</button>
            </article>
            <article>
              <span>Third destination</span>
              <strong>140,202</strong>
              <h4>Inactive ballots became a major final account.</h4>
              <p>The inactive lane grows at every transfer. It records ballots without a continuing valid choice, not support for either finalist.</p>
              <button type="button" onClick={() => setSelectedPoolId("yang")}>Inspect Yang’s pool</button>
            </article>
          </div>
        </section>

        <section className="ballot-ledger__scoreboard" aria-labelledby="ballot-scoreboard-title">
          <div>
            <span>04 / The endpoints</span>
            <h3 id="ballot-scoreboard-title">The scoreboard is accurate. It is simply missing the middle.</h3>
            <p>
              Garcia added nearly twice as many late-round ballots as Adams. That extraordinary gain still fell
              7,197 votes short because the transfer sequence began with Adams more than 100,000 ahead.
            </p>
          </div>
          <div className="ballot-ledger__score-table" role="table" aria-label="Round 5 and final ballot totals">
            <div className="ballot-ledger__score-header" role="row">
              <span role="columnheader">Account</span><span role="columnheader">Round 5</span><span role="columnheader">Final</span>
            </div>
            {FINAL_ROWS.map((row) => (
              <div className="ballot-ledger__score-row" role="row" key={row.id} style={{ "--row-color": row.color }}>
                <strong role="cell">{row.label}</strong>
                <span role="cell">{formatVotes(row.roundFive)}</span>
                <span role="cell">{formatVotes(row.final)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="ballot-ledger__method" aria-labelledby="ballot-method-title">
          <div>
            <span>05 / Source and method</span>
            <h3 id="ballot-method-title">A conservation check on the certified recap</h3>
            <p>
              This view transcribes the official NYC Board of Elections ranked-choice rounds beginning at Round 5.
              Each elimination pool sums exactly to its published source total. At the finish, Adams (404,513),
              Garcia (397,316), and inactive ballots (140,202) sum back to all 942,031 ballots in the opening ledger.
            </p>
            <p>
              The recap reports McGuire, Morales, and Stringer as one joint transfer. Keeping them together is an
              evidentiary boundary: their combined destinations are known, but candidate-specific paths inside that pool are not.
            </p>
          </div>
          <a href={NYC_RCV_SOURCE.href} target="_blank" rel="noreferrer">
            <small>PRIMARY SOURCE / CERTIFIED {NYC_RCV_SOURCE.certified.toUpperCase()}</small>
            <strong>{NYC_RCV_SOURCE.label}</strong>
            <span>Open the official round-by-round table ↗</span>
          </a>
        </section>

        <section className="blocks-example ballot-ledger__code" aria-labelledby="ballot-code-title">
          <span>06 / Rebuild the view</span>
          <h3 id="ballot-code-title">The ledger is encoded as timed, conserved transfers</h3>
          <p>
            Reusable lanes keep each round compact after an eliminated account closes. Temporal pairing and crossing-aware
            ordering keep the source and destination edges aligned while the ballot values determine ribbon width.
          </p>
          <CodeBlock code={implementationCode} language="jsx" showCopyButton wrap />
        </section>

        <footer className="ballot-ledger__footer">
          <span>NYC / JUNE 2021 DEMOCRATIC PRIMARY / CERTIFIED COUNT</span>
          <strong>Garcia won every late transfer. Adams won the corridor.</strong>
          <p>The result is the accumulation of both facts.</p>
        </footer>
      </div>
    </ExamplePageLayout>
  )
}
