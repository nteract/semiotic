/* eslint-disable react/no-unescaped-entities */
import React from "react"
import BlogFigure from "../components/BlogFigure.jsx"

const prReviewGif = new URL("../images/pr_review.gif", import.meta.url).href

function Body() {
  return (
    <>
      <p>
        Semiotic is absolutely slamming PRs right now. The only way that stays useful
        is if review time is spent on the few things automation cannot see: intent,
        taste, visual judgment, and the occasional focused code read. The rest has
        to be boring. Every PR should prove that it did not break the package, the
        chart catalog, the docs, the AI-facing files, the visual baselines, or the
        publish artifact before a human has to hold all of that in their head.
      </p>

      <BlogFigure
        src={prReviewGif}
        alt="Animated review of Semiotic visual diff screenshots cycling through chart snapshot updates."
        caption="Most review time goes here: visual diffs, screenshot updates, and the few rendered changes that actually need human judgment. Code review still happens, but in focused moments instead of as the only safety net."
      />

      <p>
        That is the release gate. It is not one heroic CI job. It is a stack of
        small, specific checks that make drift expensive and hygiene cheap. A PR
        can add a chart, change a prop, alter docs, touch the MCP surface, or move
        a visual baseline, but it has to update every dependent surface that now
        depends on that change.
      </p>

      <h2 id="the-pr-shape">The PR Shape</h2>
      <p>
        The PR starts with the plain checklist: summarize the change, name the
        tests, say whether the browser was exercised, and call out user-facing
        changelog work. That template is not the gate, but it gives CI a human
        companion: what changed, and which part of the gate should matter most.
      </p>
      <p>
        On GitHub, the main PR workflow runs on Node 22 on Ubuntu. It installs
        dependencies, builds the package, builds the MCP server, runs the Vitest
        suite with coverage, and then starts checking all the contracts that are
        easy to forget when PR volume is high.
      </p>

      <h2 id="build-and-type-contracts">Build And Type Contracts</h2>
      <p>
        The first layer answers the simplest question: does the thing still build?
        <code>npm run dist</code> runs the Rollup build and emits the library
        bundles and declaration files. <code>npm run build:mcp</code> bundles the
        MCP server. <code>npm run typescript</code> checks the library,{" "}
        <code>npm run typescript:tests</code> checks the test suite against its
        baseline, and <code>npm run typescript:mcp</code> checks the MCP project.
      </p>
      <p>
        The declaration files get a second explicit pass later in the job. CI
        checks that the entry-point <code>.d.ts</code> files exist for the root
        package and the subpath packages like <code>semiotic/xy</code>,{" "}
        <code>semiotic/network</code>, <code>semiotic/realtime</code>,{" "}
        <code>semiotic/ai</code>, <code>semiotic/server</code>, and{" "}
        <code>semiotic/themes</code>. A bundle can compile and still be useless if
        the published types vanish, so that gets its own failure mode.
      </p>

      <h2 id="the-chart-registry-is-the-spine">The Chart Registry Is The Spine</h2>
      <p>
        Semiotic has one canonical chart registry, and most hygiene checks are
        just different ways of asking whether every downstream surface still
        agrees with it. <code>check:chart-specs</code> verifies the registry,
        schema, validation, and metadata round trip. If a chart appears in{" "}
        <code>chartSpecs.ts</code>, it needs to be represented where the schema
        and AI tooling expect it.
      </p>
      <p>
        From there, <code>check:capabilities</code> verifies that{" "}
        <code>ai/capabilities.json</code> is fresh,{" "}
        <code>check:visual-baseline-capabilities</code> makes sure visual coverage
        lines up with the catalog, and <code>check:capability-coverage</code> in
        the local release gate keeps the capability matrix from becoming a
        hand-wavy marketing file. These are boring names for an important rule:
        if a chart is real, the agents and docs should know what it can do.
      </p>

      <h2 id="docs-are-a-contract">Docs Are A Contract</h2>
      <p>
        The docs gates are deliberately mechanical. <code>check:docs-coverage</code>{" "}
        asks whether every specced chart has a docs page or an explicit burn-down
        exception. <code>check:docs-prop-tables</code> catches prop tables that
        drift away from <code>chartSpecs</code>.{" "}
        <code>check:docs-playground-controls</code> does the same for playground
        controls, where a missing control is a quiet product bug.
      </p>
      <p>
        The blog has its own small gate. Blog entries live in a React registry and
        a metadata-only registry so build scripts can read post metadata without
        importing JSX. <code>check:blog-entries</code> keeps those two files in
        lockstep. Draft posts stay routable for preview but stay out of the index,
        RSS feed, and SEO prerender metadata until <code>draft: true</code> is
        removed.
      </p>
      <p>
        The full docs build runs after merge through the docs deployment workflow:
        build production bundles, generate TypeDoc JSON, generate{" "}
        <code>llms.txt</code>, generate SSR gallery and demo GIFs, check blog
        metadata, render OG cards and RSS, build the Vite website, prerender
        routes, and smoke-check the generated docs. Then it copies the AI-readable
        docs into the published site: <code>CLAUDE.md</code>,{" "}
        <code>llms-full.txt</code>, <code>schema.json</code>,{" "}
        <code>api-reference.md</code>, and <code>examples.md</code>.
      </p>

      <h2 id="ai-facing-drift">AI-Facing Drift</h2>
      <p>
        Semiotic ships more than charts. It ships a contract for agents that need
        to choose charts, generate props, inspect capabilities, and call the MCP
        server. That is why PR CI checks <code>llms.txt</code> freshness,{" "}
        <code>CLAUDE.md</code> component coverage, <code>context7.json</code>{" "}
        package-subpath freshness, MCP registry cross-references, AI/MCP surface
        parity, HOC JSDoc example coverage, and{" "}
        <code>ai/examples.md</code> coverage and drift.
      </p>
      <p>
        The local release gate adds <code>check:ai-contracts</code>, which keeps
        generated agent-visible behavior rules synchronized across the files that
        agents read. The point is not to make the docs bigger. The point is to
        stop a PR from changing the library while leaving the machine-readable
        story behind.
      </p>

      <h2 id="runtime-and-visual-gates">Runtime And Visual Gates</h2>
      <p>
        Unit tests catch logic. Semiotic also needs to catch rendered behavior.
        <code>check:ssr</code> keeps server-rendered and client-rendered behavior
        aligned. The Playwright job runs after the main testing job, installs
        Chromium, Firefox, and WebKit, builds the library, and runs the visual and
        integration suite.
      </p>
      <p>
        The visual suite uses a missing-snapshot bootstrap script. If a brand-new
        test has no baseline for a browser and OS combination, CI can write that
        missing baseline and upload it as an artifact. Existing baselines stay
        locked. A real screenshot diff still fails. That means the suite can grow
        without turning every new visual test into an infrastructure negotiation,
        but established behavior remains protected.
      </p>
      <p>
        CI also validates the canvas test stub. It compares methods used by
        production stream renderers with methods stubbed in{" "}
        <code>setupTests.ts</code>. If a renderer starts calling a canvas method
        the test environment does not stub, the PR fails before the next test suite
        gets a mysterious canvas crash.
      </p>

      <h2 id="package-and-size-gates">Package And Size Gates</h2>
      <p>
        Once the PR has proved source-level correctness, CI rebuilds production
        bundles with <code>npm run dist:prod</code>. It then checks the bundle-size
        docs in the README, <code>CLAUDE.md</code>, and the AI system prompt,
        runs <code>size-limit</code>, and performs a pack smoke test.
      </p>
      <p>
        The pack smoke test is the one that catches the embarrassing release
        class: the source builds, but the package a user installs is missing an
        export, has a bad <code>exports</code> map, or cannot be imported as ESM
        or CommonJS from a clean consumer project. It packs the current repo into
        a tarball, installs it in a throwaway project, and verifies every public
        entry point.
      </p>
      <p>
        PR CI also runs <code>check:api-surface</code>, which compares the current
        built declaration surface with the committed API snapshots. That turns a
        breaking public API change into an explicit diff instead of an accidental
        side effect of a refactor.
      </p>

      <h2 id="performance">Performance Has Its Own Job</h2>
      <p>
        Performance runs separately on pull requests. The benchmark job checks out
        enough history to compare the PR against <code>origin/main</code> on the
        same CI hardware. That avoids the common false alarm where a committed
        baseline from one machine makes every benchmark on another machine look
        slower. The comparison is not "is this number globally perfect?" It is
        "did this PR regress relative to main, on the same runner?"
      </p>

      <h2 id="release-rings">Release Rings</h2>
      <p>
        There are two more rings around PR CI. The local{" "}
        <code>npm run release:check</code> and <code>prepublishOnly</code> scripts
        chain the same family of gates before a release is cut from a working
        tree: lint, type checks, MCP build, tests, registry drift checks, docs and
        AI drift checks, SSR alignment, test-quality baseline, production bundles,
        bundle sizes, package size, and pack validation.
      </p>
      <p>
        The tag-triggered release workflow is publish-focused. It rebuilds,
        retests, checks the core registries, verifies declarations, chooses{" "}
        <code>beta</code> or <code>latest</code> from the package version, runs
        the pack smoke test, performs an npm dry run, publishes with provenance,
        waits for npm propagation, installs the published package in a fresh temp
        project, verifies the public entry points again, and creates or updates
        the GitHub Release from the matching <code>CHANGELOG.md</code> section.
      </p>

      <h2 id="what-humans-review">What Humans Review</h2>
      <p>
        This is why the visual diff loop matters. When the gate is working, human
        review does not have to be a full re-execution of every invariant in the
        codebase. It can focus on rendered changes, surprising screenshots, API
        intent, naming, ergonomics, and the parts of a change where taste or
        product judgment actually matter.
      </p>
      <p>
        I still review code. I just try to review it in focused moments: the small
        files that define a public contract, the helper that multiple chart
        families now share, the sanitizer that can turn into a security boundary,
        the release script that can publish the wrong artifact. The rest of the
        time, the gate makes the obvious mistakes obvious.
      </p>

      <h2 id="the-operating-principle">The Operating Principle</h2>
      <p>
        The operating principle is simple: every source of truth gets a drift
        check, every generated file gets a freshness check, every public entry
        point gets an import check, and every visual behavior that matters gets a
        screenshot. That lets Semiotic absorb a high PR rate without turning the
        project into a pile of stale docs, stale schemas, stale screenshots, and
        quietly broken package exports.
      </p>
      <p>
        The result is not perfect safety. It is a review posture that scales:
        automation owns hygiene, humans own judgment, and every PR has to pass
        through both.
      </p>
    </>
  )
}

export default {
  slug: "release-gates-for-fast-prs",
  title: "How Semiotic Keeps Fast PRs Clean",
  subtitle:
    "The CI and release gate behind Semiotic's current PR pace: registry drift checks, docs freshness, AI-facing contracts, visual diffs, performance comparison, pack smoke tests, and publish verification.",
  author: "Elijah Meeks",
  date: "2026-06-08",
  tags: ["case-study", "release", "process"],
  excerpt:
    "Semiotic can move through a high volume of PRs because review is backed by a stack of specific gates: builds, types, registry drift checks, docs and AI freshness, visual baselines, performance comparison, package smoke tests, and release verification. Humans review the rendered changes and the code that actually needs judgment.",
  component: Body,
  draft: true,
}
