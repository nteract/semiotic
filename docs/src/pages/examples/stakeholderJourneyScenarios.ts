export interface JourneySystem {
  id: string
  short: string
  title: string
  verdict: string
  description: string
  invitationForce: number
  invitationDamping: number
  leadershipForce: number
  leadershipDamping: number
  accent: string
  fieldLabel: string
}

export const STAGES = [
  {
    id: "discovery",
    label: "Discovery",
    short: "DISC",
    voice: "I find it and it looks relevant.",
  },
  {
    id: "acquisition",
    label: "Acquisition",
    short: "ACQ",
    voice: "I reach the project and try it.",
  },
  {
    id: "activation",
    label: "Activation",
    short: "ACT",
    voice: "The first wall clears.",
  },
  {
    id: "impact",
    label: "First Impact",
    short: "IMPACT",
    voice: "It did the thing I came for.",
  },
  {
    id: "habit",
    label: "Habit",
    short: "HABIT",
    voice: "It becomes a default.",
  },
  {
    id: "commitment",
    label: "Commitment",
    short: "COM",
    voice: "I help tend the project.",
  },
  {
    id: "leadership",
    label: "Ecosystem Leadership",
    short: "LEAD",
    voice: "I help steward the ecosystem.",
  },
]

export const STAGE_INDEX = Object.fromEntries(STAGES.map((stage, index) => [stage.id, index]))

export const MEMBRANES = [
  {
    id: "findability",
    label: "Findability",
    compact: "M1",
    offset: 0.2,
    cost: 0.26,
    wobble: -9,
    color: "#c2413b",
  },
  {
    id: "value-fit",
    label: "Value fit",
    compact: "M2",
    offset: 0.4,
    cost: 0.34,
    wobble: 8,
    color: "#2563a6",
  },
  {
    id: "activation-work",
    label: "Activation work",
    compact: "M3",
    offset: 0.6,
    cost: 0.4,
    wobble: -4,
    color: "#c2413b",
  },
]

export const SYSTEMS: Record<string, JourneySystem> = {
  relay: {
    id: "relay",
    short: "Designed relay",
    title: "Invitation makes the next role visible",
    verdict: "Intentional community path",
    description:
      "At Habit, an invitation adds enough support to overcome the modeled effort of taking a community role. The stewardship path beyond it is shared by both conditions.",
    invitationForce: 80,
    invitationDamping: 0.045,
    leadershipForce: 90,
    leadershipDamping: 0.04,
    accent: "#0c7894",
    fieldLabel: "near-peer invitation",
  },
  passive: {
    id: "passive",
    short: "Passive path",
    title: "Habit can remain private use",
    verdict: "Product usage without invitation",
    description:
      "At Habit, the effort of taking a community role opposes forward motion. With no added invitation, participants can remain regular users without crossing into contribution.",
    invitationForce: -240,
    invitationDamping: 0.045,
    leadershipForce: 90,
    leadershipDamping: 0.04,
    accent: "#b63832",
    fieldLabel: "no intentional invitation",
  },
}

export const SYSTEM_ORDER = ["relay", "passive"]
