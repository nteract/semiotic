import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { fingerprintValue } from "semiotic/artifact"
import { describe, expect, it } from "vitest"
import ArtifactInspector from "./ArtifactInspector"
import { buildMachineArtifactRecord } from "./buildMachineArtifactRecord"
import { WORLD_OBSERVATIONS } from "../data/worldDevelopment"

const data = [
  { year: 2021, value: 12 },
  { year: 2022, value: 16 },
  { year: 2023, value: 14 },
]

const active = {
  component: "LineChart",
  displayName: "Line Chart",
  family: "xy",
  reasons: ["Ordered observations support a connected trend."],
  caveats: ["Three points provide limited historical context."],
  props: {
    data,
    xAccessor: "year",
    yAccessor: "value",
    showPoints: true,
  },
}

const description = {
  text: "A line chart with three yearly observations. Values rise and then decline.",
  levels: {
    l1: "A line connects three yearly values.",
    l2: "Values range from 12 to 16.",
    l3: "The series rises through 2022 and declines in 2023.",
    l4: "Show the direction of the measure over time.",
  },
}

const question = {
  id: "trend",
  intent: "trend",
  question: "How does the value change?",
}

const enrichedProps = {
  ...active.props,
  title: question.question,
  description: description.text,
  summary: "Three fixture observations.",
  accessibleTable: true,
}

const suggestions = [
  active,
  {
    component: "BarChart",
    displayName: "Bar Chart",
    family: "categorical",
    reasons: ["Bars support discrete yearly comparisons."],
    caveats: [],
    props: {},
  },
]

function renderInspector() {
  return render(
    <MemoryRouter>
      <ArtifactInspector
        active={active}
        data={data}
        description={description}
        enrichedProps={enrichedProps}
        question={question}
        suggestions={suggestions}
      />
    </MemoryRouter>,
  )
}

describe("What the Machine Sees artifact inspector", () => {
  it("preserves corrected scope wording and reports transfer loss", () => {
    const record = buildMachineArtifactRecord({
      active,
      data,
      description,
      enrichedProps,
      question,
      suggestions,
    })

    const original = record.contract.claims.find(({ id }) => id.endsWith("scope.v1"))
    const replacement = record.contract.claims.find(({ id }) => id.endsWith("scope.v2"))

    expect(original).toMatchObject({ status: "superseded" })
    expect(replacement).toMatchObject({
      status: "supported",
      supersedes: [original.id],
    })
    expect(replacement.text).toContain("representing 1 of 16 countries")
    expect(replacement.scope).toMatchObject({
      representedCountryCount: 1,
      sourceFixtureCountryCount: 16,
    })

    const sourceEvidence = record.contract.evidence.find(({ role }) => role === "source-data")
    const viewEvidence = record.contract.evidence.find(({ role }) => role === "transformation")
    expect(sourceEvidence.fingerprint).toBe(fingerprintValue(WORLD_OBSERVATIONS).fingerprint)
    expect(sourceEvidence.sample.rowCount).toBe(WORLD_OBSERVATIONS.length)
    expect(viewEvidence.fingerprint).toBe(fingerprintValue(data).fingerprint)
    expect(viewEvidence.transformation.inputEvidenceIds).toEqual([sourceEvidence.id])
    expect(viewEvidence.scope).toMatchObject({
      representedCountryCount: 1,
      projectedRecordCount: data.length,
    })

    expect(record.previousContract.artifact).toMatchObject({
      id: "machine-sees-trend-line-chart-draft",
      revision: "1",
    })
    expect(record.contract.artifact).toMatchObject({
      id: "machine-sees-trend-line-chart",
      revision: "2",
    })
    expect(record.contract.inheritance.sourceArtifactIds).toEqual([
      record.previousContract.artifact.id,
    ])
    expect(record.previousContract.time.window.status).toBe("settled")
    expect(record.previousContract.time.revision.status).toBe("original")
    expect(record.contract.time.window.status).toBe("corrected")
    expect(record.contract.time.revision).toMatchObject({
      status: "corrected",
      previousArtifactId: record.previousContract.artifact.id,
      correctionId: "machine-sees-trend-line-chart.correction.scope",
    })
    expect(record.contract.contestability.corrections).toHaveLength(1)
    expect(record.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "artifact.id", kind: "changed" }),
        expect.objectContaining({ path: "artifact.revision", kind: "changed" }),
      ]),
    )
    expect(record.packet.transfer.omittedPaths).toContain("evidence[].sample")
    // Omitting optional raw samples retains claim/evidence references and
    // fingerprints, but cannot claim full fidelity.
    expect(record.packet.transfer.preservation).toBe("claim-evidence-preserved")
    expect(record.packet.contract.claims).toEqual(record.contract.claims)
    expect(record.packet.contract.evidence.map(({ id, fingerprint }) => ({ id, fingerprint })))
      .toEqual(record.contract.evidence.map(({ id, fingerprint }) => ({ id, fingerprint })))
    expect(record.packet.contract.evidence.every(({ sample }) => !sample)).toBe(true)
  })

  it("discloses every inspection layer and downloads the current packet", () => {
    renderInspector()

    const trigger = screen.getByRole("button", { name: "Inspect claims and evidence" })
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog")
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "true")

    expect(screen.getByRole("dialog", { name: "Artifact inspector" })).toBeInTheDocument()
    expect(screen.getByRole("group", { name: "Evaluation policy" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Claims" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Evidence" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Time and uncertainty" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Changes and corrections" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Alternative forms" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Transfer packet" })).toBeInTheDocument()
    expect(
      screen.getByRole("region", {
        name: "Bounded evidence preview for Canonical World Bank documentation fixture",
        hidden: true,
      }),
    ).toHaveAttribute("tabindex", "0")

    const outcome = screen.getByRole("status")
    expect(outcome).toHaveAttribute("aria-live", "polite")
    expect(outcome).toHaveTextContent(/Exploratory/)

    fireEvent.click(screen.getByRole("button", { name: "Editorial policy" }))
    expect(screen.getByText(/editorial@0\.1/)).toBeInTheDocument()
    expect(outcome).toHaveTextContent(/Editorial/)

    const download = screen.getByRole("link", { name: "Download packet JSON" })
    expect(download).toHaveAttribute("download", expect.stringMatching(/\.artifact\.json$/))
    const href = download.getAttribute("href")
    const prefix = "data:application/json;charset=utf-8,"
    const packet = JSON.parse(decodeURIComponent(href.slice(prefix.length)))
    expect(packet.artifactId).toBe("machine-sees-trend-line-chart")
    expect(packet.contract.contestability.corrections).toHaveLength(1)
  })
})
