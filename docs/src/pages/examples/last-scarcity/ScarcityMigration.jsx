import React, { useCallback, useMemo, useState } from "react"
import { ProcessSankey, TooltipRoot, markTooltipChrome } from "semiotic/network"
import { unwrapDatum } from "semiotic/recipes"
import useResponsiveWidth from "../../../hooks/useResponsiveWidth"
import {
  DEFAULT_SCARCITY_PARAMETERS,
  SCARCITY_GOODS,
  scarcityProcess,
} from "./lastScarcityData"

const MODEL_COLORS = {
  scenario: "var(--ls-series-scenario, #476c60)",
  reproducible: "var(--ls-series-reproducible, #88a99f)",
  rival: "var(--ls-series-rival, #7f9b76)",
  positional: "var(--ls-series-positional, #8e5c70)",
  relational: "var(--ls-series-relational, #b9655b)",
  institutional: "var(--ls-series-institutional, #4c6675)",
}

const PRIMARY_CONTROL = {
  id: "abundance",
  label: "How cheap are copies?",
  low: "still costly",
  high: "nearly free",
  help: "Primary dial. As abundance rises, competition leaves printable goods and crowds into rank, attention, and relationships.",
}

const SECONDARY_CONTROLS = [
  { id: "concentration", label: "Wealth concentration", low: "spread out", high: "concentrated" },
  { id: "imitation", label: "How much we copy each other", low: "independent", high: "imitative" },
]

const ADVANCED_CONTROLS = [
  { id: "norms", label: "Strength of social norms", low: "weak", high: "strong" },
  { id: "substitution", label: "Synthetic substitution", low: "little", high: "extensive" },
  { id: "access", label: "Distribution of access", low: "enclosed", high: "broad" },
  { id: "care", label: "Care & civic capacity", low: "thin", high: "thick" },
]

