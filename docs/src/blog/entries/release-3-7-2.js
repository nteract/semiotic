/* eslint-disable react/no-unescaped-entities */
import React from "react"
import { Link } from "react-router-dom"

function Body() {
  return (
    <>
      <p>
        3.7.2 is a deployment and documentation-polish release. The MCP HTTP
        server is now stateless and serverless-friendly, the repo includes a
        Cloud Run wrapper for hosted connectors, and the accessibility docs
        fix two dark-mode misses plus a blog annotation demo that had lost its
        visible callouts. Full release notes are on{" "}
        <a
          href="https://github.com/nteract/semiotic/blob/main/CHANGELOG.md#372---2026-06-12"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
        .
      </p>

      <h2 id="stateless-mcp-http">Stateless MCP HTTP</h2>
      <p>
        <code>semiotic-mcp --http</code> now creates a fresh MCP server and
        Streamable HTTP transport for every request. Tools stay read-only and
        independent, responses come back as JSON rather than long-held SSE
        streams, and teardown happens promptly after each request. That shape
        is a better fit for Cloud Run and other serverless hosts because there
        is no session affinity to preserve and no session map to leak.
      </p>
      <p>
        HTTP mode also picks up production hygiene: <code>/mcp</code> as the
        canonical endpoint, <code>/healthz</code> and <code>/health</code> for
        probes, clean 404s for non-MCP paths, and optional{" "}
        <code>MCP_ALLOWED_HOSTS</code> host-header allowlisting for DNS
        rebinding protection.
      </p>

      <h2 id="cloud-run-wrapper">Cloud Run Wrapper</h2>
      <p>
        The new <code>deploy/cloud-run</code> wrapper runs the published{" "}
        <code>semiotic-mcp</code> binary in HTTP mode. It documents the deploy
        command, environment variables, endpoints, Cloud Run scaling behavior,
        and client setup for Claude and ChatGPT connectors. Because the wrapper
        depends on the npm package, publishing <code>3.7.2</code> and then
        redeploying is enough to update the hosted endpoint.
      </p>

      <h2 id="docs-polish">Docs Polish</h2>
      <p>
        The Accessibility / Structured Navigation page had two visible dark
        mode issues. <code>AccessibleNavTree</code>'s selected row now resolves
        through Semiotic theme tokens instead of a light fallback, and the
        bidirectional sync BarChart switches between <code>carbon</code> and{" "}
        <code>carbon-dark</code> with the docs theme.
      </p>
      <p>
        The "Annotations That Get Contested, and Heard" blog chart now uses a
        numeric XY coordinate for rendering and formats ticks back to month
        labels. The prose and navigation tree still speak in month names, while
        the visual chart reliably renders the accepted, proposed, and disputed
        callouts.
      </p>

      <h2 id="upgrade-notes">Upgrade Notes</h2>
      <p>
        3.7.2 is a patch release. Runtime chart APIs are unchanged. If you
        consume the packaged AI schema programmatically, update expectations to{" "}
        <code>3.7.2</code>. If you run the Cloud Run wrapper, publish the npm
        package first and then redeploy the wrapper so it installs the new
        <code>semiotic@^3.7.2</code> line.
      </p>

      <p>
        See <Link to="/features/cli-mcp">CLI &amp; MCP</Link> for the MCP
        surface and <Link to="/accessibility/navigation">Structured Navigation</Link>{" "}
        for the visible tree demos.
      </p>
    </>
  )
}

export default {
  slug: "release-3-7-2",
  title: "Semiotic 3.7.2",
  subtitle:
    "A deployment and docs-polish patch: stateless MCP HTTP for serverless connectors, a Cloud Run wrapper, dark-mode accessibility fixes, and restored annotation callouts in the contested-annotations blog demo.",
  author: "AI-Generated",
  date: "2026-06-12",
  tags: ["release"],
  excerpt:
    "3.7.2 makes the MCP HTTP server easier to host: stateless Streamable HTTP, JSON responses, health endpoints, host allowlisting, and a Cloud Run wrapper. It also fixes dark-mode misses in the accessibility navigation demos and restores visible callouts in the contested-annotations blog chart.",
  component: Body,
}
