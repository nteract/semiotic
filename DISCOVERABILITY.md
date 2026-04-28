# Semiotic Discoverability Playbook

Where to list Semiotic so AI coding agents and developers actually find it.
Each task below is split into **what Claude can do for you** (drafts, schema
files, README sections — all check-in-able from a chat session) and **what you
have to do** (anything requiring your GitHub identity, npm credentials, or a
form submission in your browser).

The order is by leverage. Stop after Tier 1 if you only have an hour; Tier 1 is
where the visibility wins are.

---

## Quick map: who does what

| Task | Claude drafts | You do |
|---|---|---|
| 1. Official MCP Registry | `server.json`, `package.json#mcpName` (already shipped), `mcp-name:` line in README, PR description | Auth via GitHub OAuth, run `mcp-publisher publish` |
| 2. Smithery | `smithery.yaml` (if needed) | Run `smithery auth login` then `smithery mcp publish` |
| 3. mcp.so | Submission text | Click "Submit" on mcp.so, paste |
| 4. awesome-mcp-servers | One-line entry + PR description | Open PR from your fork |
| 5. llmstxt hub | Submission text | Fill form at llmstxthub.com/submit |
| 6. awesome-react / data-viz lists | One-line entry + PR description | Open PR from your fork |
| 7. GitHub repo topics | List of topics | Edit Settings → Topics in browser |
| 8. README "Where to find" section | Markdown block | Already in this PR if you want it — flag below |
| 9. DeepWiki / GitMCP verification | Verification URLs to visit | Click links to confirm pages render |

Time estimates are honest: Tier 1 (tasks 1–4) is **~90 minutes total** if you
hit no auth snags; Tier 2 (tasks 5–9) is **~30 minutes**. Most of the wall-clock
time is waiting for human review on the awesome-list PRs.

---

# Tier 1 — MCP server visibility (highest ROI)

Semiotic ships `npx semiotic-mcp` as a real MCP server. That makes it eligible
for every MCP discovery channel, and most agent-facing tools pull from one of
these three or four registries. This is the single biggest free win.

## Task 1 — Official MCP Registry

