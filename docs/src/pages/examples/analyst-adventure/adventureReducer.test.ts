import { describe, expect, it } from "vitest"
import { geoBounds } from "d3-geo"
import { fromConfig, type ChartConfig } from "semiotic/utils"
import type { AdventureAction, AnalystAdventureState, EndingId } from "./adventureTypes"
import { ENDING_IDS } from "./adventureTypes"
import { adventureActions, adventureReducer, createInitialAdventureState } from "./adventureReducer"
import {
  campusAreas,
  campusFlowFacts,
  campusPoints,
  deriveCampusFlowFacts,
} from "./data/campusFlows"
import { departmentFacts, deriveDepartmentFacts } from "./data/departmentRecords"
import { deriveExecutiveFacts, executiveFacts } from "./data/executiveTelemetry"
import {
  createForecastBodies,
  deriveForecastFacts,
  forecastBodies,
  forecastFacts,
  settleForecastBodies,
} from "./data/forecastPhysics"
import {
  derivePresentationLineageFacts,
  presentationLineageFacts,
} from "./data/presentationLineage"
import {
  ENDINGS,
  MAIN_EVIDENCE_IDS,
  getAvailableChoices,
  getAvailableDestinations,
  getRoom,
  roomRegistry,
} from "./roomRegistry"
import { ANALYST_ADVENTURE_SEED, acceptedAtForEvidence } from "./storySeed1984"

function play(
  actions: readonly AdventureAction[],
  initialState = createInitialAdventureState(),
): AnalystAdventureState {
  return actions.reduce(adventureReducer, initialState)
}

const start = adventureActions.start()
const solveExecutive = adventureActions.choose("executive-cache")
const solveRecords = adventureActions.choose("records-archaeology")
const solveMap = adventureActions.choose("map-origin")
const solveServer = adventureActions.choose("server-daemon-flow")

function arriveAtRecords() {
  return play([start, solveExecutive, adventureActions.navigate("records-catacombs")])
}

function arriveAtMap() {
  return play([start, solveExecutive, adventureActions.navigate("map-room")])
}

function arriveAtServerWithThreeArtifacts() {
  return play([
    start,
    solveExecutive,
    adventureActions.navigate("records-catacombs"),
    solveRecords,
    adventureActions.navigate("server-cathedral"),
  ])
}

function arriveAtBoardroomWithFourArtifacts() {
  return play([
    start,
    solveExecutive,
    adventureActions.navigate("records-catacombs"),
    solveRecords,
    adventureActions.navigate("map-room"),
    solveMap,
    adventureActions.navigate("server-cathedral"),
    solveServer,
    adventureActions.navigate("boardroom"),
  ])
}

function arriveAtVault() {
  return play([
    start,
    solveExecutive,
    adventureActions.navigate("map-room"),
    adventureActions.activateAnnotation("map-service-tunnel"),
    solveMap,
    adventureActions.navigate("server-cathedral"),
    adventureActions.activateAnnotation("server-presentation-daemon"),
  ])
}

