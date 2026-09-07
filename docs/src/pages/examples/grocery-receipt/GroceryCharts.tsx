import React, { useEffect, useRef, useState } from "react"
import { BarChart } from "semiotic/ordinal"
import { ConnectedScatterplot, LineChart } from "semiotic/xy"
import { ThemeProvider } from "semiotic/themes/react"
import { contributionChartProps, historySeries, trajectoryChartProps } from "./chart-config"
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
      <BasketTrajectory receipt={receipt} width={width} />
      <details>
        <summary>See cost and annual change separately over time</summary>
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
      </details>
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

function BasketTrajectory({ receipt, width }: { receipt: PreparedBasket; width: number }) {
  const props = trajectoryChartProps(receipt)
  const [month, setMonth] = useState("")
  const active = props.data.find((p) => p.month === month) ?? props.data.at(-1)
  const first = props.data[0]
  return (
    <figure className="grocery-trajectory" data-testid="grocery-trajectory">
      <figcaption>
        <h3>Follow the bill through time</h3>
      </figcaption>
      <p>
        Right means a bigger bill. Up means a faster rise from a year earlier. A path moving down
        while staying to the right shows how inflation can ease while shopping remains expensive.
      </p>
      {active && props.data.length > 1 ? (
        <>
          <ThemeProvider theme="light">
            <ConnectedScatterplot
              {...props}
              width={width}
              xFormat={(v) => money(Number(v), 0)}
              yFormat={(v) => `${Number(v).toFixed(0)}%`}
              annotations={[
                ...props.annotations,
                {
                  type: "callout",
                  radius: 5,
                  x: active.costUSD,
                  y: active.yearChangePct,
                  label: active.month,
                  dx:
                    active.costUSD >
                    (Math.min(...props.data.map((d) => d.costUSD)) +
                      Math.max(...props.data.map((d) => d.costUSD))) /
                      2
                      ? -45
                      : 35,
                  dy: -22,
                  color: "#23372c",
                },
              ]}
              onClick={(d) => {
                if (d && typeof d.month === "string") setMonth(d.month)
              }}
            />
          </ThemeProvider>
          <p className="grocery-small">
            Purple begins at {monthName(first.month)}; yellow ends at{" "}
            {monthName(props.data.at(-1)!.month)}. Lines connect consecutive months, not a fitted
            relationship. This is the latest complete run ending at your comparison month; earlier
            gaps remain visible in the separate time charts and table.
          </p>
          <label>
            Follow a month
            <select
              aria-label="Follow a basket month"
              value={active.month}
              onChange={(e) => setMonth(e.target.value)}
            >
              {props.data.map((d) => (
                <option key={d.month} value={d.month}>
                  {monthName(d.month)}
                </option>
              ))}
            </select>
          </label>
          <p role="status" data-testid="trajectory-reading">
            <b>{monthName(active.month)}</b>: {money(active.costUSD)} for this basket;{" "}
            {percent(active.yearChangePct)} from the same month a year earlier.
          </p>
        </>
      ) : (
        <p>
          At least two consecutive months with both a cost and a valid annual comparison are needed.
          Choose a later comparison month or inspect the missing prices in the monthly table.
        </p>
      )}
    </figure>
  )
}
