import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { spawnSync } from "node:child_process"
import { cpSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

const root = resolve(process.argv[2])
const evidencePath = resolve(process.argv[3])
const parse = (file) => JSON.parse(readFileSync(resolve(root, file), "utf8"))
const results = []
function run(args, expectedCode, input) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    input,
    timeout: 30000,
    maxBuffer: 5 * 1024 * 1024
  })
  assert.equal(result.error, undefined)
  assert.equal(result.status, expectedCode, result.stdout + result.stderr)
  return result
}
for (const [name, vintage] of [
  ["rebuilt-a", "2026-01-09"],
  ["rebuilt-b", "2026-03-06"]
]) {
  const output = run(
    [
      "tools/cli.mjs",
      "build",
      "--source",
      "raw",
      "--month",
      "2025-06",
      "--vintage",
      vintage,
      "--output",
      name,
      "--json"
    ],
    0
  )
  assert.equal(JSON.parse(output.stdout).status, "conditional")
  const briefing = parse(`${name}/briefing.json`)
  assert.equal(briefing.selected.first.change, 147000)
  assert.equal(briefing.selected.third.change, -13000)
  assert.equal(
    briefing.selected.latest.change,
    name === "rebuilt-a" ? -13000 : -20000
  )
  for (const file of [
    "briefing.json",
    "packet.json",
    "graphic.svg",
    "graphic.png",
    "source.csv",
    "email.html"
  ]) {
    assert.deepEqual(
      readFileSync(resolve(root, name, file)),
      readFileSync(
        resolve(root, name === "rebuilt-a" ? "edition-a" : "edition-b", file)
      ),
      `Independent reproduction: ${name}/${file}`
    )
  }
  results.push({
    check: `${name} canonical values and six output formats reproduce`,
    passed: true
  })
}
const input = readFileSync(resolve(root, "rebuilt-b/audit-input.json"), "utf8")
const jsonAudit = run(
  ["node_modules/semiotic/ai/cli.js", "--audit-artifact", "--json"],
  0,
  input
)
const textAudit = run(
  ["node_modules/semiotic/ai/cli.js", "--audit-artifact"],
  0,
  input
)
assert.equal(JSON.parse(jsonAudit.stdout).status, "conditional")
assert.match(textAudit.stdout + textAudit.stderr, /conditional/i)
const badInput = JSON.parse(input)
badInput.props.data[0].change += 1000
assert.equal(
  JSON.parse(
    run(
      ["node_modules/semiotic/ai/cli.js", "--audit-artifact", "--json"],
      1,
      JSON.stringify(badInput)
    ).stdout
  ).status,
  "refuse"
)
results.push({
  check:
    "Public CLI JSON and terminal both distinguish conditional exit zero; mismatched chart refused",
  passed: true
})

const checkArgs = [
  "tools/cli.mjs",
  "check",
  "--source",
  "raw",
  "--output",
  "rebuilt-b"
]
const pending = JSON.parse(run([...checkArgs, "--json"], 2).stdout)
assert.match(run(checkArgs, 2).stdout, /^conditional:/)
const now = Date.now()
const review = {
  schemaVersion: 1,
  scope: "demonstration-only",
  subject: pending.subject,
  reviewer: "Automated consumer fixture; no human editorial authority",
  reviewedAt: new Date(now - 1000).toISOString(),
  expiresAt: new Date(now + 3600000).toISOString(),
  decisions: pending.requirements.map(({ id }) => ({
    id,
    outcome: "checked",
    rationale:
      "Synthetic receipt exercises binding logic; this is not a record of human approval."
  }))
}
writeFileSync(resolve(root, "demo-review.json"), JSON.stringify(review))
const ready = JSON.parse(
  run([...checkArgs, "--review", "demo-review.json", "--json"], 0).stdout
)
assert.equal(ready.status, "ready-for-demo")
assert.equal(ready.publishable, false)
cpSync(resolve(root, "rebuilt-b"), resolve(root, "unlisted-output"), {
  recursive: true
})
writeFileSync(
  resolve(root, "unlisted-output/unreviewed.html"),
  "This extra export was not covered by the review receipt."
)
const unlistedArgs = checkArgs.map((arg) =>
  arg === "rebuilt-b" ? "unlisted-output" : arg
)
const unlisted = JSON.parse(
  run([...unlistedArgs, "--review", "demo-review.json", "--json"], 1).stderr
)
assert.equal(unlisted.status, "refuse")
assert.equal(unlisted.publishable, false)
assert.match(unlisted.error, /Output directory contains/)
assert.match(
  run([...unlistedArgs, "--review", "demo-review.json"], 1).stderr,
  /^refuse: Output directory contains/
)
results.push({
  check:
    "Unlisted exported files refuse a matching review in both CLI JSON and terminal output",
  passed: true
})
const stale = [...checkArgs]
stale[stale.indexOf("rebuilt-b")] = "rebuilt-a"
assert.equal(
  JSON.parse(
    run([...stale, "--review", "demo-review.json", "--json"], 2).stdout
  ).reviewMatches,
  false
)
writeFileSync(
  resolve(root, "incomplete-review.json"),
  JSON.stringify({ ...review, decisions: review.decisions.slice(1) })
)
assert.equal(
  JSON.parse(
    run([...checkArgs, "--review", "incomplete-review.json", "--json"], 2)
      .stdout
  ).status,
  "conditional"
)
results.push({
  check:
    "Pending, incomplete and other-edition receipts block; complete demo receipt succeeds without asserting publishability",
  passed: true
})

