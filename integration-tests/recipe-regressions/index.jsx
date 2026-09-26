import React, { useEffect, useMemo, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import Bounds from "./Bounds"
import PositionedNetworks from "./PositionedNetworks"
import { GeoCustomChart } from "../../dist/geo.module.min.js"
import { StreamPhysicsFrame } from "../../dist/physics.module.min.js"
import {
  chargeGateRegion,
  isometricLandmarkLayout
} from "../../dist/semiotic-recipes.module.min.js"

const points = [
  { id: "corner", name: "Corner City", kind: "city", lon: 0.5, lat: 0.5 },
  { id: "middle", name: "Middle Monument", kind: "monument", lon: 0, lat: 0 }
]
const margin = { left: 20, right: 20, top: 20, bottom: 20 }
const spawns = [
  {
    id: "body-a",
    x: 100,
    y: 100,
    shape: { type: "circle", radius: 12 },
    datum: { name: "First parcel" }
  },
  {
    id: "body-b",
    x: 200,
    y: 100,
    shape: { type: "circle", radius: 12 },
    datum: { name: "Second parcel" }
  }
]
const physicsConfig = {
  kernel: { gravity: { x: 0, y: 0 }, sleepAfter: 0.1, sleepSpeed: 1 },
  settleStepLimit: 30
}

function RegionChart({ width }) {
  // Use the frame here to inspect per-body region state and worker execution.
  const ref = useRef(null)
  const [execution, setExecution] = useState("pending")
  const [entries, setEntries] = useState({})
  const regions = useMemo(
    () => [
      chargeGateRegion({
        id: "gate",
        x: 150,
        y: 100,
        width: 200,
        height: 80,
        attributes: ({ body, region, regionState }) => ({
          primitive: "spoofed",
          parcel: body.datum.name,
          region: region.id,
          previousEnergy: regionState.energy
        }),
        onEnter: (event) =>
          setEntries((previous) => ({
            ...previous,
            [event.bodyId]: event.regionState.attributes
          }))
      })
    ],
    []
  )
  return (
    <section data-testid="region-chart">
      <button
        onClick={() =>
          ref.current.push({
            ...spawns[0],
            id: "body-c",
            x: 150,
            datum: { name: "Pushed parcel" }
          })
        }
      >
        Push parcel
      </button>
      <output data-testid="execution">{execution}</output>
      <output data-testid="region-entries">{JSON.stringify(entries)}</output>
      <StreamPhysicsFrame
        ref={ref}
        size={[width, 240]}
        margin={margin}
        initialSpawns={spawns}
        config={physicsConfig}
        regionEffects={regions}
        simulationExecution={
          new URLSearchParams(location.search).get("execution") ?? "sync"
        }
        onSimulationExecutionChange={(state) => setExecution(state.execution)}
        title="Parcel gate"
        description="Parcels retain their per-body region attributes."
        bodyStyle={{ fill: "#146a8a" }}
        tooltipContent={({ body }) => {
          const attributes = ref.current?.getRegionState(body.id)?.attributes
          return (
            <div>
              {attributes?.parcel}: {attributes?.primitive}
            </div>
          )
        }}
      />
    </section>
  )
}

function App() {
  const [width, setWidth] = useState(500)
  const [reversed, setReversed] = useState(false)
  const ref = useRef(null)
  const pushMode = new URLSearchParams(location.search).get("input") === "push"
  useEffect(() => {
    if (!pushMode) return
    ref.current.clear()
    ref.current.pushMany(reversed ? [...points].reverse() : points)
  }, [pushMode, reversed])
  return (
    <main>
      <button onClick={() => setWidth(380)}>Resize charts</button>
      <button onClick={() => setReversed((value) => !value)}>
        Reverse landmarks
      </button>
      <section data-testid="landmark-chart">
        <GeoCustomChart
          ref={ref}
          points={
            pushMode ? undefined : reversed ? [...points].reverse() : points
          }
          layout={isometricLandmarkLayout}
          layoutConfig={{
            center: { lon: 0, lat: 0 },
            gridSize: 3,
            gridRadiusKm: 75
          }}
          width={width}
          height={280}
          margin={margin}
          title="Local landmarks"
          description="City and monument in their geographic cells."
          tooltip={(datum) => (
            <div>
              {datum.name} [{datum.gridRow},{datum.gridColumn}]
            </div>
          )}
        />
      </section>
      <RegionChart width={width} />
    </main>
  )
}

createRoot(document.getElementById("root")).render(
  new URLSearchParams(location.search).get("case") === "positioned" ? <PositionedNetworks /> :
  new URLSearchParams(location.search).get("case") === "bounds" ? <Bounds /> : <App />
)
