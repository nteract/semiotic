import {
  ENDING_IDS,
  type AdventureChoice,
  type AdventureEnding,
  type AdventureRoom,
  type AnalystAdventureState,
  type EndingId,
  type EvidenceArtifactTemplate,
  type RoomId,
} from "./adventureTypes"
import { toConfig } from "semiotic/utils"
import {
  badgePacketFlows,
  campusFlowFacts,
  campusPoints,
} from "./data/campusFlows"
import { departmentFacts, departmentRecords } from "./data/departmentRecords"
import { executiveFacts, executiveTelemetry } from "./data/executiveTelemetry"
import { forecastFacts } from "./data/forecastPhysics"
import {
  presentationFlows,
  presentationLineageFacts,
  presentationNodes,
} from "./data/presentationLineage"
import { acceptedAtForEvidence } from "./storySeed1984"

export const MAIN_EVIDENCE_IDS = [
  "temporal-lag",
  "denominator-key",
  "origin-vector",
  "lineage-break",
] as const

export type MainEvidenceId = (typeof MAIN_EVIDENCE_IDS)[number]

function portableEvidenceConfig(
  evidenceId: string,
  component: string,
  props: Record<string, unknown>,
) {
  return {
    ...toConfig(component, props, { includeData: true }),
    // toConfig records creation time for normal application exports. The
    // adventure replaces it with its checked-in 1984 case clock so replays and
    // reducer snapshots remain byte-for-byte deterministic.
    createdAt: acceptedAtForEvidence(evidenceId),
  }
}

const executiveEvidenceRows = executiveTelemetry.filter(
  (row) =>
    row.timestamp >= new Date("1984-06-04T09:04:00.000Z") &&
    row.timestamp <= new Date("1984-06-04T09:14:00.000Z"),
)

const executiveEvidenceConfig = portableEvidenceConfig("temporal-lag", "LineChart", {
  data: executiveEvidenceRows,
  xAccessor: "timestamp",
  yAccessor: "floor",
  xScaleType: "time",
  lineBy: "source",
  colorBy: "source",
  colorScheme: ["#ff4fd8", "#55f6ff"],
  showPoints: true,
  showGrid: true,
  title: "Eight-Minute Replay",
  description:
    "Badge and elevator observations from 9:04 through 9:14, preserving displayed time, observed time, and cache age.",
  summary: "The 9:14 roof point was observed at 9:06; B2 is the last contemporaneous position.",
  accessibleTable: true,
  annotations: [
    {
      id: "executive-disappearance-window",
      type: "x-band",
      x0: new Date("1984-06-04T09:12:00.000Z"),
      x1: new Date("1984-06-04T09:14:00.000Z"),
      label: "Disappearance window",
    },
    {
      ...executiveFacts.cachedRoofPing,
      id: "executive-cached-roof",
      stableId: "executive-cached-roof",
      type: "callout",
      label: "Cached roof observation",
      dx: -24,
      dy: 22,
    },
  ],
})

const recordsEvidenceConfig = portableEvidenceConfig("denominator-key", "BarChart", {
  data: departmentRecords,
  categoryAccessor: "department",
  valueAccessor: "cancellationsPerEmployee",
  orientation: "horizontal",
  valueLabel: "Cancellations per employee",
  colorBy: "department",
  colorScheme: ["#55f6ff", "#55f6ff", "#ffd166", "#ff4fd8"],
  showGrid: true,
  title: "Denominator Key",
  description:
    "The same four department rows restored in rate mode with headcount preserved as the denominator.",
  summary: "Corporate Archaeology has six cancellations across two employees, or 3.0 per employee.",
  accessibleTable: true,
  annotations: [
    {
      ...departmentFacts.strongestRate,
      id: "records-archivist-2",
      stableId: "records-archivist-2",
      type: "callout",
      label: "Strongest exposure-adjusted rate",
      dx: -28,
      dy: -14,
    },
  ],
})

const campusEvidenceNodes = campusPoints.map((point) => ({
  ...point,
  lon: point.coordinates[0],
  lat: point.coordinates[1],
}))

