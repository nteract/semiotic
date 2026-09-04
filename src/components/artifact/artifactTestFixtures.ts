import { buildArtifactContract } from "./contract"
import type { ArtifactContract, Claim } from "./types"

export const rows = [
  { month: 1, value: 4 },
  { month: 2, value: 7 },
  { month: 3, value: 6 }
]

export const props = {
  data: rows,
  xAccessor: "month",
  yAccessor: "value",
  title: "Monthly values",
  description: "Values for three monthly observations.",
  summary: "Values rose and then eased."
}

export function contractWithClaim(
  id = "monthly-values",
  claim: Partial<Claim> = {}
): ArtifactContract {
  return buildArtifactContract("LineChart", props, {
    id,
    intents: ["trend"],
    purpose: { stakes: "informational" },
    claims: [
      {
        id: `${id}-claim`,
        text: "The series changes over the reported period.",
        kind: "observation",
        status: "supported",
        evidenceIds: [`${id}-evidence`],
        authoredBy: { id: "data-desk", kind: "human" },
        ...claim
      }
    ],
    evidence: [
      {
        id: `${id}-evidence`,
        role: "source-data",
        fingerprint: `sha256:${id}`
      }
    ],
    time: {
      observedAt: "2026-08-31T12:00:00Z",
      processedAt: "2026-08-31T12:01:00Z",
      presentation: { state: "historical" },
      freshness: {
        status: "fresh",
        checkedAt: "2026-08-31T12:02:00Z",
        basis: "bounded extract"
      },
      window: {
        start: "2026-08-01T00:00:00Z",
        end: "2026-09-01T00:00:00Z",
        status: "settled"
      },
      completeness: { status: "settled", basis: "bounded extract" },
      snapshot: { id: `${id}-snapshot` }
    },
    reception: {
      channels: [{ channel: "visual" }, { channel: "screen-reader" }],
      description: props.description,
      dataFallback: true
    },
    form: {
      chartFamily: "time-series",
      whyThisForm: "Position over time supports the stated comparison."
    },
    contestability: { sourceRequestsAllowed: true },
    accountability: {
      authors: [{ name: "Data desk", kind: "human" }]
    },
    inheritance: {
      preservation: "claim-evidence-preserved",
      rawDataDefault: "exclude"
    }
  })
}
