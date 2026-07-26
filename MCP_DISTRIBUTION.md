# MCP distribution inventory

Audited 2026-07-25. This file distinguishes release-controlled distribution
from third-party directory cards that may cache or rewrite project metadata.

## Canonical, release-controlled paths

| Path | Status | Source of truth | Freshness mechanism |
| --- | --- | --- | --- |
| npm stdio | `npx semiotic-mcp` from the `semiotic` package | `package.json` and the published npm artifact | The release workflow publishes and smoke-tests the exact immutable tarball. |
| Stable Streamable HTTP | `https://semiotic-mcp-server-481507046413.us-west1.run.app/mcp` | `server.json` and `deploy/cloud-run` | Hosted smoke tests cover initialize, tools, resources, prompts, limits, and response headers. |
| Official MCP Registry | `io.github.nteract/semiotic` | `server.json` | After npm publication, the release workflow validates and publishes the exact `package.json` / `server.json` version, then verifies the active Registry entry. Manual dispatch remains available for backfill. |

At this audit, the Official Registry returned active entries for `3.4.2` and
`3.8.1`, with `3.8.1` marked latest. Source and npm are currently `3.8.6`; the
release-called workflow removes the former one-off `3.8.1` pin. A manual
workflow dispatch after this change lands can backfill `3.8.6`; subsequent
releases publish their exact manifest version automatically.

Run the local cross-reference gate before a release:

```sh
npm run check:mcp-registry
```

That gate verifies the Registry name, package identifier, version, npm
transport, and README ownership string. Publication additionally confirms that
the exact npm version is public and that the stable remote in the Registry
response matches `server.json`.

## Secondary directory audit

These cards are discovery mirrors, not release artifacts and not acceptance by
an assistant vendor.

| Directory | Audit result | Project policy |
| --- | --- | --- |
| Smithery | The former `/server/nteract/semiotic` URL redirects to `/servers/nteract/semiotic`, which returns `404`. | Removed from the README. Do not restore the claim without a maintained listing and an owner-visible update path. |
| Glama | The card exists, but at audit time displayed the `3.8.2` README and legacy five-tool copy. | Do not present it as current. Update only after a maintainer claims the card or a documented source-controlled sync path is proven. |
| mcp.so | The card exists, reports no detected tools, and separately describes the legacy five-tool surface. | Do not present it as current. Update only through a maintained submission/claim path. |

The README intentionally links only the Official Registry for MCP directory
discovery. Context7, DeepWiki, and GitMCP remain separate documentation/repo
discovery services; they are not MCP package registries.

## Assistant-directory status

Official MCP Registry publication does **not** imply acceptance into ChatGPT,
Claude, or another assistant's curated connector directory. Semiotic currently
claims only:

- a public npm stdio server;
- a stable Streamable HTTP endpoint;
- an active Official MCP Registry entry.

Any future assistant-directory listing should be recorded here with the exact
submission owner, public card URL, accepted version, and last verification
date before it appears in talk or adoption material.

## Release checklist

1. Keep `package.json#version`, `server.json#version`, and the npm package entry
   identical.
2. Run `npm run check:mcp-registry`.
3. Publish the immutable npm artifact through `.github/workflows/release.yml`.
4. Let the release-called Registry workflow publish or verify the exact version.
5. Inspect the Registry summary attached to the workflow run.
6. Re-audit secondary cards only when there is a maintained update path; remove
   broken links instead of preserving directory count.