const mapEvidenceConfig = portableEvidenceConfig("origin-vector", "FlowMap", {
  nodes: campusEvidenceNodes,
  flows: badgePacketFlows.filter((flow) => campusFlowFacts.route.some((route) => route.id === flow.id)),
  nodeIdAccessor: "id",
  xAccessor: "lon",
  yAccessor: "lat",
  valueAccessor: "packets",
  projection: "equirectangular",
  lineType: "line",
  flowStyle: "arc",
  fitPadding: 0.12,
  showParticles: false,
  title: "Origin Vector",
  description:
    "The credential route restored from B2 Maintenance Relay through the bunker to Badge Display Service.",
  summary: "B2 is the first source in the directed route; the bunker is an intermediate endpoint.",
  accessibleTable: true,
  annotations: [
    {
      ...campusFlowFacts.origin,
      lon: campusFlowFacts.origin.coordinates[0],
      lat: campusFlowFacts.origin.coordinates[1],
      id: "map-origin-b2",
      stableId: "map-origin-b2",
      type: "callout",
      label: "Packet origin",
      dx: 24,
      dy: -18,
    },
  ],
})

const networkEvidenceConfig = portableEvidenceConfig("lineage-break", "SankeyDiagram", {
  nodes: presentationNodes,
  edges: presentationFlows,
  nodeIdAccessor: "id",
  sourceAccessor: "source",
  targetAccessor: "target",
  valueAccessor: "confidenceUnits",
  orientation: "horizontal",
  nodeAlign: "justify",
  showLabels: false,
  edgeOpacity: 0.62,
  title: "Lineage Break",
  description:
    "The presentation lineage restored with the ten unsupported confidence units entering BoardroomProjector from PresentationDaemon.",
  summary: "Legitimate sources produce 100 units; the projector receives 110.",
  accessibleTable: true,
  annotations: [
    {
      id: "server-presentation-daemon",
      stableId: "server-presentation-daemon",
      nodeId: "PresentationDaemon",
      type: "callout",
      label: "Unsupported ten-unit injection",
      dx: -22,
      dy: 18,
    },
  ],
})

export const EVIDENCE_TEMPLATES: Readonly<Record<string, EvidenceArtifactTemplate>> = {
  "temporal-lag": {
    id: "temporal-lag",
    label: "Eight-Minute Replay",
    claim: `The roof ping is stale; ${executiveFacts.lastTrustworthyFloorLabel} is the last contemporaneous location.`,
    scope: "9:04–9:14",
    frame: "StreamXYFrame",
    roomId: "executive-suite",
    chartConfig: executiveEvidenceConfig,
  },
  "denominator-key": {
    id: "denominator-key",
    label: "Denominator Key",
    claim: `${departmentFacts.strongestRate.department} records ${departmentFacts.strongestRate.cancellationsPerEmployee.toFixed(2)} cancellations per employee; all ${departmentFacts.strongestRate.cancellations} concern B2 maintenance access.`,
    scope: "Project ORACLE meeting cancellations",
    denominator: "Department headcount",
    frame: "StreamOrdinalFrame",
    roomId: "records-catacombs",
    chartConfig: recordsEvidenceConfig,
  },
  "origin-vector": {
    id: "origin-vector",
    label: "Origin Vector",
    claim: `Credential packets originate at ${campusFlowFacts.origin.name}; ${campusFlowFacts.displayedEndpoint.name} is only a routed endpoint.`,
    scope: "Credential route from B2 to Badge Display Service",
    frame: "StreamGeoFrame",
    roomId: "map-room",
    chartConfig: mapEvidenceConfig,
  },
  "lineage-break": {
    id: "lineage-break",
    label: "Lineage Break",
    claim: `BoardroomProjector receives ${presentationLineageFacts.unsupportedProjectorUnits} unsupported confidence units from PresentationDaemon, which is connected to B2.`,
    scope: "Project ORACLE presentation lineage",
    frame: "StreamNetworkFrame",
    roomId: "server-cathedral",
    chartConfig: networkEvidenceConfig,
  },
  "settled-projection": {
    id: "settled-projection",
    label: "Settled Projection",
    claim: `${forecastFacts.settledCounts.DEFENSIBLE} scenarios settle as defensible, ${forecastFacts.settledCounts["NEEDS CAVEAT"]} need a caveat, and ${forecastFacts.settledCounts["PURE EXECUTIVE WEATHER"]} are pure executive weather.`,
    scope: "Thirty Project ORACLE scenario bodies after all three gates",
    denominator: "30 forecast scenarios",
    frame: "StreamPhysicsFrame",
    roomId: "forecast-vault",
    chartConfig: {
      frameFamily: "physics",
      seed: 1984,
      paused: true,
      projection: "settled",
    },
  },
}

