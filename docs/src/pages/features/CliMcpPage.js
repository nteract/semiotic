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
        Semiotic ships two zero-install entry points for AI agents and tooling.
        Both run through <code>npx</code> with no project setup, and both read
        from the same source of truth the library validates against — so an
        agent gets the real component surface, not a guess.
      </p>
      <ul>
        <li>
          <code>npx semiotic-ai</code> — a context &amp; validation CLI that
          dumps the AI reference, lists components, prints schemas, suggests
          charts, and validates a config (including accessibility).
        </li>
        <li>
          <code>npx semiotic-mcp</code> — a{" "}
          <a href="https://modelcontextprotocol.io" target="_blank" rel="noreferrer">
            Model Context Protocol
          </a>{" "}
          server exposing the same capabilities as callable tools for MCP-aware
          assistants.
        </li>
      </ul>

      <h2 id="semiotic-ai">semiotic-ai (CLI)</h2>
      <p>
        Run with no flags to print the full <code>CLAUDE.md</code> reference —
        the same guide the library author keeps in sync with the API. Add a flag
        to narrow the output. Flags that validate read JSON from <code>stdin</code>.
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
        Pipe <code>{`{ data, intent? }`}</code> to <code>--suggest</code> for a
        ranked recommendation. Valid intents are{" "}
        <code>comparison</code>, <code>trend</code>, <code>distribution</code>,{" "}
        <code>relationship</code>, <code>composition</code>,{" "}
        <code>geographic</code>, <code>network</code>, and{" "}
        <code>hierarchy</code> (the CLI lists them if you pass an unknown one).
      </p>
      <CodeBlock language="bash">{`echo '{"data":[{"region":"AMER","value":42},{"region":"EMEA","value":33}],"intent":"comparison"}' \\
  | npx semiotic-ai --suggest`}</CodeBlock>

      <h3 id="doctor">Validate a config (--doctor)</h3>
      <p>
        Pipe <code>{`{ component, props, usageMode? }`}</code> to{" "}
        <code>--doctor</code> to validate a proposed chart before rendering. It
        reports errors, warnings (with fixes), and the behavior contracts that
        apply. Pass <code>usageMode: "push"</code> when validating ref-based
        streaming code that omits <code>data</code>.
      </p>
      <CodeBlock language="bash">{`echo '{"component":"BarChart","props":{"data":[{"region":"AMER","value":42}],"categoryAccessor":"region","valueAccessor":"value"}}' \\
  | npx semiotic-ai --doctor`}</CodeBlock>

      <h3 id="audit-a11y">Audit accessibility (--audit-a11y)</h3>
      <p>
        Pipe <code>{`{ component, props, inChartContainer?, describe?, navigable? }`}</code>{" "}
        to grade a config against Chartability (POUR-CAF) heuristics. It exits
        non-zero on a critical failure, so it works as a CI gate. See{" "}
        <Link to="/accessibility/audit">Chartability Audit</Link> for the
        in-app equivalent.
      </p>
      <CodeBlock language="bash">{`echo '{"component":"PieChart","props":{"data":[{"k":"A","v":1}],"categoryAccessor":"k","valueAccessor":"v"}}' \\
  | npx semiotic-ai --audit-a11y`}</CodeBlock>

      <h2 id="semiotic-mcp">semiotic-mcp (MCP server)</h2>
      <p>
        <code>npx semiotic-mcp</code> starts a Model Context Protocol server
        over stdio. Point an MCP-aware assistant at it and the model can call
        Semiotic's capabilities directly rather than guessing at the API.
      </p>
      <p>The server exposes these tools:</p>
      <ul>
        <li><code>renderChart</code> — render a component + props to a static SVG/PNG snapshot.</li>
        <li><code>suggestCharts</code> — rank charts for a dataset and intent (see <Link to="/intelligence/suggestions">Chart Suggestions</Link>).</li>
        <li><code>diagnoseConfig</code> — flag anti-patterns in a proposed config.</li>
        <li><code>interrogateChart</code> — answer a natural-language question about a chart's data (see <Link to="/intelligence/interrogation">Interrogation</Link>).</li>
        <li><code>groundChart</code> — return the agent-reader grounding payload (description + intent + structure; see <Link to="/intelligence/reader-grounding">Agent-Reader Grounding</Link>).</li>
        <li><code>auditAccessibility</code> — the <code>--audit-a11y</code> grading as a tool.</li>
        <li><code>repairChartConfig</code> — critique a chart choice and return safer alternatives (see <Link to="/intelligence/variant-discovery">Variant Discovery &amp; Repair</Link>).</li>
        <li><code>proposeChartVariants</code> — propose and score variants of a chart for a dataset.</li>
      </ul>

      <h3 id="agent-setup">Agent setup</h3>
      <p>
        Register the server in your assistant's MCP configuration. For example,
        in a Claude / Cursor style <code>mcpServers</code> block:
      </p>
      <CodeBlock language="json">{`{
  "mcpServers": {
    "semiotic": {
      "command": "npx",
      "args": ["semiotic-mcp"]
    }
  }
}`}</CodeBlock>

      <h2 id="which">Which one do I use?</h2>
      <ul>
        <li>
          <strong>Authoring a prompt or a build step?</strong> Use the CLI —
          pipe its output into a system prompt, or run <code>--doctor</code> /{" "}
          <code>--audit-a11y</code> as a pre-commit / CI check.
        </li>
        <li>
          <strong>Driving an MCP-aware assistant?</strong> Use the MCP server so
          the model can call <code>suggestCharts</code>, <code>renderChart</code>,
          and the rest as tools mid-conversation.
        </li>
      </ul>
    </PageLayout>
  )
}
