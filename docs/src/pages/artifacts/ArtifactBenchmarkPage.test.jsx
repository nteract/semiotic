import React from "react"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import { getBreadcrumbs, getPrevNext } from "../../components/navData"
import ArtifactBenchmarkPage, {
  BENCHMARK_LIMITATIONS,
  BENCHMARK_REPORT_PATH,
  formatBenchmarkRate,
} from "./ArtifactBenchmarkPage"

vi.mock("../../components/PageLayout", () => ({
  default: ({ title, children }) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  ),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <ArtifactBenchmarkPage />
    </MemoryRouter>,
  )
}

describe("Artifact Contract benchmark page", () => {
  it("keeps measured detection, false refusal, and unavailable precision distinct", () => {
    renderPage()

    expect(screen.getByRole("heading", { name: "Paired mutation detection" })).toBeTruthy()
    expect(screen.getByText("40/40")).toBeTruthy()
    expect(
      screen.getByText(/100% of paired cases met the declared detection criterion/),
    ).toBeTruthy()

    expect(screen.getByRole("heading", { name: "Positive-control false refusal" })).toBeTruthy()
    expect(screen.getByText("0/4")).toBeTruthy()
    expect(screen.getByText(/0% across explicitly labeled not-refuse controls/)).toBeTruthy()

    expect(screen.getByRole("heading", { name: "Refusal precision" })).toBeTruthy()
    expect(screen.getByText("Unavailable")).toBeTruthy()
    expect(
      screen.getByText(/should-refuse labels, so a refusal precision denominator is unavailable/),
    ).toBeTruthy()
  })

  it("discloses corpus limits and links the complete generated report", () => {
    renderPage()

    expect(BENCHMARK_LIMITATIONS).toHaveLength(4)
    expect(screen.getByText(/This is a small corpus/)).toBeTruthy()
    expect(screen.getByText(/self-authored in this repository/)).toBeTruthy()
    expect(
      screen.getByText(/there is no independent annotation or external holdout set/),
    ).toBeTruthy()
    expect(screen.getByText(/provide no field evidence/)).toBeTruthy()
    expect(screen.getByText(/not certification/)).toBeTruthy()

    const download = screen.getByRole("link", { name: "Download benchmark JSON" })
    expect(download).toHaveAttribute("href", BENCHMARK_REPORT_PATH)
    expect(download).toHaveAttribute("download")
  })

  it("registers the benchmark between overview and governance navigation", () => {
    expect(getBreadcrumbs("/artifacts/benchmark")?.at(-1)).toEqual({
      title: "Benchmark",
      path: "/artifacts/benchmark",
    })
    expect(getPrevNext("/artifacts/benchmark")).toMatchObject({
      prev: { path: "/artifacts/overview" },
      next: { path: "/artifacts/governance" },
    })
    expect(formatBenchmarkRate(null)).toBe("Unavailable")
    expect(formatBenchmarkRate(0)).toBe("0%")
    expect(formatBenchmarkRate(1)).toBe("100%")
  })
})
