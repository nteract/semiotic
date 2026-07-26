import React, { useState } from "react"
import { Link } from "react-router-dom"
import { BarChart, LinkedCharts, buildNavigationTree } from "semiotic"
import {
  unstable_SemioticVACPBridge as SemioticVACPBridge,
} from "semiotic/experimental"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"

const VACP_PAPER = "https://arxiv.org/abs/2603.29322"
const VACP_REPO = "https://github.com/ETH-IVIA-Lab/VACP"
const VACP_TOOL_CONTRACT =
  "https://github.com/ETH-IVIA-Lab/VACP/blob/main/docs/reference/tool-contract.md"
const VACP_ROOT_MANIFEST =
  "https://github.com/ETH-IVIA-Lab/VACP/blob/main/package.json"
const VACP_CORE_MANIFEST =
  "https://github.com/ETH-IVIA-Lab/VACP/blob/main/packages/lib/protocol/core/package.json"

const selectionRef =
  "vacp://revenue-console/view/main/selection/region-focus"
const chartRef =
  "vacp://revenue-console/view/main/visualization/regional-revenue"
const navigationRef = `${chartRef}/navigation`

const LIVE_DATA = [
  { region: "North", revenue: 128 },
  { region: "South", revenue: 94 },
  { region: "East", revenue: 116 },
  { region: "West", revenue: 142 },
]

const LIVE_CHART_PROPS = {
  data: LIVE_DATA,
  categoryAccessor: "region",
  valueAccessor: "revenue",
  title: "Revenue by region",
  size: [620, 300],
}

const LIVE_AUDIENCE = {
  name: "Operations review",
  familiarity: { BarChart: 5, BoxPlot: 2 },
  targets: {
    BoxPlot: {
      direction: "increase",
      weight: 2,
      reason: "Teach distribution reading",
    },
  },
  exposureLevel: 1,
  receptionModality: "agent",
}

const WALKTHROUGH = [
  {
    id: "capabilities",
    label: "1 · Capabilities",
    call: "bridge.getCapabilities()",
    note:
      "Grounding and serializable chart config become a semantic graph. Actions appear only when the host supplies a matching binding.",
    response: {
      version: "0.1.0",
      createdAt: "2026-07-25T12:00:00.000Z",
      graph: {
        version: "0.1.0",
        nodes: [
          {
            ref: chartRef,
            kind: "Visualization",
            layer: "VisualizationLayer",
            title: "Revenue by region",
            data: {
              component: "BarChart",
              grounding: {
                intent: "Compare regional revenue",
                physics: "Bar length encodes revenue",
              },
            },
          },
          {
            ref: selectionRef,
            kind: "Selection",
            layer: "InteractionFeedbackLayer",
            data: {
              name: "region-focus",
              fields: ["region"],
              modes: ["point"],
            },
          },
        ],
        edges: [
          {
            from: selectionRef,
            to: chartRef,
            kind: "controls",
          },
        ],
        actions: [
          {
            name: "semiotic.set_point_selection",
            description:
              "Set a named LinkedCharts point selection using allowlisted fields.",
            targetRef: "vacp://revenue-console/view/main",
            parameters: {
              type: "object",
              required: ["selectionRef", "fields"],
            },
          },
        ],
      },
    },
  },
  {
    id: "state",
    label: "2 · State",
    call: "bridge.getState()",
    note:
      "Live config, named selections, observations, and accessible navigation are keyed by durable VACP refs rather than render order.",
    response: {
      version: "0.1.0",
      createdAt: "2026-07-25T12:00:01.000Z",
      state: {
        [`${chartRef}/config`]: {
          component: "BarChart",
          props: {
            categoryAccessor: "region",
            valueAccessor: "revenue",
          },
        },
        [selectionRef]: {
          name: "region-focus",
          resolution: "union",
          clauses: [],
        },
        [navigationRef]: {
          kind: "Selection",
          status: "ready",
          activeLabel: "North: 128",
          activeMatch: { region: "North" },
        },
      },
    },
  },
  {
    id: "execute",
    label: "3 · Execute",
    call: "bridge.execute(call)",
    note:
      "The bridge validates the action, stable target ref, field allowlist, and values before invoking the explicit LinkedCharts binding.",
    request: {
      callId: "demo-1",
      name: "semiotic.set_point_selection",
      params: {
        selectionRef,
        fields: { region: ["North"] },
      },
    },
    response: {
      callId: "demo-1",
      ok: true,
      result: {
        selectionRef,
        fields: { region: ["North"] },
      },
    },
  },
]

