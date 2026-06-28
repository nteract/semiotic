import { describe, expect, it } from "vitest"
import {
  CIVIC_DATA_PORTALS,
  buildCivicNetwork,
  buildGovernmentHierarchy,
  filterCivicNetwork,
  getCivicPortal,
  inferTopic,
  latestCompleteFederalFY,
  locusCitySlug,
  parseCounty,
  slugify,
  summarizeCivicSignals,
  summarizeDisasters,
  summarizeSpending,
} from "./localGovernmentData"

const location = {
  zip: "98101",
  city: "Seattle",
  state: "Washington",
  stateCode: "WA",
}

const laws = [
  {
    id: "law-1",
    header: "Housing standards",
    content: "Rules for residential housing and tenants.",
    function: "Rules",
    topic: "Buildings",
    substantive: true,
    kind: "law",
  },
  {
    id: "law-2",
    header: "Budget process",
    content: "The council adopts the annual budget.",
    function: "Process",
    topic: null,
    substantive: false,
    kind: "law",
  },
]

const activity = {
  matters: [
    {
      id: "matter-10",
      rawId: 10,
      file: "CB 10",
      label: "CB 10",
      title: "Affordable housing funding",
      kind: "matter",
      bodyId: 4,
      bodyName: "Housing Committee",
      topic: "Housing",
    },
  ],
  meetings: [
    {
      id: "meeting-20",
      label: "Housing Committee · Jul 1",
      title: "Housing Committee",
      kind: "meeting",
      bodyId: 4,
      bodyName: "Housing Committee",
      date: "2026-07-01",
    },
  ],
  sponsors: [
    {
      id: "person-7",
      label: "A. Councilmember",
      kind: "person",
      matterId: "matter-10",
    },
  ],
}

describe("local government explorer transforms", () => {
  it("normalizes place names and infers navigation topics", () => {
    expect(slugify("St. Louis")).toBe("stlouis")
    expect(inferTopic("A lease supporting affordable homeownership")).toBe("Housing")
    expect(inferTopic("Annual revenue and appropriation ordinance")).toBe("Budget")
  })

  it("slugs multi-word cities to LOCUS underscore keys", () => {
    // LOCUS keys cities like "santa_cruz" — collapsing the separator (as the
    // node/topic slugify does) silently returns zero law rows.
    expect(locusCitySlug("Santa Cruz")).toBe("santa_cruz")
    expect(locusCitySlug("San Francisco")).toBe("san_francisco")
    expect(locusCitySlug("Seattle")).toBe("seattle")
    expect(locusCitySlug("St. Louis")).toBe("st_louis")
  })

  it("builds an authority and law hierarchy with stable unique ids", () => {
    const hierarchy = buildGovernmentHierarchy(location, laws, activity)
    const ids = []
    const visit = (node) => {
      ids.push(node.id)
      node.children?.forEach(visit)
    }
    visit(hierarchy)

    expect(hierarchy.children.map((node) => node.label)).toEqual([
      "Governing authorities",
      "Codified law · LOCUS",
    ])
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain("tree-body-4")
    expect(ids).toContain("tree-law-1")
  })

  it("connects bodies, matters, sponsors, topics, meetings, and law", () => {
    const network = buildCivicNetwork(location, laws, activity)
    const kinds = new Set(network.nodes.map((node) => node.kind))

    expect(kinds).toEqual(new Set([
      "jurisdiction",
      "body",
      "matter",
      "topic",
      "meeting",
      "person",
      "law",
    ]))
    expect(network.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: "body-4", target: "matter-10", relation: "introduced" }),
      expect.objectContaining({ source: "person-7", target: "matter-10", relation: "sponsors" }),
      expect.objectContaining({ source: "matter-10", target: "topic-housing", relation: "concerns" }),
    ]))
  })

  it("filters to a topic closure without leaving dangling edges", () => {
    const network = buildCivicNetwork(location, laws, activity)
    const filtered = filterCivicNetwork(network, {
      scope: "all",
      topic: "Housing",
      query: "",
    })
    const ids = new Set(filtered.nodes.map((node) => node.id))

    expect(ids.has("topic-housing")).toBe(true)
    expect(ids.has("matter-10")).toBe(true)
    expect(ids.has("person-7")).toBe(true)
    expect(filtered.edges.every((edge) => ids.has(edge.source) && ids.has(edge.target))).toBe(true)
  })
})