const always = (effect: AdventureChoice["outcomes"][number]["effect"]) => [{ effect }]

export const roomRegistry: Readonly<Record<RoomId, AdventureRoom>> = {
  "executive-suite": {
    id: "executive-suite",
    title: "The Calendar That Lies",
    subtitle: "Executive Suite · StreamXYFrame",
    frameFamily: "xy",
    narrative: [
      "The CEO's office is empty. His badge claims he traveled from the lobby to the roof.",
      "The elevator telemetry disagrees, while his account keeps polishing The Big Presentation.",
    ],
    prompt: "What does the roof ping actually establish?",
    successDebrief: {
      title: "Cache busted. Helicopter drama cancelled.",
      explanation:
        "The roof ping was fresh in the feed but eight minutes stale in the world. Comparing event time with observed time makes B2 the last trustworthy location—and keeps you out of a fiberglass helicopter.",
    },
    evidenceId: "temporal-lag",
    choices: [
      {
        id: "executive-roof",
        label: "The CEO fled to the roof. Pursue him immediately.",
        kind: "incorrect",
        outcomes: always({ endingId: "helicopter-of-synergy" }),
      },
      {
        id: "executive-cache",
        label: `The badge feed is replaying cached positions. ${executiveFacts.lastTrustworthyFloorLabel} is the last trustworthy location.`,
        kind: "correct",
        outcomes: always({
          completeRoom: true,
          evidenceIds: ["temporal-lag"],
          setFlags: { trustworthyTimeScopeFound: true },
        }),
      },
      {
        id: "executive-average",
        label: "Average the two lines and search floor four.",
        kind: "incorrect",
        outcomes: always({ endingId: "mean-floor" }),
      },
      {
        id: "executive-outsourced-time",
        label: "Conclude that time itself has been outsourced.",
        kind: "detour",
        outcomes: always({
          credibilityDelta: -8,
          setFlags: { timeOutsourced: true },
        }),
      },
    ],
    secretAnnotations: [
      {
        id: "executive-cached-roof",
        label: "M.ZORK (offline) left a comment",
        accessibleLabel: "Open Mort Zork's comment on the cached roof observation",
        anchorId: executiveFacts.cachedRoofPing.id,
        messages: ["M.ZORK: A timestamp is not necessarily the time something happened."],
        fragment: "X",
      },
    ],
    hintScript: [
      {
        id: "hint-executive-cache",
        prompt: "What should I compare?",
        response:
          "Compare event time with observed time. A point can arrive now while describing something older.",
        annotationId: "executive-cached-roof",
      },
    ],
  },
  "records-catacombs": {
    id: "records-catacombs",
    title: "The Department of Absolutely Normal Compensation",
    subtitle: "Records Catacombs · StreamOrdinalFrame",
    frameFamily: "ordinal",
    narrative: [
      "Sales dominates the cancellation ledger, just as a department of eighty tends to dominate a count.",
      "A COUNT/RATE switch blinks beside a nearly forgotten department.",
    ],
    prompt: "Which department's calendar is genuinely anomalous once exposure is considered?",
    successDebrief: {
      title: "Denominator found. Mass firing postponed.",
      explanation:
        "Sales wins the raw-count pageant by having eighty employees. Corporate Archaeology's six cancellations across two people is the strongest per-employee rate, and every one points toward B2.",
    },
    evidenceId: "denominator-key",
    choices: [
      {
        id: "records-sales",
        label: "Sales. It has the most cancellations.",
        kind: "incorrect",
        outcomes: always({ endingId: "great-sales-extinction" }),
      },
      {
        id: "records-archaeology",
        label: `${departmentFacts.strongestRate.department}. ${departmentFacts.strongestRate.cancellations} cancellations across ${departmentFacts.strongestRate.headcount} employees is the strongest rate, and all ${departmentFacts.strongestRate.cancellations} concern B2.`,
        kind: "correct",
        outcomes: always({
          completeRoom: true,
          evidenceIds: ["denominator-key"],
          setFlags: { denominatorConsidered: true },
        }),
      },
      {
        id: "records-rituals",
        label: "Executive Rituals, because executives are inherently suspicious.",
        kind: "detour",
        outcomes: always({
          credibilityDelta: -6,
          setFlags: { executivesInherentlySuspicious: true },
        }),
      },
      {
        id: "records-delete-headcount",
        label: "Delete the headcount column to simplify the analysis.",
        kind: "incorrect",
        outcomes: always({ endingId: "clean-data-incident" }),
      },
    ],
    secretAnnotations: [
      {
        id: "records-archivist-2",
        label: "ARCHIVIST-2 left a note",
        accessibleLabel: "Open Archivist-2's note on Corporate Archaeology",
        anchorId: departmentFacts.strongestRate.id,
        messages: ["ARCHIVIST-2: There are only two of us. Mort was the other one."],
        activatedMessages: ["Ask the map what origin means."],
        fragment: "Y",
      },
    ],
    hintScript: [
      {
        id: "hint-records-denominator",
        prompt: "What denominator matters?",
        response:
          "A large department has more chances to cancel meetings. Compare each count with the number of people exposed.",
      },
    ],
  },
  "map-room": {
    id: "map-room",
    title: "The Commute of No Return",
    subtitle: "Corporate Map Room · StreamGeoFrame",
    frameFamily: "geo",
    narrative: [
      "The badge display places Mort at an offsite continuity bunker.",
      "Packet arrows tell a more directional story than the location label.",
    ],
    prompt: "Where should you investigate next?",
    successDebrief: {
      title: "Arrows followed. Bunker tenure declined.",
      explanation:
        "The badge display names the route's endpoint, not its source. Reading the directed packet flow backward lands at the B2 relay—the packet origin, where the mystery actually starts.",
    },
    evidenceId: "origin-vector",
    choices: [
      {
        id: "map-bunker",
        label: "The offsite bunker, because that is where the badge appears.",
        kind: "incorrect",
        outcomes: always({ endingId: "offsite-forever" }),
      },
      {
        id: "map-origin",
        label: `The B2 relay, because it is the source of the credential packets.`,
        kind: "correct",
        outcomes: always({
          completeRoom: true,
          evidenceIds: ["origin-vector"],
          setFlags: { packetOriginTraced: true },
        }),
      },
      {
        id: "map-cafeteria",
        label: "The cafeteria, because all organizational mysteries begin near coffee.",
        kind: "detour",
        outcomes: always({
          credibilityDelta: -4,
          setFlags: { checkedCafeteria: true },
        }),
      },
      {
        id: "map-cartogram",
        label: "Everywhere simultaneously, using a distance cartogram as transportation.",
        kind: "incorrect",
        outcomes: always({ endingId: "mercator-event" }),
      },
    ],
    secretAnnotations: [
      {
        id: "map-service-tunnel",
        label: "Unlabeled maintenance marker",
        accessibleLabel: "Activate the unlabeled maintenance marker",
        anchorId: campusFlowFacts.serviceTunnel.id,
        messages: ["FACILITIES_BOT: This tunnel does not exist. Therefore, it cannot be locked."],
        fragment: "Z",
        flag: "hasTunnelMap",
      },
    ],
    hintScript: [
      {
        id: "hint-map-origin",
        prompt: "What could be misleading?",
        response:
          "A service can display the last named relay as a location. Follow the arrowheads backward through the route.",
      },
    ],
  },
  "server-cathedral": {
    id: "server-cathedral",
    title: "The Org Chart That Dreamed It Was a Sankey",
    subtitle: "Server Cathedral · StreamNetworkFrame",
    frameFamily: "network",
    narrative: [
      "The presentation system has assembled its own analytical lineage.",
      "The projector receives more confidence than the legitimate sources produced.",
    ],
    prompt: "What is the decisive break in the presentation's lineage?",
    successDebrief: {
      title: "Confidence audited. Office printer released.",
      explanation:
        "The legitimate sources contribute 100 confidence units, but the projector emits 110. Those extra ten arrive from PresentationDaemon, so the break is lineage—not whoever has the most connections.",
    },
    evidenceId: "lineage-break",
    choices: [
      {
        id: "server-centrality",
        label: "The executive assistant has the highest degree. Accuse them.",
        kind: "incorrect",
        outcomes: always({ endingId: "centrality-justice" }),
      },
      {
        id: "server-daemon-flow",
        label: `The projector receives ${presentationLineageFacts.unsupportedProjectorUnits} unsupported confidence units from PresentationDaemon, which is connected to B2.`,
        kind: "correct",
        outcomes: always({
          completeRoom: true,
          evidenceIds: ["lineage-break"],
          setFlags: { phantomFlowFound: true },
        }),
      },
      {
        id: "server-unplug",
        label: "Unplug DeckStore. No lineage, no problem.",
        kind: "incorrect",
        outcomes: always({ endingId: "powerpoint-apocalypse" }),
      },
      {
        id: "server-tree",
        label: "Convert the graph into a tree and discard the cycle.",
        kind: "incorrect",
        outcomes: always({ endingId: "hierarchy-restoration-program" }),
      },
    ],
    secretAnnotations: [
      {
        id: "server-presentation-daemon",
        label: "PresentationDaemon comment channel",
        accessibleLabel: "Open the PresentationDaemon annotation",
        anchorId: "PresentationDaemon",
        messages: ["PRESENTATION_DAEMON: I have improved the evidence until it agrees."],
        activatedMessages: ["M.ZORK: Service elevator. Say XYZZY."],
      },
    ],
    hintScript: [
      {
        id: "hint-server-conservation",
        prompt: "Describe the strongest anomaly.",
        response:
          "Treat confidence like a conserved quantity. Compare what the legitimate lineage produces with what the projector receives.",
      },
    ],
  },
  "forecast-vault": {
    id: "forecast-vault",
    title: "The Room Where Forecasts Fall Down",
    subtitle: "Hidden Forecast Vault · StreamPhysicsFrame",
    frameFamily: "physics",
    narrative: [
      "Thirty forecasts fall through Denominator, Freshness, and Lineage gates.",
      "Mort Zork is trapped at the manual-lineage override sensor as a gold scenario token.",
    ],
    prompt: "How do you intervene without confusing motion for evidence?",
    evidenceId: "settled-projection",
    choices: [
      {
        id: "vault-release-mort",
        label: "Activate the gold token and release Mort Zork.",
        kind: "secret",
        outcomes: always({
          completeRoom: true,
          endingId: "ceo-in-the-chart",
        }),
      },
      {
        id: "vault-read-projection",
        label: "Read the settled projection before touching anything.",
        kind: "correct",
        outcomes: always({
          evidenceIds: ["settled-projection"],
          setFlags: {
            settledProjectionRead: true,
            settledProjectionShown: true,
          },
        }),
      },
      {
        id: "vault-gravity",
        label: "Increase gravity to ‘more quarterly.’",
        kind: "incorrect",
        outcomes: always({ endingId: "forecast-avalanche" }),
      },
      {
        id: "vault-janitor",
        label: "Activate the janitor annotation.",
        kind: "secret",
        outcomes: always({
          completeRoom: true,
          activateAnnotationId: "vault-janitor",
          endingId: "janitors-monte-carlo",
        }),
      },
    ],
    secretAnnotations: [
      {
        id: "vault-janitor",
        label: "Janitor note at PURE EXECUTIVE WEATHER",
        accessibleLabel: "Activate the janitor annotation at the Pure Executive Weather sensor",
        anchorId: "PURE EXECUTIVE WEATHER",
        messages: ["JANITOR: I keep telling them gravity is not a KPI."],
      },
    ],
    hintScript: [
      {
        id: "hint-vault-settled",
        prompt: "What should I compare?",
        response:
          "Motion shows the process, but the paused settled projection makes the result bins comparable.",
      },
    ],
  },
  boardroom: {
    id: "boardroom",
    title: "The Big Presentation",
    subtitle: "Boardroom · Evidence Montage",
    frameFamily: "xy",
    narrative: [
      "Four diskette slots wait beneath a projector that is ten confidence units too certain.",
      "The board wants a culprit. The evidence offers a narrower, more useful story.",
    ],
    prompt: "Why did Mort Zork disappear, and what should Zorkcorp present?",
    choices: [
      {
        id: "boardroom-corrected",
        label: "Present the corrected account, preserve the uncertainty, and rescue Mort.",
        kind: "correct",
        outcomes: [
          {
            when: { type: "all-evidence", evidenceIds: MAIN_EVIDENCE_IDS },
            effect: {
              completeRoom: true,
              endingId: "big-presentation-denominators",
            },
          },
          {
            effect: {
              completeRoom: true,
              endingId: "analyst-who-said-no",
            },
          },
        ],
      },
      {
        id: "boardroom-refuse",
        label: "Refuse to give The Big Presentation until the unsupported claim is removed.",
        kind: "correct",
        outcomes: [
          {
            when: { type: "minimum-evidence", count: 3 },
            effect: {
              completeRoom: true,
              endingId: "analyst-who-said-no",
            },
          },
          {
            effect: {
              credibilityDelta: -12,
              endingId: "hostile-takeover-by-fax-machine",
            },
          },
        ],
      },
      {
        id: "boardroom-original",
        label: "Present the original deck but add more animation.",
        kind: "incorrect",
        outcomes: always({ endingId: "three-d-pie-dimension" }),
      },
      {
        id: "boardroom-cfo",
        label: "Accuse the CFO because Finance had the largest legitimate input.",
        kind: "incorrect",
        outcomes: always({ endingId: "hostile-takeover-by-fax-machine" }),
      },
    ],
    secretAnnotations: [],
    hintScript: [
      {
        id: "hint-boardroom-scope",
        prompt: "What would falsify the current theory?",
        response:
          "Check whether each claim has its own scope, denominator, origin, and lineage before combining them into one account.",
      },
    ],
  },
}

