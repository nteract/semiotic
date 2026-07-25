import React, { useEffect, useState } from "react"
import {
  GeoCustomChart,
  geographicDotGridLayout,
  geographicGridLayout,
  resolveReferenceGeography,
} from "semiotic/geo"
import {
  US_REGION_COLORS,
  US_STATE_GRID,
  formatPopulation,
  worldLatitudeColor,
} from "./data/geographicGridData"

const gridFrameProps = {
  background: "transparent",
  transition: { duration: 500 },
}

const dotFrameProps = {
  background: "#08171d",
  transition: { duration: 0 },
  introAnimation: false,
}

const excludeAntarctica = (feature) => String(feature.id) !== "010"

function useReferenceAreas(reference) {
  const [areas, setAreas] = useState(null)

  useEffect(() => {
    let active = true
    resolveReferenceGeography(reference)
      .then((features) => {
        if (active) setAreas(features)
      })
      .catch(() => {
        if (active) setAreas([])
      })
    return () => {
      active = false
    }
  }, [reference])

  return areas
}

function DotGridLoading({ width, height, children }) {
  return (
    <div
      role="status"
      style={{
        width,
        height,
        display: "grid",
        placeItems: "center",
        color: "#9db1b8",
        background: "#08171d",
        borderRadius: 8,
      }}
    >
      {children}
    </div>
  )
}

const dotStyle = (datum) => ({
  fillOpacity:
    0.58
    + (((datum.gridColumn * 17 + datum.gridRow * 31) % 7) / 7) * 0.38,
})

export function USDotGrid({ width = 720, height = 430 }) {
  const countries = useReferenceAreas("world-110m")
  const usa = countries?.filter((feature) => String(feature.id) === "840")

  if (!countries) {
    return (
      <DotGridLoading width={width} height={height}>
        Sampling the U.S. land mask…
      </DotGridLoading>
    )
  }

  return (
    <GeoCustomChart
      areas={usa ?? []}
      projection="albersUsa"
      layout={geographicDotGridLayout}
      layoutConfig={{
        columns: width < 620 ? 58 : 86,
        radiusRatio: 0.25,
        fillAccessor: (d) => d.latitude > 44 ? "#a9f4e9" : "#55d7d3",
        markStyle: dotStyle,
      }}
      width={width}
      height={height}
      margin={0}
      animate={false}
      accessibleTable={false}
      description="The United States sampled onto a regular projected lattice."
      summary="Every grid-cell center inside the projected U.S. land mask is rendered as a dot. The dots collectively preserve the geographic silhouette."
      frameProps={dotFrameProps}
    />
  )
}

export function WorldDotGrid({ width = 900, height = 470 }) {
  const land = useReferenceAreas("world-110m")

  if (!land) {
    return (
      <DotGridLoading width={width} height={height}>
        Sampling the world land mask…
      </DotGridLoading>
    )
  }

  return (
    <GeoCustomChart
      areas={land}
      projection="equalEarth"
      layout={geographicDotGridLayout}
      layoutConfig={{
        columns: width < 620 ? 66 : 104,
        radiusRatio: 0.23,
        featureFilter: excludeAntarctica,
        fillAccessor: (d) => d.latitude > 0 ? "#85ede1" : "#3bb9c5",
        markStyle: dotStyle,
      }}
      width={width}
      height={height}
      margin={0}
      animate={false}
      accessibleTable={false}
      description="World land sampled onto a regular Equal Earth lattice."
      summary="Every projected grid-cell center inside the Natural Earth land mask becomes a dot. Coastlines emerge from the retained cells; Antarctica is omitted."
      frameProps={dotFrameProps}
    />
  )
}

const stateLayoutBase = {
  source: "points",
  rowAccessor: "gridRow",
  columnAccessor: "gridColumn",
  idAccessor: "id",
  labelAccessor: "abbr",
  categoryAccessor: "region",
  layoutPadding: 12,
  cellPadding: 0.1,
  maxLabelLength: 2,
  labelFontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  markStyle: { stroke: "rgba(255,255,255,0.82)", strokeWidth: 1.25 },
}

