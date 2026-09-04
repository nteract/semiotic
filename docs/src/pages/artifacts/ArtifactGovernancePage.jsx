import React from "react"
import { Link } from "react-router-dom"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import "./ArtifactContractsOverviewPage.css"

export const POLICY_EXTENSION_CODE = `import {
  ARTIFACT_POLICIES,
  evaluateArtifact,
} from "semiotic/artifact"
import { renderChartWithEvidence } from "semiotic/server"

const newsroomPreview = {
  ...ARTIFACT_POLICIES.editorial,
  id: "example.newsroom-preview",
  version: "1.0.0",
  label: "Newsroom preview",
  description: "Editorial checks for material that has not been published.",
  rules: {
    ...ARTIFACT_POLICIES.editorial.rules,
    // Keep manual review visible; do not convert it into an automatic pass.
    allowManualChecks: true,
  },
}

const evaluation = evaluateArtifact(component, props, contract, {
  policy: newsroomPreview,
  now: reviewClock,
  render: renderChartWithEvidence,
})`

export const EXCEPTION_CODE = `const exception = {
  rule: "requireSettledTime",
  rationale: "The preview is explicitly labeled provisional.",
  owner: "election-desk-editor",
  reviewAt: "2026-11-04T08:00:00Z",
}

// Evaluation reports the exception as applied or rejected. It never edits
// the underlying evidence, time state, or claim status.
evaluateArtifact(component, props, contract, {
  policy: "editorial",
  exceptions: [exception],
  now: "2026-11-04T06:00:00Z",
})`

const RULE_FIELDS = [
  ["Stable ID", "Names one condition so results remain comparable across releases."],
  [
    "Relation",
    "Places the condition under claim support, time, reception, or another contract relation.",
  ],
  [
    "Explicit status",
    "Returns pass, fail, warn, manual, unknown, or not-applicable without collapsing them.",
  ],
  ["Evidence path", "Points to the contract or rendered fact a reviewer can inspect."],
  ["Repair", "Explains a bounded next step without fabricating missing source or review facts."],
]

const BOUNDARIES = [
  [
    "Can establish",
    "Schema validity, internal references, declared clock order, deterministic fingerprints, rendered mark evidence, and named policy outcomes.",
  ],
  [
    "Cannot establish",
    "That a source is truthful, a definition is appropriate, a causal claim is valid, a reader understood the display, or a real assistive-technology workflow succeeded.",
  ],
  [
    "Must remain visible",
    "Unknown facts, manual checks, policy exceptions, source limitations, disputed claims, correction history, and transfer losses.",
  ],
]

