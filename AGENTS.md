# Semiotic repository instructions

## Scope

Semiotic is a TypeScript/React data-visualization library with high-level chart
components, lower-level Stream Frames, browser and server renderers, a Vite
documentation site, and schema-backed AI/MCP tooling.

Keep this file focused on instructions that apply to most repository work. Use
the task-specific sources below instead of loading large references by default.

## Source map

- `CONTRIBUTING.md`: complete development workflow, architecture, and command
  reference.
- `ai/system-prompt.md`: compact product/API guidance for generating Semiotic
  chart code.
- `ai/reference.md`: comprehensive Semiotic product reference; consult only the
  relevant section.
- `ai/schema.json`: machine-readable component and prop schemas.
- `ai/behaviorContracts.cjs`: canonical agent-visible behavior rules.
- `ai/examples.md`: on-demand examples; search for the relevant chart or task
  rather than loading the whole file.
- `agent-skill/semiotic-charts/SKILL.md`: portable chart-authoring and
  validation workflow shipped with the package.
- `.agents/skills/blog-post/`: the shared blog-authoring workflow and templates.

When documentation disagrees with runtime code, generated chart specs, or
tests, treat the executable source as authoritative and update the docs and
generated artifacts in the same change.

## Repository layout

- `src/components/charts/`: high-level chart components by family.
- `src/components/stream/`: retained scene, canvas/SVG, interaction, streaming,
  and worker infrastructure.
- `src/components/{ai,server,recipes,data}/`: intelligence, static rendering,
  custom-layout recipes, and transforms.
- `ai/`: schemas, MCP server, CLI, prompts, contracts, and examples.
- `docs/`: Vite documentation application and examples.
- `integration-tests/`: Playwright browser and visual coverage.
- `scripts/`: build, generation, validation, and release tooling.

## Working agreements

- Preserve unrelated worktree changes. Make the smallest coherent change and
  review the final diff.
- Prefer TypeScript for new source files. The project uses strict TypeScript,
  double quotes, no semicolons, Prettier, and ESLint.
- Prefer high-level chart components for public examples. Use Stream Frames
  only when the high-level API does not expose the required control.
- Prefer family subpath imports (`semiotic/xy`, `semiotic/network`, and so on)
  in production examples. Avoid widening entry graphs accidentally.
- Preserve public API compatibility unless the task explicitly authorizes a
  breaking change. Update types, chart specs, schemas, docs, and tests together.
- Add or update focused tests for behavior changes. Do not weaken assertions or
  raise bundle/coverage limits merely to make a check pass.
- For a confirmed, user-visible defect—not a transient CI or infrastructure
  failure—perform a related-surface audit before closing it. Check equivalent
  renderers, entry points, generated artifacts, formats, and public API paths;
  fix or cover any same-class issue found, and record the audit scope and
  result with verification.
- Do not hand-edit `dist/`, `docs/build/`, generated manifests, or generated
  sections between marker comments. Run the owning generator.
- Do not add production dependencies, change lockfiles, publish packages, push
  branches, or deploy without explicit task scope.

## Product contracts agents often miss

- Static rendering and serialized/MCP configs require real `data` (or the
  component's equivalent). React push mode is selected by omitting `data` and
  using a ref; `data={[]}` is not push mode.
- Keep accessible text on high-level charts via `title`, `description`,
  `summary`, and `accessibleTable` when those props exist in the component
  schema. Value components such as `BigNumber` have their own contract.
- Formatters such as `xFormat` and `valueFormat` are React callbacks, not JSON
  schema fields. Never invent string formatter props in serialized configs.
- Use `renderChartWithEvidence`, diagnostics, and accessibility audits when
  validating generated charts; a successful render alone does not prove that
  data marks were drawn correctly.

## Verification

Choose checks proportional to the change; do not run the entire release suite
for a narrowly scoped edit unless shared behavior is affected.

- Focused unit test: `npx vitest run path/to/file.test.tsx`
- Lint source changes: `npm run lint` or `npx eslint <touched-files>`
- Type changes: `npm run typescript` and, when applicable,
  `npm run typescript:tests` or `npm run typescript:mcp`
- Library build: `npm run dist:prod`
- Bundle-sensitive changes: `npm run size`
- Documentation routes/examples: `npm run check:website-build`
- Browser behavior: `npm run test:examples:source` or a focused Playwright spec
- AI/schema/instruction changes: `npm run check:chart-specs`,
  `npm run check:ai-schema`, `npm run check:ai-contracts`,
  `npm run check:ai-instructions`, `npm run check:ai-reference-coverage`,
  `npm run check:ai-examples-coverage`, `npm run check:agent-skill`,
  `npm run check:context7`, `npm run check:llms`, and the relevant MCP tests
- Package surface changes: `npm run check:api-surface` and `npm run check:pack`

Before finishing, report what changed, the checks actually run, and any check
that could not be run. Do not claim tests passed unless their command completed
successfully.
