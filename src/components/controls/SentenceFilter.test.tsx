import * as React from "react"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import {
  SentenceFilter,
  type SentenceFilterDefinition,
  type SentenceFilterProps,
  type SentenceFilterValue,
} from "./SentenceFilter"

const subjectDefinition: SentenceFilterDefinition = {
  type: "select",
  label: "Subject",
  searchable: true,
  options: [
    { value: "love", label: "love" },
    { value: "death", label: "death", keywords: ["mortality"] },
    { value: "power", label: "power" },
  ],
}

function ControlledHarness({
  initial,
  onChange,
  ...props
}: Omit<SentenceFilterProps, "filters" | "onChange"> & {
  initial: Record<string, SentenceFilterValue>
  onChange?: SentenceFilterProps["onChange"]
}) {
  const [filters, setFilters] = React.useState(initial)
  return (
    <SentenceFilter
      {...props}
      filters={filters}
      onChange={(next, meta) => {
        setFilters(next)
        onChange?.(next, meta)
      }}
    />
  )
}

describe("SentenceFilter", () => {
  it("preserves punctuation and escaped braces while rendering repeated placeholders", () => {
    render(
      <SentenceFilter
        as="h2"
        sentence="Compare {{literal}} {subject}, then {subject}."
        filters={{ subject: "love" }}
        definitions={{ subject: subjectDefinition }}
        onChange={() => undefined}
      />,
    )

    const heading = screen.getByRole("heading", {
      name: "Compare {literal} love, then love.",
    })
    expect(heading).toHaveTextContent("Compare {literal} love, then love.")
    expect(within(heading).getAllByRole("button")).toHaveLength(2)
  })

  it("has deterministic, readable SSR output with no initially open popover", () => {
    const html = renderToString(
      <SentenceFilter
        as="h2"
        sentence="Explore {amount} sentences about {subject}."
        filters={{ amount: 20, subject: "love" }}
        definitions={{
          amount: { type: "number", label: "Number of sentences" },
          subject: subjectDefinition,
        }}
        onChange={() => undefined}
      />,
    )

    expect(html).toContain("data-semiotic-control=\"sentence-filter\"")
    expect(html).toContain("aria-label=\"Explore 20 sentences about love.\"")
    expect(html).toContain("data-sentence-filter-key=\"amount\"")
    expect(html).not.toContain("role=\"dialog\"")
  })

  it("renders an accessible sentence, navigates options, announces changes, and synchronizes repeats", () => {
    const onChange = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <ControlledHarness
        as="h2"
        sentence="Compare {subject} with {subject}."
        initial={{ subject: "love" }}
        definitions={{ subject: subjectDefinition }}
        onChange={onChange}
        onOpenChange={onOpenChange}
      />,
    )

    const heading = screen.getByRole("heading", { name: "Compare love with love." })
    const triggers = within(heading).getAllByRole("button", {
      name: "Subject: love. Activate to change.",
    })
    expect(triggers).toHaveLength(2)
    expect(triggers[0]).toHaveAttribute("aria-haspopup", "dialog")

    fireEvent.click(triggers[0], { detail: 1 })
    expect(onOpenChange).toHaveBeenLastCalledWith("subject")
    const dialog = screen.getByRole("dialog", { name: "Subject" })
    const search = within(dialog).getByRole("searchbox", { name: "Search Subject" })
    expect(search).toHaveFocus()

    fireEvent.change(search, { target: { value: "mort" } })
    fireEvent.keyDown(search, { key: "ArrowDown" })
    const death = within(dialog).getByRole("option", { name: "death" })
    expect(death).toHaveFocus()
    fireEvent.click(death, { detail: 1 })

    expect(onChange).toHaveBeenLastCalledWith(
      { subject: "death" },
      expect.objectContaining({
        key: "subject",
        previousValue: "love",
        value: "death",
        source: "pointer",
      }),
    )
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(triggers[0]).toHaveFocus()
    expect(screen.getAllByRole("button", {
      name: "Subject: death. Activate to change.",
    })).toHaveLength(2)
    expect(screen.getByRole("status")).toHaveTextContent(
      "Subject changed from love to death.",
    )
  })

  it("closes on Escape and outside interaction and returns focus to the active trigger", () => {
    render(
      <ControlledHarness
        sentence="About {subject}"
        initial={{ subject: "love" }}
        definitions={{ subject: subjectDefinition }}
      />,
    )
    const trigger = screen.getByRole("button", { name: /Subject: love/ })

    fireEvent.click(trigger)
    fireEvent.keyDown(document, { key: "Escape" })
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()

    fireEvent.click(trigger)
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it("fits above its trigger inside a shrunken visual viewport", () => {
    const viewportDescriptor = Object.getOwnPropertyDescriptor(window, "visualViewport")
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: {
        offsetLeft: 0,
        offsetTop: 0,
        width: 240,
        height: 220,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    })
    const bounds = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function mockBounds(this: HTMLElement) {
        if (this.matches("[data-sentence-filter-popover]")) {
          const width = Number.parseFloat(this.style.maxWidth) || 288
          const height = Number.parseFloat(this.style.maxHeight) || 384
          const left = 100 + (Number.parseFloat(this.style.left) || 0)
          return {
            x: left,
            y: 0,
            top: 0,
            left,
            right: left + width,
            bottom: height,
            width,
            height,
            toJSON: () => ({}),
          }
        }
        if (this.matches("button[data-sentence-filter-key]")) {
          return {
            x: 100,
            y: 180,
            top: 180,
            left: 100,
            right: 140,
            bottom: 200,
            width: 40,
            height: 20,
            toJSON: () => ({}),
          }
        }
        return {
          x: 0,
          y: 0,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: 0,
          height: 0,
          toJSON: () => ({}),
        }
      })
    const scrollHeight = vi.spyOn(HTMLElement.prototype, "scrollHeight", "get")
      .mockReturnValue(384)

    try {
      render(
        <SentenceFilter
          sentence="About {subject}"
          filters={{ subject: "love" }}
          definitions={{ subject: subjectDefinition }}
          onChange={() => undefined}
        />,
      )
      fireEvent.click(screen.getByRole("button", { name: /Subject: love/ }))
      const dialog = screen.getByRole("dialog", { name: "Subject" })
      expect(dialog.style.bottom).toBe("calc(100% + 0.5rem)")
      expect(dialog.style.maxHeight).toBe("156px")
      expect(dialog.style.maxWidth).toBe("208px")
    } finally {
      bounds.mockRestore()
      scrollHeight.mockRestore()
      if (viewportDescriptor) {
        Object.defineProperty(window, "visualViewport", viewportDescriptor)
      } else {
        Reflect.deleteProperty(window, "visualViewport")
      }
    }
  })

  it("closes stale popovers after external state changes and honors disabled and read-only modes", () => {
    const { rerender } = render(
      <SentenceFilter
        sentence="About {subject}"
        filters={{ subject: "love" }}
        definitions={{ subject: subjectDefinition }}
        onChange={() => undefined}
      />,
    )

    const trigger = screen.getByRole("button", { name: /Subject: love/ })
    fireEvent.click(trigger)
    expect(screen.getByRole("dialog", { name: "Subject" })).toBeInTheDocument()

    rerender(
      <SentenceFilter
        sentence="About {subject}"
        filters={{ subject: "death" }}
        definitions={{ subject: subjectDefinition }}
        onChange={() => undefined}
        readOnly
      />,
    )

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    const readOnlyTrigger = screen.getByRole("button", { name: /Subject: death/ })
    expect(readOnlyTrigger).toBeDisabled()
    fireEvent.click(readOnlyTrigger)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    rerender(
      <SentenceFilter
        sentence="About {subject}"
        filters={{ subject: "power" }}
        definitions={{ subject: subjectDefinition }}
        onChange={() => undefined}
        disabled
      />,
    )
    expect(screen.getByRole("button", { name: /Subject: power/ })).toBeDisabled()
  })

  it("inherits title typography while exposing responsive alignment and wrapping controls", () => {
    render(
      <SentenceFilter
        as="h3"
        className="chart-title-filter"
        sentence="About {subject}"
        filters={{ subject: "love" }}
        definitions={{ subject: subjectDefinition }}
        onChange={() => undefined}
        size="inherit"
        align="end"
        wrap={false}
      />,
    )

    const heading = screen.getByRole("heading", { level: 3, name: "About love" })
    expect(heading).toHaveClass("semiotic-sentence-filter", "chart-title-filter")
    expect(heading.style.fontFamily).toBe("inherit")
    expect(heading.style.fontSize).toBe("inherit")
    expect(heading.style.lineHeight).toBe("inherit")
    expect(heading.style.textAlign).toBe("end")
    expect(heading.style.whiteSpace).toBe("nowrap")
  })

  it("supports Home, End, typeahead, and keyboard source metadata in option lists", () => {
    const onChange = vi.fn()
    render(
      <SentenceFilter
        sentence="About {subject}"
        filters={{ subject: "love" }}
        definitions={{ subject: { ...subjectDefinition, searchable: false } }}
        onChange={onChange}
      />,
    )
    expect(screen.getByRole("group", { name: "About love" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /Subject: love/ }))
    const love = screen.getByRole("option", { name: "love" })
    const power = screen.getByRole("option", { name: "power" })
    expect(love).toHaveFocus()
    fireEvent.keyDown(love, { key: "End" })
    expect(power).toHaveFocus()
    fireEvent.keyDown(power, { key: "Home" })
    expect(love).toHaveFocus()
    fireEvent.keyDown(love, { key: "p" })
    expect(power).toHaveFocus()
    fireEvent.click(power, { detail: 0 })
    expect(onChange).toHaveBeenLastCalledWith(
      { subject: "power" },
      expect.objectContaining({ source: "keyboard", value: "power" }),
    )
  })

  it("supports multiselect, number, range, toggle, and text editors", () => {
    const definitions: Record<string, SentenceFilterDefinition> = {
      tags: {
        type: "multiselect",
        label: "Themes",
        options: [
          { value: "love", label: "love" },
          { value: "time", label: "time" },
        ],
      },
      amount: { type: "number", label: "Amount", min: 1, max: 20, inputMode: "both" },
      years: { type: "range", label: "Years", min: 1500, max: 1700 },
      annotated: {
        type: "toggle",
        label: "Annotations",
        trueLabel: "annotated",
        falseLabel: "plain",
      },
      query: {
        type: "text",
        label: "Query",
        suggestions: [{ value: "king", label: "king" }],
      },
    }
    render(
      <ControlledHarness
        sentence="{tags}; {amount}; {years}; {annotated}; {query}"
        initial={{
          tags: ["love"], amount: 5, years: [1550, 1650], annotated: false, query: "",
        }}
        definitions={definitions}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: /Themes:/ }))
    fireEvent.click(screen.getByRole("checkbox", { name: "time" }))
    expect(screen.getByRole("button", { name: /Themes: love and time/ })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: "Escape" })

    fireEvent.click(screen.getByRole("button", { name: /Amount: 5/ }))
    fireEvent.change(screen.getByRole("spinbutton", { name: "Amount" }), {
      target: { value: "10" },
    })
    expect(screen.getByRole("button", { name: /Amount: 10/ })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: "Escape" })

    fireEvent.click(screen.getByRole("button", { name: /Years: 1550 to 1650/ }))
    fireEvent.change(screen.getByRole("spinbutton", { name: "Minimum" }), {
      target: { value: "1575" },
    })
    expect(screen.getByRole("button", { name: /Years: 1575 to 1650/ })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: "Escape" })

    fireEvent.click(screen.getByRole("button", { name: /Annotations: plain/ }))
    fireEvent.click(screen.getByRole("option", { name: "annotated" }), { detail: 1 })
    expect(screen.getByRole("button", { name: /Annotations: annotated/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /Query: Any/ }))
    fireEvent.change(screen.getByRole("textbox", { name: "Query" }), {
      target: { value: "ki" },
    })
    fireEvent.click(screen.getByRole("option", { name: "king" }), { detail: 1 })
    expect(screen.getByRole("button", { name: /Query: king/ })).toBeInTheDocument()
  })

  it("supports defaultFilters, clear metadata, formatting, and a custom editor", () => {
    const onChange = vi.fn()
    render(
      <SentenceFilter
        sentence="Show {amount}"
        defaultFilters={{ amount: 2 }}
        definitions={{
          amount: {
            type: "number",
            label: "Amount",
            allowClear: true,
            emptyLabel: "any amount",
            formatValue: (value) => <strong>{value} items</strong>,
            getAccessibleValue: (value) => `${value} items`,
          },
        }}
        onChange={onChange}
        renderControl={({ setValue }) => (
          <button type="button" onClick={() => setValue(7)}>Seven</button>
        )}
      />,
    )

    const root = document.querySelector("[data-semiotic-control='sentence-filter']")!
    expect(root).toHaveAttribute("data-sentence-filter-state", "uncontrolled")
    expect(root).toHaveAttribute("aria-label", "Show 2 items")
    fireEvent.click(screen.getByRole("button", { name: /Amount: 2 items/ }))
    fireEvent.click(screen.getByRole("button", { name: "Seven" }))
    expect(onChange).toHaveBeenLastCalledWith(
      { amount: 7 },
      expect.objectContaining({ source: "programmatic", value: 7 }),
    )
    expect(screen.getByRole("button", { name: /Amount: 7 items/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Clear Amount" }))
    expect(onChange).toHaveBeenLastCalledWith(
      { amount: null },
      expect.objectContaining({ source: "clear", previousValue: 7, value: null }),
    )
    expect(screen.getByRole("button", { name: /Amount: any amount/ })).toBeInTheDocument()
  })

  it("warns once for unknown and missing template keys and leaves unknown text intact", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const { rerender } = render(
      <SentenceFilter
        sentence="{known} and {unknown}"
        filters={{}}
        definitions={{ known: { type: "text", label: "Known", emptyLabel: "nothing" } }}
      />,
    )
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("{known}"))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("{unknown}"))
    expect(document.querySelector("[data-semiotic-control='sentence-filter']"))
      .toHaveAttribute("aria-label", "nothing and {unknown}")
    const calls = warn.mock.calls.length
    rerender(
      <SentenceFilter
        sentence="{known} and {unknown}"
        filters={{}}
        definitions={{ known: { type: "text", label: "Known", emptyLabel: "nothing" } }}
      />,
    )
    expect(warn).toHaveBeenCalledTimes(calls)
    warn.mockRestore()
  })
})