const panelStyle = {
  border: "1px solid var(--surface-3)",
  borderRadius: 10,
  background: "var(--surface-1)",
  padding: 16,
}

const statusStyle = {
  ...panelStyle,
  borderLeft: "4px solid var(--accent)",
  margin: "20px 0",
}

const pretty = (value) => JSON.stringify(value, null, 2)

function ExternalLink({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  )
}

function ProtocolWalkthrough() {
  const [activeId, setActiveId] = useState(WALKTHROUGH[0].id)
  const active =
    WALKTHROUGH.find((step) => step.id === activeId) ?? WALKTHROUGH[0]

  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          margin: "12px 0",
        }}
      >
        {WALKTHROUGH.map((step) => (
          <button
            key={step.id}
            type="button"
            aria-pressed={step.id === active.id}
            onClick={() => setActiveId(step.id)}
            style={{
              padding: "6px 12px",
              borderRadius: 16,
              border: "1px solid var(--surface-3)",
              background:
                step.id === active.id
                  ? "var(--accent)"
                  : "var(--surface-2)",
              color:
                step.id === active.id ? "white" : "var(--text-primary)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {step.label}
          </button>
        ))}
      </div>

      <div style={{ ...panelStyle, marginBottom: 12 }}>
        <code>{active.call}</code>
        <p
          style={{
            margin: "8px 0 0",
            color: "var(--text-secondary)",
            fontSize: 13,
          }}
        >
          {active.note}
        </p>
      </div>

      {active.request ? (
        <>
          <p style={{ fontSize: 13, marginBottom: 6 }}>Action call</p>
          <CodeBlock language="json" wrap>
            {pretty(active.request)}
          </CodeBlock>
        </>
      ) : null}

      <p style={{ fontSize: 13, marginBottom: 6 }}>
        Representative 0.1.0 response
      </p>
      <CodeBlock language="json" wrap>
        {pretty(active.response)}
      </CodeBlock>
    </>
  )
}

function LiveBridgeDemo() {
  const navigationTree = React.useMemo(
    () => buildNavigationTree("BarChart", LIVE_CHART_PROPS),
    []
  )
  const [activeId, setActiveId] = useState(navigationTree.id)
  const [installation, setInstallation] = useState(null)
  const [lastResult, setLastResult] = useState(null)

  const executeSelection = async (region) => {
    const bridge = window.__vacp
    if (!bridge) {
      setLastResult({
        callId: "docs-selection",
        ok: false,
        error: { message: "The live bridge is not installed." },
      })
      return
    }
    const result = await bridge.execute({
      callId: `docs-selection-${region.toLowerCase()}`,
      name: "semiotic.set_point_selection",
      params: {
        selectionRef,
        fields: { region: [region] },
      },
    })
    setLastResult(result)
  }

  const clearSelection = async () => {
    const bridge = window.__vacp
    if (!bridge) return
    setLastResult(
      await bridge.execute({
        callId: "docs-selection-clear",
        name: "semiotic.clear_selection",
        params: { selectionRef },
      })
    )
  }

  return (
    <LinkedCharts>
      <SemioticVACPBridge
        appId="revenue-console"
        title="Revenue review"
        charts={[
          {
            chartId: "regional-revenue",
            component: "BarChart",
            title: "Revenue by region",
            props: LIVE_CHART_PROPS,
            audience: LIVE_AUDIENCE,
            selections: [
              {
                name: "region-focus",
                fields: ["region"],
                mode: "point",
              },
            ],
            navigation: {
              tree: navigationTree,
              matchFields: ["region"],
              activeId,
              onActiveChange: (node) => setActiveId(node.id),
            },
          },
        ]}
        onInstallationChange={(result) =>
          setInstallation({
            installed: result.installed,
            reason: result.reason,
          })
        }
      />

      <div style={{ ...panelStyle, margin: "12px 0 16px" }}>
        <div
          role="status"
          style={{
            marginBottom: 10,
            color: installation?.installed
              ? "var(--accent)"
              : "var(--text-secondary)",
          }}
        >
          {installation?.installed
            ? "Live window.__vacp bridge installed."
            : installation?.reason ?? "Installing the live bridge…"}
        </div>
        <div style={{ overflowX: "auto" }}>
          <BarChart
            {...LIVE_CHART_PROPS}
            selection={{ name: "region-focus", unselectedOpacity: 0.18 }}
          />
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginTop: 10,
          }}
        >
          {["North", "West"].map((region) => (
            <button
              key={region}
              type="button"
              disabled={!installation?.installed}
              onClick={() => void executeSelection(region)}
            >
              Select {region} through VACP
            </button>
          ))}
          <button
            type="button"
            disabled={!installation?.installed}
            onClick={() => void clearSelection()}
          >
            Clear selection
          </button>
        </div>
        <p style={{ marginBottom: 0, fontSize: 13 }}>
          Active navigation id: <code>{activeId}</code>. The same bridge is
          available in DevTools, so the outreach exercise can inspect
          capabilities, audience metadata, state, and actions directly.
        </p>
      </div>
      {lastResult ? (
        <CodeBlock language="json" wrap>
          {pretty(lastResult)}
        </CodeBlock>
      ) : null}
    </LinkedCharts>
  )
}

