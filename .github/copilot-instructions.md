# Semiotic Copilot instructions

Use `AGENTS.md` as the authoritative repository-wide development guide. This
short compatibility file exists for Copilot surfaces that do not yet load
`AGENTS.md` directly; open that file when the task needs repository layout,
commands, product contracts, or the full verification matrix.

- Semiotic is a strict TypeScript/React visualization library. Follow the
  double-quote, no-semicolon, Prettier, and ESLint conventions already present.
- Preserve unrelated worktree changes and make the smallest coherent change.
- Prefer high-level chart components and family subpath imports in production
  examples; use Stream Frames only for controls the high-level API does not
  expose.
- Keep public APIs, types, chart specs, schemas, generated documentation, and
  focused tests synchronized.
- Do not hand-edit build output or generated marker sections. Run the owning
  generator.
- Run checks proportional to the change and report only checks that actually
  completed successfully.

For chart-generation guidance, start with `ai/system-prompt.md` and the exact
component schema. Treat `ai/reference.md` and `ai/examples.md` as on-demand
resources rather than default context.

For pull request review, use the workflow in
`.github/skills/code-review/SKILL.md`. Use GitHub MCP to retrieve referenced
issues, incidents, related pull requests, and relevant CI results. Use
Playwright MCP when a review claim depends on browser rendering, interaction,
responsive layout, hydration, or accessibility. When an unstable custom lint
fails, evaluate the rule as well as the code before recommending a disposition.
