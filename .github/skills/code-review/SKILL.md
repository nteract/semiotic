---
name: code-review
description: Review Semiotic pull requests for behavioral bugs, regressions, contract drift, and missing evidence. Use for GitHub Copilot code review of TypeScript/React charts, Stream Frames, canvas and browser interactions, SSR, public exports, docs/examples, AI schemas and tooling, generated contracts, tests, CI baselines, and custom-lint changes. Use GitHub MCP for linked issue, incident, PR, and CI context and Playwright MCP for relevant browser behavior.
---

# Review Semiotic pull requests

Produce a findings-first review grounded in executable behavior. Treat
`AGENTS.md` as the repository authority. Do not restate the diff or praise the
change; identify defects that the author can act on.

## Establish the review contract

1. Read the pull request description, changed files, and relevant sections of
   `AGENTS.md`.
2. Classify the change surface: chart HOC, Stream Frame/runtime, browser
   interaction, SSR/server, package surface, docs/example, AI/schema, generated
   artifact, test infrastructure, or custom lint.
3. Identify the user-visible or package-level behavior the change claims to
   preserve or introduce.
4. Use GitHub MCP when the pull request references an issue, incident, prior
   pull request, or failing check. Read the referenced acceptance criteria and
   compare them with the implementation. Do not infer requirements from an
   identifier without retrieving it.
5. Inspect available CI results through GitHub MCP when they can confirm a
   suspected regression or reveal an unverified path. Distinguish a product
   defect from a stale generated baseline or an unstable-rule disagreement.

## Trace behavior, not files

Follow changed values across component boundaries. A local implementation can
be type-correct while breaking a downstream scene, renderer, or package
contract.

For chart HOCs and Stream Frames, check:

- Accessor, grouping, style, tooltip, hover, selection, legend, margin, and
  `frameProps` precedence through the final Stream Frame props.
- Line-object versus flat-row normalization and preservation of parent series
  metadata.
- Static mode versus push mode. Static and serialized paths require real data;
  React push mode omits `data`. `data={[]}` is not push mode.
- Controlled updates, refs, rAF scheduling, cleanup, transition continuity,
  stable configuration identity, and retained-scene invalidation.
- Coordinate-space assumptions involving margins, legends, scales, responsive
  dimensions, device pixel ratio, canvas bounds, and pointer type.
- Browser, SSR, hydration, static renderer, and serialized/MCP parity when the
  shared behavior crosses those paths.

For public API changes, check all affected surfaces together:

- Runtime implementation and exported TypeScript types.
- Family entry points and package exports without accidental graph widening.
- Chart specs, `ai/schema.json`, behavior contracts, prompts, examples, and
  reference coverage when agent-visible behavior changes.
- Documentation examples using high-level charts and family subpath imports.
- Generated sections and manifests updated only through their owning
  generator.

## Demand meaningful evidence

Evaluate whether tests prove the changed behavior rather than merely mounting
a component or finding a canvas/SVG element.

- Prefer assertions against scene summaries, rendered marks, callbacks,
  accessible output, or user-visible behavior.
- In canvas interaction tests, account for automatic legends, margins,
  responsive sizing, and plot coordinates before trusting literal pointer
  positions.
- Require regression coverage for the exact input form and interaction mode
  that failed.
- Treat regenerated bundle, package, and measurement baselines as evidence of
  an intentional contract change only when the implementation explains the
  delta.
- Recommend focused checks from `AGENTS.md`; do not claim a command passed
  unless CI or a tool result shows that it completed successfully.

## Use browser and MCP evidence selectively

Use Playwright MCP when the diff changes rendering, hover/click/keyboard
interaction, responsive behavior, accessibility, hydration, or a documentation
example. Reproduce the relevant route or minimal scenario, inspect browser
console failures, and compare observed marks and interactions with the claim.
Do not spend browser-tool time on pure type, text, or build-script changes.

If a Semiotic MCP server is configured, use its chart schema, diagnostics,
render evidence, or accessibility audit when reviewing serialized chart or AI
tooling behavior. A successful render alone is insufficient; check that marks,
domains, and accessible evidence are meaningful.

## Evaluate custom lints as hypotheses

When `check:custom-lints` fails or a pull request changes custom lint policy,
read `scripts/custom-lint/README.md` and
`scripts/custom-lint/registry.json`. For every unstable-rule finding, evaluate
both the code and the rule. Accept one or more dispositions:

1. Fix a real bug and record positive evidence for the unstable rule.
2. Adjust, demote, or retire an imprecise rule and record contrary or revision
   evidence.
3. Promote only at the policy threshold with distinct positive references,
   focused rule tests, and no grandfathered findings.

Do not recommend blindly syncing the baseline. Promotion never excuses an
unfixed violation, and a CI failure is not proof that the rule is correct.

## Report only actionable findings

Order findings by severity. For each finding:

- Give a concise title describing the defect.
- Cite the narrowest changed line that causes it.
- State the concrete runtime, consumer, accessibility, or maintenance impact.
- Explain the triggering scenario and the evidence supporting it.
- Suggest the direction of repair without prescribing a speculative rewrite.

Do not report stylistic preferences, hypothetical concerns without a reachable
failure path, or issues outside the pull request's changed behavior. If no
findings remain, state that explicitly and identify only material residual
risks or verification gaps.
