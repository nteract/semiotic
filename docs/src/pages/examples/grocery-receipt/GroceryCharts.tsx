import React, { useEffect, useRef, useState } from "react"
import { BarChart } from "semiotic/ordinal"
import { LineChart } from "semiotic/xy"
import { contributionChartProps, historySeries } from "./chart-config"
import { money, monthName, percent, summary } from "./format"
import type { PreparedBasket } from "./types"

function useChartWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(620)
  useEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver((entries) =>
      setWidth(Math.max(180, Math.floor(entries[0].contentRect.width))),
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return { ref, width }
}

export function ContributionChart({ receipt }: { receipt: PreparedBasket }) {
  const { ref, width } = useChartWidth()
  const props = contributionChartProps(receipt)
  return (
    <div ref={ref} className="grocery-contribution-chart">
      {props.data.length > 0 ? (
        <BarChart
          {...props}
          width={width}
          colorScheme={["#36644c"]}
          valueFormat={(value) => money(Number(value))}
        />
      ) : (
        <p>No eligible contributions to draw.</p>
      )}
    </div>
  )
}

export function HistoryCharts({ receipt }: { receipt: PreparedBasket }) {
  const { ref, width } = useChartWidth()
  return (
    <div ref={ref} className="grocery-history-charts">
      {(["costUSD", "yearChangePct"] as const).map((measure) => {
        const data = historySeries(receipt, measure)
        const title =
          measure === "costUSD"
            ? "The price level: cost of this basket"
            : "The rate: change from 12 months earlier"
        return (
          <figure key={measure}>
            <figcaption>{title}</figcaption>
            {data.length > 0 ? (
              <LineChart
                data={data}
                xAccessor="monthIndex"
                yAccessor="value"
                lineBy="segment"
                width={width}
                height={250}
                xExtent={[0, 83]}
                yExtent={
                  measure === "costUSD"
                    ? [0, Math.max(...data.map((row) => row.value)) * 1.1 || 1]
                    : undefined
                }
                xLabel="Observation month"
                yLabel={measure === "costUSD" ? "Basket cost (USD)" : "12-month change (%)"}
                xFormat={(value) => {
                  const month = receipt.history[Math.round(Number(value))]?.month
                  return month ? `${month.slice(0, 4)}-${month.slice(5)}` : ""
                }}
                yFormat={(value) =>
                  measure === "costUSD" ? money(Number(value), 0) : percent(Number(value))
                }
                colorScheme={[measure === "costUSD" ? "#36644c" : "#a3462e"]}
                showLegend={false}
                margin={{ left: 65, right: 20, top: 20, bottom: 55 }}
                title={title}
                description="Fixed quantities and fixed subset membership. Gaps are missing prices, not zero cost."
                summary={summary(receipt)}
                accessibleTable
              />
            ) : (
              <p>The selected scope has no eligible values.</p>
            )}
          </figure>
        )
      })}
      <details>
        <summary>Read the monthly values</summary>
        <div
          className="grocery-table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Monthly basket values"
        >
          <table>
            <caption>
              {receipt.scope} USD basket costs and percentage changes. Unavailable means a required
              price is missing or the previous-year denominator is zero.
            </caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col">Cost (USD)</th>
                <th scope="col">12-month change</th>
              </tr>
            </thead>
            <tbody>
              {receipt.history.map((row) => (
                <tr key={row.month}>
                  <th scope="row">{monthName(row.month)}</th>
                  <td>{money(row.costUSD, 3)}</td>
                  <td>{percent(row.yearChangePct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
