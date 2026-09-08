// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest"
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import { renderChartWithEvidence } from "semiotic/server"
import {
  evaluateArtifact,
  fingerprintValue,
  validateArtifactContract
} from "semiotic/artifact"
import { auditData } from "../../src/components/data/auditData"
import { ingest } from "./ingest"
import { bundle, checkSaved, writeEdition } from "./bundle"
import { publicationCheck, type DemoReview } from "./publication"
import {
  annualChange,
  canonicalRows,
  estimate,
  firstEdition,
  jobs,
  laterEdition,
  months,
  prepareMonth
} from "../../docs/src/pages/examples/jobs-report/model"
import {
  buildBriefing,
  compareBriefings,
  handoff,
  verifyBriefing,
  verifyHandoff
} from "../../docs/src/pages/examples/jobs-report/packet"
import {
  lineProps,
  pairedProps
} from "../../docs/src/pages/examples/jobs-report/chart-config"
import {
  sourceCSV,
  briefingHTML
} from "../../docs/src/pages/examples/jobs-report/exports"
import bootstrap from "../../docs/src/pages/examples/jobs-report/bootstrap.json"
import checks from "./source-checks.json"

const raw = resolve("docs/public", bootstrap.base.slice(1), "raw")
const snapshot = ingest(raw)
// These unit receipts have explicitly synthetic output identities. The bundle
// and separate consumer tests bind and reproduce actual exported file bytes.
function fixtureCheck(
  source: typeof snapshot,
  briefing: ReturnType<typeof buildBriefing>,
  review?: DemoReview,
  now?: string
) {
  return publicationCheck(
    source,
    briefing,
    review,
    now,
    fingerprintValue({ fixture: "unit-output", edition: briefing.edition })
      .fingerprint
  )
}

const temporary: string[] = []
function scratch() {
  const directory = mkdtempSync(resolve(tmpdir(), "e06-test-"))
  temporary.push(directory)
  return directory
}
afterEach(() =>
  temporary
    .splice(0)
    .forEach((directory) => rmSync(directory, { recursive: true, force: true }))
)

describe("BLS vintage admission and arithmetic", () => {
  it("matches all 47 first/third numerical cells and the missing first cell independently transcribed from BLS", () => {
    expect(months).toHaveLength(24)
    for (const row of checks.firstThird) {
      const selected = prepareMonth(snapshot, row.month)
      expect(selected.first?.change ?? null, `${row.month} first`).toBe(
        row.first === null ? null : row.first * 1000
      )
      expect(selected.third?.change, `${row.month} third`).toBe(
        row.third * 1000
      )
    }
  })
  it("matches 48 benchmark-table cells, keeping employment levels distinct from changes", () => {
    for (const row of checks.benchmark) {
      const before = estimate(snapshot, row.month, firstEdition)!
      const after = estimate(snapshot, row.month, "2026-02-11")!
      expect(
        [before.level, before.change / 1000, after.level, after.change / 1000],
        row.month
      ).toEqual([
        row.previousLevel,
        row.previousChange,
        row.revisedLevel,
        row.revisedChange
      ])
    }
  })
  it("rejects altered bytes, unlisted files, swapped calendar fields and undated current-series exports", () => {
    const directory = scratch()
    cpSync(raw, directory, { recursive: true })
    const file = resolve(directory, "PAYEMS-2024-02-02.csv")
    const original = readFileSync(file)
    writeFileSync(file, original.toString().replace("157700", "157701"))
    expect(() => ingest(directory)).toThrow(/checksum/)
    writeFileSync(file, original)
    writeFileSync(resolve(directory, "unlisted.csv"), "unlisted")
    expect(() => ingest(directory)).toThrow(/Every CSV/)
    rmSync(resolve(directory, "unlisted.csv"))
    const ledgerFile = resolve(directory, "retrieval.json")
    const ledger = JSON.parse(readFileSync(ledgerFile, "utf8"))
    ledger.files[0].referenceMonth = "2024-02"
    writeFileSync(ledgerFile, JSON.stringify(ledger))
    expect(() => ingest(directory)).toThrow(/calendar/)
    ledger.files[0].referenceMonth = "2024-01"
    ledger.files[0].url = ledger.files[0].url.replace(
      "alfredgraph",
      "fredgraph"
    )
    writeFileSync(ledgerFile, JSON.stringify(ledger))
    expect(() => ingest(directory)).toThrow(/URL/)
  })
  it("assigns a different identity to a new retrieval, even for identical observation bytes", () => {
    const directory = scratch()
    cpSync(raw, directory, { recursive: true })
    const ledgerFile = resolve(directory, "retrieval.json")
    const ledger = JSON.parse(readFileSync(ledgerFile, "utf8"))
    ledger.files[0].retrievedAt = "2026-09-08T12:00:00Z"
    writeFileSync(ledgerFile, JSON.stringify(ledger))
    expect(ingest(directory).id).not.toBe(snapshot.id)
  })
  it("does not leak later third estimates into earlier editions or invent October's first", () => {
    expect(prepareMonth(snapshot, "2025-12", firstEdition)).toMatchObject({
      third: null,
      latest: { change: 50000 }
    })
    expect(prepareMonth(snapshot, "2025-12", laterEdition)).toMatchObject({
      third: { change: -17000 }
    })
    expect(prepareMonth(snapshot, "2025-08", "2025-11-20").third).toBeNull()
    expect(prepareMonth(snapshot, "2025-08", "2025-12-16").third?.change).toBe(
      -26000
    )
    expect(prepareMonth(snapshot, "2025-10")).toMatchObject({
      first: null,
      reversal: false,
      revision: null
    })
    expect(prepareMonth(snapshot, "2025-06", "2025-06-06").latest).toBeNull()
  })
  it("converts negative thousands explicitly and derives coherent annual totals within one vintage", () => {
    expect(jobs(-13)).toBe(-13000)
    expect(() => jobs(NaN)).toThrow(/finite/)
    expect(
      [firstEdition, "2026-02-11", laterEdition].map((date) =>
        annualChange(snapshot, 2025, date)
      )
    ).toEqual([584000, 181000, 116000])
    const mixed = months
      .filter((month) => month.startsWith("2024"))
      .reduce(
        (sum, month) => sum + prepareMonth(snapshot, month).first!.change,
        0
      )
    expect(mixed).not.toBe(annualChange(snapshot, 2024, laterEdition))
    expect(canonicalRows(snapshot)).toHaveLength(677)
    expect(sourceCSV(snapshot, firstEdition)).not.toContain('"2026-03-06"')
  })
})