describe("seed 1984 analytical fixtures", () => {
  it("computes the executive answer from event and observation timestamps", () => {
    const facts = deriveExecutiveFacts()
    expect(facts.exactLagMinutes).toBe(8)
    expect(facts.allPreDisappearanceBadgeRowsMatchElevator).toBe(true)
    expect(facts.cachedRoofObservedAt.toISOString()).toBe("1984-06-04T09:06:00.000Z")
    expect(facts.cachedRoofPing.timestamp.toISOString()).toBe("1984-06-04T09:14:00.000Z")
    expect(facts.lastTrustworthyFloorLabel).toBe("B2")
    expect(facts.slideEditsAfterTrustworthyActivity.length).toBeGreaterThan(0)
    expect(getRoom("executive-suite").choices[1].label).toContain(facts.lastTrustworthyFloorLabel)
  })

  it("computes the denominator-aware answer from the canonical records", () => {
    const facts = deriveDepartmentFacts()
    expect(facts.rawCountLeader.department).toBe("Sales")
    expect(facts.strongestRate.department).toBe("Corporate Archaeology")
    expect(facts.strongestRate.cancellationsPerEmployee).toBe(
      facts.strongestRate.cancellations / facts.strongestRate.headcount,
    )
    expect(facts.allStrongestRateCancellationsConcernB2).toBe(true)
    expect(getRoom("records-catacombs").choices[1].label).toContain(
      `${facts.strongestRate.cancellations} cancellations across ${facts.strongestRate.headcount} employees`,
    )
  })

  it("computes the packet origin by tracing the routed flow backward", () => {
    const facts = deriveCampusFlowFacts()
    expect(facts.route.map((flow) => [flow.source, flow.target])).toEqual([
      ["b2-maintenance-relay", "hq-router"],
      ["hq-router", "offsite-continuity-bunker"],
      ["offsite-continuity-bunker", "badge-display-service"],
    ])
    expect(facts.origin.name).toBe("B2 Maintenance Relay")
    expect(facts.displayedEndpoint.name).toBe("Offsite Continuity Bunker")
    expect(campusFlowFacts.origin.id).toBe(facts.origin.id)
  })

  it("keeps the synthetic campus locally bounded for projection fitting", () => {
    const campusCollection: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        ...campusAreas,
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "MultiPoint",
            coordinates: campusPoints.map((point) => point.coordinates),
          },
        },
      ],
    }

    expect(geoBounds(campusCollection)).toEqual([
      [16, 17],
      [94, 72],
    ])
  })

  it("computes the daemon's conservation break from network edges", () => {
    const facts = derivePresentationLineageFacts()
    expect(facts.legitimateSourceUnits).toBe(35 + 42 + 23)
    expect(facts.legitimateProjectorUnits).toBe(100)
    expect(facts.projectorUnits).toBe(110)
    expect(facts.unsupportedProjectorUnits).toBe(10)
    expect(facts.daemonInjection.source).toBe("PresentationDaemon")
    expect(facts.daemonTouchesB2).toBe(true)
    expect(facts.hasBackedge).toBe(true)
  })

  it("produces the same bodies and settled physics result for seed 1984", () => {
    const firstBodies = createForecastBodies(ANALYST_ADVENTURE_SEED)
    const secondBodies = createForecastBodies(ANALYST_ADVENTURE_SEED)
    expect(firstBodies).toEqual(secondBodies)
    expect(firstBodies).toEqual(forecastBodies)
    expect(settleForecastBodies(firstBodies)).toEqual(settleForecastBodies(secondBodies))
    const facts = deriveForecastFacts(firstBodies)
    expect(facts.forecastCount).toBe(30)
    expect(facts.ceoBody).toMatchObject({
      id: "mort-zork",
      kind: "ceo",
      denominatorPresent: true,
      freshEvidence: true,
      lineageComplete: false,
      resultBin: "MANUAL LINEAGE OVERRIDE",
    })
    expect(Object.values(facts.settledCounts).reduce((sum, count) => sum + count, 0)).toBe(30)
    expect(forecastFacts.settledCounts).toEqual(facts.settledCounts)
  })

  it("uses the computed fixture facts in the canonical evidence claims", () => {
    const state = arriveAtBoardroomWithFourArtifacts()
    const claims = Object.fromEntries(
      state.evidence.map((artifact) => [artifact.id, artifact.claim]),
    )
    expect(claims["temporal-lag"]).toContain(executiveFacts.lastTrustworthyFloorLabel)
    expect(claims["denominator-key"]).toContain(
      departmentFacts.strongestRate.cancellationsPerEmployee.toFixed(2),
    )
    expect(claims["origin-vector"]).toContain(campusFlowFacts.origin.name)
    expect(claims["lineage-break"]).toContain(
      `${presentationLineageFacts.unsupportedProjectorUnits} unsupported`,
    )
  })

  it("round-trips every ordinary evidence view through Semiotic serialization", () => {
    const first = arriveAtBoardroomWithFourArtifacts()
    const replay = arriveAtBoardroomWithFourArtifacts()
    const expectedComponents = ["LineChart", "BarChart", "FlowMap", "SankeyDiagram"]

    expect(first.evidence).toEqual(replay.evidence)
    first.evidence.forEach((artifact, index) => {
      const config = artifact.chartConfig as ChartConfig
      expect(config).toMatchObject({
        component: expectedComponents[index],
        version: "1",
        createdAt: acceptedAtForEvidence(artifact.id),
      })
      const restored = fromConfig(config)
      expect(restored.componentName).toBe(expectedComponents[index])
      expect(restored.props.data ?? restored.props.nodes ?? restored.props.edges).toBeTruthy()
      expect(restored.props.annotations).toHaveLength(1 + (index === 0 ? 1 : 0))
    })
  })
})

