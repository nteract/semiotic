import React from "react"
import { OrbitDiagram } from "semiotic"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import PageLayout from "../../components/PageLayout"
import ChartGrounding from "../../components/ChartGrounding"
import { Link } from "react-router-dom"

const orbitDiagramProps = [
  { name: "data", type: "object", required: true, description: "Root of the hierarchy with children" },
  { name: "childrenAccessor", type: "string | function", default: '"children"', description: "How to access children" },
  { name: "nodeIdAccessor", type: "string | function", default: '"name"', description: "How to identify nodes" },
  { name: "orbitMode", type: '"flat" | "solar" | "atomic" | number[]', default: '"flat"', description: "Ring capacity pattern" },
  { name: "orbitSize", type: "number | function", default: "2.95", description: "Ring size divisor per depth" },
  { name: "speed", type: "number", default: "0.25", description: "Rotation speed (degrees/frame)" },
  { name: "revolution", type: "function", default: "(n) => 1/(depth+1)", description: "Per-node speed modifier (overrides revolutionStyle)" },
  { name: "revolutionStyle", type: '"locked" | "decay" | "alternate"', default: '"locked"', description: "Preset revolution pattern" },
  { name: "eccentricity", type: "number | function", default: "1", description: "Vertical squash (1=circle, 0.5=ellipse)" },
  { name: "showRings", type: "boolean", default: "true", description: "Draw orbital ring paths" },
  { name: "nodeRadius", type: "number | function", default: "6", description: "Node circle radius" },
  { name: "showLabels", type: "boolean", default: "false", description: "Show node name labels" },
  { name: "animated", type: "boolean", default: "true", description: "Enable orbital animation" },
  { name: "colorBy", type: "string | function", description: "Field for node colors" },
  { name: "colorByDepth", type: "boolean", default: "false", description: "Color by hierarchy depth" },
  { name: "tooltip", type: "function", default: "default", description: "Custom tooltip (static mode only — disabled during animation)" },
]

const orgData = {
  name: "CEO",
  children: [
    { name: "Engineering", children: [
      { name: "Frontend", children: [
        { name: "L3" }, { name: "L3" }, { name: "L4" }, { name: "L5" }, { name: "L4" }, { name: "L3" }
      ]},
      { name: "Backend", children: [
        { name: "L3" }, { name: "L4" }, { name: "L4" }, { name: "L5" }
      ]},
      { name: "Infra", children: [
        { name: "L5" }, { name: "L6" }
      ]},
      { name: "Data", children: [
        { name: "L3" }, { name: "L3" }, { name: "L4" }, { name: "L5" }, { name: "L7" }
      ]}
    ]},
    { name: "Design", children: [
      { name: "Product Design", children: [
        { name: "L3" }, { name: "L4" }, { name: "L4" }
      ]},
      { name: "Brand", children: [
        { name: "L2" }
      ]}
    ]},
    { name: "Sales", children: [
      { name: "Enterprise", children: [
        { name: "L1" }, { name: "L1" }, { name: "L2" }, { name: "L2" }, { name: "L3" }
      ]},
      { name: "SMB", children: [
        { name: "L1" }, { name: "L1" }, { name: "L1" }, { name: "L2" }
      ]},
      { name: "Partnerships" }
    ]},
  ]
}

// Hoisted to module scope so the animated OrbitDiagram receives stable
// function identities. Inline arrows recreated on every page render would
// churn the network frame's pipeline config (functions never compare
// shallow-equal), re-firing the hierarchy-ingest effect on each parent
// re-render and compounding with the orbit's continuous animation frame
// loop until React's max-update-depth guard trips. See CLAUDE.md
// "Performance": memoize function accessors.
const solarRevolution = (n) => 1 / (n.depth + 1)
const solarNodeRadius = (n) => (n.depth === 0 ? 16 : n.data?.children ? 8 : 4)

const solarSystem = {
  name: "Sun",
  children: [
    { name: "Mercury" }, { name: "Venus" }, { name: "Earth",
      children: [{ name: "Moon" }]
    }, { name: "Mars",
      children: [{ name: "Phobos" }, { name: "Deimos" }]
    }, { name: "Jupiter",
      children: [{ name: "Io" }, { name: "Europa" }, { name: "Ganymede" }, { name: "Callisto" }]
    }, { name: "Saturn",
      children: [{ name: "Titan" }, { name: "Enceladus" }]
    },
  ]
}