describe("briefings and actual chart marks", () => {
  it.each(["2025-06", "2025-07", "2024-03", "2025-10"])(
    "keeps %s values consistent across chart steps, packet and plain HTML",
    (month) => {
      const briefing = buildBriefing(snapshot, month, laterEdition)
      expect(
        briefing.props.data.reduce((total, row) => total + row.change, 0)
      ).toBe(briefing.selected.latest!.change)
      const rendered = renderChartWithEvidence(
        briefing.component,
        briefing.props,
        { artifactContract: briefing.contract }
      )
      expect(rendered.evidence).toMatchObject({
        empty: false,
        artifactBinding: { status: "match" },
        markCountByType: { rect: briefing.props.data.length }
      })
      expect(auditData(briefing.component, briefing.props).ok).toBe(true)
      expect(validateArtifactContract(briefing.contract).valid).toBe(true)
      expect(
        verifyHandoff(snapshot, JSON.parse(JSON.stringify(handoff(briefing))))
      ).toEqual(briefing)
      const html = briefingHTML(briefing)
      expect(html).toContain(briefing.selected.latest!.releaseDate.slice(0, 4))
      expect(html).toContain('scope="row"')
      expect(html).not.toContain("<script")
    }
  )
  it("draws all 47 paired estimates on common scales and breaks the first-estimate line at the missing month", () => {
    const a = renderChartWithEvidence("DotPlot", pairedProps(snapshot, "2024"))
    const b = renderChartWithEvidence("DotPlot", pairedProps(snapshot, "2025"))
    expect(a.evidence.markCount).toBe(24)
    expect(b.evidence.markCount).toBe(23)
    expect(a.evidence.yDomain).toEqual(b.evidence.yDomain)
    const props = lineProps(snapshot, laterEdition, true)
    expect(props.data.find((row) => row.month === 22)).toBeUndefined()
    const rendered = renderChartWithEvidence("LineChart", props)
    expect(rendered.evidence.markCountByType.line).toBe(2)
    expect(
      props.data
        .filter((row) => row.segment === "after gap")
        .map((row) => row.month)
    ).toEqual([23, 24])
  })
  it("recomputes claims and rejects tampered packets, source identities and publication assertions", () => {
    const briefing = buildBriefing(snapshot, "2025-06", laterEdition)
    for (const mutate of [
      (b: typeof briefing) => {
        b.values[0].value = 10
      },
      (b: typeof briefing) => {
        b.contract.claims[1].text = "This proves a recession"
      },
      (b: typeof briefing) => {
        b.props.data[0].change = 10
      },
      (b: typeof briefing) => {
        b.sourceDigest = "sha256:another"
      }
    ]) {
      const changed = structuredClone(briefing)
      mutate(changed)
      expect(() => verifyBriefing(snapshot, changed)).toThrow(/reproduce/)
    }
    const packet = handoff(briefing)
    packet.publication.status = "approved"
    expect(() => verifyHandoff(snapshot, packet)).toThrow(/publication/)
    expect(prepareMonth(snapshot, "2025-06").reversal).toBe(true)
    expect(prepareMonth(snapshot, "2025-07").reversal).toBe(false)
  })
})

