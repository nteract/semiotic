import { describe, expect, it } from "vitest"
import {
  atlas,
  circuit,
  delivered,
  edition,
  ledger,
  makeLedger,
  resolution,
  totalHandoffs,
} from "./data"

describe("Novel Network Lab shared evidence", () => {
  it("derives every handoff from reproducible individual manuscript paths", () => {
    expect(makeLedger()).toEqual(ledger)
    expect(ledger.manuscripts).toHaveLength(48)
    expect(ledger.nodes).toHaveLength(14)
    expect(ledger.edges).toHaveLength(21)
    expect(delivered).toBe(45)
    expect(totalHandoffs).toBe(434)
    expect(ledger.manuscripts.reduce((sum, book) => sum + book.nodePath.length - 1, 0)).toBe(
      totalHandoffs,
    )
    for (const edge of ledger.edges) {
      const events = ledger.manuscripts.flatMap((book) =>
        book.edgeIds.filter((id) => id === edge.id).map(() => book.id),
      )
      expect(edge.manuscriptIds).toEqual(events)
      expect(edge.value).toBe(events.length)
    }
  })
  it("conserves manuscripts at each stage including repeats and exits", () => {
    for (const node of ledger.nodes) {
      const starts = ledger.manuscripts.filter((book) => book.nodePath[0] === node.id).length
      const ends = ledger.manuscripts.filter((book) => book.nodePath.at(-1) === node.id).length
      expect(node.incoming + starts).toBe(node.visits)
      expect(node.outgoing + ends).toBe(node.visits)
    }
    expect(ledger.nodes.find((node) => node.id === "Copy")).toMatchObject({
      visits: 63,
      manuscripts: 45,
    })
    const authorBooks = ledger.manuscripts.filter((book) => book.nodePath.includes("Author"))
    expect(authorBooks).toHaveLength(12)
    expect(
      authorBooks.filter((book) => book.nodePath.filter((id) => id === "Author").length === 2),
    ).toHaveLength(4)
  })
  it("keeps parallel channels, feedback, a self-loop, and the shortcut in the admitted graph", () => {
    expect(
      ledger.edges
        .filter((edge) => edge.source === "Copy" && edge.target === "Proof")
        .map((edge) => edge.channel)
        .sort(),
    ).toEqual(["automated", "manual"])
    expect(
      ledger.edges.find((edge) => edge.source === "Copy" && edge.target === "Copy")?.value,
    ).toBe(4)
    expect(
      ledger.edges.find((edge) => edge.source === "Intake" && edge.target === "Editor")?.value,
    ).toBe(3)
    expect(atlas.source.edges).toEqual(
      ledger.edges.map(({ id, source, target }) => ({ id, source, target })),
    )
    expect(atlas.source.occurrences).toHaveLength(6)
    expect(atlas.source.occurrences!.reduce((sum, cohort) => sum + cohort.entityCount!, 0)).toBe(48)
    for (const cohort of atlas.source.occurrences!) {
      expect(
        ledger.manuscripts.filter(
          (book) => JSON.stringify(book.nodePath) === JSON.stringify(cohort.nodePath),
        ),
      ).toHaveLength(cohort.entityCount!)
    }
    expect(circuit.modules.map((module) => module.nodeId).sort()).toEqual(
      ledger.nodes.map((node) => node.id).sort(),
    )
    expect(edition.entries[0].flows.map((flow) => flow.edgeId).sort()).toEqual(
      ledger.edges.map((edge) => edge.id).sort(),
    )
  })
  it("supports the required-gateway finding with full-graph dominators", () => {
    const dominators = atlas.requiredPaths!.immediateDominatorByNode
    expect(atlas.requiredPaths!.status).toBe("exact")
    expect(dominators.Delivered).toBe("Release")
    expect(dominators.Editor).toBe("Intake")
    expect(ledger.manuscripts.filter((book) => book.nodePath.includes("Legal"))).toHaveLength(4)
  })
  it("preserves original membership while reducing the number of visible groups", () => {
    expect(resolution.pages).toHaveLength(4)
    expect(resolution.pages[0].groupIds).toHaveLength(14)
    expect(resolution.pages.at(-1)!.groupIds).toHaveLength(9)
    expect(resolution.source.nodes.map((node) => node.id).sort()).toEqual(
      ledger.nodes.map((node) => node.id).sort(),
    )
    expect(resolution.source.edges.map((edge) => edge.id).sort()).toEqual(
      ledger.edges.map((edge) => edge.id).sort(),
    )
  })
  it("derives circuit rates from the same daily counts without inventing queue or capacity measurements", () => {
    expect(edition.synthetic).toBe(true)
    expect(edition.individualTimings).toBe("unavailable")
    const entry = edition.entries[0]
    for (const edge of ledger.edges)
      expect(entry.flows.find((flow) => flow.edgeId === edge.id)!.perSecond! * 86400).toBeCloseTo(
        edge.value,
      )
    for (const node of ledger.nodes) {
      expect(entry.nodes[node.id]).toMatchObject({ capacity: null, queued: null })
      expect(entry.nodes[node.id].completions! * 86400).toBeCloseTo(node.visits)
      expect(entry.nodes[node.id].arrivals! * 86400).toBeCloseTo(node.visits)
    }
    expect(entry.totals.completions! * 86400).toBeCloseTo(delivered)
  })
})