export default function ScarcityMigration({ parameters, onParametersChange }) {
  const [width, hostRef] = useResponsiveWidth(320, 720, { bucket: 20 })
  const [selected, setSelected] = useState(null)
  const process = useMemo(() => scarcityProcess(parameters), [parameters])
  const chartHeight = width < 520 ? 680 : 540
  const chartMargin = width < 520
    ? { top: 42, right: 10, bottom: 48, left: 78 }
    : { top: 42, right: 30, bottom: 46, left: 112 }

  const update = useCallback((id, value) => {
    onParametersChange({ ...parameters, [id]: Number(value) })
  }, [onParametersChange, parameters])

  const inspect = useCallback((hover) => {
    const datum = unwrapDatum(hover)
    if (datum) setSelected(datum)
  }, [])

  const gainers = process.deltas.filter((row) => row.delta > 0).slice(0, 4)
  const losers = process.deltas.filter((row) => row.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 3)
  const headlineGainer = gainers[0]
  const headlineLoser = losers[0]

  return (
    <div ref={hostRef} className="ls-migration">
      <div className="ls-model-notice">
        <span className="ls-model-notice__texture" aria-hidden="true" />
        <div>
          <strong>Scenario model · 100 conserved units · not a forecast</strong>
          <p>
            Left is a world where copies are still expensive. Right is your scenario after they get cheap.
            Ribbons that cross are competition moving from one kind of good to another.
          </p>
        </div>
      </div>

      <div className="ls-model-controls">
        <label className="ls-model-control ls-model-control--primary">
          <span>
            <strong>{PRIMARY_CONTROL.label}</strong>
            <output>{parameters.abundance}</output>
          </span>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={parameters.abundance}
            onChange={(event) => update("abundance", event.target.value)}
          />
          <small><i>{PRIMARY_CONTROL.low}</i><i>{PRIMARY_CONTROL.high}</i></small>
          <p className="ls-model-control__help">{PRIMARY_CONTROL.help}</p>
        </label>

        {SECONDARY_CONTROLS.map((control) => (
          <ModelControl key={control.id} control={control} value={parameters[control.id]} onChange={update} />
        ))}

        <details>
          <summary>More scenario knobs</summary>
          <div>
            {ADVANCED_CONTROLS.map((control) => (
              <ModelControl key={control.id} control={control} value={parameters[control.id]} onChange={update} />
            ))}
          </div>
        </details>
      </div>

      <div className="ls-migration__live" aria-live="polite">
        <span>What just moved</span>
        <strong>
          {process.migrated} of 100 units reallocate under the current dials
          {headlineGainer && headlineLoser
            ? ` · biggest gain ${headlineGainer.label} (+${headlineGainer.delta}) · biggest drop ${headlineLoser.label} (${headlineLoser.delta})`
            : ""}
        </strong>
      </div>

      <div className="ls-migration__chart ls-scenario-layer">
        <ProcessSankey
          nodes={process.nodes}
          edges={process.edges}
          domain={[-0.06, 1.06]}
          axisTicks={[
            { date: 0.05, label: "BEFORE · COPIES COSTLY" },
            { date: 0.95, label: "AFTER · COPIES CHEAP" },
          ]}
          width={Math.max(320, width)}
          height={chartHeight}
          margin={chartMargin}
          colorBy="family"
          colorScheme={MODEL_COLORS}
          nodeLabel="shortLabel"
          nodeSizing="max"
          showLabels
          showLegend={false}
          edgeOpacity={0.74}
          styleRules={MODEL_NODE_STYLE_RULES}
          onClick={inspect}
          tooltip={(hover) => <MigrationTooltip hover={hover} />}
          timeFormat={(value) => (value < 0.5 ? "before cheap copies" : "after abundance")}
          valueFormat={(value) => `${value} of 100 scenario units`}
          accessibleTable
          description="A ProcessSankey with two stages. The left column is a fixed low-abundance baseline. The right column is the current scenario. Ribbons that stay on the same good keep their share; crossing ribbons show competition migrating toward attention, status, exclusivity, relationships, and power as copies get cheaper."
          summary={`${process.migrated} units migrate between goods. ${headlineGainer ? `${headlineGainer.label} gains the most (+${headlineGainer.delta}).` : ""} Reproducible production categories collectively hold ${process.after.filter((row) => row.kind === "reproducible").reduce((sum, row) => sum + row.value, 0)} units after abundance.`}
          chartId="last-scarcity-migration"
        />
      </div>

      <div className="ls-model-readout" aria-live="polite">
        <div>
          <span>{selected?.source && selected?.target ? "Selected flow" : selected?.id ? "Selected good" : "Reading the chart"}</span>
          <strong>{selected?.statement ?? selected?.label ?? "Turn the primary dial and watch ribbons leave printable goods."}</strong>
          <p>
            {selected?.caveat
              ?? "Widths are a conserved story, not a prediction for 2035. Material plenty and social peace are separate knobs."}
          </p>
        </div>
        <ol>
          {gainers.map((row) => (
            <li key={row.id}>
              <span>{row.label}</span>
              <strong className="is-gain">+{row.delta}</strong>
            </li>
          ))}
          {losers.map((row) => (
            <li key={row.id}>
              <span>{row.label}</span>
              <strong className="is-loss">{row.delta}</strong>
            </li>
          ))}
        </ol>
      </div>

      <details className="ls-model-assumptions">
        <summary>How the model works · full before/after table</summary>
        <div className="ls-model-assumptions__formula">
          <span>migration rule</span>
          <strong>keep min(before, after) on each good · ship residual excess from shrinking goods to growing ones</strong>
        </div>
        <p>
          Reproducible costs fall as abundance rises. Status and exclusive access respond to imitation and concentration.
          Relational supply cannot be increased unilaterally. Norms, broad access, and care damp some positional pressure.
          All positive weights are normalized back to exactly 100 on each side of the chart.
        </p>
        <table>
          <caption>Current modeled allocation (before vs after)</caption>
          <thead>
            <tr>
              <th>Good</th>
              <th>Kind</th>
              <th>Before</th>
              <th>After</th>
              <th>Δ</th>
            </tr>
          </thead>
          <tbody>
            {process.deltas
              .slice()
              .sort((a, b) => a.label.localeCompare(b.label))
              .map((row) => (
                <tr key={row.id}>
                  <td>{row.label}</td>
                  <td>{row.kind}</td>
                  <td>{row.before}</td>
                  <td>{row.value}</td>
                  <td>{row.delta > 0 ? `+${row.delta}` : row.delta}</td>
                </tr>
              ))}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan="2">Total</th>
              <td>100</td>
              <td>100</td>
              <td>0</td>
            </tr>
          </tfoot>
        </table>
      </details>
    </div>
  )
}

function ModelControl({ control, value, onChange }) {
  return (
    <label className="ls-model-control">
      <span><strong>{control.label}</strong><output>{value}</output></span>
      <input type="range" min="0" max="100" step="1" value={value} onChange={(event) => onChange(control.id, event.target.value)} />
      <small><i>{control.low}</i><i>{control.high}</i></small>
    </label>
  )
}

function MigrationTooltip({ hover }) {
  const datum = unwrapDatum(hover)
  if (!datum) return null
  return (
    <TooltipRoot chrome="css" className="ls-chart-tooltip">
      <span>scenario model</span>
      <strong>{datum.statement ?? datum.label}</strong>
      <small>{datum.value != null ? `${datum.value} of 100 scenario units` : "modeled node"}</small>
    </TooltipRoot>
  )
}
markTooltipChrome(MigrationTooltip)

const MODEL_NODE_STYLE_RULES = [
  {
    id: "scenario-texture",
    style: (node) => ({
      fill: {
        type: "hatch",
        background: MODEL_COLORS[node.family] ?? "#91a398",
        stroke: "var(--ls-chart-paper, #fffefa)",
        lineWidth: 1,
        spacing: 7,
        angle: 42,
        lineOpacity: 0.62,
      },
      stroke: MODEL_COLORS[node.family] ?? "#60746b",
      strokeWidth: 1,
    }),
  },
]

export { DEFAULT_SCARCITY_PARAMETERS, SCARCITY_GOODS }
