import * as React from "react"
import { useMemo, useState } from "react"
import ExamplePageLayout from "./ExamplePageLayout"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import { supplierStory } from "../../../../src/components/recipes/atlas/supplierStory"
import {
  DependencyForestChart,
  dependencyForestChartProps,
} from "../../../../src/components/recipes/atlas/DependencyForestChart"
import { DependencyMatrix } from "../../../../src/components/recipes/atlas/DependencyMatrix"
import {
  branchMembers,
  getBranchResidualConnections,
  requiredTargets,
} from "../../../../src/components/recipes/atlas/dependencyForest"
import {
  getBypassWitness,
  getDependencyExclusion,
  getRequiredPaths,
} from "../../../../src/components/recipes/atlas/dependencyQueries"
import "./DependencyXRayExamplePage.css"

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement("a")
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function DependencyXRayExamplePage() {
  const [bypass, setBypass] = useState(false)
  const [reverse, setReverse] = useState(false)
  const [nodeId, setNodeId] = useState("X")
  const [target, setTarget] = useState("A")
  const [reading, setReading] = useState<"organize" | "required-paths">("required-paths")
  const [collapsed, setCollapsed] = useState(false)
  const [highlightedEdgeIds, setHighlightedEdgeIds] = useState<string[]>([])
  const [exportError, setExportError] = useState("")
  const [width, container] = useResponsiveWidth(600, 1100)
  const story = useMemo(() => supplierStory(bypass, reverse), [bypass, reverse])
  const forest = story.projection
  const atlas = forest.atlas
  const selected = atlas.source.nodes.some((node) => node.id === nodeId) ? nodeId : "X"
  const selection = {
    nodeId: selected,
    analysisRevision: atlas.analysisRevision,
    relationScopeId: "directed-admitted" as const,
  }
  const witness = getBypassWitness(atlas, { target, avoiding: [selected] })
  const mandatory = getRequiredPaths(atlas, target)
  const loss = getDependencyExclusion(atlas, [selected])
  const ties = getBranchResidualConnections(forest, selected)
  const members = branchMembers(forest, selected)
  const neighborhood = new Set([selected, ...members])
  for (const edge of atlas.source.edges) {
    if (members.has(edge.source) || members.has(edge.target)) {
      neighborhood.add(edge.source)
      neighborhood.add(edge.target)
    }
  }
  const matrixIds = atlas.sections.sectionIds.flatMap((section) =>
    forest.order.filter(
      (id) => neighborhood.has(id) && atlas.sections.nodeIdsBySection[section].includes(id),
    ),
  )
  const chartProps = {
    forest,
    selection,
    reading,
    collapsedNodeIds: collapsed ? [selected] : [],
    highlightedEdgeIds,
    width: Math.max(600, width),
    height: 440,
    title: "Synthetic supplier dependencies",
  }
  const packet = {
    synthetic: true,
    question: "Which suppliers share X, and does a bypass improve usable capacity?",
    sourceRevision: atlas.provenance.sourceRevision,
    analysisRevision: atlas.analysisRevision,
    relationScope: "directed-admitted",
    roots: atlas.requiredPaths!.roots,
    selection,
    requiredPaths: mandatory,
    bypass: witness,
    exclusion: loss,
    originalEdges: atlas.source.edges,
    displayBackbone: forest.forest.backboneEdgeIds,
    residualEdges: forest.residual.residualEdgeIds,
    measures: story.measures,
    assumptions: [
      "One fungible component; no inventory; C expands to 3,000 units/week.",
      "Current allocation remains unchanged in the zero-capacity bypass variant.",
      "AND prerequisites and failure probabilities are not modeled.",
    ],
    completeness: atlas.completeness,
  }
  return (
    <ExamplePageLayout title="Dependency X-Ray">
      <div className="dependency-xray" ref={container}>
        <p className="dependency-xray__eyebrow">Network Atlas · synthetic supplier study</p>
        <h1>Three suppliers. Two share one dependency.</h1>
        <p>
          A and B obtain their component through X. C has a separate admitted route. Inspect the
          original links, then add a bypass with no usable capacity.
        </p>
        <dl className="dependency-xray__metrics">
          <div>
            <dt>Current allocation exposed to X</dt>
            <dd>{story.measures.exposureBps / 100}%</dd>
          </div>
          <div>
            <dt>Demand shortfall if X is unavailable</dt>
            <dd>{story.measures.shortfallBps / 100}%</dd>
          </div>
          <div>
            <dt>Additional independent units/week for 70% output</dt>
            <dd>{story.measures.additional.toLocaleString("en-US")}</dd>
          </div>
        </dl>
        <div className="dependency-xray__controls">
          <label>
            Reading{" "}
            <select
              value={reading}
              onChange={(event) => setReading(event.target.value as typeof reading)}
            >
              <option value="organize">Organize</option>
              <option value="required-paths">Required paths</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={bypass}
              onChange={(event) => {
                setBypass(event.target.checked)
                setHighlightedEdgeIds([])
              }}
            />{" "}
            Add Y → A bypass (0 units/week)
          </label>
          <label>
            <input
              type="checkbox"
              checked={reverse}
              onChange={(event) => setReverse(event.target.checked)}
            />{" "}
            Reverse backbone ranking
          </label>
        </div>
        <p>
          {reading === "organize"
            ? "Gray links are chosen for this drawing. Rust links preserve the other original connections."
            : "Blue brackets mark required ancestry in the full admitted graph. They are separate from the directed links."}
        </p>
        <div className="dependency-xray__overview" data-testid="dependency-overview">
          <DependencyForestChart
            {...chartProps}
            onSelectNode={(id) => {
              setNodeId(id)
              setCollapsed(false)
            }}
          />
        </div>
        <section className="dependency-xray__inspector" aria-label="Branch and bypass inspector">
          <div>
            <h2>Inspect a dependency</h2>
            <label>
              Dependency{" "}
              <select
                aria-label="Dependency"
                value={selected}
                onChange={(event) => {
                  setNodeId(event.target.value)
                  setCollapsed(false)
                }}
              >
                {atlas.source.nodes.map((node) => (
                  <option key={node.id}>{node.id}</option>
                ))}
              </select>
            </label>{" "}
            <label>
              Target{" "}
              <select
                aria-label="Target"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
              >
                {["A", "B", "C", "product"].map((id) => (
                  <option key={id}>{id}</option>
                ))}
              </select>
            </label>
            <p data-testid="required-targets">
              {selected} is required for:{" "}
              {requiredTargets(forest, selected).join(", ") || "no other targets in this graph"}.
            </p>
            <p role="status">
              {witness.value?.exists
                ? `Bypass: ${witness.value.path!.nodeIds.join(" → ")}.`
                : `No admitted path to ${target} avoids ${selected}.`}
            </p>
            <button
              type="button"
              disabled={!witness.value?.exists}
              onClick={() => setHighlightedEdgeIds(witness.value?.path?.edgeIds ?? [])}
            >
              Show bypass on chart
            </button>{" "}
            <button type="button" onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? "Open branch" : "Collapse branch"}
            </button>
            <p>
              Excluding {selected} removes all admitted paths to:{" "}
              {loss.value?.lostNodeIds.join(", ") || "none"}.
            </p>
            <p>
              <strong>Capacity reading:</strong> {story.measures.remaining.toLocaleString("en-US")}{" "}
              units/week remain under the stated no-inventory X-outage scenario.{" "}
              {bypass
                ? "Y has zero usable capacity, so the shortfall stays 70%."
                : "A path through C prevents X from dominating the product."}
            </p>
            <h3>Cross-links touching this branch</h3>
            <ul>
              {ties.map((edge) => (
                <li key={edge.id}>
                  <button type="button" onClick={() => setHighlightedEdgeIds([edge.id])}>
                    {edge.id}: {edge.source} → {edge.target}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2>Local adjacency</h2>
            <DependencyMatrix
              forest={forest}
              nodeIds={matrixIds}
              onSelectEdges={setHighlightedEdgeIds}
            />
            <p>
              Boundary endpoints remain in the matrix when the branch closes. Empty cells indicate
              no admitted edge, not independent suppliers.
            </p>
          </div>
        </section>
        <p>
          The 75% exposure is an allocation share, not an outage probability. The capacity scenario
          assumes one fungible component, no inventory, and expansion of C to 3,000 units/week.
        </p>
        <button
          type="button"
          onClick={() =>
            download("supplier-evidence.json", JSON.stringify(packet, null, 2), "application/json")
          }
        >
          Export evidence
        </button>{" "}
        <button
          type="button"
          onClick={async () => {
            try {
              const { renderChart } = await import("semiotic/server")
              download(
                "supplier-dependencies.svg",
                renderChart("NetworkCustomChart", dependencyForestChartProps(chartProps)),
                "image/svg+xml",
              )
            } catch (error) {
              setExportError(String(error))
            }
          }}
        >
          Export static SVG
        </button>
        {exportError && <p role="alert">{exportError}</p>}
      </div>
    </ExamplePageLayout>
  )
}
