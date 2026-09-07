# Complete task guidance

The three definitions in this directory own task intent, fit, example references,
expected outcomes, repairs and maintenance context. They do not duplicate the
component prop catalog. `scripts/generate-ai-task-packets.mjs` reads the current
schema, component metadata, behavior contracts and package manifests to produce
matching Markdown and JSON in `ai/task-packets/` and `docs/public/tasks/`.

The React task pages use those packets. Node verification code stays outside the
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

Source identities are content digests of runtime inputs, dependency lock,
schema/manifest files, examples, task hosts, tests and verification tooling.
They are not Git commit IDs. Committing an unchanged generated packet therefore
does not make it stale. An affected source change moves its recorded evidence
to `stale` on regeneration, until the relevant checks run again. The generator
does not manufacture a successful result merely because expected test files exist.

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

The task freshness check runs in both `release:check` and `prepublishOnly`, so a
direct publish also refuses outdated packets. Regenerate after the final source
edits, rerun `verify:ai-tasks` to refresh observed evidence, then regenerate the
dependent adoption inventory. Changing a lifecycle script also changes the
source identity because `package.json` is one of the inputs.

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
