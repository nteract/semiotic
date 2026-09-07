import React, { useCallback, useMemo, useState } from "react"
import { SankeyDiagram } from "semiotic/network"
import useResponsiveWidth from "../../../hooks/useResponsiveWidth"
import {
  buildDecisionFlow,
  caseGroupLabel,
  caseGroups,
  caseTitle,
  decisionCases,
  decisionChartProps,
  decisionClass,
  decisionLabels,
  decisionPalette,
  settingLabel,
  type CaseGroup,
} from "./decision-data"
import "./decision-flow.css"

export default function DecisionFlow() {
  const [group, setGroup] = useState<CaseGroup | "all">("all")
  const [selectedId, setSelectedId] = useState("requested-capability-comparison")
  const [traceCase, setTraceCase] = useState(false)
  const flow = useMemo(() => buildDecisionFlow(group === "all" ? undefined : group), [group])
  const selected = flow.cases.find((testCase) => testCase.id === selectedId) ?? flow.cases[0]
  const props = useMemo(() => decisionChartProps(flow), [flow])
  const [width, containerRef] = useResponsiveWidth(720, 1100)
  const traceColor = useCallback(
    (edge: { data?: { caseId?: string }; caseId?: string }) =>
      (edge.data?.caseId ?? edge.caseId) === selected.id ? decisionPalette.ink : "#d8dfd8",
    [selected.id],
  )
  const chooseGroup = (next: CaseGroup | "all") => {
    setGroup(next)
    setTraceCase(false)
  }

  return (
    <section className="sp-decision-flow" aria-labelledby="sp-flow-heading">
      <div className="sp-flow-intro">
        <p className="sp-eyebrow">The test of a good recommendation</p>
        <h3 id="sp-flow-heading">Where should the advice lead?</h3>
        <p>
          Follow {decisionCases.length} situations from the request to an acceptable response.
          Sometimes the right answer is to use Semiotic. Sometimes it is to leave a working chart
          alone, ask for the missing evidence, or make no chart at all.
        </p>
      </div>

      <div className="sp-flow-filters" role="group" aria-label="Filter test situations">
        <button type="button" aria-pressed={group === "all"} onClick={() => chooseGroup("all")}>
          All situations <span>{decisionCases.length}</span>
        </button>
        {Object.entries(caseGroups).map(([key, label]) => (
          <button
            type="button"
            key={key}
            aria-pressed={group === key}
            onClick={() => chooseGroup(key as CaseGroup)}
          >
            {label} <span>{decisionCases.filter((testCase) => testCase.group === key).length}</span>
          </button>
        ))}
      </div>

      <figure className="sp-flow-figure">
        <div
          className="sp-flow-scroll"
          ref={containerRef as React.Ref<HTMLDivElement>}
          tabIndex={0}
          role="region"
          aria-label="Decision flow diagram; scroll horizontally on a narrow screen"
        >
          <div className="sp-flow-columns" style={{ width: width as number }} aria-hidden="true">
            <span>Starting situation</span>
            <span>Decision context</span>
            <span>Acceptable response</span>
          </div>
          <SankeyDiagram
            {...props}
            width={width as number}
            edgeColorBy={traceCase ? traceColor : "target"}
            edgeOpacity={traceCase ? 0.95 : 0.55}
          />
        </div>
        <figcaption>
          <span role="status">
            Showing {flow.cases.length} of {decisionCases.length} authored cases.
          </span>{" "}
          Each ribbon carries one case through each stage. “Judgment required” keeps cases with more
          than one acceptable answer together. These are planned tests, not measured results.
          <span className="sp-flow-scroll-hint">
            {" "}
            On a small screen, swipe or use the arrow keys to explore the diagram.
          </span>
        </figcaption>
      </figure>

      <div className="sp-case-reader">
        <div className="sp-case-controls">
          <label htmlFor="sp-case-picker">Look inside a case</label>
          <select
            id="sp-case-picker"
            value={selected.id}
            onChange={(event) => {
              setSelectedId(event.target.value)
              setTraceCase(true)
            }}
          >
            {flow.cases.map((testCase) => (
              <option value={testCase.id} key={testCase.id}>
                {caseTitle(testCase)}
              </option>
            ))}
          </select>
          <label className="sp-trace-control">
            <input
              type="checkbox"
              checked={traceCase}
              onChange={(event) => setTraceCase(event.target.checked)}
            />
            Trace this case in the chart
          </label>
        </div>

        <div className="sp-case-content" aria-live="polite" aria-atomic="true">
          <p className="sp-case-route">
            {caseGroupLabel(selected.group)} <span aria-hidden="true">→</span>{" "}
            {settingLabel(selected.setting)} <span aria-hidden="true">→</span>{" "}
            {decisionLabels[decisionClass(selected)]}
          </p>
          <blockquote>{selected.prompt}</blockquote>
          <p className="sp-case-constraint">
            <strong>The constraint:</strong> {selected.project.dependencyPolicy}
          </p>
          <p>
            <strong>Acceptable responses:</strong>{" "}
            {selected.expect.decisions
              .map((decision) => decisionLabels[decision as keyof typeof decisionLabels])
              .join("; ")}
            .
          </p>
          <p className="sp-case-checks-label">What would make the answer good?</p>
          <ul>
            {selected.expect.checks.map((check) => (
              <li key={check}>{check}</li>
            ))}
          </ul>
          <p className="sp-case-limit">
            <strong>This still would not tell us:</strong> {selected.expect.unassessed.join(" ")}
          </p>
        </div>
      </div>

      <details className="sp-flow-data">
        <summary>Read the exact routes for these {flow.cases.length} cases</summary>
        <div
          className="sp-flow-table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Exact scenario routes"
        >
          <table>
            <caption>One row per authored case; accepted alternatives are listed in full.</caption>
            <thead>
              <tr>
                <th scope="col">Case</th>
                <th scope="col">Starting situation</th>
                <th scope="col">Context</th>
                <th scope="col">Acceptable responses</th>
              </tr>
            </thead>
            <tbody>
              {flow.cases.map((testCase) => (
                <tr key={testCase.id}>
                  <th scope="row">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(testCase.id)
                        setTraceCase(true)
                      }}
                    >
                      {caseTitle(testCase)}
                    </button>
                  </th>
                  <td>{caseGroupLabel(testCase.group)}</td>
                  <td>{settingLabel(testCase.setting)}</td>
                  <td>
                    {testCase.expect.decisions
                      .map((decision) => decisionLabels[decision as keyof typeof decisionLabels])
                      .join("; ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}
