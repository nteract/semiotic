import { describe, expect, it, vi } from "vitest"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import * as React from "react"
import { ChartContainer } from "./ChartContainer"

function toggle(): HTMLElement {
  return document.querySelector(
    ".semiotic-chart-notifications-toggle",
  ) as HTMLElement
}

const unsafeConfig = {
  component: "BubbleChart",
  props: {
    data: [
      { x: 1, y: 2, size: 4 },
      { x: 2, y: 3, size: -1 },
    ],
    xAccessor: "x",
    yAccessor: "y",
    sizeBy: "size",
    title: "Unsafe bubbles",
  },
}

describe("ChartContainer dataAudit", () => {
  it("lazily maps numeric hazards into the existing notification bell", async () => {
    render(
      <ChartContainer chartConfig={unsafeConfig} dataAudit>
        <div>chart</div>
      </ChartContainer>,
    )

    await waitFor(() => expect(toggle()).toBeTruthy())
    expect(toggle().getAttribute("aria-label")).toContain("most severe: error")
    fireEvent.click(toggle())
    expect(screen.getByText(/Negative Size · size/)).toBeTruthy()
    expect(screen.getByText("Semiotic data audit")).toBeTruthy()
    expect(screen.getByText(/maps this role to non-negative geometry/)).toBeTruthy()
  })

  it("merges automatic findings after caller notices so callback indices stay stable", async () => {
    const onDismiss = vi.fn()
    render(
      <ChartContainer
        chartConfig={unsafeConfig}
        dataAudit
        notifications={[{ id: "authored", title: "Authored note", message: "Keep me." }]}
        onNotificationDismiss={onDismiss}
      >
        <div>chart</div>
      </ChartContainer>,
    )

    await waitFor(() => expect(toggle()).toBeTruthy())
    fireEvent.click(toggle())
    await waitFor(() => expect(screen.getByText(/Negative Size/)).toBeTruthy())
    fireEvent.click(
      screen.getByRole("button", { name: "Dismiss notification: Authored note" }),
    )
    expect(onDismiss.mock.calls[0][0].id).toBe("authored")
    expect(onDismiss.mock.calls[0][1]).toBe(0)
    expect(screen.getByText(/Negative Size/)).toBeTruthy()
  })

  it("recomputes when chartConfig data changes and prunes resolved dismissal state", async () => {
    const safeConfig = {
      ...unsafeConfig,
      props: {
        ...unsafeConfig.props,
        data: [
          { x: 1, y: 2, size: 4 },
          { x: 2, y: 3, size: 8 },
        ],
      },
    }
    const { rerender, container } = render(
      <ChartContainer chartConfig={unsafeConfig} dataAudit>
        <div>chart</div>
      </ChartContainer>,
    )
    await waitFor(() => expect(toggle()).toBeTruthy())
    fireEvent.click(toggle())
    fireEvent.click(
      screen.getByRole("button", { name: /Dismiss notification: Negative Size/ }),
    )
    expect(container.querySelector(".semiotic-chart-notifications")).toBeNull()

    rerender(
      <ChartContainer chartConfig={safeConfig} dataAudit>
        <div>chart</div>
      </ChartContainer>,
    )
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(container.querySelector(".semiotic-chart-notifications")).toBeNull()

    rerender(
      <ChartContainer chartConfig={unsafeConfig} dataAudit>
        <div>chart</div>
      </ChartContainer>,
    )
    await waitFor(() => expect(toggle()).toBeTruthy())
    fireEvent.click(toggle())
    expect(screen.getByText(/Negative Size · size/)).toBeTruthy()
  })

  it("preserves a dismissal across an equivalent inline config recomputation", async () => {
    const { rerender, container } = render(
      <ChartContainer chartConfig={unsafeConfig} dataAudit={{ max: 6 }}>
        <div>chart</div>
      </ChartContainer>,
    )
    await waitFor(() => expect(toggle()).toBeTruthy())
    fireEvent.click(toggle())
    fireEvent.click(
      screen.getByRole("button", { name: /Dismiss notification: Negative Size/ }),
    )

    rerender(
      <ChartContainer
        chartConfig={{
          component: unsafeConfig.component,
          props: { ...unsafeConfig.props, data: [...unsafeConfig.props.data] },
        }}
        dataAudit={{ max: 6 }}
      >
        <div>chart</div>
      </ChartContainer>,
    )
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(container.querySelector(".semiotic-chart-notifications-toggle")).toBeNull()
  })

  it("supports errorsOnly without hiding errors", async () => {
    const mixedConfig = {
      component: "BubbleChart",
      props: {
        data: [
          { x: 1, y: 2, size: 4 },
          { x: 1, y: 3, size: -2 },
        ],
        xAccessor: "x",
        yAccessor: "y",
        sizeBy: "size",
      },
    }
    render(
      <ChartContainer chartConfig={mixedConfig} dataAudit={{ errorsOnly: true }}>
        <div>chart</div>
      </ChartContainer>,
    )
    await waitFor(() => expect(toggle()).toBeTruthy())
    fireEvent.click(toggle())
    expect(screen.getByText(/Negative Size/)).toBeTruthy()
    expect(screen.queryByText(/Zero Span Domain/)).toBeNull()
  })

  it("remains inert without chartConfig", () => {
    const { container: noConfig } = render(
      <ChartContainer dataAudit>
        <div>chart</div>
      </ChartContainer>,
    )
    expect(noConfig.querySelector(".semiotic-chart-notifications")).toBeNull()
  })
})
