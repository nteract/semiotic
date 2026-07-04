/* eslint-disable react/no-unescaped-entities */
import React from "react"
import { Link } from "react-router-dom"

function Body() {
  return (
    <>
      <p>
        3.7.1 is the verification release. 3.7.0 made charts receivable —
        describable, navigable, repairable; this version makes them checkable.
        A server render now returns ground-truth evidence that data marks
        actually drew, <code>diagnoseConfig()</code> learns to flag designs
        that mislead, every shipped theme is held to WCAG-derived contrast
        floors, and the capability scorecard reports the strict top-1 number
        instead of hiding behind top-3. Full release notes are on{" "}
        <a
          href="https://github.com/nteract/semiotic/blob/main/CHANGELOG.md#371---2026-06-11"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
        .
      </p>

      <h2 id="why-care">Why Verification</h2>
      <p>
        An agent loop that renders a chart and gets back an SVG string has
        learned almost nothing. The SVG might be an empty plot with perfect
        axes; the data might have silently failed to bind; the pie might have
        nineteen slices. Humans catch these by looking. Agents — and CI —
        need the render path itself to testify. The thread through this
        release is that every claim a chart makes ("I drew your data", "I am
        legible", "I am the right chart for this") now has a machine-checkable
        counterpart.
      </p>

      <h2 id="render-evidence">Render Evidence</h2>
      <p>
        <code>renderChartWithEvidence()</code> in <code>semiotic/server</code>{" "}
        returns the SVG plus a <code>RenderEvidence</code> object computed from
        the rendered scene graph — mark counts by scene type, resolved axis
        domains, an <code>empty</code> flag, category/node/edge counts,
        annotation count, and the accessible name. Agent repair loops and CI
        assertions can verify a chart drew data marks without pixel
        inspection, and the MCP <code>renderChart</code> tool returns the same
        evidence block alongside its SVG/PNG output. See{" "}
        <Link to="/using-ssr">Using SSR</Link> for the server-side details.
      </p>

      <h2 id="deception-checks">Misleading-Design Diagnostics</h2>
      <p>
        <code>diagnoseConfig()</code> gains a deception-check pack: inverted
        extents (<code>INVERTED_AXIS</code>), unlabeled dual-axis series (
        <code>DUAL_AXIS_UNLABELED</code>), trend windows cropped to a
        favorable slice (<code>CHERRY_PICKED_WINDOW</code>), negative values
        in part-to-whole encodings (<code>PART_TO_WHOLE_NEGATIVE</code> — an
        error for pie, donut, and funnel), non-interpolating{" "}
        <code>curve="basis"</code> smoothing (<code>NON_PASSING_CURVE</code>),
        slope-distorting aspect ratios (<code>EXTREME_ASPECT_RATIO</code>),
        and over-sliced pies (<code>PIE_TOO_MANY_SLICES</code>).
      </p>
      <p>
        The motivation is double-edged: these patterns mislead human readers,
        and — per the growing chart-deception literature — they mislead
        vision-language models the same way. A chart that cherry-picks its
        window doesn't just fool the person reading it; it fools the agent
        summarizing it. The checks run through the same{" "}
        <code>diagnoseConfig</code> surface as the existing validation,
        encoding, and accessibility packs, so{" "}
        <code>npx semiotic-ai --doctor</code> and the MCP{" "}
        <code>diagnoseConfig</code> tool pick them up automatically.
      </p>

      <h2 id="theme-contrast">Theme Contrast Conformance</h2>
      <p>
        Every shipped theme preset is now tested against WCAG-derived floors —
        4.5:1 for text, tooltip, and annotation roles, 3:1 for the focus
        indicator — with sub-3:1 mark colors pinned in an exact-match
        known-exceptions ledger. A palette regression fails the build, and an
        improvement must shrink the ledger; the axe integration scan
        re-enables its <code>color-contrast</code> rule on the strength of the
        gate.
      </p>
      <p>
        The gate immediately paid for itself: <code>pastels</code>{" "}
        <code>textSecondary</code>/<code>focus</code>/<code>annotation</code>,{" "}
        <code>bi-tool</code> <code>textSecondary</code>, and the{" "}
        <code>tufte-dark</code>/<code>journalist</code>/<code>playful</code>{" "}
        annotation colors were all deepened to clear the floors, and the
        empty-state fallback color moved from <code>#999</code> (2.8:1) to{" "}
        <code>#666</code>. Browse the presets on{" "}
        <Link to="/theming/theme-provider">the theming page</Link>.
      </p>

      <h2 id="chatgpt-apps">ChatGPT Apps Widget (Experimental)</h2>
      <p>
        The MCP server gains <code>renderInteractiveChart</code>, which
        renders a static-data chart through the same server path as{" "}
        <code>renderChart</code> and returns a{" "}
        <code>text/html;profile=mcp-app</code> widget with fit, zoom, data,
        hover, and render-evidence controls — usable from ChatGPT
        developer-mode connectors over <code>semiotic-mcp --http</code>. A
        deployment playbook lives in the repo as{" "}
        <code>CHATGPT_APPS_DEPLOYMENT.md</code>, and an MCP protocol test suite
        covers the tool and the widget resource end to end. The MCP surface is documented on{" "}
        <Link to="/features/cli-mcp">CLI &amp; MCP</Link>.
      </p>

      <h2 id="scorecard">Scorecard Honesty</h2>
      <p>
        The capability quality scorecard now reports strict{" "}
        <code>top1AgreementRate</code> beside the lenient top-3 rate — the
        current canonical set sits at 93% top-1 / 100% top-3 — and ranks the
        top-3 over <em>distinct components</em> rather than variants of one
        chart. Fixtures were added for the previously unexercised Heatmap,
        GaugeChart, FlowMap, and DistanceCartogram descriptors.
      </p>
      <p>
        Three capability descriptors had their judgment corrected along the
        way: <code>DifferenceChart</code> no longer takes full{" "}
        <code>compare-series</code> marks when it would silently drop series
        beyond its native two, flat <code>BarChart</code> yields on crossed
        two-categorical matrices and raw-observation data, and{" "}
        <code>ChoroplethMap</code> requires at least two area features — a
        one-region choropleth has nothing to compare.
      </p>

      <h2 id="docs-prerender">Docs Routes For Agent Readers</h2>
      <p>
        The docs build now emits one prerendered HTML file per route, each
        embedding sanitized, route-specific machine-readable content in its{" "}
        <code>&lt;noscript&gt;</code> fallback, plus a{" "}
        <code>llms-routes.json</code> route index. Crawlers and agent readers
        get resolved content per page instead of an SPA shell.
      </p>

      <h2 id="upgrade-notes">Upgrade Notes</h2>
      <p>
        3.7.1 is additive on the API surface — no prop contracts changed. Two
        things may be visible: the theme legibility fixes shift a handful of
        secondary-text, focus, and annotation colors in the affected presets
        (visual snapshots against <code>pastels</code>, <code>bi-tool</code>,{" "}
        <code>tufte-dark</code>, <code>journalist</code>, or{" "}
        <code>playful</code> may drift by design), and{" "}
        <code>contrastRatio()</code> now parses 3-digit hex shorthand, so
        previously unmeasurable colors participate in audits. If you consume
        the AI schema programmatically, update expectations to version{" "}
        <code>3.7.1</code>.
      </p>
    </>
  )
}

export default {
  slug: "release-3-7-1",
  title: "Semiotic 3.7.1",
  subtitle:
    "The verification release: render evidence for agent loops, misleading-design diagnostics, WCAG contrast gates on every theme, an experimental ChatGPT Apps widget, and honest top-1 scorecard numbers.",
  author: "AI-Generated",
  date: "2026-06-11",
  tags: ["release"],
  excerpt:
    "3.7.1 makes charts checkable: renderChartWithEvidence() returns scene-graph ground truth so agents can verify marks actually drew, diagnoseConfig() flags deceptive designs like cherry-picked windows and over-sliced pies, every theme preset is gated against WCAG contrast floors, and the MCP server ships an experimental ChatGPT Apps chart widget.",
  component: Body,
}
