import React from "react"
import { OrbitDiagram } from "semiotic"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

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
      <p>
        OrbitDiagram arranges hierarchical data as orbital rings — children
        revolve around their parent node. It's an animated alternative to
        tree layouts that emphasizes the <em>relationship</em> between parent
        and children rather than the structure.
      </p>

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
          revolution: (n) => 1 / (n.depth + 1),
          nodeRadius: (n) => n.depth === 0 ? 16 : n.children ? 8 : 4,
          colorByDepth: true,
          showLabels: true,
          width: 500,
          height: 500,
        }}
        type={OrbitDiagram}
        overrideProps={{
          data: "solarSystem",
          revolution: "(n) => 1 / (n.depth + 1)",
          nodeRadius: "(n) => n.depth === 0 ? 16 : n.children ? 8 : 4",
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

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9em" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--surface-3)" }}>
            <th style={{ textAlign: "left", padding: 8 }}>Prop</th>
            <th style={{ textAlign: "left", padding: 8 }}>Type</th>
            <th style={{ textAlign: "left", padding: 8 }}>Default</th>
            <th style={{ textAlign: "left", padding: 8 }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["data", "object", "required", "Root of the hierarchy with children"],
            ["childrenAccessor", "string | fn", '"children"', "How to access children"],
            ["nodeIdAccessor", "string | fn", '"name"', "How to identify nodes"],
            ["orbitMode", '"flat"|"solar"|"atomic"|number[]', '"flat"', "Ring capacity pattern"],
            ["orbitSize", "number | fn", "2.95", "Ring size divisor per depth"],
            ["speed", "number", "0.25", "Rotation speed (degrees/frame)"],
            ["revolution", "fn", "(n) => 1/(depth+1)", "Per-node speed modifier"],
            ["eccentricity", "number | fn", "1", "Vertical squash (1=circle, 0.5=ellipse)"],
            ["showRings", "boolean", "true", "Draw orbital ring paths"],
            ["nodeRadius", "number | fn", "6", "Node circle radius"],
            ["showLabels", "boolean", "false", "Show node name labels"],
            ["animated", "boolean", "true", "Enable orbital animation"],
            ["colorBy", "string | fn", "—", "Field for node colors"],
            ["colorByDepth", "boolean", "false", "Color by hierarchy depth"],
            ["tooltip", "fn", "default", "Custom tooltip render function"],
          ].map(([name, type, def, desc]) => (
            <tr key={name} style={{ borderBottom: "1px solid var(--surface-3)" }}>
              <td style={{ padding: 8 }}><code>{name}</code></td>
              <td style={{ padding: 8 }}><code>{type}</code></td>
              <td style={{ padding: 8 }}>{def}</td>
              <td style={{ padding: 8 }}>{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>

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