export default function VACPPage() {
  return (
    <PageLayout
      title="VACP Bridge (Experimental)"
      breadcrumbs={[
        { label: "Interoperability", path: "/interoperability" },
        { label: "VACP Bridge", path: "/interoperability/vacp" },
      ]}
      prevPage={{
        title: "Portability Spec",
        path: "/interoperability/portability-spec",
      }}
      nextPage={{
        title: "HRA/WPP Typology Pilot",
        path: "/interoperability/hra-wpp",
      }}
    >
      <p>
        The{" "}
        <ExternalLink href={VACP_PAPER}>
          Visual Analytics Context Protocol (VACP)
        </ExternalLink>{" "}
        gives an agent a semantic account of a visual-analytics application:
        what views and interactions exist, what state they are in, and which
        named actions are safe to execute. The{" "}
        <ExternalLink href={VACP_REPO}>official repository</ExternalLink>{" "}
        describes this as a small in-app contract. Semiotic&apos;s experimental
        bridge translates its existing chart grounding, LinkedCharts state, and
        accessible navigation into that contract.
      </p>

      <div style={statusStyle}>
        <strong>Compatibility status</strong>
        <p style={{ marginBottom: 0 }}>
          This is dependency-free <em>structural compatibility</em> with VACP
          schema <code>0.1.0</code>, not official provider certification. At the
          time this bridge was developed, the official{" "}
          <ExternalLink href={VACP_ROOT_MANIFEST}>workspace</ExternalLink> and{" "}
          <ExternalLink href={VACP_CORE_MANIFEST}>
            <code>@vacp/core</code> package
          </ExternalLink>{" "}
          are versioned <code>0.1.0</code> but marked private, so Semiotic does
          not add an unpublished package dependency. The{" "}
          <code>unstable_</code> prefix remains until the public packages,
          conformance surface, and integration patterns settle.
        </p>
      </div>

      <h2>The translation boundary</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: 12,
        }}
      >
        <div style={panelStyle}>
          <strong>Grounding + config → capabilities</strong>
          <p style={{ marginBottom: 0, fontSize: 13 }}>
            Reader grounding, serializable <code>ChartConfig</code>, encodings,
            annotations, and bounded data handles become nodes and edges in the
            VACP semantic graph.
          </p>
        </div>
        <div style={panelStyle}>
          <strong>Selections + navigation → state</strong>
          <p style={{ marginBottom: 0, fontSize: 13 }}>
            LinkedCharts named selections, observations, and the accessible
            navigation tree become state keyed by durable{" "}
            <code>vacp://</code> refs.
          </p>
        </div>
        <div style={panelStyle}>
          <strong>Bindings → semantic actions</strong>
          <p style={{ marginBottom: 0, fontSize: 13 }}>
            Named selection mutations and navigation activation are advertised
            only when the host provides a callback. Action parameters are
            validated against declared refs, modes, fields, and datum keys.
          </p>
        </div>
        <div style={panelStyle}>
          <strong>Data stays bounded</strong>
          <p style={{ marginBottom: 0, fontSize: 13 }}>
            Config snapshots omit raw collections. Agents receive data handles
            and schema summaries; row sampling is a separate, explicitly
            enabled, size-limited action.
          </p>
        </div>
      </div>

      <h2 id="live-bridge">Live bridge lab</h2>
      <p>
        This chart installs the documented <code>window.__vacp</code> bridge.
        Use the buttons to exercise its validated action boundary, or open
        DevTools and call <code>await window.__vacp.getCapabilities()</code>,{" "}
        <code>await window.__vacp.getState()</code>, and{" "}
        <code>await window.__vacp.execute(...)</code>. The capability graph
        carries the Operations review audience profile used by the outreach
        exercise.
      </p>
      <LiveBridgeDemo />

      <h2>A protocol exchange</h2>
      <p>
        Step through fixed explanatory payloads for the same chart. The live
        lab above is the executable bridge; these panels make its three calls
        easier to compare.
      </p>
      <ProtocolWalkthrough />

      <h2>React: bind the bridge to LinkedCharts</h2>
      <p>
        Render the bridge inside the same <code>LinkedCharts</code> provider as
        the charts it describes. The component renders no DOM; it reads current
        selection and observation stores and installs an ownership-safe in-page
        bridge after the client commits.
      </p>
      <CodeBlock language="jsx">
{`import { BarChart, LinkedCharts } from "semiotic"
import {
  unstable_SemioticVACPBridge as SemioticVACPBridge,
} from "semiotic/experimental"

const chartProps = {
  data,
  categoryAccessor: "region",
  valueAccessor: "revenue",
  title: "Revenue by region",
}

<LinkedCharts>
  <SemioticVACPBridge
    appId="revenue-console"
    charts={[{
      chartId: "regional-revenue",
      component: "BarChart",
      props: chartProps,
      grounding: { includeStructure: true },
      selections: [{
        name: "region-focus",
        fields: ["region"],
        mode: "point",
      }],
      navigation: {
        tree: navigationTree,
        matchFields: ["region"],
        activeId,
        onActiveChange: setActiveNode,
      },
    }]}
  />
  <BarChart
    {...chartProps}
    selection={{ name: "region-focus" }}
  />
</LinkedCharts>`}
      </CodeBlock>

      <h2>Framework-free: construct the same contract</h2>
      <p>
        For a non-React host, SSR preparation, or a custom store, construct the
        bridge directly and provide live getters plus the mutations the agent
        may invoke.
      </p>
      <CodeBlock language="ts">
{`import {
  unstable_createSemioticVACPBridge,
} from "semiotic/experimental/vacp"

const bridge = unstable_createSemioticVACPBridge({
  appId: "revenue-console",
  charts: () => chartDescriptors,
  getSelections: () => serializedSelections,
  selectionActions: {
    setPointSelection(name, clientId, fields) {
      selectionController.setPoint(name, clientId, fields)
    },
    clearSelection(name) {
      selectionController.clear(name)
    },
  },
})

const capabilities = bridge.getCapabilities()
const state = await bridge.getState()
const result = await bridge.execute({
  callId: "agent-call-17",
  name: "semiotic.set_point_selection",
  params: {
    selectionRef: bridge.refs.selection("region-focus"),
    fields: { region: ["North"] },
  },
})`}
      </CodeBlock>

      <h2>Protocol, transport, and visual verification</h2>
      <p>
        The official{" "}
        <ExternalLink href={VACP_TOOL_CONTRACT}>tool contract</ExternalLink>{" "}
        defines the stable transport-facing surface as{" "}
        <code>vacp_capabilities</code>, <code>vacp_state</code>, and{" "}
        <code>vacp_execute</code>. A transport adapter can map those tools to the
        in-page <code>getCapabilities</code>, <code>getState</code>, and{" "}
        <code>execute</code> methods. MCP is one possible transport; it is not
        the bridge itself.
      </p>
      <p>
        Likewise, a screenshot can verify that an action produced the intended
        visual outcome, but pixels are not required for discovery, state
        reading, or control. The semantic graph and validated action bridge are
        the primary contract; vision remains optional evidence rather than an
        inferred DOM or click API.
      </p>

      <h2>What the unstable contract promises</h2>
      <ul>
        <li>
          VACP <code>0.1.0</code> envelopes, semantic graph layers, stable refs,
          state snapshots, and call-correlated action results.
        </li>
        <li>
          No synthesized clicks, DOM-order identity, arbitrary callback access,
          or raw-row exposure by default.
        </li>
        <li>
          No claim that structural compatibility is official VACP conformance
          while its packages and conformance suite are unpublished.
        </li>
      </ul>

      <p>
        See also{" "}
        <Link to="/intelligence/reader-grounding">Reader Grounding</Link> for the
        semantic source material and{" "}
        <Link to="/interoperability/portability-spec">Portability Spec</Link> for
        Semiotic&apos;s library-neutral chart metadata.
      </p>
    </PageLayout>
  )
}
