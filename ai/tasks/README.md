# Complete task guidance

The three definitions in this directory own task intent, fit, example references,
expected outcomes, repairs and maintenance context. They do not duplicate the
component prop catalog. `scripts/generate-ai-task-packets.mjs` reads the current
schema, component metadata, behavior contracts and package manifests to produce
matching Markdown and JSON in `ai/task-packets/`. That directory is the only
committed copy: the docs server and build expose the same files at `/tasks/`
(`scripts/lib/docs-task-packets.mjs`).

The React task pages import those packets. Node verification code stays outside the
browser examples. The package includes generated packets for offline retrieval;
source definitions and verification tooling remain repository authoring inputs.

```sh
npm run docs:ai-tasks
npm run check:ai-tasks
npx tsc -p scripts/ai-tasks/tsconfig.json
npm run verify:ai-tasks
npm run prepare:adoption-evals
npm run check:adoption-evals
```

`verify:ai-tasks` runs the declared unit and browser checks, verifies that all
declared test files actually executed, and records successful results against
the source contents. It refuses to record if those contents changed during the
run. Temporary reports are removed; the retained record includes environment,
commands and passed counts. It does not run paid models or publish anything.

Two content digests are involved, and neither is a Git commit ID.

- A packet's **source revision** covers what the packet says: the task
  definition, its declared examples and checks, the task pages and tooling, and
  the part of the public contract the packet copies (the selected props, the
  component metadata, the referenced behavior contracts, and the package
  export). The committed packet changes only when one of these does, so an
  unrelated source edit, dependency bump, or new docs route no longer makes it
  stale.
- A recorded run is bound to more than that: the same revision plus the runtime
  source, schemas and manifests, the dependency lock, and the docs and test
  harness it executed. That evidence identity is computed whenever packets are
  generated or checked and is stored only in `verification.json`.

A change to anything a run executed therefore still moves its evidence to
`stale`, until the checks run again. While evidence is already `stale` or
`proposed`, such a change leaves the packet files byte-identical. The first
runtime change after a fresh `verify:ai-tasks` does rewrite them once, from
`supported-in-scope` to `stale`. The generator does not manufacture a successful
result merely because expected test files exist.

Evidence states describe the fixture and environment: `proposed`,
`supported-in-scope`, or `stale`. Source tests cannot establish deployed package
parity, source authenticity, human review, reception or adoption. The evidence
record is a readable repository execution record, not an authenticated external
attestation. Its author and limitations travel with the packet.

Each packet contains a behavioral update: an assumption to revisit, action,
rechecks and unresolved obligations. The current entries have `introducedIn:
null` and `status: source-only`. A release owner must attach a verified candidate
package identity and actual released version before describing them as an
installed-release migration. Older consumers should inspect their installed
schema and retrieve matching guidance; version equality alone does not prove
that a source checkout, website and tool service have identical contents.

The task freshness check runs in `release:check`, and `prepublishOnly` delegates
to `release:check`, so a direct publish also refuses outdated packets. Rerun
`verify:ai-tasks` after the final source edits to refresh observed evidence.
Changing a lifecycle script invalidates a recorded run, because `package.json`
is one of the things it executed, but it does not change a packet.

The source-path audit covers POSIX and Windows absolute paths, drive-relative
paths, traversal with either separator, and file or directory symlinks leaving
the checkout. Legitimate internal links and a symlinked checkout remain readable.
The installed MCP reader separately constrains IDs and resolved packet paths.
Regression checks cover generation, installed reads, protocol discovery and
packet delivery; the packed-consumer fixture exercises both MCP profiles.

The public development evaluation scenarios live in `evals/adoption/`. They
include hard negatives and stale-context handoffs. They contain no measured
adoption result, paid run or protected holdout. Materialize isolated starting
projects and obtain the existing spending authorization before model trials.
