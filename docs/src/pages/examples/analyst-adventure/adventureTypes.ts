export const ROOM_IDS = [
  "executive-suite",
  "records-catacombs",
  "map-room",
  "server-cathedral",
  "forecast-vault",
  "boardroom",
] as const

export type RoomId = (typeof ROOM_IDS)[number]

export type OrdinaryRoomId = Exclude<RoomId, "forecast-vault" | "boardroom">

export const ENDING_IDS = [
  "big-presentation-denominators",
  "analyst-who-said-no",
  "ceo-in-the-chart",
  "janitors-monte-carlo",
  "helicopter-of-synergy",
  "great-sales-extinction",
  "offsite-forever",
  "powerpoint-apocalypse",
  "three-d-pie-dimension",
  "centrality-justice",
  "forecast-avalanche",
  "mean-floor",
  "clean-data-incident",
  "mercator-event",
  "hierarchy-restoration-program",
  "hostile-takeover-by-fax-machine",
] as const

export type EndingId = (typeof ENDING_IDS)[number]

export type FrameFamily = "xy" | "ordinal" | "geo" | "network" | "physics"

export type EvidenceFrame =
  | "StreamXYFrame"
  | "StreamOrdinalFrame"
  | "StreamGeoFrame"
  | "StreamNetworkFrame"
  | "StreamPhysicsFrame"

export type SerializableChartConfig = Record<string, unknown>

export interface EvidenceArtifact {
  id: string
  label: string
  claim: string
  scope: string
  denominator?: string
  frame: EvidenceFrame
  reachedAfterHint: boolean
  provenance: {
    roomId: RoomId
    source: "player"
    acceptedAt: string
  }
  chartConfig?: SerializableChartConfig
}

export type EvidenceArtifactTemplate = Omit<EvidenceArtifact, "reachedAfterHint" | "provenance"> & {
  roomId: RoomId
}

export interface HintDefinition {
  id: string
  prompt: string
  response: string
  annotationId?: string
}

export interface SecretAnnotationDefinition {
  id: string
  label: string
  accessibleLabel: string
  anchorId: string
  messages: string[]
  activatedMessages?: string[]
  fragment?: string
  flag?: string
}

export type ChoiceKind = "correct" | "incorrect" | "detour" | "secret"

export type AdventureCondition =
  | { type: "always" }
  | { type: "flag"; flag: string; value?: boolean }
  | { type: "all-evidence"; evidenceIds: readonly string[] }
  | { type: "minimum-evidence"; count: number }

export interface AdventureChoiceEffect {
  completeRoom?: boolean
  credibilityDelta?: number
  evidenceIds?: string[]
  endingId?: EndingId
  navigateTo?: RoomId
  setFlags?: Record<string, boolean>
  secretFragments?: string[]
  activateAnnotationId?: string
}

export interface AdventureChoiceOutcome {
  when?: AdventureCondition
  effect: AdventureChoiceEffect
}

export interface AdventureChoice {
  id: string
  label: string
  kind: ChoiceKind
  outcomes: AdventureChoiceOutcome[]
}

export interface AdventureSuccessDebrief {
  title: string
  explanation: string
}

export interface AdventureRoom {
  id: RoomId
  title: string
  subtitle: string
  frameFamily: FrameFamily
  narrative: string[]
  prompt: string
  successDebrief?: AdventureSuccessDebrief
  choices: AdventureChoice[]
  evidenceId?: string
  secretAnnotations: SecretAnnotationDefinition[]
  hintScript: HintDefinition[]
}

export interface AdventureEnding {
  id: EndingId
  title: string
  category: "good" | "secret" | "bad"
  narrative: string[]
}

export type AdventureInputType =
  "keyboard" | "pointer" | "touch" | "navigation-tree" | "programmatic"

export type AdventureAction =
  | { type: "START" }
  | { type: "CHOOSE"; choiceId: string }
  | { type: "NAVIGATE"; roomId: RoomId }
  | { type: "ACTIVATE_ANNOTATION"; annotationId: string }
  | { type: "USE_HINT"; roomId: RoomId }
  | {
      type: "INSPECT_DATUM"
      datumId: string
      inputType: AdventureInputType
    }
  | { type: "SHOW_SETTLED_PROJECTION" }
  | { type: "REWIND" }
  | { type: "RESTART" }

export interface AdventureStateFields {
  seed: number
  currentRoomId: RoomId
  visitedRoomIds: RoomId[]
  completedRoomIds: RoomId[]
  evidence: EvidenceArtifact[]
  credibility: number
  hintsUsed: number
  inspectedDatumIds: string[]
  activatedAnnotationIds: string[]
  secretFragments: string[]
  flags: Record<string, boolean>
  endingId?: EndingId
}

export type AdventureSnapshot = AdventureStateFields

export interface AdventureEvent {
  id: string
  type:
    | "start"
    | "choice"
    | "navigation"
    | "annotation"
    | "hint"
    | "inspection"
    | "projection"
    | "rewind"
  occurredAt: string
  action: Exclude<AdventureAction, { type: "RESTART" }>
  before: AdventureSnapshot
  after: AdventureSnapshot
}

export interface AnalystAdventureState extends AdventureStateFields {
  path: AdventureEvent[]
}