describe("adventure reducer", () => {
  it("starts at the title state and records deterministic full snapshots", () => {
    const initial = createInitialAdventureState()
    expect(initial).toMatchObject({
      seed: 1984,
      currentRoomId: "executive-suite",
      credibility: 100,
      flags: { storyStarted: false },
    })
    const started = adventureReducer(initial, start)
    expect(started.flags.storyStarted).toBe(true)
    expect(started.path).toHaveLength(1)
    expect(started.path[0]).toMatchObject({
      id: "event-0001",
      occurredAt: "1984-06-04T09:12:30.000Z",
      before: { flags: { storyStarted: false } },
      after: { flags: { storyStarted: true } },
    })
  })

  it("permits Records and Map in either order and opens Server after either", () => {
    const executiveSolved = play([start, solveExecutive])
    expect(getAvailableDestinations(executiveSolved)).toEqual(["records-catacombs", "map-room"])

    const recordsFirst = play(
      [adventureActions.navigate("records-catacombs"), solveRecords],
      executiveSolved,
    )
    expect(getAvailableDestinations(recordsFirst)).toEqual([
      "executive-suite",
      "map-room",
      "server-cathedral",
    ])

    const mapFirst = play([adventureActions.navigate("map-room"), solveMap], executiveSolved)
    expect(getAvailableDestinations(mapFirst)).toEqual([
      "executive-suite",
      "records-catacombs",
      "server-cathedral",
    ])
  })

  it("replaces solved-room choices with authored debriefs and rejects stale choices", () => {
    for (const roomId of [
      "executive-suite",
      "records-catacombs",
      "map-room",
      "server-cathedral",
    ] as const) {
      expect(getRoom(roomId).successDebrief?.title).toBeTruthy()
      expect(getRoom(roomId).successDebrief?.explanation).toBeTruthy()
    }
    expect(getRoom("forecast-vault").successDebrief).toBeUndefined()
    expect(getRoom("boardroom").successDebrief).toBeUndefined()

    const solved = play([start, solveExecutive])
    expect(getAvailableChoices(solved)).toEqual([])
    expect(adventureReducer(solved, adventureActions.choose("executive-roof"))).toBe(solved)

    const detoured = play([
      start,
      adventureActions.choose("executive-outsourced-time"),
    ])
    expect(getAvailableChoices(detoured)).toHaveLength(4)
  })

  it("shows the Server debrief before opening a guarded route to the Boardroom", () => {
    const serverSolved = play([solveServer], arriveAtServerWithThreeArtifacts())
    expect(serverSolved.currentRoomId).toBe("server-cathedral")
    expect(getAvailableChoices(serverSolved)).toEqual([])
    expect(getAvailableDestinations(serverSolved)).toContain("boardroom")

    const boardroom = adventureReducer(serverSolved, adventureActions.navigate("boardroom"))
    expect(boardroom.currentRoomId).toBe("boardroom")
    expect(getAvailableChoices(boardroom)).toHaveLength(4)
  })

  it("lets the player leave an incomplete boardroom and reopen evidence rooms", () => {
    const incompleteBoardroom = play(
      [solveServer, adventureActions.navigate("boardroom")],
      arriveAtServerWithThreeArtifacts(),
    )
    expect(incompleteBoardroom.currentRoomId).toBe("boardroom")
    expect(getAvailableDestinations(incompleteBoardroom)).toEqual([
      "executive-suite",
      "records-catacombs",
      "map-room",
      "server-cathedral",
    ])

    const returned = adventureReducer(incompleteBoardroom, adventureActions.navigate("map-room"))
    expect(returned.currentRoomId).toBe("map-room")
  })

  it("reaches the best boardroom ending only with all four main artifacts", () => {
    const complete = arriveAtBoardroomWithFourArtifacts()
    expect(complete.currentRoomId).toBe("boardroom")
    expect(complete.evidence.map((artifact) => artifact.id)).toEqual(MAIN_EVIDENCE_IDS)
    const best = adventureReducer(complete, adventureActions.choose("boardroom-corrected"))
    expect(best.endingId).toBe("big-presentation-denominators")

    const incomplete = play(
      [solveServer, adventureActions.navigate("boardroom")],
      arriveAtServerWithThreeArtifacts(),
    )
    expect(incomplete.evidence).toHaveLength(3)
    const guarded = adventureReducer(incomplete, adventureActions.choose("boardroom-corrected"))
    expect(guarded.endingId).toBe("analyst-who-said-no")
    expect(guarded.endingId).not.toBe("big-presentation-denominators")
  })

  it("gives artifacts deterministic provenance and records whether a hint preceded them", () => {
    const hinted = play([start, adventureActions.useHint("executive-suite"), solveExecutive])
    expect(hinted.hintsUsed).toBe(1)
    expect(hinted.evidence[0]).toMatchObject({
      id: "temporal-lag",
      reachedAfterHint: true,
      provenance: {
        roomId: "executive-suite",
        source: "player",
        acceptedAt: acceptedAtForEvidence("temporal-lag"),
      },
    })

    const replay = play([start, adventureActions.useHint("executive-suite"), solveExecutive])
    expect(replay.evidence).toEqual(hinted.evidence)
  })

  it("rejects ordinary navigation to the Forecast Vault", () => {
    const atMap = arriveAtMap()
    const illegalAction = {
      type: "NAVIGATE",
      roomId: "forecast-vault",
    } as unknown as AdventureAction
    expect(adventureReducer(atMap, illegalAction)).toBe(atMap)
    expect(getAvailableDestinations(atMap)).not.toContain("forecast-vault")
  })

  it("unlocks the vault only through the tunnel map plus daemon annotation", () => {
    const noTunnel = play(
      [adventureActions.activateAnnotation("server-presentation-daemon")],
      arriveAtServerWithThreeArtifacts(),
    )
    expect(noTunnel.currentRoomId).toBe("server-cathedral")
    expect(noTunnel.flags).toMatchObject({
      daemonAnnotated: true,
      daemonNeedsTunnel: true,
    })
    expect(noTunnel.flags.vaultUnlocked).not.toBe(true)

    const foundMap = play(
      [
        adventureActions.navigate("map-room"),
        adventureActions.activateAnnotation("map-service-tunnel"),
        solveMap,
        adventureActions.navigate("server-cathedral"),
        adventureActions.activateAnnotation("server-presentation-daemon"),
      ],
      noTunnel,
    )
    expect(foundMap.currentRoomId).toBe("forecast-vault")
    expect(foundMap.flags).toMatchObject({
      hasTunnelMap: true,
      daemonAnnotated: true,
      vaultUnlocked: true,
    })
    expect(foundMap.secretFragments.slice(-3)).toEqual(["Z", "Z", "Y"])
  })

  it("discovers the Annotation Cabal without ending the investigation", () => {
    const annotationCabal = play([
      start,
      adventureActions.activateAnnotation("executive-cached-roof"),
      solveExecutive,
      adventureActions.navigate("records-catacombs"),
      adventureActions.activateAnnotation("records-archivist-2"),
      solveRecords,
      adventureActions.navigate("map-room"),
      adventureActions.activateAnnotation("map-service-tunnel"),
      solveMap,
      adventureActions.navigate("server-cathedral"),
      adventureActions.activateAnnotation("server-presentation-daemon"),
    ])

    expect(ENDING_IDS).not.toContain("annotation-cabal")
    expect(annotationCabal.secretFragments.join("")).toBe("XYZZY")
    expect(annotationCabal.flags).toMatchObject({
      annotationCabalFound: true,
      vaultUnlocked: true,
    })
    expect(annotationCabal.currentRoomId).toBe("forecast-vault")
    expect(annotationCabal.endingId).toBeUndefined()
    expect(getAvailableChoices(annotationCabal).map((choice) => choice.id)).toEqual([
      "vault-release-mort",
      "vault-read-projection",
      "vault-gravity",
      "vault-janitor",
    ])
  })

  it("rewinds a room transition with evidence, flags, and secret state intact", () => {
    const vault = arriveAtVault()
    expect(vault.currentRoomId).toBe("forecast-vault")
    expect(vault.flags.vaultUnlocked).toBe(true)
    expect(vault.activatedAnnotationIds).toContain("server-presentation-daemon")

    const rewound = adventureReducer(vault, adventureActions.rewind())
    expect(rewound.currentRoomId).toBe("server-cathedral")
    expect(rewound.flags.hasTunnelMap).toBe(true)
    expect(rewound.flags.vaultUnlocked).not.toBe(true)
    expect(rewound.activatedAnnotationIds).toEqual(["map-service-tunnel"])
    expect(rewound.secretFragments).toEqual(["Z"])
    expect(rewound.evidence.map((artifact) => artifact.id)).toEqual([
      "temporal-lag",
      "origin-vector",
    ])
    expect(rewound.path.at(-1)?.type).toBe("rewind")

    const previousRoom = adventureReducer(rewound, adventureActions.rewind())
    expect(previousRoom.currentRoomId).toBe("map-room")
    expect(previousRoom.flags.hasTunnelMap).toBe(true)
    expect(previousRoom.evidence.map((artifact) => artifact.id)).toEqual([
      "temporal-lag",
      "origin-vector",
    ])
  })

  it("exposes the deterministic settled projection without waiting for motion", () => {
    const vault = arriveAtVault()
    const projected = adventureReducer(vault, adventureActions.showSettledProjection())
    expect(projected.flags.settledProjectionRead).toBe(true)
    expect(projected.evidence.at(-1)).toMatchObject({
      id: "settled-projection",
      frame: "StreamPhysicsFrame",
    })
    expect(adventureReducer(projected, adventureActions.showSettledProjection())).toBe(projected)
  })

  it("keeps the settled-projection choice one-shot for keyboard and programmatic actions", () => {
    const vault = arriveAtVault()
    const projected = adventureReducer(vault, adventureActions.choose("vault-read-projection"))

    expect(projected.flags.settledProjectionRead).toBe(true)
    expect(
      projected.evidence.filter((artifact) => artifact.id === "settled-projection"),
    ).toHaveLength(1)
    expect(adventureReducer(projected, adventureActions.choose("vault-read-projection"))).toBe(
      projected,
    )
  })

  it("records keyboard and navigation-tree investigation without duplicates", () => {
    const started = play([start])
    const inspected = play(
      [
        adventureActions.inspectDatum("badge-roof-0914", "keyboard"),
        adventureActions.inspectDatum("corporate-archaeology", "navigation-tree"),
        adventureActions.inspectDatum("badge-roof-0914", "pointer"),
      ],
      started,
    )
    expect(inspected.inspectedDatumIds).toEqual(["badge-roof-0914", "corporate-archaeology"])
    expect(inspected.flags["inspected-with:keyboard"]).toBe(true)
    expect(inspected.flags["inspected-with:navigation-tree"]).toBe(true)
  })
})

