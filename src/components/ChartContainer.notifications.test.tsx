import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import * as React from "react"
import { ChartContainer, type ChartNotification } from "./ChartContainer"

// Notifications are the container-level surface for chart-level notices with
// no mark to anchor to — audit / data-pitfall findings, unplaceable
// data-quality results, and custom user-authored notices. They surface as a
// severity-colored toolbar bell + count badge; the full cards live in a
// click-to-open popover so arriving/dismissing notices never reflow the plot.

const NOTIFICATIONS: ChartNotification[] = [
  {
    id: "truncated-axis",
    level: "error",
    title: "Truncated axis",
    message: "Start the bar axis at zero.",
    source: "datapitfalls · Graphical Gaffes",
  },
  {
    id: "loaded-title",
    level: "warning",
    title: "Loaded title",
    message: "Title with the measured change.",
  },
  { id: "fyi", message: "Data refreshes nightly." },
]

function renderContainer(
  notifications: ChartNotification[],
  onNotificationDismiss?: (n: ChartNotification, i: number) => void
) {
  return render(
    <ChartContainer
      title="Test"
      notifications={notifications}
      onNotificationDismiss={onNotificationDismiss}
    >
      <div>chart</div>
    </ChartContainer>
  )
}

/** The toolbar toggle that opens the notifications popover. Selected by class
 *  so it resolves whether the popover is open ("Hide") or closed ("Show"). */
function getToggle() {
  return document.querySelector(
    ".semiotic-chart-notifications-toggle"
  ) as HTMLElement
}

describe("ChartContainer notifications", () => {
  it("renders a toggle with the count and most-severe level, popover closed by default", () => {
    renderContainer(NOTIFICATIONS)
    const toggle = getToggle()
    // 3 notifications, most severe is the error.
    expect(toggle.getAttribute("aria-label")).toContain("3 chart notifications")
    expect(toggle.getAttribute("aria-label")).toContain("most severe: error")
    expect(toggle.getAttribute("aria-expanded")).toBe("false")
    // Cards are not in the DOM until opened.
    expect(screen.queryByText("Truncated axis")).toBeNull()
  })

  it("opens a popover with the notification cards on click", () => {
    renderContainer(NOTIFICATIONS)
    fireEvent.click(getToggle())
    expect(screen.getByRole("dialog", { name: "Chart notifications" })).toBeTruthy()
    expect(screen.getByText("Truncated axis")).toBeTruthy()
    expect(screen.getByText("Start the bar axis at zero.")).toBeTruthy()
    expect(screen.getByText("datapitfalls · Graphical Gaffes")).toBeTruthy()
    expect(screen.getByText("Data refreshes nightly.")).toBeTruthy()
    expect(getToggle().getAttribute("aria-expanded")).toBe("true")
  })

  it("exposes a badge with the visible count", () => {
    const { container } = renderContainer(NOTIFICATIONS)
    const badge = container.querySelector(".semiotic-chart-notifications-badge")
    expect(badge).toBeTruthy()
    expect(badge!.textContent).toBe("3")
  })

  it("keeps an aria-live status region announcing the count + severity", () => {
    const { container } = renderContainer(NOTIFICATIONS)
    const region = container.querySelector(".semiotic-chart-notifications [role='status']")
    expect(region).toBeTruthy()
    expect(region!.getAttribute("aria-live")).toBe("polite")
    expect(region!.textContent).toContain("3 chart notifications")
    expect(region!.textContent).toContain("most severe: error")
  })

  it("closes the popover on Escape", () => {
    renderContainer(NOTIFICATIONS)
    fireEvent.click(getToggle())
    expect(screen.queryByRole("dialog")).toBeTruthy()
    fireEvent.keyDown(document, { key: "Escape" })
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("applies a level class per card, defaulting to info", () => {
    const { container } = renderContainer(NOTIFICATIONS)
    fireEvent.click(getToggle())
    const items = container.querySelectorAll(".semiotic-chart-notification")
    expect(items.length).toBe(3)
    expect(items[0].className).toContain("semiotic-chart-notification--error")
    expect(items[1].className).toContain("semiotic-chart-notification--warning")
    expect(items[2].className).toContain("semiotic-chart-notification--info")
  })

  it("dismisses a notification and reports it through the callback", () => {
    const onDismiss = vi.fn()
    renderContainer(NOTIFICATIONS, onDismiss)
    fireEvent.click(getToggle())
    fireEvent.click(
      screen.getByRole("button", { name: "Dismiss notification: Truncated axis" })
    )
    expect(screen.queryByText("Truncated axis")).toBeNull()
    expect(screen.getByText("Loaded title")).toBeTruthy()
    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(onDismiss.mock.calls[0][0].id).toBe("truncated-axis")
    expect(onDismiss.mock.calls[0][1]).toBe(0)
  })

  it("updates the badge count and severity after a dismissal", () => {
    const { container } = renderContainer(NOTIFICATIONS)
    fireEvent.click(getToggle())
    fireEvent.click(
      screen.getByRole("button", { name: "Dismiss notification: Truncated axis" })
    )
    const badge = container.querySelector(".semiotic-chart-notifications-badge")
    expect(badge!.textContent).toBe("2")
    // Most severe is now the warning.
    expect(getToggle().getAttribute("aria-label")).toContain("most severe: warning")
  })

  it("keeps a dismissed notification dismissed when the same list re-renders", () => {
    const { rerender } = renderContainer(NOTIFICATIONS)
    fireEvent.click(getToggle())
    fireEvent.click(
      screen.getByRole("button", { name: "Dismiss notification: Truncated axis" })
    )
    rerender(
      <ChartContainer title="Test" notifications={[...NOTIFICATIONS]}>
        <div>chart</div>
      </ChartContainer>
    )
    // Popover stays open across the re-render; the dismissed card stays gone.
    expect(screen.queryByText("Truncated axis")).toBeNull()
    expect(screen.getByText("Loaded title")).toBeTruthy()
  })

  it("removes the whole affordance once every notification is dismissed", () => {
    const { container } = renderContainer([NOTIFICATIONS[2]])
    fireEvent.click(getToggle())
    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }))
    expect(container.querySelector(".semiotic-chart-notifications")).toBeNull()
  })

  it("hides the dismiss button when dismissible is false", () => {
    renderContainer([
      { id: "pinned", title: "Pinned", message: "Cannot remove", dismissible: false },
    ])
    fireEvent.click(getToggle())
    expect(screen.getByText("Pinned")).toBeTruthy()
    expect(screen.queryByRole("button", { name: /Dismiss notification/ })).toBeNull()
  })

  it("renders no affordance when notifications is empty or absent", () => {
    const { container } = render(
      <ChartContainer title="Test" notifications={[]}>
        <div>chart</div>
      </ChartContainer>
    )
    expect(container.querySelector(".semiotic-chart-notifications")).toBeNull()
    const { container: bare } = render(
      <ChartContainer title="Test">
        <div>chart</div>
      </ChartContainer>
    )
    expect(bare.querySelector(".semiotic-chart-notifications")).toBeNull()
  })

  it("still exposes notifications while the chart is loading", () => {
    render(
      <ChartContainer title="Test" loading notifications={[NOTIFICATIONS[0]]}>
        <div>chart</div>
      </ChartContainer>
    )
    fireEvent.click(getToggle())
    expect(screen.getByText("Truncated axis")).toBeTruthy()
  })
})