export const endingRegistry: Readonly<Record<EndingId, AdventureEnding>> = {
  "big-presentation-denominators": {
    id: "big-presentation-denominators",
    title: "THE BIG PRESENTATION, NOW WITH DENOMINATORS",
    category: "good",
    narrative: [
      "You rescue Mort and replace the original deck with four defensible claims and a slide titled ‘What We Still Do Not Know.’",
      "The board applauds cautiously.",
      "You are promoted from Intrepid Young Analyst to Senior Intrepid Young Analyst.",
    ],
  },
  "analyst-who-said-no": {
    id: "analyst-who-said-no",
    title: "THE ANALYST WHO SAID NO",
    category: "good",
    narrative: [
      "You refuse to narrate certainty unsupported by the evidence.",
      "For seventeen terrifying seconds, nobody speaks.",
      "Mort emerges from B2 and says, ‘Finally, someone read the footnotes.’",
    ],
  },
  "ceo-in-the-chart": {
    id: "ceo-in-the-chart",
    title: "THE CEO IN THE CHART",
    category: "secret",
    narrative: [
      "You release the gold body from the Forecast Vault.",
      "Mort tumbles safely into the NEEDS CAVEAT bin.",
      "He declares it the first honest performance review of his career.",
    ],
  },
  "janitors-monte-carlo": {
    id: "janitors-monte-carlo",
    title: "THE JANITOR'S MONTE CARLO",
    category: "secret",
    narrative: [
      "The janitor explains every flaw in Project ORACLE, repairs the simulation, and becomes interim Chief Epistemology Officer.",
      "You receive a golden mop.",
    ],
  },
  "helicopter-of-synergy": {
    id: "helicopter-of-synergy",
    title: "THE HELICOPTER OF SYNERGY",
    category: "bad",
    narrative: [
      "You storm the roof and commandeer the corporate helicopter.",
      "It is a stationary fiberglass trade-show prop.",
      "The board praises your bias for action.",
    ],
  },
  "great-sales-extinction": {
    id: "great-sales-extinction",
    title: "THE GREAT SALES EXTINCTION",
    category: "bad",
    narrative: [
      "You fire all eighty Sales employees.",
      "Revenue falls to zero, but quarterly growth becomes mathematically infinite because the denominator has disappeared.",
    ],
  },
  "offsite-forever": {
    id: "offsite-forever",
    title: "OFFSITE FOREVER",
    category: "bad",
    narrative: [
      "You follow the badge endpoint to the continuity bunker. The door locks behind you.",
      "Twenty-seven years later, you are promoted to Senior Vice President of Bunker.",
    ],
  },
  "powerpoint-apocalypse": {
    id: "powerpoint-apocalypse",
    title: "THE POWERPOINT APOCALYPSE",
    category: "bad",
    narrative: [
      "You unplug DeckStore.",
      "Every presentation in Zorkcorp opens simultaneously and begins auto-advancing.",
      "Civilization lasts nine more slides.",
    ],
  },
  "three-d-pie-dimension": {
    id: "three-d-pie-dimension",
    title: "THE 3D PIE DIMENSION",
    category: "bad",
    narrative: [
      "You present the original deck with one additional 3D pie chart.",
      "The pie opens a portal to a universe where all values sum to 113%.",
    ],
  },
  "centrality-justice": {
    id: "centrality-justice",
    title: "CENTRALITY JUSTICE",
    category: "bad",
    narrative: [
      "You arrest the most connected person in the network.",
      "It is the office printer. It demands legal representation.",
    ],
  },
  "forecast-avalanche": {
    id: "forecast-avalanche",
    title: "FORECAST AVALANCHE",
    category: "bad",
    narrative: [
      "You increase gravity. Four quarters of projections arrive at once.",
      "The company reports all future revenue immediately and is delisted by lunch.",
    ],
  },
  "mean-floor": {
    id: "mean-floor",
    title: "THE MEAN FLOOR",
    category: "bad",
    narrative: [
      "You average two incompatible observations and search floor four.",
      "Facilities congratulates you on discovering a floor that was already there.",
    ],
  },
  "clean-data-incident": {
    id: "clean-data-incident",
    title: "THE CLEAN DATA INCIDENT",
    category: "bad",
    narrative: [
      "You delete the denominator. The table is cleaner and the analysis is gone.",
      "Project ORACLE is certified tidy.",
    ],
  },
  "mercator-event": {
    id: "mercator-event",
    title: "THE MERCATOR EVENT",
    category: "bad",
    narrative: [
      "The distance cartogram folds the campus around you.",
      "You arrive everywhere, which turns out to be nowhere in particular.",
    ],
  },
  "hierarchy-restoration-program": {
    id: "hierarchy-restoration-program",
    title: "THE HIERARCHY RESTORATION PROGRAM",
    category: "bad",
    narrative: [
      "You discard the cycle until the system resembles the org chart.",
      "The phantom flow is promoted to a dotted-line report.",
    ],
  },
  "hostile-takeover-by-fax-machine": {
    id: "hostile-takeover-by-fax-machine",
    title: "THE HOSTILE TAKEOVER BY FAX MACHINE",
    category: "bad",
    narrative: [
      "You accuse Finance without tracing the unsupported input.",
      "The office fax machine acquires a controlling interest before lunch.",
    ],
  },
}