export default function ArtifactGovernancePage() {
  return (
    <PageLayout
      title="Artifact policy and contribution guide"
      breadcrumbs={[
        { label: "Artifacts", path: "/artifacts" },
        { label: "Policy and contributions", path: "/artifacts/governance" },
      ]}
      prevPage={{ title: "Benchmark", path: "/artifacts/benchmark" }}
      nextPage={{ title: "What the Machine Sees", path: "/examples/what-the-machine-sees" }}
    >
      <p className="artifact-overview-lede">
        Artifact evaluation is a deterministic review aid. It makes declared evidence, open
        questions, rendered output, and policy consequences inspectable. It does not certify that an
        artifact is true, accessible in practice, journalistically sound, or safe to act on.
      </p>

      <aside className="artifact-overview-boundary" role="note">
        <strong>A passing result is scoped evidence, not a trust badge.</strong>
        <span>
          Report the policy and version, the facts supplied to it, unresolved manual work, and any
          exception. Keep domain review and real reader testing outside the automatic pass state.
        </span>
      </aside>

      <section>
        <h2>What the system can responsibly report</h2>
        <div className="artifact-overview-parts">
          {BOUNDARIES.map(([title, description]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2>Extend a policy without hiding its basis</h2>
        <p>
          Artifact audits are opt-in diagnostics, not an authorization system. Ordinary
          renderChart calls remain available without a contract; a governed host must enforce
          its publication or action boundary independently. Neither an MCP tool response nor
          CLI exit code 0 grants approval: conditional results still contain open work.
          Manual-check resolution, reviewer authentication, and revision-bound release decisions
          are not implemented by this contract kernel.
        </p>
        <p>
          Organization-owned policies are ordinary versioned objects composed from shared audit
          evidence. Use a namespaced ID, pin a version, keep the rule object inspectable, and pass
          the policy explicitly at the release boundary. A local policy must not mutate a built-in
          policy or convert manual findings into facts.
        </p>
        <CodeBlock
          code={POLICY_EXTENSION_CODE}
          language="jsx"
          codeAreaLabel="Versioned artifact policy extension code"
        />
      </section>

      <section>
        <h2>Add an obligation</h2>
        <p>
          Start with a product decision the new check will change. If a proposed field or rule does
          not alter a recommendation, enable an audit, or preserve information across a boundary,
          keep it out of the wire contract.
        </p>
        <div className="artifact-overview-parts">
          {RULE_FIELDS.map(([title, description]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
        <ol className="artifact-overview-sequence">
          <li>
            <strong>Locate the evidence</strong>
            <span>Reuse a current validator or auditor before adding another source of truth.</span>
          </li>
          <li>
            <strong>Add the finding</strong>
            <span>Give it one stable ID, relation, path, message, and bounded repair.</span>
          </li>
          <li>
            <strong>Choose the consequence</strong>
            <span>
              Put release behavior in a named policy; do not bury it in the evidence collector.
            </span>
          </li>
          <li>
            <strong>Test both sides</strong>
            <span>
              Cover a valid case, a true defect, absent information, malformed input, and any
              exception path.
            </span>
          </li>
          <li>
            <strong>Regenerate owned surfaces</strong>
            <span>
              Update schema, reference, inventory, API report, and machine-readable docs through
              their generators.
            </span>
          </li>
        </ol>
      </section>

      <section>
        <h2>Keep manual review manual</h2>
        <p>
          Keyboard and screen-reader task completion, audience comprehension, source suitability,
          editorial judgment, and domain interpretation require attributable review records. A
          static heuristic may request that work, but it cannot record success on a person's behalf.
        </p>
        <p>
          When automated evidence changes, invalidate dependent approval or action records instead
          of silently carrying them into the new revision. Corrections preserve prior claim text and
          status so a reviewer can reconstruct what changed.
        </p>
      </section>

      <section>
        <h2>Make exceptions bounded and reviewable</h2>
        <p>
          An exception names one rule, a rationale, an owner, and an expiry or review time. The
          evaluator accepts it only when the selected policy permits exceptions and its bound is
          valid at the explicit evaluation clock.
        </p>
        <CodeBlock
          code={EXCEPTION_CODE}
          language="jsx"
          codeAreaLabel="Bounded artifact policy exception code"
        />
      </section>

      <section>
        <h2>Verification before review</h2>
        <CodeBlock
          code={`npm run check:artifact-contract\nnpm run typescript\nnpm run typescript:tests\nnpm run lint\nnpm run check:api-surface\nnpm run size`}
          language="bash"
          codeAreaLabel="Artifact contribution verification commands"
        />
        <p>
          Also run the focused browser, documentation, CLI, MCP, server-render, or transfer test for
          every surface the change affects. Bundle and compatibility limits are product constraints,
          not values to raise solely to accept a new rule.
        </p>
      </section>

      <aside className="artifact-overview-example-link">
        <div>
          <span>Inspect the model</span>
          <h2>Trace a contract through a working chart</h2>
          <p>
            The interactive example keeps claims, evidence, time, corrections, alternatives, and
            policy findings beside the rendered view.
          </p>
        </div>
        <Link to="/examples/what-the-machine-sees">Open the inspector →</Link>
      </aside>
    </PageLayout>
  )
}
