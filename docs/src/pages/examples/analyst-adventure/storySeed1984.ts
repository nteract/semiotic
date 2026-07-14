import type { EvidenceArtifactTemplate, RoomId } from "./adventureTypes"

export const ANALYST_ADVENTURE_SEED = 1984 as const

export const STORY_START_AT = "1984-06-04T09:12:00.000Z"

const ACCEPTED_AT_BY_EVIDENCE_ID: Readonly<Record<string, string>> = {
  "temporal-lag": "1984-06-04T09:14:00.000Z",
  "denominator-key": "1984-06-04T09:22:00.000Z",
  "origin-vector": "1984-06-04T09:29:00.000Z",
  "lineage-break": "1984-06-04T09:37:00.000Z",
  "settled-projection": "1984-06-04T09:44:00.000Z",
}

export const storySeed1984 = {
  seed: ANALYST_ADVENTURE_SEED,
  title: "Analyst Adventure",
  subtitle: "The Case of the Vanishing Visionary",
  company: "Zorkcorp",
  companyMotto: "Making Synergy Tangible Since 1981.",
  playerTitle: "Intrepid Young Analyst",
  startAt: STORY_START_AT,
  introduction: [
    "9:12 A.M. THE BIG PRESENTATION IS MINUTES AWAY.",
    "Mortimer Zork is missing, but his badge and account remain unusually productive.",
    "The charts are the only witnesses whose stories can be cross-examined.",
  ],
} as const

export const annotationCabalDiscovery = {
  id: "annotation-cabal",
  title: "THE ANNOTATION CABAL",
  eyebrow: "SECRET CHANNEL // XYZZY ACCEPTED",
  narrative: [
    "Every hidden channel resolves to XYZZY. Mort has been communicating through chart comments because PresentationDaemon controls every ordinary messaging system.",
    "Congratulations. You have discovered collaborative analytics. The Forecast Vault is now open.",
  ],
} as const

export function acceptedAtForEvidence(evidenceId: string): string {
  const acceptedAt = ACCEPTED_AT_BY_EVIDENCE_ID[evidenceId]
  if (!acceptedAt) {
    throw new Error(`No deterministic acceptedAt is registered for ${evidenceId}`)
  }
  return acceptedAt
}

export function eventTimeForIndex(index: number): string {
  const start = Date.parse(STORY_START_AT)
  return new Date(start + index * 30_000).toISOString()
}

export function materializeEvidence(template: EvidenceArtifactTemplate, reachedAfterHint: boolean) {
  const { roomId, ...artifact } = template
  return {
    ...artifact,
    reachedAfterHint,
    provenance: {
      roomId,
      source: "player" as const,
      acceptedAt: acceptedAtForEvidence(template.id),
    },
  }
}

export function hintFlagForRoom(roomId: RoomId): string {
  return `hint-used:${roomId}`
}