export default function OrbitDiagramPage() {
  return (
    <PageLayout
      title="OrbitDiagram"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Network Charts", path: "/charts" },
        { label: "OrbitDiagram", path: "/charts/orbit-diagram" },
      ]}
      prevPage={{ title: "Circle Pack", path: "/charts/circle-pack" }}
    >
      <ComponentMeta
        componentName="OrbitDiagram"
        importStatement='import { OrbitDiagram } from "semiotic"'
        tier="charts"
        wraps="StreamNetworkFrame"
        wrapsPath="/frames/network-frame"
        related={[
          { name: "TreeDiagram", path: "/charts/tree-diagram" },
          { name: "CirclePack", path: "/charts/circle-pack" },
          { name: "Treemap", path: "/charts/treemap" },
        ]}
      />

      <p>
        OrbitDiagram arranges hierarchical data as orbital rings — children
        revolve around their parent node. It's an animated alternative to
        tree layouts that emphasizes the <em>relationship</em> between parent
        and children rather than the structure.
      </p>

      <ChartGrounding component="OrbitDiagram" />

      <h2 id="quick-start">Quick Start</h2>

      <LiveExample
        frameProps={{
          data: orgData,
          childrenAccessor: "children",
          nodeIdAccessor: "name",
          colorByDepth: true,
          showLabels: true,
          width: 500,
          height: 500,
        }}
        type={OrbitDiagram}
        startHidden={false}
        overrideProps={{
          data: `{
  name: "CEO",
  children: [
    { name: "Engineering", children: [...] },
    { name: "Design", children: [...] },
    { name: "Sales", children: [...] },
  ]
}`,
        }}
        hiddenProps={{}}
      />

      <h2 id="examples">Examples</h2>

      <h3 id="solar-mode">Solar Mode</h3>
      <p>
        <code>orbitMode="solar"</code> places one child per ring, creating a
        solar system effect. Combined with <code>eccentricity</code> for
        elliptical orbits and <code>revolution</code> for depth-based speed.
      </p>

      <LiveExample
        frameProps={{
          data: solarSystem,
          childrenAccessor: "children",
          nodeIdAccessor: "name",
          orbitMode: "solar",
          eccentricity: 0.7,
          speed: 0.4,
          revolution: solarRevolution,
          nodeRadius: solarNodeRadius,
          colorByDepth: true,
          showLabels: true,
          width: 500,
          height: 500,
        }}
        type={OrbitDiagram}
        overrideProps={{
          data: "solarSystem",
          revolution: "(n) => 1 / (n.depth + 1)",
          nodeRadius: "(n) => n.depth === 0 ? 16 : n.data?.children ? 8 : 4",
        }}
        hiddenProps={{}}
      />

      <h3 id="atomic-mode">Atomic Mode</h3>
      <p>
        <code>orbitMode="atomic"</code> uses electron shell capacities [2, 8]
        — the first ring holds 2 nodes, subsequent rings hold 8.
      </p>

      <CodeBlock
        code={`<OrbitDiagram
  data={moleculeData}
  childrenAccessor="children"
  nodeIdAccessor="name"
  orbitMode="atomic"
  speed={0.3}
  colorByDepth
/>`}
        language="jsx"
      />

      <h3 id="static">Static (No Animation)</h3>
      <p>
        Set <code>animated={"{false}"}</code> for a static orbital layout
        without the revolving animation.
      </p>

      <LiveExample
        frameProps={{
          data: orgData,
          childrenAccessor: "children",
          nodeIdAccessor: "name",
          colorByDepth: true,
          showLabels: true,
          animated: false,
          width: 500,
          height: 500,
        }}
        type={OrbitDiagram}
        overrideProps={{
          data: "orgData",
          animated: "false",
        }}
        hiddenProps={{}}
      />

      <h2 id="props">Props</h2>

      <PropTable componentName="OrbitDiagram" props={orbitDiagramProps} />

      <h2 id="orbit-modes">Orbit Modes</h2>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9em" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--surface-3)" }}>
            <th style={{ textAlign: "left", padding: 8 }}>Mode</th>
            <th style={{ textAlign: "left", padding: 8 }}>Capacity Pattern</th>
            <th style={{ textAlign: "left", padding: 8 }}>Use Case</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['"flat"', "[9999] — all in one ring", "Org charts, simple hierarchies"],
            ['"solar"', "[1] — one per ring", "Solar systems, sequential depth"],
            ['"atomic"', "[2, 8] — electron shells", "Atomic models, tiered capacity"],
            ["[3, 6, 12]", "Custom capacities (last repeats)", "Custom ring patterns"],
          ].map(([mode, pattern, use]) => (
            <tr key={mode} style={{ borderBottom: "1px solid var(--surface-3)" }}>
              <td style={{ padding: 8 }}><code>{mode}</code></td>
              <td style={{ padding: 8 }}>{pattern}</td>
              <td style={{ padding: 8 }}>{use}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 id="revolution-styles">Revolution Styles</h2>
      <p>
        The <code>revolutionStyle</code> prop controls how child nodes move
        relative to their parents. You can also pass a custom <code>revolution</code> function
        for full control.
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9em" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--surface-3)" }}>
            <th style={{ textAlign: "left", padding: 8 }}>Style</th>
            <th style={{ textAlign: "left", padding: 8 }}>Behavior</th>
            <th style={{ textAlign: "left", padding: 8 }}>Use Case</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['"locked"', "Children rotate with parent, speed = 1/(depth+1)", "Default, natural hierarchy feel"],
            ['"decay"', "Each depth level exponentially slower", "Winding down, outer rings nearly still"],
            ['"alternate"', "Odd-depth rings reverse direction", "Counter-rotating, mechanical feel"],
          ].map(([style, behavior, use]) => (
            <tr key={style} style={{ borderBottom: "1px solid var(--surface-3)" }}>
              <td style={{ padding: 8 }}><code>{style}</code></td>
              <td style={{ padding: 8 }}>{behavior}</td>
              <td style={{ padding: 8 }}>{use}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 id="tooltip-note">Tooltips</h3>
      <p>
        <strong>Tooltips are only available when the chart is static</strong> (<code>animated={"{false}"}</code>).
        During animation, tooltips are automatically disabled because nodes
        continuously move under the cursor, causing flicker. Set{" "}
        <code>animated={"{false}"}</code> to enable hover and tooltip interactions.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li><Link to="/charts/tree-diagram">TreeDiagram</Link> — static hierarchical tree</li>
        <li><Link to="/charts/circle-pack">CirclePack</Link> — nested circles for hierarchy</li>
        <li><Link to="/charts/treemap">Treemap</Link> — space-filling rectangles</li>
        <li><Link to="/charts/force-directed-graph">ForceDirectedGraph</Link> — physics-based network</li>
      </ul>
    </PageLayout>
  )
}