export function USCircleGrid({ width = 720, height = 430 }) {
  return (
    <GeoCustomChart
      points={US_STATE_GRID}
      xAccessor="gridColumn"
      yAccessor="gridRow"
      projection="equirectangular"
      layout={geographicGridLayout}
      layoutConfig={{ ...stateLayoutBase, shape: "circle" }}
      colorScheme={US_REGION_COLORS}
      width={width}
      height={height}
      margin={0}
      enableHover
      accessibleTable
      tooltip={stateTooltip}
      description="The fifty U.S. states arranged as equal circles on a geographic grid."
      summary="Each state receives one equal mark. Position preserves broad geography and color identifies Census region."
      frameProps={gridFrameProps}
    />
  )
}

export function USSquareCartogram({ width = 720, height = 430 }) {
  return (
    <GeoCustomChart
      points={US_STATE_GRID}
      xAccessor="gridColumn"
      yAccessor="gridRow"
      projection="equirectangular"
      layout={geographicGridLayout}
      layoutConfig={{ ...stateLayoutBase, shape: "square", cellPadding: 0.04 }}
      colorScheme={US_REGION_COLORS}
      width={width}
      height={height}
      margin={0}
      enableHover
      accessibleTable
      tooltip={stateTooltip}
      description="A square tile-grid cartogram of the fifty U.S. states."
      summary="Every state occupies the same square area. The authored grid preserves broad west-to-east and north-to-south position."
      frameProps={gridFrameProps}
    />
  )
}

export function WorldCircleGrid({ width = 900, height = 470 }) {
  const areas = useReferenceAreas("world-110m")

  if (!areas) {
    return (
      <div
        role="status"
        style={{
          width,
          height,
          display: "grid",
          placeItems: "center",
          color: "var(--text-secondary)",
          background: "var(--surface-1)",
          borderRadius: 8,
        }}
      >
        Gridifying country centroids…
      </div>
    )
  }

  return (
    <GeoCustomChart
      areas={areas}
      projection="equalEarth"
      layout={geographicGridLayout}
      layoutConfig={{
        source: "areas",
        shape: "circle",
        columns: width < 620 ? 16 : 24,
        occupancy: 0.66,
        idAccessor: "id",
        labelAccessor: (d) => String(d.name ?? d.id).slice(0, 3).toUpperCase(),
        fillAccessor: worldLatitudeColor,
        layoutPadding: 10,
        cellPadding: 0.08,
        maxLabelLength: 3,
        labelFontSize: width < 620 ? 6.5 : 8,
        markStyle: { stroke: "rgba(255,255,255,0.72)", strokeWidth: 0.8 },
      }}
      width={width}
      height={height}
      margin={0}
      enableHover
      accessibleTable
      tooltip={(d) => (
        <div>
          <strong>{d.name ?? d.id}</strong>
          <br />
          One country · one circle
        </div>
      )}
      description="Natural Earth country centroids automatically snapped to a collision-free circle grid."
      summary="Countries receive equal circles. Their broad projected position is preserved while overlap and land-area dominance are removed."
      frameProps={gridFrameProps}
    />
  )
}

export default function GeographicGridMaps({ width = 760 }) {
  const compactWidth = Math.max(300, width)
  return (
    <div style={{ display: "grid", gap: 28 }}>
      <USDotGrid width={compactWidth} height={Math.round(compactWidth * 0.58)} />
      <WorldDotGrid width={compactWidth} height={Math.round(compactWidth * 0.52)} />
      <USCircleGrid width={compactWidth} height={Math.round(compactWidth * 0.58)} />
      <USSquareCartogram width={compactWidth} height={Math.round(compactWidth * 0.58)} />
      <WorldCircleGrid width={compactWidth} height={Math.round(compactWidth * 0.52)} />
    </div>
  )
}

function stateTooltip(datum) {
  return (
    <div>
      <strong>{datum.name}</strong>
      <br />
      {datum.region} · 2020 population {formatPopulation(datum.population)}
    </div>
  )
}
