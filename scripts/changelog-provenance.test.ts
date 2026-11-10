import assert from "node:assert/strict"
import { execFileSync, spawnSync } from "node:child_process"
import {
  mkdtempSync,
  writeFileSync,
  copyFileSync,
  rmSync,
  readFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import type { Tokens } from "marked"
import {
  adoptionMarker,
  checkProvenance,
  parseChangelog
} from "./check-changelog-provenance.ts"
import { runReleasePreflight } from "./check-release-preflight.ts"
const changelog = (body: string) =>
  `${adoptionMarker}\n## [Unreleased]\n### Added\n${body}\n## [3.13.3]\n### Added\n- Legacy capability without attribution.\n`

for (const source of [
  "#1683",
  "https://github.com/nteract/semiotic/pull/123",
  "rfcs/001-proposal.md",
  "consumer: public reporting export workflow",
  "maintainer"
]) {
  test(`accepts explicit origin ${source}`, () =>
    assert.deepEqual(
      checkProvenance(
        changelog(`- Capability\n  with details. [source: ${source}]`)
      ),
      []
    ))
}
for (const source of [
  "",
  "[source:]",
  "[source: unknown]",
  "[source: #0]",
  "[source: consumer: x]",
  "[source: maintainer",
  "[source: #1] [source: #2]"
]) {
  test(`rejects missing/malformed source ${source}`, () =>
    assert.match(
      checkProvenance(changelog(`- Capability ${source}`))[0],
      /CHANGELOG.md:4: \[Unreleased\] Added/
    ))
}
test("empty Unreleased and historical releases are grandfathered without rewrites", () => {
  const input = changelog("")
  assert.deepEqual(checkProvenance(input), [])
})
test("parses headings, multiline roots, nested details, and fenced examples", () => {
  const entries = parseChangelog(
    changelog(
      "- First [source: #1]\n  continuation\n  - detail\n- Second [source: #2]\n```md\n## [99.0.0]\n### Added\n- Example\n```"
    )
  )
  assert.equal(entries.length, 3)
  assert.equal(entries[0].text, "First [source: #1] continuation")
  assert.equal(entries[1].text, "Second [source: #2]")
})
test("nested detail cannot attribute its parent", () =>
  assert.equal(
    checkProvenance(changelog("- Parent\n  - Detail [source: #1]")).length,
    1
  ))
test("moving Unreleased into a release retains comparison identity", () => {
  const base = changelog("- Capability [source: #1]")
  const moved = base.replace(
    "## [Unreleased]\n### Added",
    "## [Unreleased]\n\n## [3.14.0]\n### Added"
  )
  assert.deepEqual(checkProvenance(moved, base), [])
  assert.deepEqual(checkProvenance(moved), [])
  assert.match(
    checkProvenance(moved.replace(" [source: #1]", ""), base)[0],
    /\[3.14.0\] Added/
  )
})
test("explicit base compares multisets and does not exempt duplicate new bullets", () => {
  const base = changelog("- Existing")
  assert.deepEqual(checkProvenance(base, base), [])
  assert.equal(
    checkProvenance(changelog("- Existing\n- Existing"), base).length,
    1
  )
  assert.equal(
    checkProvenance(changelog("- Existing"), base.replace(adoptionMarker, ""))
      .length,
    1
  )
})
test("missing or malformed adoption boundary fails closed", () => {
  for (const marker of ["", "<!-- added-provenance: v2 -->"])
    assert.match(
      checkProvenance(changelog("").replace(adoptionMarker, marker))[0],
      /adoption marker/
    )
})
test("standalone source CLI works without dist, dependencies, or browsers and fails on missing base", () => {
  const root = mkdtempSync(join(tmpdir(), "semiotic-provenance-"))
  try {
    copyFileSync(
      new URL("./check-changelog-provenance.ts", import.meta.url),
      join(root, "check.ts")
    )
    writeFileSync(
      join(root, "CHANGELOG.md"),
      changelog("- Export [source: maintainer]")
    )
    const run = (...args: string[]) =>
      spawnSync(
        process.execPath,
        ["--experimental-strip-types", "check.ts", ...args],
        { cwd: root, encoding: "utf8" }
      )
    assert.equal(run().status, 0)
    assert.equal(
      readFileSync(join(root, "CHANGELOG.md"), "utf8"),
      changelog("- Export [source: maintainer]")
    )
    assert.notEqual(run("--base-ref").status, 0)
    assert.notEqual(run("--base-ref", "missing").status, 0)
    execFileSync("git", ["init", "--quiet"], { cwd: root })
    execFileSync("git", ["add", "CHANGELOG.md"], { cwd: root })
    execFileSync(
      "git",
      [
        "-c",
        "user.name=Fixture",
        "-c",
        "user.email=fixture@example.org",
        "commit",
        "--quiet",
        "-m",
        "baseline"
      ],
      { cwd: root }
    )
    assert.equal(run("--base-ref", "HEAD").status, 0)
    writeFileSync(
      join(root, "CHANGELOG.md"),
      changelog("- Export [source: maintainer]\n- New without source")
    )
    const result = run("--base-ref", "HEAD")
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /CHANGELOG.md:5/)
    for (const body of [
      "  - Missing source",
      "- Parent\n    ```md\n    [source: #123]\n    ```",
      "````md\n```\n````\n- Missing source",
      "- Parent\n  - Child\n  [source: #123]"
    ]) {
      writeFileSync(join(root, "CHANGELOG.md"), changelog(body))
      for (const args of [[], ["--base-ref", "HEAD"]]) {
        const failure = run(...args)
        assert.equal(failure.status, 1, `${body}: ${failure.stderr}`)
        assert.match(failure.stderr, /Added: supply one/)
      }
    }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
test("current release harness skips only provenance on genuinely pre-adoption tags", () => {
  const root = mkdtempSync(join(tmpdir(), "semiotic-old-tag-"))
  try {
    for (const adopted of [false, true]) {
      writeFileSync(
        join(root, "CHANGELOG.md"),
        adopted ? changelog("") : "## [3.13.3]\n### Added\n- Legacy"
      )
      const commands: string[] = [],
        logs: string[] = []
      const status = runReleasePreflight({
        root,
        execute(_command, args) {
          commands.push(args.join(" "))
          return { status: args[1] === "check:changelog-provenance" ? 1 : 0 }
        },
        log: (message) => logs.push(message),
        error() {}
      })
      assert.equal(status, adopted ? 1 : 0)
      assert.equal(commands.includes("run check:changelog-provenance"), adopted)
      assert.equal(
        logs.some((message) => message.includes("predates adoption")),
        !adopted
      )
      assert.ok(commands.includes("run check:release-version-alignment"))
    }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test("nested continuation and malformed extra marker do not bypass attribution", () => {
  assert.equal(
    checkProvenance(
      changelog("- Parent\n  - Detail\n    continuation [source: #1]")
    ).length,
    1
  )
  assert.equal(
    checkProvenance(changelog("- Parent [source: #1] [source typo]")).length,
    1
  )
})
test("PR provenance runs from an explicit fetched base before dependencies or builds", () => {
  const workflow = readFileSync(
    new URL("../.github/workflows/node.js.yml", import.meta.url),
    "utf8"
  )
  const step = workflow.indexOf("name: Check new Added entries")
  assert.ok(step > workflow.indexOf("name: Use Node.js"))
  assert.ok(step < workflow.indexOf("name: Install dependencies"))
  assert.match(
    workflow,
    /github\.event\.pull_request\.base\.sha \|\| github\.event\.before/
  )
  assert.match(workflow, /git fetch --no-tags origin "\$PROVENANCE_BASE"/)
  assert.match(
    workflow,
    /check-changelog-provenance\.ts --base-ref "\$PROVENANCE_BASE"/
  )
  const branchScript = readFileSync(
    new URL("./create-release-branch.sh", import.meta.url),
    "utf8"
  )
  const check = branchScript.indexOf(
    "node --experimental-strip-types scripts/check-changelog-provenance.ts"
  )
  assert.ok(check >= 0)
  assert.ok(check < branchScript.indexOf("npm ci"))
  assert.ok(check < branchScript.indexOf("git checkout -b"))
})

test("copying a grandfathered historical bullet into Unreleased is a new addition", () => {
  const base = changelog("")
  assert.equal(
    checkProvenance(changelog("- Legacy capability without attribution."), base)
      .length,
    1
  )
})

for (const indentation of [0, 1, 2, 3]) {
  for (const marker of ["-", "+", "*", "1.", "12)"]) {
    test(`checks root and child indentation: ${indentation} spaces, ${marker}`, () => {
      const root = " ".repeat(indentation) + marker + " "
      const child = " ".repeat(root.length)
      assert.equal(
        checkProvenance(
          changelog(`${root}Parent\n${child}- Detail [source: #123]`)
        ).length,
        1
      )
      assert.deepEqual(
        checkProvenance(
          changelog(
            `${root}First [source: #1]\n${root}Second\n${child}continuation [source: #2]`
          )
        ),
        []
      )
      assert.equal(
        checkProvenance(changelog(`${root}Missing source`)).length,
        1
      )
    })
  }
}
for (const example of [
  "    ```md\n    [source: #123]\n    ```",
  "  ~~~~md\n  ~~~\n  [source: #123]\n  ~~~~",
  "\n      [source: #123]",
  "  Example `[source: #123]`",
  "  Example ``literal ` [source: #123]``",
  "  <!-- [source: #123] -->",
  "  <!--\n  [source: #123]\n  -->",
  "  - Child\n    - Grandchild [source: #123]",
  "  - Child\nlazy continuation [source: #123]",
  "  - Child\n  lazy continuation [source: #123]",
  "  - Child\n   lazy continuation [source: #123]"
]) {
  test(`example cannot attribute its parent: ${JSON.stringify(example)}`, () => {
    assert.equal(checkProvenance(changelog(`- Parent\n${example}`)).length, 1)
  })
}
for (const delimiter of ["````", "~~~~"]) {
  for (const falseCloser of [
    delimiter.slice(1),
    `${delimiter} trailing text`,
    delimiter[0] === "`" ? "~~~~" : "````"
  ]) {
    test(`only a matching complete fence closes ${delimiter}: ${falseCloser}`, () => {
      const block = `${delimiter}md\n${falseCloser}\n- Example [source: #123]\n${delimiter}\n- Real addition`
      const entries = parseChangelog(changelog(block))
      assert.equal(entries[0].text, "Real addition")
      assert.equal(checkProvenance(changelog(block)).length, 1)
      assert.equal(checkProvenance(changelog(block), changelog("")).length, 1)
    })
  }
}
test("nested and inline list fences end at their container and cannot hide later additions", () => {
  for (const block of [
    "- Parent [source: #1]\n    ```md\n    example\n- Real addition",
    "- Parent [source: #1]\n  - ```md\n    example\n- Real addition",
    "- ```md\n  example\n  ```\n  Parent [source: #1]\n- Real addition"
  ]) {
    assert.equal(checkProvenance(changelog(block)).length, 1)
    assert.match(checkProvenance(changelog(block))[0], /supply one/)
  }
})
test("indented headings, lazy root continuations, blank bullets, and tabs remain visible", () => {
  for (const spaces of ["", " ", "  ", "   "]) {
    const source = `${adoptionMarker}\n${spaces}## [Unreleased]\n${spaces}### Added ###\n${spaces}- Missing source`
    assert.equal(checkProvenance(source).length, 1)
  }
  assert.deepEqual(
    checkProvenance(changelog("- Capability\nlazy continuation [source: #1]")),
    []
  )
  assert.deepEqual(
    checkProvenance(changelog("-\n  Capability [source: #1]")),
    []
  )
  assert.equal(
    checkProvenance(changelog("-\tParent\n\t- Child [source: #1]")).length,
    1
  )
  assert.deepEqual(
    checkProvenance(changelog("- Parent\n\tcontinuation [source: #1]")),
    []
  )
})
test("unsupported Added content and unterminated blocks fail explicitly", () => {
  for (const block of [
    "A capability outside a list",
    "<pre>\n[source: #1]\n</pre>",
    "> Quoted source [source: #1]",
    "- > Quoted source [source: #1]",
    "- - Nested source [source: #1]",
    "- <pre>[source: #1]</pre>",
    "```md\nexample",
    "<!--\ncomment"
  ]) {
    assert.match(checkProvenance(changelog(block))[0], /unsupported|unclosed/)
  }
})
test("code and comment examples do not hide a following source in plain prose", () => {
  for (const body of [
    "- Example `[source: #2]` [source: #1]",
    "- Example <!-- [source: #2] --> [source: #1]",
    "- Example\n    ````md\n    ```\n    [source: #2]\n    ````\n  [source: #1]"
  ])
    assert.deepEqual(checkProvenance(changelog(body)), [])
})

test("root item boundaries agree with the docs Markdown renderer", async () => {
  // marked is already the docs renderer. It is only an independent test oracle;
  // the checked CLI continues to run in a fixture with no installed packages.
  const { lexer } = await import("marked")
  const cases = [
    "- Root [source: #1]\n<!-- separator -->\n  - Next",
    "- Root [source: #1]\n  <!-- detail -->\n  - Child",
    "- Root [source: #1]\n\n````md\n```\n- Example\n````\n   - Next",
    "- Root [source: #1]\n---\n  - Next",
    "  - Root [source: #1]\n    - Child\n   - Next",
    "- ```md\n  code\n- Next",
    "1. Root [source: #1]\n   ```md\n   example\n2. Next",
    "- Root\n  - Child\n  lazy source [source: #1]",
    "- Root\n  - Child\n\n  Parent source [source: #1]",
    "- Root\n    ```md\n    [source: #1]\n    ```"
  ]
  for (const indent of [0, 1, 2, 3]) {
    for (const marker of ["-", "+", "*", "1.", "12)"]) {
      const prefix = " ".repeat(indent) + marker + " "
      const child = " ".repeat(prefix.length)
      cases.push(
        `${prefix}Root [source: #1]\n${child}- Child [source: #2]\n${prefix}Next`
      )
    }
  }
  for (const body of cases) {
    const renderedRoots: Tokens.ListItem[] = lexer(body).flatMap((token) =>
      token.type === "list" ? token.items : []
    )
    const entries = parseChangelog(changelog(body)).filter(
      (entry) => entry.release === "Unreleased"
    )
    assert.equal(entries.length, renderedRoots.length, body)
    const unattributed = renderedRoots.filter(
      (item) =>
        !item.tokens
          .filter(
            (token) => token.type === "text" || token.type === "paragraph"
          )
          .map((token) => (token as { text: string }).text)
          .join(" ")
          .includes("[source: #1]")
    )
    assert.equal(
      checkProvenance(changelog(body)).length,
      unattributed.length,
      body
    )
  }
})

test("generated Markdown indentation variants never let an unattributed root pass", async () => {
  const { lexer } = await import("marked")
  const source = "[source: #1]"
  const inspect = (body: string) => {
    const roots: Tokens.ListItem[] = lexer(body).flatMap((token) =>
      token.type === "list" ? token.items : []
    )
    const unattributed = roots.some(
      (item) =>
        !item.tokens
          .filter(
            (token) => token.type === "text" || token.type === "paragraph"
          )
          .map((token) => (token as { text: string }).text)
          .join(" ")
          .includes(source)
    )
    if (unattributed)
      assert.ok(checkProvenance(changelog(body)).length > 0, body)
  }
  for (let indent = 0; indent < 4; indent++) {
    for (const bullet of ["-", "+", "*", "1.", "12)"]) {
      for (let padding = 1; padding <= 4; padding++) {
        const prefix = " ".repeat(indent) + bullet + " ".repeat(padding)
        for (let detailIndent = 0; detailIndent < 10; detailIndent++) {
          const detail = " ".repeat(detailIndent)
          inspect(`${prefix}First ${source}\n${detail}- Missing source`)
          inspect(`${prefix}Parent\n${detail}- Child ${source}`)
          inspect(
            `${prefix}Parent\n${" ".repeat(prefix.length)}- Child\n${detail}${source}`
          )
          inspect(
            `${prefix}Parent\n${detail}~~~md\n${detail}${source}\n${detail}~~~`
          )
        }
      }
    }
  }
})
