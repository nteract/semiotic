/* eslint-disable react/no-unescaped-entities */
import React from "react"
import { Link } from "react-router-dom"
import { auditAccessibility, formatAccessibilityAudit } from "semiotic/utils"

// ─── Shared styling ──────────────────────────────────────────────────────

const report = {
  background: "var(--surface-1)",
  border: "1px solid var(--surface-3)",
  borderRadius: 8,
  padding: 16,
  margin: "20px 0",
  fontFamily: "var(--font-mono)",
  fontSize: 12.5,
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
  overflowX: "auto",
}

const codeBlock = {
  ...report,
  fontSize: 13,
}

// A deliberately under-labeled config — the kind an LLM emits on a first pass.
const BARE = {
  component: "LineChart",
  props: {
    data: [
      { month: 1, sales: 4200 },
      { month: 2, sales: 5100 },
      { month: 3, sales: 6800 },
    ],
    xAccessor: "month",
    yAccessor: "sales",
    colorScheme: ["#eeeeee"],
  },
}

function LiveReport({ config }) {
  const result = auditAccessibility(config.component, config.props, config.options || {})
  return <pre style={report}>{formatAccessibilityAudit(result)}</pre>
}

function Body() {
  return (
    <>
      <p>
        "This chart is accessible" is one of the easier claims to make and one of
        the hardest to falsify. A bar chart drawn on a <code>&lt;canvas&gt;</code>{" "}
        is, to a screen reader, a single opaque image — there's no DOM to inspect,
        no elements to tab through, nothing an automated checker like axe can even
        see. So how do you know? Usually you don't, until someone who relies on a
        screen reader tells you. We wanted a way to ask the question earlier — in
        a unit test, in CI, in the moment an AI agent generates a chart — without
        pretending a machine can answer all of it. The result is{" "}
        <code>auditAccessibility()</code>, and the most interesting thing about it
        is what it refuses to tell you.
      </p>

      <h2 id="why-care">Why this matters</h2>
      <p>
        Data visualization accessibility has a measurement problem. The WCAG
        success criteria were written for documents and forms; they don't say
        much about whether a trend is perceivable without sight. The field's best
        answer is{" "}
        <a href="https://chartability.github.io/POUR-CAF/" target="_blank" rel="noopener noreferrer">
          Chartability
        </a>
        , Frank Elavsky's heuristic framework. It extends WCAG's POUR principles —
        Perceivable, Operable, Understandable, Robust — with three more that are
        specific to data: <strong>C</strong>ompromising (is there a real
        non-visual path to the same information?), <strong>A</strong>ssistive (does
        the interface reduce labor, e.g. by describing the trend instead of making
        you reconstruct it point by point?), and <strong>F</strong>lexible (does it
        respect the user's own settings?). Fifty heuristics; fourteen marked
        critical.
      </p>
      <p>
        Chartability is a checklist for a human auditor, and it says so plainly:
        you cannot "pass" it 100%, and it assumes you'll test with real assistive
        technology. That posture is the whole point. The failure mode for
        accessibility tooling isn't missing a check — it's <em>accessibility
        theater</em>: a green dashboard that lulls a team into shipping something
        no blind user can actually use. Any honest static audit has to draw a hard
        line between "I checked this and it's fine," "I checked this and it's
        broken," and "I cannot check this — go test it yourself." Most tools blur
        the third into the first. We tried not to.
      </p>

      <h2 id="the-audit">The audit, run live</h2>
      <p>
        Here's the real output of <code>auditAccessibility()</code> — computed in
        your browser, right now — for a perfectly ordinary, perfectly
        under-labeled line chart: data, accessors, a faint color, and no title or
        description. The kind of config an LLM hands back on its first try.
      </p>

      <LiveReport config={BARE} />

      <p>
        Three hard failures, all author-actionable: no title or summary (so a
        screen reader announces "XY chart" and nothing else), no explanation of
        how to read it, and a stroke color at 1.2:1 against white. But look at the
        checkmarks. The chart already passes most of its <em>critical</em>{" "}
        heuristics — and the author did nothing to earn them.
      </p>

      <h2 id="crediting-built-ins">Crediting what you already ship</h2>
      <p>
        Every Semiotic chart ships keyboard navigation, a shape-adaptive focus
        ring, a "skip to data table" link, a screen-reader data table that shows
        real values, reduced-motion and forced-colors handling, and serializable
        state. Those satisfy a stack of Chartability criticals — single input
        modality, AT-shortcut safety, "is there a table?", skippable navigation,
        user-style respect — by construction. A good audit shouldn't make you
        prove what the toolkit guarantees; it should tell you what you're getting
        for free and then spend its attention on the gaps only you can close. So
        the report leads with passes, not just failures. The signal an author
        needs is the short list of things that are actually theirs to fix.
      </p>

      <h2 id="four-statuses">The status that matters most is "manual"</h2>
      <p>
        Every finding lands in one of five buckets, and the design lives in the
        distinctions between them:
      </p>
      <ul>
        <li><strong>pass</strong> — provable from the config, or guaranteed by a built-in.</li>
        <li><strong>fail</strong> — provable breakage. A critical fail makes the whole audit <code>ok: false</code> and exits the CLI non-zero.</li>
        <li><strong>warn</strong> — a likely problem or a default worth a second look. It doesn't block.</li>
        <li><strong>manual</strong> — <em>this is the honest one.</em> The thing genuinely cannot be settled from a config, so the audit names the Chartability test to run by hand instead of guessing.</li>
        <li><strong>not-applicable</strong> — the heuristic doesn't fit this chart (a data table for a single big number).</li>
      </ul>
      <p>
        A static analyzer can confirm that two hex colors clear 3:1. It{" "}
        <em>cannot</em> confirm that your themed, CSS-variable-driven colors clear
        3:1 once they resolve in the browser, and it certainly cannot confirm that
        the chart reads correctly in NVDA. Tools that paper over that gap — that
        report "contrast: pass" when they never saw the rendered pixels — are
        worse than no tool, because they manufacture false confidence. So when the
        audit can't see something, it says so, and tells you exactly which manual
        test closes the gap. The <code>manual</code> items aren't the audit
        failing to do its job. They're the audit doing the part of its job that
        matters most: drawing the boundary of what automation knows.
      </p>
      <p>
        A couple of checks are quietly doing more than a checklist lookup. Contrast
        reuses the same WCAG math the library's <code>diagnoseConfig</code> already
        uses, so there's one source of truth. And the reading-level heuristic —
        Chartability asks for grade 9 or lower — runs a Flesch–Kincaid estimate
        over your description and summary text, because "is this readable?" is a
        question you can partially answer from the words themselves.
      </p>

      <h2 id="three-surfaces">Three surfaces, one function</h2>
      <p>
        The audit is a pure function of <code>(component, props)</code> — no DOM,
        SSR-clean — which is what lets it run everywhere the decision matters:
      </p>
      <pre style={codeBlock}>{`// 1. In code / tests
import { auditAccessibility } from "semiotic/utils"
const { ok, summary, findings } = auditAccessibility("LineChart", props)

// 2. In CI (exits non-zero on a critical fail)
npx semiotic-ai --audit-a11y '{"component":"LineChart","props":{...}}'

// 3. As an MCP tool, so an AI agent can grade its own chart
//    before handing the code back to you`}</pre>
      <p>
        That last one is why the project prioritized this first. Semiotic is
        increasingly used by models generating charts; an audit the model can call
        on its own output turns "I hope this is accessible" into a checkable step
        in the loop — including catching the missing-title failure you saw above
        before it ever reaches a human.
      </p>

      <h2 id="opt-in-data">A deliberate non-feature: forced data download</h2>
      <p>
        Chartability asks that the accessible table be downloadable or sortable —
        not just readable. The obvious move is to bolt a "download CSV" button onto
        every chart. We didn't, on purpose. Plenty of deployments must be able to{" "}
        <em>withhold</em> raw-data export — governance, licensing, privacy — and a
        charting library that forces exfiltration onto every chart is a non-starter
        for them. So data download is an opt-in <Link to="/features/chart-container">ChartContainer</Link>{" "}
        action, and the audit's remediation points there rather than reporting a
        hard failure. Accessibility work that ignores the constraints of real
        deployments doesn't ship, and a feature that doesn't ship helps no one.
      </p>

      <h2 id="when-to-reach-for-it">When to reach for it (and when not)</h2>
      <p>
        Reach for the audit as a <strong>fast triage and a regression gate</strong>:
        in CI to stop a chart from losing its title, in an agent loop to self-check
        generated configs, as a teaching aid that explains <em>why</em> each
        heuristic matters. Do <strong>not</strong> reach for it as proof of
        accessibility. A clean audit means "no config-level problems I can see and
        here are the manual tests still owed" — it is the start of the work, not a
        certificate. The <code>manual</code> items are homework, not noise, and the
        one warning worth staring at is "visually apparent features are not
        described": today that's a warning, and the next step on the roadmap —
        <code>describeChart()</code>, automated trend-and-outlier descriptions — is
        what turns it into a pass.
      </p>

      <h2 id="other-domains">The pattern beyond charts</h2>
      <p>
        The honest-static-analyzer shape generalizes well past data viz:
      </p>
      <ul>
        <li>
          <strong>Type checkers and linters.</strong> The good ones distinguish
          "definitely wrong" from "can't tell — annotate it." <code>any</code> and{" "}
          <code>// eslint-disable</code> are the <code>manual</code> status with a
          different name.
        </li>
        <li>
          <strong>Security scanners.</strong> SAST tools that flag "needs human
          review" instead of asserting safe-or-exploitable are trusted; the ones
          that cry wolf or rubber-stamp get ignored.
        </li>
        <li>
          <strong>Other canvas / WebGL visualization.</strong> Map libraries,
          game UIs, and WebGL dashboards have the same "no DOM to audit" problem
          and need the same config-level grading plus explicit manual boundaries.
        </li>
        <li>
          <strong>Performance budgets.</strong> A bundle-size check can prove a
          number; it can't prove the page feels fast. Same line between the
          measurable and the experiential.
        </li>
      </ul>
      <p>
        In every case the credibility comes from the tool knowing the edge of its
        own knowledge — and saying so.
      </p>

      <h2 id="related">Related</h2>
      <ul>
        <li><Link to="/accessibility/audit">Chartability Audit — reference</Link></li>
        <li><Link to="/accessibility/overview">Accessibility — overview</Link></li>
        <li>
          <a href="https://chartability.github.io/POUR-CAF/" target="_blank" rel="noopener noreferrer">
            Chartability (POUR-CAF) — Frank Elavsky
          </a>
        </li>
      </ul>
    </>
  )
}

export default {
  slug: "auditing-what-you-cant-see",
  title: "Auditing What You Can't See",
  subtitle:
    "A static accessibility audit for Semiotic charts, organized by Chartability (POUR-CAF) — and the design decision at its center: being honest about what a static check can't know.",
  author: "Semiotic Team",
  date: "2026-06-01",
  tags: ["case-study", "accessibility"],
  excerpt:
    "A canvas chart is an opaque image to a screen reader, and automated checkers can't see it. auditAccessibility() grades a chart config against Chartability's heuristics — crediting the built-ins every chart ships, flagging the author-actionable gaps, and, most importantly, marking what it cannot know as 'manual' instead of manufacturing a false green checkmark.",
  component: Body,
  draft: true,
}
