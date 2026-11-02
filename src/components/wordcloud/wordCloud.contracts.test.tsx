import * as React from "react"
import { describe, expect, it, vi } from "vitest"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { WordCloud, type WordCloudProps } from "../charts/wordcloud/WordCloud"
import { normalizeWordCloudInput } from "./normalizeWordCloudInput"
import type { WordCloudLayoutResult } from "./types"
import fixture from "./wordCloud.fixture.json"
import { SelectionProvider } from "../store/SelectionStore"
import { useSelection } from "../store/useSelection"
import { wordCloudTableScene } from "./wordCloudTable"
import { extractAllRows } from "../stream/accessibleDataRows"
import { toConfig } from "../export/chartConfig"
import {
  artifactConfigurationValue,
  artifactDataValue
} from "../artifact/identity"

const data = fixture.options.data.map((row) =>
  Object.freeze({ term: row.text, count: row.value })
)
function configured(patch: Partial<WordCloudProps> = {}): WordCloudProps {
  const props = {
    ...fixture.options,
    data,
    textAccessor: "term",
    valueAccessor: "count",
    ...patch
  } as WordCloudProps
  const normalized = normalizeWordCloudInput(props)
  return {
    ...props,
    layout: {
      ...fixture.layout,
      inputFingerprint: normalized.inputFingerprint,
      inputCount: props.data.length,
      omitted: normalized.omitted,
      words: fixture.layout.words.map((word) => ({
        ...word,
        sourceIndex: props.data.findIndex((row) => row?.term === word.text)
      }))
    } as WordCloudLayoutResult
  }
}

describe("WordCloud accessor contracts", () => {
  it.each(["multi", { mode: "multi" }] as const)(
    "uses normalized term and weight for tooltip %j",
    async (tooltip) => {
      const { container } = render(
        <WordCloud {...configured()} tooltip={tooltip} />
      )
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 30))
      })
      fireEvent.keyDown(container.querySelector(".stream-network-frame")!, {
        key: "Home"
      })
      const tip = container.querySelector(".stream-network-tooltip")!
      const row = data.find(
        (datum) => datum.term === tip.querySelector("strong")?.textContent
      )!
      expect(row).toBeDefined()
      expect(tip).toHaveTextContent(String(row.count))
    }
  )

  it.each([false, true])(
    "links callback accessors by explicit raw fields (callback id: %s)",
    async (withId) => {
      function Consumer() {
        const selection = useSelection({
          name: "callback-terms",
          fields: ["term"]
        })
        return (
          <output data-testid="linked-term">
            {selection.isActive
              ? data
                  .filter(selection.predicate)
                  .map((row) => row.term)
                  .join(",")
              : "none"}
          </output>
        )
      }
      const clicked = vi.fn()
      const { container } = render(
        <SelectionProvider>
          <Consumer />
          <WordCloud
            {...configured({
              textAccessor: (row) => row.term,
              idAccessor: withId ? (row) => row.term : undefined
            })}
            linkedHover={{ name: "callback-terms", fields: ["term"] }}
            onClick={clicked}
          />
        </SelectionProvider>
      )
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 30))
      })
      const frame = container.querySelector(".stream-network-frame")!
      fireEvent.keyDown(frame, { key: "Home" })
      const term = container.querySelector(
        ".stream-network-tooltip strong"
      )!.textContent!
      expect(screen.getByTestId("linked-term")).toHaveTextContent(term)
      fireEvent.keyDown(frame, { key: "Enter" })
      expect(clicked.mock.calls[0][0]).toBe(
        data.find((row) => row.term === term)
      )
      fireEvent.keyDown(frame, { key: "Escape" })
      expect(screen.getByTestId("linked-term")).toHaveTextContent("none")
    }
  )

  it("reports omitted rows whose value accessor cannot run, without crashing the chart", () => {
    const rows = [
      { term: "" },
      ...data.map((row) => ({ term: row.term, metrics: { count: row.count } }))
    ]
    const props = configured({
      data: rows,
      valueAccessor: (row) => row.metrics.count
    })
    const table = extractAllRows(wordCloudTableScene(props, props.layout))
    expect(table.at(-1)?.values).toMatchObject({
      value: "Invalid value",
      placement: "missing-text"
    })
    expect(() => renderToStaticMarkup(<WordCloud {...props} />)).not.toThrow()
  })

  it("excludes prepared term records from data-free configs and artifact configuration identity", () => {
    const props = configured()
    expect(
      toConfig("WordCloud", props, { includeData: false }).props
    ).not.toHaveProperty("layout")
    expect(artifactConfigurationValue(props)).not.toHaveProperty("layout")
    expect(artifactDataValue(props)).toMatchObject({
      data,
      layout: props.layout
    })
  })
})