describe("universal county layer (FCC + FEMA)", () => {
  it("splits an FCC county FIPS into state and county codes", () => {
    const parsed = parseCounty({
      county_fips: "53033",
      county_name: "King County",
      state_code: "WA",
      state_name: "Washington",
    })
    expect(parsed).toMatchObject({
      countyFips: "53033",
      stateFips: "53",
      countyCode: "033",
      countyName: "King County",
      stateCode: "WA",
    })
  })

  it("dedupes FEMA program rows and summarizes the declaration record", () => {
    const rows = [
      // Same declaration repeated per program flag — the IA row sets the flag.
      { disasterNumber: 4906, femaDeclarationString: "DR-4906-WA", declarationType: "DR", declarationTitle: "SEVERE STORMS, FLOODING", declarationDate: "2026-04-07T00:00:00.000Z", fyDeclared: 2026, incidentType: "Flood", iaProgramDeclared: false },
      { disasterNumber: 4906, femaDeclarationString: "DR-4906-WA", declarationType: "DR", declarationTitle: "SEVERE STORMS, FLOODING", declarationDate: "2026-04-07T00:00:00.000Z", fyDeclared: 2026, incidentType: "Flood", iaProgramDeclared: true },
      { disasterNumber: 1641, femaDeclarationString: "DR-1641-WA", declarationType: "DR", declarationTitle: "EARTHQUAKE", declarationDate: "2006-02-14T00:00:00.000Z", fyDeclared: 2006, incidentType: "Earthquake", iaProgramDeclared: false },
      { disasterNumber: 3401, femaDeclarationString: "EM-3401-WA", declarationType: "EM", declarationTitle: "COVID-19 PANDEMIC", declarationDate: "2020-03-22T00:00:00.000Z", fyDeclared: 2020, incidentType: "Biological", iaProgramDeclared: true },
    ]
    const summary = summarizeDisasters(rows, { countyName: "King County", stateCode: "WA" })

    expect(summary.total).toBe(3)
    expect(summary.iaCount).toBe(2)
    expect(summary.firstYear).toBe(2006)
    expect(summary.lastYear).toBe(2026)
    expect(summary.topType).toBe("Flood")
    expect(summary.sourceMode).toBe("live")
    // recent is sorted newest-first; the deduped flood carries the IA flag.
    expect(summary.recent[0]).toMatchObject({
      declarationString: "DR-4906-WA",
      title: "Severe Storms, Flooding",
      individualAssistance: true,
    })
    // byYear is a continuous span so a sparkline never has gaps.
    expect(summary.byYear[0].year).toBe(2006)
    expect(summary.byYear.at(-1).year).toBe(2026)
    expect(summary.byYear.reduce((sum, point) => sum + point.count, 0)).toBe(3)
  })
})

describe("local 311 layer (Socrata)", () => {
  it("resolves a portal only for covered cities", () => {
    expect(getCivicPortal({ city: "Seattle", stateCode: "WA" })?.dataset).toBe("5ngg-rpne")
    expect(getCivicPortal({ city: "Chicago", stateCode: "IL" })?.dataset).toBe("v6vf-nfxy")
    expect(getCivicPortal({ city: "Smallville", stateCode: "KS" })).toBeNull()
  })

  it("normalizes 311 rows into counts, a daily series, and recent records", () => {
    const portal = CIVIC_DATA_PORTALS["chicago|il"]
    const rows = [
      { created_date: "2026-06-27T10:00:00.000", sr_type: "Pothole in Street", status: "Open", street_address: "100 N State St", owner_department: "Streets & Sanitation" },
      { created_date: "2026-06-26T09:00:00.000", sr_type: "Pothole in Street", status: "Completed", street_address: "200 W Madison St", owner_department: "Streets & Sanitation" },
      { created_date: "2026-06-25T08:00:00.000", sr_type: "Graffiti Removal", status: "Open", street_address: "300 S Clark St", owner_department: "Streets & Sanitation" },
    ]
    const summary = summarizeCivicSignals(rows, portal, "ZIP 60601")

    expect(summary.total).toBe(3)
    expect(summary.topType).toBe("Pothole in Street")
    expect(summary.byType[0]).toEqual({ label: "Pothole in Street", count: 2 })
    expect(summary.byDay.map((point) => point.day)).toEqual(["2026-06-25", "2026-06-26", "2026-06-27"])
    expect(summary.latest).toBe("2026-06-27T10:00:00.000")
    expect(summary.scope).toBe("ZIP 60601")
    expect(summary.recent[0]).toMatchObject({
      type: "Pothole in Street",
      status: "Open",
      address: "100 N State St",
      agency: "Streets & Sanitation",
    })
    expect(summary.sourceMode).toBe("live")
  })
})

describe("federal spending layer (USAspending)", () => {
  it("derives the latest COMPLETE federal fiscal year", () => {
    // FY N runs Oct 1 (N-1) – Sep 30 (N). Use the local Date constructor
    // (month is 0-indexed) so these are not shifted by UTC parsing.
    expect(latestCompleteFederalFY(new Date(2026, 5, 15))).toBe(2025)
    expect(latestCompleteFederalFY(new Date(2026, 8, 30))).toBe(2025)
    expect(latestCompleteFederalFY(new Date(2026, 9, 1))).toBe(2026)
    expect(latestCompleteFederalFY(new Date(2026, 11, 31))).toBe(2026)
  })

  it("summarizes the county total and drops the MULTIPLE RECIPIENTS bucket", () => {
    const geography = {
      results: [{ shape_code: "53033", display_name: "King County", aggregated_amount: 20691763838.58, per_capita: 9116.62 }],
    }
    const recipients = {
      results: [
        { name: "MULTIPLE RECIPIENTS", amount: 10298846559.52, recipient_id: null },
        { name: "THE BOEING COMPANY", amount: 4352078974.63, recipient_id: "abc-C" },
        { name: "UNIVERSITY OF WASHINGTON", amount: 767062330.07, recipient_id: "def-C" },
        { name: "ZERO DOLLAR CORP", amount: 0, recipient_id: "zzz-C" },
      ],
    }
    const summary = summarizeSpending(geography, recipients, {
      fy: 2025,
      county: { countyName: "King County", stateCode: "WA" },
    })

    expect(summary.total).toBeCloseTo(20691763838.58, 2)
    expect(summary.perCapita).toBeCloseTo(9116.62, 2)
    expect(summary.fy).toBe(2025)
    expect(summary.sourceMode).toBe("live")
    // MULTIPLE RECIPIENTS and the $0 row are excluded; names are title-cased.
    expect(summary.topRecipients).toEqual([
      { label: "The Boeing Company", amount: 4352078974.63, recipientId: "abc-C" },
      { label: "University Of Washington", amount: 767062330.07, recipientId: "def-C" },
    ])
    expect(summary.topRecipient).toBe("The Boeing Company")
  })
})
