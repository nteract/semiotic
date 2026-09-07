import { auditAccessibility } from "semiotic/utils"
import { describe, expect, it } from "vitest"
import { readFileSync, cpSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import { fingerprintValue } from "semiotic/artifact"
import { renderChartWithEvidence } from "semiotic/server"
import { ingest, parseStorageCSV } from "./ingest"
import {
  addDays,
  dateForWaterYear,
  dateIndex,
  dateTime
} from "../../docs/src/pages/examples/reservoir-guide/calendar"
import {
  capacityComparison,
  prepareGuide,
  readingAt
} from "../../docs/src/pages/examples/reservoir-guide/prepare"
import {
  compareEditions,
  verifySnapshot
} from "../../docs/src/pages/examples/reservoir-guide/edition"
import {
  defaultState,
  readStateSearch,
  resolveState,
  stateSearch
} from "../../docs/src/pages/examples/reservoir-guide/state"
import {
  buildGuidePacket,
  evaluateBindings,
  importGuidePacket,
  numericalBindings
} from "../../docs/src/pages/examples/reservoir-guide/packet"
import {
  collectionChartProps,
  seasonChartProps
} from "../../docs/src/pages/examples/reservoir-guide/chart-config"
import { renderSavedHTML } from "../../docs/src/pages/examples/reservoir-guide/exports"
import type { ReservoirSnapshot } from "../../docs/src/pages/examples/reservoir-guide/types"

const edition = JSON.parse(
  readFileSync(
    resolve("docs/src/pages/examples/reservoir-guide/bootstrap.json"),
    "utf8"
  )
).header.editionId
const directory = resolve(`docs/public/stories/reservoir-guide/${edition}`)
const snapshot = JSON.parse(
  readFileSync(resolve(directory, "snapshot.json"), "utf8")
) as ReservoirSnapshot
const initial = defaultState(snapshot)
function mutable() {
  return structuredClone(snapshot)
}
function signed(value: ReservoirSnapshot) {
  value.fingerprint = fingerprintValue({
    ...value,
    fingerprint: ""
  }).fingerprint
  return value
}
const selectedIndex = dateIndex("2025-07-30", snapshot.startDate)

describe("CDEC source admission and calendars", () => {
  it("requires every source checksum and assigns a different identity to a new retrieval", () => {
    const raw = mkdtempSync(resolve(tmpdir(), "e03-source-admission-"))
    cpSync(resolve(directory, "raw"), raw, { recursive: true })
    const inventoryPath = resolve(raw, "retrieval.json")
    const original = JSON.parse(readFileSync(inventoryPath, "utf8"))
    writeFileSync(
      inventoryPath,
      JSON.stringify({ ...original, sources: [...original.sources].reverse() })
    )
    expect(ingest(raw)).toEqual(snapshot)
    const missing = structuredClone(original)
    missing.sources = missing.sources.filter(
      (item: { file: string }) => item.file !== "SHA.csv"
    )
    writeFileSync(inventoryPath, JSON.stringify(missing))
    expect(() => ingest(raw)).toThrow(/source inventory/)
    original.sources[0].retrievedAt = "2026-09-08T00:00:00.000Z"
    writeFileSync(inventoryPath, JSON.stringify(original))
    expect(ingest(raw).editionId).not.toBe(snapshot.editionId)
    writeFileSync(resolve(raw, "SHA.csv"), "corrupted synthetic test input")
    expect(() => ingest(raw)).toThrow(/checksum mismatch/)
  })
  it("rebuilds all canonical values and identities from pinned source checksums", () => {
    expect(ingest(resolve(directory, "raw"))).toEqual(snapshot)
    expect(
      Object.values(snapshot.counts).reduce((sum, c) => sum + c.rows, 0)
    ).toBe(76704)
    expect(snapshot.counts.DNP.missing).toBe(1122)
    expect(verifySnapshot(snapshot)).toBe(snapshot)
  })
  it("rejects invalid and duplicate source records, unsupported units and dates", () => {
    const header =
      "STATION_ID,DURATION,SENSOR_NUMBER,SENSOR_TYPE,DATE TIME,OBS DATE,VALUE,DATA_FLAG,UNITS\n"
    const row = "SHA,D,15,STORAGE,20250730 0000,20250730 2359,100,,AF\n"
    expect(() =>
      parseStorageCSV(header + row + row, "SHA", "2025-07-30", "2025-07-30")
    ).toThrow(/Duplicate/)
    expect(() =>
      parseStorageCSV(
        header + row.replace(",AF", ",CFS"),
        "SHA",
        "2025-07-30",
        "2025-07-30"
      )
    ).toThrow()
    expect(() =>
      parseStorageCSV(
        header + row.replace(",100,", ",-1,"),
        "SHA",
        "2025-07-30",
        "2025-07-30"
      )
    ).toThrow()
    const parsed = parseStorageCSV(
      header + row.replace(",100,", ",---,"),
      "SHA",
      "2025-07-29",
      "2025-07-30"
    )
    expect(parsed.packed).toEqual([
      [null, null],
      [null, 1439]
    ])
    expect(parsed.overrides["2025-07-30"]).toBe(2)
  })
  it("aligns month/day across leap years and retains distinct fixed-PST source timestamps", () => {
    expect(dateForWaterYear(2025, "10-01")).toBe("2024-10-01")
    expect(dateForWaterYear(2024, "02-29")).toBe("2024-02-29")
    expect(dateForWaterYear(2025, "02-29")).toBeNull()
    expect(dateForWaterYear(2024, "03-01")).toBe("2024-03-01")
    expect(() => dateTime("2025-02-29")).toThrow()
    const row = readingAt(snapshot, "SHA", "2025-07-30")!
    expect(row.sourceDateTime).toBe("20250730 0000")
    expect(row.sourceObservationDateTime).toBe("20250730 0000")
    expect(
      readingAt(snapshot, "ORO", "2025-07-30")!.sourceObservationDateTime
    ).toBe("20250731 0000")
    expect(row.sourceRecordLine).toBe(selectedIndex + 2)
    expect(addDays(snapshot.startDate, selectedIndex)).toBe("2025-07-30")
  })
})

describe("three comparisons and matched membership", () => {
  it("distinguishes capacity, seasonal mean and historical rank without mutating inputs", () => {
    const before = JSON.stringify(snapshot)
    const guide = prepareGuide(snapshot, initial)
    expect(guide.reading!.storageAcreFeet).toBe(3258792)
    expect(guide.capacity.percent).toBeCloseTo((3258792 / 4552000) * 100, 10)
    expect(guide.baseline.mean).toBeCloseTo(3115518.033333333, 8)
    expect(guide.baseline.percentOfMean).toBeCloseTo(104.59872050598842, 10)
    expect(guide.baseline.percentile).toBe(50)
    expect(guide.baseline.less).toBe(15)
    expect(guide.baseline.equal).toBe(0)
    expect(guide.collection.storage).toBe(12164697)
    expect(guide.collection.capacity).toBe(15831403)
    expect(guide.collection.percent).toBeCloseTo(
      (12164697 / 15831403) * 100,
      10
    )
    const unweighted =
      guide.collection.members.reduce(
        (sum, m) => sum + m.capacity.percent!,
        0
      ) / 6
    expect(unweighted).toBeCloseTo(75.92086803211585, 10)
    expect(unweighted).not.toBeCloseTo(guide.collection.percent!, 1)
    expect(JSON.stringify(snapshot)).toBe(before)
  })
  it("removes missing or estimated members from both sums, retaining revised and zero readings", () => {
    const fixture = mutable()
    fixture.series.SHA[selectedIndex] = [null, 1439]
    fixture.series.ORO[selectedIndex] = [2742600, 1439, "e"]
    fixture.series.FOL[selectedIndex] = [0, 1439, "r"]
    const guide = prepareGuide(fixture, initial)
    expect(guide.collection.excludedIds).toEqual(["SHA", "ORO"])
    expect(guide.collection.status).toBe("partial")
    expect(guide.collection.storage).toBe(1729032 + 1763500 + 2088281)
    expect(guide.collection.capacity).toBe(977000 + 2400000 + 2030000 + 2447650)
    expect(readingAt(fixture, "FOL", "2025-07-30")!.eligible).toBe(true)
    for (const id of fixture.reservoirs.map((r) => r.id))
      fixture.series[id][selectedIndex] = [null, 1439]
    expect(prepareGuide(fixture, initial).collection.percent).toBeNull()
  })
  it("honors capacity intervals, labels reference-only dates and never clamps over-capacity observations", () => {
    const fixture = mutable()
    fixture.capacities.push({
      ...fixture.capacities[0],
      id: "SHA-earlier-capacity-test",
      acreFeet: 100,
      validFrom: "2025-07-29",
      validTo: "2025-07-29"
    })
    const row = readingAt(fixture, "SHA", "2025-07-29")
    const result = capacityComparison(fixture, "SHA", row)
    expect(result.mode).toBe("dated")
    expect(result.aboveReference).toBe(true)
    expect(result.percent).toBeGreaterThan(100)
    expect(
      capacityComparison(
        fixture,
        "SHA",
        readingAt(fixture, "SHA", "2025-07-28")
      ).mode
    ).toBe("reference")
    fixture.capacities[0].acreFeet = 0
    expect(
      capacityComparison(
        fixture,
        "SHA",
        readingAt(fixture, "SHA", "2025-07-30")
      ).percent
    ).toBeNull()
    expect(() => verifySnapshot(signed(fixture))).toThrow(/capacity/)
  })
  it("withholds incompatible measurement baselines and undersized leap-day percentiles", () => {
    const oro = prepareGuide(snapshot, { ...initial, stationId: "ORO" })
    expect(oro.baseline.count).toBe(0)
    expect(oro.baseline.mean).toBeNull()
    expect(oro.baseline.percentile).toBeNull()
    const leap = prepareGuide(snapshot, {
      ...initial,
      waterYear: 2024,
      monthDay: "02-29"
    })
    expect(leap.baseline.count).toBe(7)
    expect(leap.baseline.excluded).toContainEqual({
      year: 1992,
      reason: "missing"
    })
    expect(leap.baseline.percentile).toBeNull()
    expect(leap.comparisonReading).toBeNull()
    const missing = prepareGuide(snapshot, {
      ...initial,
      stationId: "DNP",
      waterYear: 1993
    })
    expect(missing.reading!.storageAcreFeet).toBeNull()
    expect(missing.capacity.percent).toBeNull()
    expect(missing.collection.excludedIds).toContain("DNP")
    expect(
      prepareGuide(snapshot, { ...initial, stationId: "DNP" }).baseline.count
    ).toBe(26)
  })
  it("uses midrank for ties and leaves a zero historical mean unknown", () => {
    const fixture = mutable()
    for (let year = 1991; year <= 2020; year++)
      fixture.series.SHA[dateIndex(`${year}-07-30`, fixture.startDate)] = [
        100, 1439
      ]
    fixture.series.SHA[selectedIndex] = [100, 1439]
    let guide = prepareGuide(fixture, initial)
    expect(guide.baseline.percentile).toBe(50)
    expect(guide.baseline.equal).toBe(30)
    for (let year = 1991; year <= 2020; year++)
      fixture.series.SHA[dateIndex(`${year}-07-30`, fixture.startDate)] = [
        0, 1439
      ]
    guide = prepareGuide(fixture, initial)
    expect(guide.baseline.percentOfMean).toBeNull()
    expect(guide.baseline.percentile).toBe(100)
  })
})

describe("portable identity, honest updates and render parity", () => {
  it("rejects changed units, baselines, inputs, expected values, packet versions and source metadata", () => {
    const guide = prepareGuide(snapshot, initial)
    const bindings = numericalBindings(guide)
    for (const patch of [
      { unit: "acre-feet" },
      { baseline: "wrong" },
      { inputs: ["ORO:2025-07-30"] },
      { expected: 1 }
    ]) {
      const wrong = structuredClone(bindings)
      Object.assign(wrong[0], patch)
      expect(evaluateBindings(guide, wrong)[0].status).toBe("fail")
    }
    const packet = buildGuidePacket(snapshot, initial)
    expect(
      importGuidePacket(JSON.parse(JSON.stringify(packet)), snapshot).guide!
        .state
    ).toEqual(initial)
    expect(importGuidePacket(packet, snapshot).guide!.state).toEqual(initial)
    packet.guide.reading!.storageAcreFeet! += 1
    expect(() => importGuidePacket(packet, snapshot)).toThrow(/differ/)
    expect(() =>
      importGuidePacket({ ...packet, packetVersion: 2 }, snapshot)
    ).toThrow(/version/)
    const corrupted = mutable()
    corrupted.series.SHA[selectedIndex][0]! += 1
    expect(() => verifySnapshot(corrupted)).toThrow(/fingerprint/)
    const overlap = mutable()
    overlap.capacities.push({
      ...overlap.capacities[0],
      id: "duplicate-interval"
    })
    expect(() => verifySnapshot(signed(overlap))).toThrow(/Overlapping/)
  })
  it("preserves an unavailable identity, round-trips URLs and describes changed values and compatibility", () => {
    expect(readStateSearch(stateSearch(initial), snapshot)).toEqual(initial)
    const unavailable = { ...initial, stationId: "ZZZ" }
    expect(resolveState(unavailable, snapshot)).toMatch(
      /reservoir is unavailable/
    )
    expect(
      importGuidePacket(
        { packetVersion: 1, storyId: "E03", state: unavailable },
        snapshot
      ).state
    ).toEqual(unavailable)
    const next = mutable()
    next.editionId = "synthetic-test-edition"
    next.series.SHA[selectedIndex][0]! += 10
    const comparison = compareEditions(snapshot, signed(next), initial)
    expect(comparison.changes).toEqual([
      {
        stationId: "SHA",
        date: "2025-07-30",
        before: 3258792,
        after: 3258802,
        detail: "Storage or coverage changed"
      }
    ])
    expect(comparison.nextState).toEqual({
      ...initial,
      editionId: next.editionId
    })
    expect(comparison.selectionIssue).toBeNull()
    next.baseline.id = "synthetic-different-baseline"
    expect(
      compareEditions(snapshot, signed(next), initial).selectionIssue
    ).toMatch(/baseline is unavailable/)
  })
  for (const patch of [
    {},
    { stationId: "ORO" },
    { stationId: "DNP", waterYear: 1993 },
    { waterYear: 2024, monthDay: "02-29" }
  ]) {
    it(`preserves canonical values through packet, table and server SVG: ${JSON.stringify(patch)}`, () => {
      const state = { ...initial, ...patch }
      const guide = prepareGuide(snapshot, state)
      const packet = buildGuidePacket(snapshot, state)
      expect(packet.guide).toEqual(guide)
      expect(packet.checks.some((c) => c.status === "fail")).toBe(false)
      const chart = renderChartWithEvidence(
        "LineChart",
        seasonChartProps(guide)
      )
      expect(chart.svg).toContain("<path")
      expect(chart.evidence.markCount).toBeGreaterThan(0)
      expect(chart.evidence.sceneHash).toBeTruthy()
      expect(
        auditAccessibility(
          "LineChart",
          seasonChartProps(guide)
        ).findings.filter((f) => f.critical && f.status === "fail")
      ).toEqual([])
      const html = renderSavedHTML(snapshot, guide, chart.svg)
      expect(html).toContain(snapshot.editionId)
      expect(html).toContain(
        `water year ${state.waterYear} compared with ${state.comparisonYear}`
      )
      expect(html).toContain(guide.reservoir.name)
      expect(/<script|<link|<img|@import|url\((?!#)/.test(html)).toBe(false)
      expect(html.match(/<tr>/g)!.length).toBeGreaterThanOrEqual(374)
      const collection = renderChartWithEvidence(
        "BarChart",
        collectionChartProps(guide)
      )
      expect(collection.svg).toContain("<rect")
    })
  }
  it("breaks missing/estimated lines and detects geometry changes with the same mark count", () => {
    const guide = prepareGuide(snapshot, initial)
    const props = seasonChartProps(guide)
    const changed = {
      ...props,
      data: props.data.map((d, i) =>
        i === 50 ? { ...d, storageMAF: d.storageMAF + 1 } : d
      )
    }
    const a = renderChartWithEvidence("LineChart", props)
    const b = renderChartWithEvidence("LineChart", changed)
    expect(a.evidence.markCount).toBe(b.evidence.markCount)
    expect(a.evidence.sceneHash).not.toBe(b.evidence.sceneHash)
    const fixture = mutable()
    fixture.series.SHA[dateIndex("2025-07-15", fixture.startDate)] = [
      100,
      1439,
      "e"
    ]
    const points = seasonChartProps(prepareGuide(fixture, initial)).data.filter(
      (d) => d.role.startsWith("Selected")
    )
    expect(points.some((d) => d.rowId === "SHA:2025-07-15")).toBe(false)
    expect(points.find((d) => d.rowId === "SHA:2025-07-14")!.segment).not.toBe(
      points.find((d) => d.rowId === "SHA:2025-07-16")!.segment
    )
  })
})