export const ENDINGS = endingRegistry
export const endingList = ENDING_IDS.map((id) => endingRegistry[id])

export function getRoom(roomId: RoomId): AdventureRoom {
  return roomRegistry[roomId]
}

export function getEnding(endingId: EndingId): AdventureEnding {
  return endingRegistry[endingId]
}

export function getEvidenceTemplate(evidenceId: string): EvidenceArtifactTemplate {
  const template = EVIDENCE_TEMPLATES[evidenceId]
  if (!template) throw new Error(`Unknown evidence artifact: ${evidenceId}`)
  return template
}

export function hasAllMainEvidence(state: Pick<AnalystAdventureState, "evidence">): boolean {
  const evidenceIds = new Set(state.evidence.map((artifact) => artifact.id))
  return MAIN_EVIDENCE_IDS.every((id) => evidenceIds.has(id))
}

export function getAvailableDestinations(state: AnalystAdventureState): RoomId[] {
  if (state.endingId || !state.flags.storyStarted) return []
  if (state.currentRoomId === "forecast-vault") return []
  const completed = new Set(state.completedRoomIds)
  const destinations: RoomId[] = []

  if (completed.has("executive-suite")) {
    if (state.currentRoomId !== "executive-suite") {
      destinations.push("executive-suite")
    }
    if (state.currentRoomId !== "records-catacombs") {
      destinations.push("records-catacombs")
    }
    if (state.currentRoomId !== "map-room") destinations.push("map-room")
  }

  if (
    (completed.has("records-catacombs") || completed.has("map-room")) &&
    state.currentRoomId !== "server-cathedral"
  ) {
    destinations.push("server-cathedral")
  }

  if (completed.has("server-cathedral") && state.currentRoomId !== "boardroom") {
    destinations.push("boardroom")
  }

  return destinations
}

export function getAvailableChoices(state: AnalystAdventureState): AdventureChoice[] {
  if (state.endingId || !state.flags.storyStarted) return []
  if (state.completedRoomIds.includes(state.currentRoomId)) return []
  return roomRegistry[state.currentRoomId].choices
}