const report = JSON.parse(
  run(
    [
      "tools/cli.mjs",
      "compare",
      "--source",
      "raw",
      "--month",
      "2025-06",
      "--before",
      "2026-01-09",
      "--after",
      "2026-03-06",
      "--output",
      "comparison",
      "--json"
    ],
    0
  ).stdout
)
assert.deepEqual(report.affectedClaims, [
  "estimate-2026-01-09-2025-06-v1",
  "estimate-2026-03-06-2025-06-v1",
  "interpretation-2026-01-09-2025-06-v1",
  "interpretation-2026-03-06-2025-06-v1"
])
assert.equal(report.previousReviewApplies, false)
cpSync(resolve(root, "raw"), resolve(root, "altered-raw"), { recursive: true })
writeFileSync(
  resolve(root, "altered-raw/PAYEMS-2026-03-06.csv"),
  "changed source"
)
const refused = run(
  [
    "tools/cli.mjs",
    "build",
    "--source",
    "altered-raw",
    "--month",
    "2025-06",
    "--vintage",
    "2026-03-06",
    "--output",
    "refused-output",
    "--json"
  ],
  1
)
assert.match(refused.stderr, /checksum mismatch/)
results.push({
  check:
    "Two-edition comparison names affected claims; altered raw bytes are refused",
  passed: true
})
const editorial = JSON.parse(
  run(
    [
      "tools/cli.mjs",
      "compare",
      "--source",
      "raw",
      "--month",
      "2025-06",
      "--before",
      "2026-03-06",
      "--after",
      "2026-03-06",
      "--reading",
      "size",
      "--reason",
      "editorial-interpretation",
      "--output",
      "editorial-change",
      "--json"
    ],
    0
  ).stdout
)
assert.equal(editorial.reason, "editorial-interpretation")
assert.equal(editorial.changed.length, 0)
assert.notEqual(editorial.previousClaims[1].text, editorial.nextClaims[1].text)
results.push({
  check:
    "Editorial-only change keeps numerical values but replaces its interpretation claim",
  passed: true
})
const evidence = {
  verifiedAt: new Date().toISOString(),
  node: process.version,
  packageVersion: parse("node_modules/semiotic/package.json").version,
  packageTarballSha256: createHash("sha256")
    .update(readFileSync(resolve(root, `semiotic-${parse("node_modules/semiotic/package.json").version}.tgz`)))
    .digest("hex"),
  adapterSha256: createHash("sha256")
    .update(readFileSync(resolve(root, "tools/cli.mjs")))
    .digest("hex"),
  authority:
    "Automated clean-consumer exercise, not an independent human maintainer or editorial sign-off",
  publicImports: ["semiotic/artifact", "semiotic/server"],
  results
}
writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + "\n")
console.log(JSON.stringify(evidence, null, 2))