describe("ending reachability", () => {
  function endingFrom(
    initial: AnalystAdventureState,
    ...actions: AdventureAction[]
  ): EndingId | undefined {
    return play(actions, initial).endingId
  }

  it("registers every named ending exactly once", () => {
    expect(Object.keys(ENDINGS).sort()).toEqual([...ENDING_IDS].sort())
    expect(new Set(Object.values(ENDINGS).map((ending) => ending.title)).size).toBe(
      ENDING_IDS.length,
    )
  })

  it("makes every named good, secret, and bad ending reachable", () => {
    const reached = new Set<EndingId>()
    const record = (endingId: EndingId | undefined) => {
      expect(endingId).toBeDefined()
      reached.add(endingId as EndingId)
    }

    const initial = play([start])
    record(endingFrom(initial, adventureActions.choose("executive-roof")))
    record(endingFrom(initial, adventureActions.choose("executive-average")))

    const records = arriveAtRecords()
    record(endingFrom(records, adventureActions.choose("records-sales")))
    record(endingFrom(records, adventureActions.choose("records-delete-headcount")))

    const map = arriveAtMap()
    record(endingFrom(map, adventureActions.choose("map-bunker")))
    record(endingFrom(map, adventureActions.choose("map-cartogram")))

    const server = arriveAtServerWithThreeArtifacts()
    record(endingFrom(server, adventureActions.choose("server-centrality")))
    record(endingFrom(server, adventureActions.choose("server-unplug")))
    record(endingFrom(server, adventureActions.choose("server-tree")))

    const boardroomThree = play([solveServer, adventureActions.navigate("boardroom")], server)
    record(endingFrom(boardroomThree, adventureActions.choose("boardroom-corrected")))
    record(endingFrom(boardroomThree, adventureActions.choose("boardroom-original")))
    record(endingFrom(boardroomThree, adventureActions.choose("boardroom-cfo")))

    const boardroomFour = arriveAtBoardroomWithFourArtifacts()
    record(endingFrom(boardroomFour, adventureActions.choose("boardroom-corrected")))

    const vault = arriveAtVault()
    record(endingFrom(vault, adventureActions.choose("vault-release-mort")))
    record(endingFrom(vault, adventureActions.choose("vault-gravity")))
    record(endingFrom(vault, adventureActions.activateAnnotation("vault-janitor")))

    expect([...reached].sort()).toEqual([...ENDING_IDS].sort())
  })

  it("keeps every room declarative and within the two-to-four choice budget", () => {
    for (const room of Object.values(roomRegistry)) {
      expect(room.choices.length).toBeGreaterThanOrEqual(2)
      expect(room.choices.length).toBeLessThanOrEqual(4)
      expect(room.hintScript.length).toBeGreaterThan(0)
    }
  })
})
