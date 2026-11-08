import React from "react"
import { LinkedCharts } from "semiotic/ai"
import { NetworkCustomChart } from "semiotic/network"
import { OrdinalCustomChart } from "semiotic/ordinal"
import { htmlCardLayout, selectableParallelLayout } from "./selectionLayouts"

const services = [
  { id: "orders", title: "Orders", meta: "REST · 1.2k rps" },
  { id: "payments", title: "Payments", meta: "gRPC · 480 rps" },
  { id: "inventory", title: "Inventory", meta: "queue · 90 rps" },
  { id: "shipping", title: "Shipping", meta: "batch · hourly" },
]
const connections = [
  { source: "orders", target: "payments" },
  { source: "orders", target: "inventory" },
  { source: "payments", target: "shipping" },
  { source: "inventory", target: "shipping" },
]
const cars = [
  { name: "compact", mpg: 32, hp: 95, weight: 2200, accel: 16, year: 2018 },
  { name: "sedan", mpg: 26, hp: 180, weight: 3100, accel: 12, year: 2019 },
  { name: "suv", mpg: 21, hp: 240, weight: 4200, accel: 10, year: 2020 },
  { name: "truck", mpg: 17, hp: 310, weight: 5400, accel: 9, year: 2017 },
  { name: "ev", mpg: 92, hp: 350, weight: 4400, accel: 6, year: 2022 },
  { name: "sport", mpg: 24, hp: 400, weight: 3200, accel: 5, year: 2021 },
  { name: "minivan", mpg: 22, hp: 280, weight: 4600, accel: 11, year: 2019 },
  { name: "hybrid", mpg: 52, hp: 130, weight: 3000, accel: 13, year: 2020 },
  { name: "wagon", mpg: 28, hp: 195, weight: 3400, accel: 11, year: 2018 },
  { name: "coupe", mpg: 25, hp: 320, weight: 3300, accel: 7, year: 2021 },
]
const parallelConfig = {
  fields: ["mpg", "hp", "weight", "accel", "year"],
  colorBy: "name",
  showPoints: true,
  opacity: 0.7,
  strokeWidth: 1.5,
}

export function HtmlMarksDemo() {
  return (
    <div data-testid="selection-html-marks">
      <LinkedCharts>
        <NetworkCustomChart
          nodes={services}
          edges={connections}
          layout={htmlCardLayout}
          width={720}
          height={200}
          responsiveWidth
          margin={{ top: 20, right: 24, bottom: 20, left: 24 }}
          animate={false}
          enableHover
          linkedHover={{ name: "service", fields: ["id"] }}
          selection={{ name: "service" }}
          tooltip={(d) => (
            <>
              <strong>{String(d.title ?? `${d.source} → ${d.target}`)}</strong>
              <div>{String(d.meta ?? "Service connection")}</div>
            </>
          )}
          title="Service connections"
          description="Orders connects to payments and inventory; both connect to shipping."
          summary="Hover a service to highlight its card without moving the graph."
          accessibleTable
        />
      </LinkedCharts>
      <p>Hover a card to dim its neighbors. Moving away restores every card.</p>
    </div>
  )
}

export function ParallelCoordinatesDemo() {
  return (
    <div data-testid="selection-parallel-coordinates">
      <LinkedCharts>
        <OrdinalCustomChart
          data={cars}
          layout={selectableParallelLayout}
          layoutConfig={parallelConfig}
          width={760}
          height={320}
          responsiveWidth
          margin={{ top: 30, right: 48, bottom: 20, left: 20 }}
          enableHover
          linkedHover={{ name: "vehicle", fields: ["name"] }}
          selection={{ name: "vehicle" }}
          tooltip={(d) => (
            <>
              <strong>{String(d.name)}</strong>
              <div>
                {String(d.mpg)} mpg · {String(d.hp)} hp
              </div>
            </>
          )}
          title="Vehicle profiles"
          description="Ten vehicles compared across five independently scaled measures."
          summary="The electric vehicle has the highest equivalent fuel efficiency."
          accessibleTable
        />
      </LinkedCharts>
      <p>Hover a line or point to highlight that vehicle without rebuilding its axes.</p>
    </div>
  )
}
