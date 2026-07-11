import React from "react"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"
import { Link } from "react-router-dom"

export default function CliMcpPage() {
  return (
    <PageLayout
      title="CLI & MCP"
      breadcrumbs={[
        { label: "Intelligence", path: "/intelligence/observation-hooks" },
        { label: "CLI & MCP", path: "/intelligence/cli-mcp" },
      ]}
      prevPage={{ title: "Audience Profiles", path: "/intelligence/audience-profiles" }}
      nextPage={{ title: "Styling", path: "/theming/styling" }}
    >
      <p>
        Semiotic ships two zero-install entry points for AI agents and tooling. Both run through{" "}
        <code>npx</code> with no project setup, and both read from the same source of truth the
        library validates against — so an agent gets the real component surface, not a guess.
      </p>
      <ul>
        <li>
          <code>npx semiotic-ai</code> — a context &amp; validation CLI that dumps the AI reference,
          lists components, prints schemas, suggests charts, and validates a config (including
          accessibility).
        </li>
        <li>
          <code>npx semiotic-mcp</code> — a{" "}
          <a href="https://modelcontextprotocol.io" target="_blank" rel="noreferrer">
            Model Context Protocol
          </a>{" "}
          server exposing the same capabilities as callable tools for MCP-aware assistants.
        </li>
      </ul>

      <h2 id="semiotic-ai">semiotic-ai (CLI)</h2>
      <p>
        Run with no flags to print the full <code>CLAUDE.md</code> reference — the same guide the
        library author keeps in sync with the API. Add a flag to narrow the output. Flags that
        validate read JSON from <code>stdin</code>.
      </p>

      <CodeBlock language="bash">{`# Full AI reference (CLAUDE.md) to stdout
npx semiotic-ai

# List components, categories, import paths, and renderability
npx semiotic-ai --list
npx semiotic-ai --list --json        # machine-readable component index

# Tool schemas (all components, or one)
npx semiotic-ai --schema
npx semiotic-ai --schema BarChart    # one component schema + AI metadata

# Compact system prompt / copy-paste examples
npx semiotic-ai --compact            # ai/system-prompt.md
npx semiotic-ai --examples           # ai/examples.md

npx semiotic-ai --help`}</CodeBlock>

      <h3 id="suggest">Suggest a chart</h3>
      <p>
        Pipe <code>{`{ data, intent? }`}</code> to <code>--suggest</code> for a ranked
        recommendation. Valid intents are <code>comparison</code>, <code>trend</code>,{" "}
        <code>distribution</code>, <code>relationship</code>, <code>composition</code>,{" "}
        <code>geographic</code>, <code>network</code>, and <code>hierarchy</code> (the CLI lists
        them if you pass an unknown one).
      </p>
      <CodeBlock language="bash">{`echo '{"data":[{"region":"AMER","value":42},{"region":"EMEA","value":33}],"intent":"comparison"}' \\
  | npx semiotic-ai --suggest`}</CodeBlock>

      <h3 id="doctor">Validate a config (--doctor)</h3>
      <p>
        Pipe <code>{`{ component, props, usageMode? }`}</code> to <code>--doctor</code> to validate
        a proposed chart before rendering. It reports errors, warnings (with fixes), and the
        behavior contracts that apply. Pass <code>usageMode: &quot;push&quot;</code> when validating ref-based
        streaming code that omits <code>data</code>.
      </p>
      <CodeBlock language="bash">{`echo '{"component":"BarChart","props":{"data":[{"region":"AMER","value":42}],"categoryAccessor":"region","valueAccessor":"value"}}' \\
  | npx semiotic-ai --doctor`}</CodeBlock>
      <p>
        Beyond structural validation, the diagnostics include a{" "}
        <strong>misleading-design pack</strong> — checks for patterns that
        deceive readers (and, per the chart-deception literature, deceive
        vision-language models the same way): inverted axes
        (<code>INVERTED_AXIS</code>), unlabeled dual-axis charts
        (<code>DUAL_AXIS_UNLABELED</code>), trend windows cropped to a
        favorable slice (<code>CHERRY_PICKED_WINDOW</code>), negative values in
        part-to-whole encodings (<code>PART_TO_WHOLE_NEGATIVE</code>),
        B-spline curves that don&rsquo;t pass through the data points
        (<code>NON_PASSING_CURVE</code>), slope-distorting aspect ratios
        (<code>EXTREME_ASPECT_RATIO</code>), and over-sliced pies
        (<code>PIE_TOO_MANY_SLICES</code>) — alongside the long-standing
        non-zero-baseline and color-contrast checks. Each diagnosis carries an
        actionable <code>fix</code>.
      </p>

      <h3 id="audit-a11y">Audit accessibility (--audit-a11y)</h3>
      <p>
        Pipe <code>{`{ component, props, inChartContainer?, describe?, navigable? }`}</code> to
        grade a config against Chartability (POUR-CAF) heuristics. It exits non-zero on a critical
        failure, so it works as a CI gate. See{" "}
        <Link to="/accessibility/audit">Chartability Audit</Link> for the in-app equivalent.
      </p>
      <CodeBlock language="bash">{`echo '{"component":"PieChart","props":{"data":[{"k":"A","v":1}],"categoryAccessor":"k","valueAccessor":"v"}}' \\
  | npx semiotic-ai --audit-a11y`}</CodeBlock>

      <h2 id="semiotic-mcp">semiotic-mcp (MCP server)</h2>
      <p>
        <code>npx semiotic-mcp</code> starts a Model Context Protocol server over stdio. Point an
        MCP-aware assistant at it and the model can call Semiotic&rsquo;s capabilities directly rather
        than guessing at the API.
      </p>
      <h3 id="public-profile">Public task profile</h3>
      <p>
        For an in-conversation app or a user-facing connector, start the focused profile instead
        of loading every expert tool. It exposes five task-oriented tools: <code>createChart</code>,{" "}
        <code>improveChart</code>, <code>explainChart</code>, <code>auditChart</code>, and{" "}
        <code>getChartSchema</code>. <code>createChart</code> composes selection, validation,
        diagnosis, interactive rendering, and render evidence in one call.
      </p>
      <CodeBlock language="bash">{`# Public app / connector profile (five tools)
npx semiotic-mcp --profile public

# Equivalent for hosted deployments
MCP_TOOL_PROFILE=public npx semiotic-mcp --http --port 3001`}</CodeBlock>

      <h3 id="developer-profile">Full developer profile</h3>
      <p>
        The default profile retains the complete expert surface for coding agents, CI, and chart
        debugging. Key tools include:
      </p>
      <ul>
        <li>
          <code>renderChart</code> — render a component + props to a static SVG/PNG snapshot. The
          response includes a <strong>render-evidence</strong> JSON block (mark counts by scene
          type, resolved axis domains, an <code>empty</code> flag, annotation count, and the
          accessible name) computed from the rendered scene graph — agents verify the chart actually
          drew data marks by reading the evidence instead of parsing SVG. The same payload is
          available in code as <code>renderChartWithEvidence</code> from{" "}
          <code>semiotic/server</code>.
        </li>
        <li>
          <code>renderInteractiveChart</code> — render a static-data chart into a ChatGPT Apps / MCP
          Apps widget. The MCP server runs Semiotic, returns a hidden SVG payload, and the iframe
          adds fit, zoom, data, hover, and render-evidence controls.
        </li>
        <li>
          <code>suggestCharts</code> — rank charts for a dataset and intent (see{" "}
          <Link to="/intelligence/suggestions">Chart Suggestions</Link>).
        </li>
        <li>
          <code>suggestTokenEncoding</code> — recommend semantic token encodings for ISOTYPE,
          natural-frequency grids, quantile dotplots, and hybrid bar-token views.
        </li>
        <li>
          <code>diagnoseConfig</code> — flag anti-patterns in a proposed config, including{" "}
          <code>tokenEncoding</code> warnings when a chart declares token semantics.
        </li>
        <li>
          <code>interrogateChart</code> — answer a natural-language question about a chart&rsquo;s data
          (see <Link to="/intelligence/interrogation">Interrogation</Link>).
        </li>
        <li>
          <code>groundChart</code> — return the agent-reader grounding payload (description + intent
          + structure; see <Link to="/intelligence/reader-grounding">Agent-Reader Grounding</Link>).
        </li>
        <li>
          <code>auditAccessibility</code> — the <code>--audit-a11y</code> grading as a tool.
        </li>
        <li>
          <code>repairChartConfig</code> — critique a chart choice and return safer alternatives
          (see <Link to="/intelligence/variant-discovery">Variant Discovery &amp; Repair</Link>).
        </li>
        <li>
          <code>proposeChartVariants</code> — propose and score variants of a chart for a dataset.
        </li>
      </ul>

      <h3 id="agent-setup">Agent setup</h3>
      <p>
        Register the server in your assistant&rsquo;s MCP configuration. For example, in a Claude / Cursor
        style <code>mcpServers</code> block:
      </p>
      <CodeBlock language="json">{`{
  "mcpServers": {
    "semiotic": {
      "command": "npx",
      "args": ["semiotic-mcp"]
    }
  }
}`}</CodeBlock>
      <p>
        For a ChatGPT Apps SDK prototype, start the HTTP transport with{" "}
        <code>npx semiotic-mcp --http --port 3001</code>, expose <code>/mcp</code> over HTTPS with a
        tunnel, then create a ChatGPT developer-mode connector pointed at that endpoint. The widget
        template is served from <code>ui://semiotic/chart-widget.html</code>.
      </p>

      <h2 id="which">Which one do I use?</h2>
      <ul>
        <li>
          <strong>Authoring a prompt or a build step?</strong> Use the CLI — pipe its output into a
          system prompt, or run <code>--doctor</code> / <code>--audit-a11y</code> as a pre-commit /
          CI check.
        </li>
        <li>
          <strong>Driving an MCP-aware assistant?</strong> Use the MCP server so the model can call{" "}
          <code>suggestCharts</code>, <code>renderChart</code>, and the rest as tools
          mid-conversation.
        </li>
      </ul>
    </PageLayout>
  )
}