**What it is:** [registry.modelcontextprotocol.io](https://registry.modelcontextprotocol.io/) — Anthropic / MCP Steering Group source of truth. Everything else (Smithery, mcp.so, GitHub MCP Registry) eventually pulls from here.

**Time:** ~20 minutes.

### What Claude has already done in this PR

- Added `"mcpName": "io.github.nteract/semiotic"` to `package.json` ✓ (check `git log -p package.json | grep mcpName`)

### What Claude can still do (ask in chat)

- **`server.json` at the repo root** — concrete file, ready to commit. Draft:

  ```json
  {
    "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
    "name": "io.github.nteract/semiotic",
    "title": "Semiotic",
    "description": "React data visualization MCP server — render and validate charts (43 chart types across XY, ordinal, network, geo, and realtime families) from agent-supplied JSON specs. Includes schema/diagnose/suggest tools.",
    "websiteUrl": "https://semiotic.nteract.io",
    "repository": {
      "url": "https://github.com/nteract/semiotic",
      "source": "github"
    },
    "version": "<read from package.json>",
    "packages": [
      {
        "registryType": "npm",
        "registryBaseUrl": "https://registry.npmjs.org",
        "identifier": "semiotic",
        "version": "<same as above>",
        "transport": { "type": "stdio" }
      }
    ]
  }
  ```

  Ask: *"Generate the server.json with the current package version filled in and commit it."*

- **`mcp-name: io.github.nteract/semiotic` line in `README.md`** — required by the registry validator. Should sit near the top of the MCP Server section. Ask: *"Add the mcp-name line to README.md."*

### What you have to do

1. **Install the publisher CLI** (one time):
   ```bash
   git clone https://github.com/modelcontextprotocol/registry.git /tmp/mcp-registry
   cd /tmp/mcp-registry
   make publisher
   # Binary lands at ./bin/mcp-publisher
   ```

2. **Authenticate** (one time, browser opens):
   ```bash
   ./bin/mcp-publisher login github
   ```
   GitHub OAuth confirms you control the `nteract` org. The registry uses this to claim the `io.github.nteract/*` namespace.

3. **Publish** from the Semiotic repo root:
   ```bash
   cd ~/Sites/semiotic
   /tmp/mcp-registry/bin/mcp-publisher publish
   ```
   It reads `server.json`, validates it, posts to the registry. ~30 seconds.

4. **Verify** at `https://registry.modelcontextprotocol.io/v0/servers?search=semiotic` — JSON response should include your entry.

### Likely snags

- *"Namespace verification failed"* → you authed as a personal account, not as someone with `nteract` org membership. Re-auth with an account that has org write access.
- *"mcp-name string missing from README"* → the validator literal-matches `mcp-name: io.github.nteract/semiotic` in README content. If Claude's README edit got reformatted, search for that exact string.

---

## Task 2 — Smithery

**What it is:** [smithery.ai](https://smithery.ai) — most-used MCP server discovery hub. Cursor, Cline, and several other MCP clients pull from here.

**Time:** ~10 minutes (after Task 1).

### What Claude can do (ask in chat)

- **Confirm whether Smithery needs a `smithery.yaml`** for an npm-published server. The CLI mostly auto-detects from package.json. Claude can fetch their docs to verify and either generate the yaml or confirm it's not needed.

### What you have to do

1. **Install the CLI** (one time):
   ```bash
   npm install -g @smithery/cli
   ```

2. **Authenticate** (one time, browser opens for OAuth):
   ```bash
   smithery auth login
   ```

3. **Publish**:
   ```bash
   cd ~/Sites/semiotic
   smithery mcp publish "https://github.com/nteract/semiotic" -n nteract/semiotic
   ```

4. **Verify** at `https://smithery.ai/server/nteract/semiotic`.

---

## Task 3 — mcp.so

**What it is:** [mcp.so](https://mcp.so) — community-driven directory. Lower bar than the official registry, broader discovery surface.

**Time:** ~5 minutes.

### What Claude can do (ask in chat)

- **Submission blurb** — short description, longer description, install command, screenshot URL (if you have one). Claude can draft from `package.json#description` and `README.md`.

### What you have to do

1. Go to [mcp.so](https://mcp.so) and click **Submit** in the nav.
2. Paste the GitHub URL: `https://github.com/nteract/semiotic`.
3. Optionally upload a screenshot — pick something from `docs/public/screenshots/` if it exists, or skip.
4. **Verify** at `https://mcp.so/server/semiotic` (or whatever slug they assign — it's listed in your submission confirmation).

### Snag fallback

If the form rejects npm-only servers (some MCP directories want hosted endpoints), fall back to filing a GitHub issue at [github.com/chatmcp/mcp-directory](https://github.com/chatmcp/mcp-directory) titled "Add Semiotic MCP server" with the same blurb.

---

## Task 4 — awesome-mcp-servers

**What it is:** [github.com/punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) — 85k+ stars, the canonical "list of MCP servers" GitHub PR target. Has a **Data Visualization** section.

**Time:** ~15 minutes (most is waiting for review after the PR).

### What Claude can do (ask in chat)

- **The exact one-liner to add** under the Data Visualization section, matching their format. Format is:
  `- [author/name](github-link) badges - description.`

  Draft for Semiotic:
  ```markdown
  - [nteract/semiotic](https://github.com/nteract/semiotic) 📇 🏠 ☁️ 🍎 🪟 🐧 - React data visualization MCP server. Render and validate charts (43 types across XY, ordinal, network, geo, realtime) from JSON. Includes schema/diagnose/suggest tools.
  ```

  Badge legend (per their README): 📇 = TypeScript, 🏠 = Local, ☁️ = Cloud, 🍎 🪟 🐧 = macOS / Windows / Linux. Ask Claude: *"Confirm the badges by reading the awesome-mcp-servers README key, then output the exact line."*

- **The PR description** — Claude can draft the body referencing the relevant Semiotic features, capping at the length awesome-list maintainers prefer.

### What you have to do

1. Fork [github.com/punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) on GitHub (one click).
2. Edit `README.md` in the GitHub web UI (no clone needed for a one-line change). Find the **Data Visualization** section, add Semiotic in alphabetical order.
3. Commit directly to a new branch via the web UI ("Create new file" → "Propose changes").
4. Open the PR. Title: `Add Semiotic MCP server (data visualization)`.
5. **Verify** in 2–7 days when the maintainer reviews. They merge fast for well-formatted entries.

---

# Tier 2 — broader discoverability

These are smaller wins individually but cheap, and they compound. Do them
opportunistically.

## Task 5 — llmstxt hub

**What it is:** [llmstxthub.com](https://llmstxthub.com) — directory of projects with valid `llms.txt`. Semiotic already has both `docs/public/llms.txt` and `docs/public/llms-full.txt`, so this is a free listing.

**Time:** ~5 minutes.

### What Claude can do (ask in chat)

- **Verify the llms.txt is at a publicly-fetchable URL** — likely `https://semiotic.nteract.io/llms.txt`. Claude can WebFetch it to confirm.
- **Submission blurb** — title, description, category. Suggested: category = "Developer Tools" or "Data & Analytics".

### What you have to do

1. Go to [llmstxthub.com/submit](https://llmstxthub.com/submit).
2. Paste the public llms.txt URL.
3. Pick category, submit.
4. **Verify** at `https://llmstxthub.com/<slug>` once they accept (usually same-day).

---

## Task 6 — awesome-react / awesome-react-components

**What it is:** Community-curated React library lists. Semiotic isn't on any of them today (verified by the "Top React chart libraries 2026" roundup search — none of the recent articles mention Semiotic).

**Time:** ~20 minutes per list (most is review wait).

Targets in priority order:

1. **[awesome-react-components](https://github.com/brillout/awesome-react-components)** — most-watched, has a "Charts" section.
2. **[awesome-react](https://github.com/enaqx/awesome-react)** — broader, "UI Components → Charts".
3. **[awesome.cube.dev/for/react](https://awesome.cube.dev/for/react)** — auto-curated; submission via PR to [github.com/cube-js/awesome-react](https://github.com/cube-js/awesome-react) (or wherever they host the source).

### What Claude can do (ask in chat)

- **Per-list one-liner** matching each list's format. Ask: *"Generate the awesome-react-components entry, matching the format and badge convention used in their existing Charts section."*
- **PR descriptions** for each.

### What you have to do

For each list:

1. Fork the repo on GitHub.
2. Edit the README in the web UI, add Semiotic under the right section in alphabetical order.
3. Open the PR.
4. **Verify** when the maintainer merges (varies — `awesome-react` is fast, `awesome-react-components` is selective).

---

## Task 7 — GitHub repo topics

**What it is:** GitHub topics drive in-platform search and influence GitHub's MCP Registry auto-discovery.

**Time:** 2 minutes.

### What Claude can do

Nothing — this is a repo-settings UI change.

### What you have to do

1. Go to [github.com/nteract/semiotic](https://github.com/nteract/semiotic).
2. Click the gear icon next to **About** in the right sidebar.
3. Under **Topics**, ensure these are all set:
   - `react`
   - `data-visualization`
   - `charts`
   - `mcp`
   - `model-context-protocol`
   - `mcp-server`
   - `llm`
   - `ai-tools`
   - `d3`
   - `streaming-data`
   - `canvas`
   - `svg`

   These match `package.json#keywords`. Topics ≠ keywords — they're set in different places, so this is a separate step even though the lists overlap.
4. Save.

---

## Task 8 — README "Where to find Semiotic" section

**What it is:** A short README block linking the discovery surfaces so consumers (and agents) see them up front.

**Time:** 2 minutes.

### What Claude can do (ask in chat)

- **Draft the markdown block** ready to commit. Example:

  ```markdown
  ## Where to find Semiotic

  Semiotic is indexed by the major AI-coding-agent documentation tools so
  your assistant (Claude Code, Cursor, Cline, Copilot, etc.) can pull
  current docs without you copy-pasting:

  - **Context7**: [context7.com/nteract/semiotic](https://context7.com/nteract/semiotic)
  - **DeepWiki**: [deepwiki.com/nteract/semiotic](https://deepwiki.com/nteract/semiotic)
  - **GitMCP**: [gitmcp.io/nteract/semiotic](https://gitmcp.io/nteract/semiotic)
  - **MCP Registry**: [registry.modelcontextprotocol.io](https://registry.modelcontextprotocol.io) (search "semiotic")
  - **Smithery**: [smithery.ai/server/nteract/semiotic](https://smithery.ai/server/nteract/semiotic)

  See `CLAUDE.md` and `docs/public/llms-full.txt` for the agent-facing API guide.
  ```

  Ask: *"Add the 'Where to find Semiotic' section to README.md just below the MCP Server section."*

### What you have to do

Tell Claude where in the README it should land, or trust the placement above.
The links to Context7, DeepWiki, and GitMCP work the moment those services
crawl your repo (Context7 is already in their queue; DeepWiki and GitMCP
activate on first lookup).

---

## Task 9 — DeepWiki / GitMCP verification

**What it is:** Confirm the auto-indexers actually rendered Semiotic.

**Time:** 1 minute.

### What you have to do

1. Open [deepwiki.com/nteract/semiotic](https://deepwiki.com/nteract/semiotic) in a browser. If the page is blank, click "Generate" — it'll index the repo over a few minutes.
2. Open [gitmcp.io/nteract/semiotic](https://gitmcp.io/nteract/semiotic). Should serve as an MCP endpoint immediately.

If either is broken, the issue is on their end (passive indexer); no submission needed.

---

# Maintenance

The `check:context7` gate keeps `context7.json` honest. The other surfaces
update less frequently:

- **MCP Registry / Smithery / mcp.so**: re-publish on each release. Ask
  Claude in a release-prep session: *"Update server.json's version to match
  package.json and republish to the MCP Registry."*
- **awesome-* lists**: no maintenance. The PR is one-and-done.
- **llmstxt hub**: no maintenance.
- **GitHub topics**: no maintenance.
- **README discovery section**: update only if a new index becomes prominent
  (next "Context7" hits the scene). Add a line in
  `OUTSTANDING_WORK.md` reminding the next person who's onboarding tools to
  re-check this list every ~6 months.

---

# Things explicitly NOT worth doing yet

- **Docfork / Nia / Visioncraft / Deepcon** — newer Context7 alternatives
  with smaller install bases. Wait until one of them shows up in a Claude
  Code or Cursor default config.
- **DocSearch / Algolia** — for end-user doc search, not agent indexing.
  Worth doing if the docs site needs better in-page search; not relevant
  for AI visibility.
- **Hugging Face Spaces / Replicate** — model hosting, not library
  hosting. Not applicable.
- **Product Hunt / Hacker News Show** — these are launch-event channels,
  not maintenance channels. Save them for a 4.0 release.

---

# Suggested first session

If you can give yourself one focused hour:

1. (5 min) Ask Claude: *"Generate the server.json, add the mcp-name line to README.md, and commit them on a new branch."*
2. (5 min) Verify the changes locally and push the branch.
3. (15 min) Run Task 1 (Official MCP Registry) end-to-end.
4. (10 min) Run Task 2 (Smithery).
5. (5 min) Run Task 3 (mcp.so).
6. (10 min) Open Task 4 (awesome-mcp-servers PR).
7. (10 min) Set GitHub topics (Task 7) and submit llmstxt hub (Task 5).

That's 6/9 tasks done in an hour. The two awesome-* PRs (Task 6) and the
README discovery section (Task 8) can wait for a second session.