describe("publication and revision handoff", () => {
  it("will not accept a review without identified outputs or for changed exported bytes", () => {
    const briefing = buildBriefing(snapshot, "2025-06", laterEdition)
    const review = receipt(fixtureCheck(snapshot, briefing))
    const unidentified = publicationCheck(snapshot, briefing, review, now)
    expect(unidentified.unresolved).toContainEqual(
      expect.objectContaining({ id: "host.output-identity", status: "unknown" })
    )
    expect(
      publicationCheck(
        snapshot,
        briefing,
        review,
        now,
        fingerprintValue("changed-caption-or-PNG").fingerprint
      ).reviewMatches
    ).toBe(false)
  })
  it("can repeat evaluation of the same frozen chart and contract without changing either", () => {
    const briefing = buildBriefing(snapshot, "2025-06", laterEdition)
    const original = fingerprintValue(briefing).fingerprint
    function freeze(value: unknown) {
      if (!value || typeof value !== "object" || Object.isFrozen(value)) return
      Object.values(value).forEach(freeze)
      Object.freeze(value)
    }
    freeze(briefing)
    const options = {
      policy: "exploratory" as const,
      now: laterEdition,
      render: renderChartWithEvidence,
      recommendRepresentation: false
    }
    const first = evaluateArtifact(
      briefing.component,
      briefing.props,
      briefing.contract,
      options
    )
    const second = evaluateArtifact(
      briefing.component,
      briefing.props,
      briefing.contract,
      options
    )
    expect(second).toEqual(first)
    expect(first.render?.markCountByType.rect).toBe(3)
    expect(fingerprintValue(briefing).fingerprint).toBe(original)
  })
  const now = "2026-09-07T23:00:00Z"
  function receipt(check: ReturnType<typeof publicationCheck>): DemoReview {
    return {
      schemaVersion: 1,
      scope: "demonstration-only",
      subject: check.subject,
      reviewer: "Automated test fixture, not a human editor",
      reviewedAt: "2026-09-07T22:00:00Z",
      expiresAt: "2026-09-08T00:00:00Z",
      decisions: check.requirements.map(({ id }) => ({
        id,
        outcome: "checked",
        rationale:
          "Synthetic receipt for testing the host's binding logic only."
      }))
    }
  }
  it("keeps unresolved work conditional and recognizes only a complete, current demonstration receipt", () => {
    const briefing = buildBriefing(snapshot, "2025-06", laterEdition)
    const pending = fixtureCheck(snapshot, briefing, undefined, now)
    expect(pending.status).toBe("conditional")
    const review = receipt(pending)
    expect(fixtureCheck(snapshot, briefing, review, now)).toMatchObject({
      status: "ready-for-demo",
      publishable: false,
      demoReady: true
    })
    expect(
      fixtureCheck(
        snapshot,
        briefing,
        { ...review, decisions: review.decisions.slice(1) },
        now
      ).status
    ).toBe("conditional")
    expect(
      fixtureCheck(snapshot, briefing, review, "2026-09-09T00:00:00Z").status
    ).toBe("conditional")
    expect(
      fixtureCheck(
        snapshot,
        briefing,
        { ...review, reviewedAt: "2026-09-08T00:00:00Z" },
        now
      ).status
    ).toBe("conditional")
  })
  it("retains A and names the claims reassessed for B; an A review cannot authorize B", () => {
    const a = buildBriefing(snapshot, "2025-06", firstEdition)
    const b = buildBriefing(snapshot, "2025-06", laterEdition)
    const before = fingerprintValue(a).fingerprint
    const report = compareBriefings(a, b)
    expect(report.changed).toContainEqual({ key: "dated", value: -20000 })
    expect(report.affectedClaims).toEqual(
      expect.arrayContaining(a.contract.claims.map(({ id }) => id))
    )
    expect(
      report.contract.claims.filter(({ status }) => status === "superseded")
    ).toHaveLength(2)
    expect(fingerprintValue(a).fingerprint).toBe(before)
    expect(
      fixtureCheck(snapshot, b, receipt(fixtureCheck(snapshot, a)), now)
        .reviewMatches
    ).toBe(false)
    expect(() => compareBriefings(a, b, "editorial-interpretation")).toThrow(
      /source-update/
    )
    const mismatch = evaluateArtifact(b.component, b.props, a.contract, {
      policy: "exploratory",
      recommendRepresentation: false
    })
    expect(mismatch.status).toBe("refuse")
  })
  it("distinguishes an editorial reading change from new source evidence", () => {
    const direction = buildBriefing(snapshot, "2025-06", laterEdition)
    const size = buildBriefing(snapshot, "2025-06", laterEdition, "size")
    const report = compareBriefings(direction, size, "editorial-interpretation")
    expect(report.reason).toBe("editorial-interpretation")
    expect(report.changed).toEqual([])
    expect(size.props).toEqual(direction.props)
    expect(size.contract.claims[1].text).toContain("−167,000")
    expect(report.nextClaims[1].id).not.toBe(report.previousClaims[1].id)
    expect(() => compareBriefings(direction, size)).toThrow(
      /editorial-interpretation/
    )
    expect(
      fixtureCheck(
        snapshot,
        size,
        receipt(fixtureCheck(snapshot, direction)),
        now
      ).reviewMatches
    ).toBe(false)
  })
  it("preserves complete editions and refuses altered output even if its inventory was rewritten", async () => {
    const output = resolve(scratch(), "edition")
    const result = await bundle(snapshot, "2025-06", laterEdition)
    writeEdition(output, result.files)
    expect((await checkSaved(snapshot, output)).status).toBe("conditional")
    writeEdition(output, result.files)
    const original = readFileSync(resolve(output, "graphic.svg"))
    expect(() =>
      writeEdition(output, { ...result.files, "graphic.svg": "changed" })
    ).toThrow(/immutable/)
    expect(readFileSync(resolve(output, "graphic.svg"))).toEqual(original)
    writeFileSync(resolve(output, "graphic.svg"), "misleading graphic")
    writeFileSync(resolve(output, "outputs.json"), "[]")
    await expect(checkSaved(snapshot, output)).rejects.toThrow(
      /does not reproduce/
    )
  })
  it.each([
    "extra file",
    "hidden file",
    "nested directory",
    "symbolic link",
    "missing file",
    "renamed file"
  ])("refuses a reviewed edition with %s on check and rebuild", async (change) => {
    const directory = scratch()
    const output = resolve(directory, "edition")
    const result = await bundle(snapshot, "2025-06", laterEdition)
    writeEdition(output, result.files)
    const review = {
      ...receipt(await checkSaved(snapshot, output)),
      reviewedAt: new Date(Date.now() - 60000).toISOString(),
      expiresAt: new Date(Date.now() + 60000).toISOString()
    }
    expect(await checkSaved(snapshot, output, review)).toMatchObject({
      status: "ready-for-demo",
      publishable: false
    })
    const graphic = resolve(output, "graphic.svg")
    if (change === "extra file" || change === "hidden file") {
      writeFileSync(
        resolve(output, change === "extra file" ? "unreviewed.html" : ".hidden"),
        "These exported bytes were never reviewed."
      )
    } else if (change === "nested directory") {
      mkdirSync(resolve(output, "extra"))
      writeFileSync(resolve(output, "extra/graphic.svg"), "Unreviewed graphic")
    } else if (change === "symbolic link") {
      const external = resolve(directory, "graphic.svg")
      renameSync(graphic, external)
      symlinkSync(external, graphic)
    } else if (change === "missing file") {
      rmSync(graphic)
    } else {
      renameSync(graphic, resolve(output, "renamed.svg"))
    }
    await expect(checkSaved(snapshot, output, review)).rejects.toThrow(
      /Output directory contains missing, unexpected or non-regular files/
    )
    expect(() => writeEdition(output, result.files)).toThrow(
      /Output directory contains missing, unexpected or non-regular files/
    )
  })
})
