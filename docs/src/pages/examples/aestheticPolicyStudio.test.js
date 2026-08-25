import { describe, expect, it } from "vitest"
import {
  AESTHETIC_CANDIDATES,
  SERVICE_DATA,
  buildAestheticPolicyShowcase,
} from "./aestheticPolicyStudio"

describe("aesthetic policy studio", () => {
  const showcase = buildAestheticPolicyShowcase()

  it("keeps the balanced default useful without pretending it is organizational style", () => {
    expect(showcase.defaultCase.report).toMatchObject({
      profile: "Semiotic balanced",
      ok: true,
    })
    expect(
      showcase.defaultCase.report.features.find(
        (feature) => feature.id === "mark-scaffold-hierarchy",
      ),
    ).toMatchObject({ status: "pass" })
    expect(
      showcase.defaultCase.report.features.find((feature) => feature.id === "palette-authorship"),
    ).toMatchObject({ status: "warn", score: 0.2 })
  })

  it("selects different treatments for opposing organizational policies", () => {
    const [northstar, fieldnote] = showcase.organizations

    expect(northstar.selection.selected.candidate.id).toBe("continuity-bar")
    expect(fieldnote.selection.selected.candidate.id).toBe("editorial-dot")
    expect(northstar.selection.selected.report.score).toBeGreaterThan(
      northstar.selection.ranked[1].report.score,
    )
    expect(fieldnote.selection.selected.report.score).toBeGreaterThan(
      fieldnote.selection.ranked[1].report.score,
    )
  })

  it("retains the same evidence and hierarchy floor in both selected charts", () => {
    expect(AESTHETIC_CANDIDATES.every((candidate) => candidate.props.data === SERVICE_DATA)).toBe(
      true,
    )
    for (const organization of showcase.organizations) {
      const hierarchy = organization.selection.selected.report.features.find(
        (feature) => feature.id === "mark-scaffold-hierarchy",
      )
      expect(hierarchy).toMatchObject({ status: "pass", score: 1 })
    }
  })
})
