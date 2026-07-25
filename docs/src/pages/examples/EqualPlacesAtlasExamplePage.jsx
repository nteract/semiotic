import React, { useEffect, useMemo, useState } from "react"
import {
  GeoCustomChart,
  geographicDotGridLayout,
  geographicGridLayout,
  resolveReferenceGeography,
} from "semiotic/geo"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  CENSUS_SOURCE,
  US_REGION_COLORS,
  US_STATE_GRID,
  WORLD_LATITUDE_COLORS,
  formatPopulation,
  worldLatitudeBand,
  worldLatitudeColor,
} from "../../examples/recipes/data/geographicGridData"
import "./EqualPlacesAtlasExamplePage.css"

const SHAPES = [
  { id: "circle", label: "Circles", note: "places as peers" },
  { id: "square", label: "Squares", note: "places as tiles" },
  { id: "hexagon", label: "Hexes", note: "places as cells" },
]

const SCOPE_COPY = {
  usa: {
    kicker: "50 states · authored grid",
    title: "The United States, with every state held equal",
    lede:
      "A conventional map lets Alaska dominate the page and makes Rhode Island nearly disappear. Here every state begins with one slot.",
  },
  world: {
    kicker: "Natural Earth · automatic grid",
    title: "The world, without a land-area hierarchy",
    lede:
      "Country centroids keep their broad geographic direction, but each country receives the same visual voice.",
  },
}

const DOT_SCOPE_COPY = {
  usa: {
    kicker: "U.S. land · projected lattice",
    title: "The United States, built from occupied grid cells",
    lede:
      "A regular screen-space grid meets an Albers USA projection. Cell centers that land inside the country become dots; all other cells stay dark.",
  },
  world: {
    kicker: "Natural Earth · projected lattice",
    title: "The world, sampled one grid cell at a time",
    lede:
      "Coastlines emerge from a dense Equal Earth lattice. These are not country symbols or random points—they are the occupied cells of a geographic mask.",
  },
}

const chartFrameProps = {
  background: "transparent",
  transition: { duration: 650 },
}

const dotChartFrameProps = {
  background: "transparent",
  transition: { duration: 0 },
  introAnimation: false,
}

const excludeAntarctica = (feature) => String(feature.id) !== "010"

export default function EqualPlacesAtlasExamplePage() {
  const [representation, setRepresentation] = useState("dots")
  const [scope, setScope] = useState("usa")
  const [shape, setShape] = useState("circle")
  const [sizing, setSizing] = useState("equal")
  const [density, setDensity] = useState("dense")
  const [worldAreas, setWorldAreas] = useState(null)
  const [selected, setSelected] = useState(null)
  const [width, hostRef] = useResponsiveWidth(300, 1040)

  useEffect(() => {
    let active = true
    resolveReferenceGeography("world-110m")
      .then((features) => {
        if (active) setWorldAreas(features)
      })
      .catch(() => {
        if (active) setWorldAreas([])
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    setSelected(null)
    if (scope === "world") setSizing("equal")
  }, [representation, scope])

  const chartWidth = Math.max(300, width)
  const isDotField = representation === "dots"
  const chartHeight = Math.round(chartWidth * 0.52)
  const copy = isDotField ? DOT_SCOPE_COPY[scope] : SCOPE_COPY[scope]
  const usaAreas = useMemo(
    () => worldAreas?.filter((feature) => String(feature.id) === "840") ?? [],
    [worldAreas]
  )
  const stateConfig = useMemo(
    () => ({
      source: "points",
      rowAccessor: "gridRow",
      columnAccessor: "gridColumn",
      idAccessor: "id",
      labelAccessor: "abbr",
      categoryAccessor: "region",
      shape,
      layoutPadding: chartWidth < 520 ? 5 : 18,
      cellPadding: shape === "square" ? 0.04 : 0.1,
      maxLabelLength: 2,
      labelFontSize: chartWidth < 520 ? 7 : 11,
      labelFontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      labelFontWeight: 800,
      ...(sizing === "population"
        ? {
            sizeAccessor: "population",
            sizeDomain: [0, 39538223],
            sizeRange: [0.22, 1],
          }
        : {}),
      markStyle: {
        stroke: "rgba(255,255,255,0.88)",
        strokeWidth: chartWidth < 520 ? 0.75 : 1.3,
      },
    }),
    [chartWidth, shape, sizing]
  )
  const worldConfig = useMemo(
    () => ({
      source: "areas",
      shape,
      columns: chartWidth < 520 ? 16 : 24,
      occupancy: 0.66,
      idAccessor: "id",
      labelAccessor: (d) =>
        String(d.name ?? d.id).slice(0, 3).toUpperCase(),
      fillAccessor: worldLatitudeColor,
      layoutPadding: chartWidth < 520 ? 4 : 12,
      cellPadding: shape === "square" ? 0.04 : 0.08,
      maxLabelLength: 3,
      labelFontSize: chartWidth < 520 ? 5.5 : 8,
      labelFontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      labelFontWeight: 750,
      markStyle: {
        stroke: "rgba(255,255,255,0.72)",
        strokeWidth: chartWidth < 520 ? 0.5 : 0.85,
      },
    }),
    [chartWidth, shape]
  )
  const dotConfig = useMemo(
    () => {
      const denseColumns =
        scope === "usa"
          ? chartWidth < 520 ? 58 : 90
          : chartWidth < 520 ? 68 : 112
      const columns =
        density === "dense"
          ? denseColumns
          : Math.round(denseColumns * 0.62)
      return {
        shape,
        columns,
        ...(scope === "world"
          ? {
              featureFilter: excludeAntarctica,
            }
          : {}),
        radiusRatio:
          shape === "square" ? 0.31 : shape === "hexagon" ? 0.28 : 0.235,
        fillAccessor: (datum) => {
          if (scope === "usa") {
            if (datum.longitude < -112) return "#9cf0e6"
            if (datum.longitude < -96) return "#55d7d3"
            return "#ef9b76"
          }
          if (datum.latitude > 30) return "#9cf0e6"
          if (datum.latitude > -12) return "#55d7d3"
          return "#ef9b76"
        },
        markStyle: (datum) => ({
          fillOpacity:
            0.56
            + (((datum.gridColumn * 17 + datum.gridRow * 31) % 9) / 9) * 0.42,
        }),
      }
    },
    [chartWidth, density, scope, shape]
  )
  const placeCount = scope === "usa" ? US_STATE_GRID.length : worldAreas?.length ?? 0
  const stageCount = isDotField ? dotConfig.columns : placeCount
  const stageCountLabel = isDotField ? "lattice columns" : "places shown"

  return (
    <ExamplePageLayout title="The Equal Places Atlas">
      <div className="epa-page">
        <header className="epa-hero">
          <p className="epa-overline">An atlas of geographic alternatives</p>
          <div className="epa-hero-grid">
            <div>
              <h2>What if geography were rendered cell by cell?</h2>
              <p>
                A projected land mask can become a field of occupied grid cells:
                dense enough for coastlines to emerge, regular enough that the
                construction stays visible. Switch to place tiles to compare
                that sampled-land view with equal-unit cartograms.
              </p>
            </div>
            <dl className="epa-principles">
              <div>
                <dt>01</dt>
                <dd>Lay down a regular grid</dd>
              </div>
              <div>
                <dt>02</dt>
                <dd>Test each cell against land</dd>
              </div>
              <div>
                <dt>03</dt>
                <dd>Make density a visible choice</dd>
              </div>
            </dl>
          </div>
        </header>

        <section className="epa-atlas" aria-labelledby="epa-atlas-title">
          <div className="epa-toolbar">
            <ControlGroup label="Representation">
              <AtlasButton
                active={isDotField}
                onClick={() => setRepresentation("dots")}
              >
                Land dots
              </AtlasButton>
              <AtlasButton
                active={!isDotField}
                onClick={() => setRepresentation("places")}
              >
                Place tiles
              </AtlasButton>
            </ControlGroup>

            <ControlGroup label="Geography">
              <AtlasButton
                active={scope === "usa"}
                onClick={() => setScope("usa")}
              >
                United States
              </AtlasButton>
              <AtlasButton
                active={scope === "world"}
                onClick={() => setScope("world")}
              >
                World
              </AtlasButton>
            </ControlGroup>

            <ControlGroup label="Mark">
              {SHAPES.map((option) => (
                <AtlasButton
                  key={option.id}
                  active={shape === option.id}
                  onClick={() => setShape(option.id)}
                  title={option.note}
                >
                  {option.label}
                </AtlasButton>
              ))}
            </ControlGroup>

            {isDotField ? (
              <ControlGroup label="Density">
                <AtlasButton
                  active={density === "dense"}
                  onClick={() => setDensity("dense")}
                >
                  Dense
                </AtlasButton>
                <AtlasButton
                  active={density === "airy"}
                  onClick={() => setDensity("airy")}
                >
                  Airy
                </AtlasButton>
              </ControlGroup>
            ) : (
              <ControlGroup label="Area means">
                <AtlasButton
                  active={sizing === "equal"}
                  onClick={() => setSizing("equal")}
                >
                  One place
                </AtlasButton>
                <AtlasButton
                  active={sizing === "population"}
                  disabled={scope === "world"}
                  onClick={() => setSizing("population")}
                  title={
                    scope === "world"
                      ? "The world view intentionally has no quantitative data"
                      : "Mark area follows 2020 Census population"
                  }
                >
                  Population
                </AtlasButton>
              </ControlGroup>
            )}
          </div>

          <div className="epa-stage-heading">
            <div>
              <p>{copy.kicker}</p>
              <h2 id="epa-atlas-title">{copy.title}</h2>
            </div>
            <div className="epa-count" aria-label={`${stageCount} ${stageCountLabel}`}>
              <strong>{stageCount || "…"}</strong>
              <span>{stageCountLabel}</span>
            </div>
          </div>
          <p className="epa-stage-lede">{copy.lede}</p>

          <div className="epa-chart-and-detail">
            <div className="epa-chart-shell" ref={hostRef}>
              {!worldAreas && (isDotField || scope === "world") ? (
                <div className="epa-loading" role="status">
                  <span />
                  Loading geographic mask
                </div>
              ) : (
                <GeoCustomChart
                  chartId="equal-places-atlas"
                  points={
                    !isDotField && scope === "usa"
                      ? US_STATE_GRID
                      : undefined
                  }
                  areas={
                    isDotField
                      ? scope === "usa" ? usaAreas : worldAreas ?? []
                      : scope === "world" ? worldAreas ?? [] : undefined
                  }
                  xAccessor={
                    !isDotField && scope === "usa"
                      ? "gridColumn"
                      : "lon"
                  }
                  yAccessor={
                    !isDotField && scope === "usa"
                      ? "gridRow"
                      : "lat"
                  }
                  projection={
                    isDotField && scope === "usa"
                      ? "albersUsa"
                      : scope === "world"
                        ? "equalEarth"
                        : "equirectangular"
                  }
                  layout={
                    isDotField
                      ? geographicDotGridLayout
                      : geographicGridLayout
                  }
                  layoutConfig={
                    isDotField
                      ? dotConfig
                      : scope === "usa" ? stateConfig : worldConfig
                  }
                  colorScheme={
                    !isDotField && scope === "usa"
                      ? US_REGION_COLORS
                      : undefined
                  }
                  width={chartWidth}
                  height={chartHeight}
                  margin={0}
                  animate={!isDotField}
                  enableHover={!isDotField}
                  accessibleTable={!isDotField}
                  mobileInteraction={
                    isDotField
                      ? undefined
                      : {
                          tapToSelect: true,
                          tapToLockTooltip: true,
                          clearSelection: "backgroundTap",
                          targetSize: 40,
                        }
                  }
                  onClick={
                    isDotField
                      ? undefined
                      : (datum) => setSelected(datum)
                  }
                  tooltip={
                    isDotField
                      ? undefined
                      : scope === "usa" ? StateTooltip : WorldTooltip
                  }
                  description={`${copy.title}. ${copy.lede}`}
                  summary={
                    isDotField
                      ? `${scope === "usa" ? "United States" : "World"} land is sampled on a regular ${dotConfig.columns}-column projected lattice. Grid-cell centers inside the land mask are shown as ${shape}s; outside cells are omitted.`
                      : `${placeCount} places shown as ${shape}s. ${
                          sizing === "population"
                            ? "Mark area encodes 2020 resident population."
                            : "Every place receives equal mark area."
                        } Select a mark for details.`
                  }
                  frameProps={
                    isDotField
                      ? dotChartFrameProps
                      : chartFrameProps
                  }
                />
              )}
            </div>

            <PlaceDetail
              datum={selected}
              scope={scope}
              sizing={sizing}
              shape={shape}
              representation={representation}
              columns={dotConfig.columns}
            />
          </div>

          <div className="epa-legend">
            {isDotField ? (
              <>
                <span>
                  <i className="epa-key-dot epa-key-dot--inside" />
                  Cell center inside land
                </span>
                <span>
                  <i className="epa-key-dot epa-key-dot--outside" />
                  Cell center outside land
                </span>
              </>
            ) : scope === "usa" ? (
              Object.entries(US_REGION_COLORS).map(([label, color]) => (
                <span key={label}>
                  <i style={{ background: color }} />
                  {label}
                </span>
              ))
            ) : (
              Object.entries(WORLD_LATITUDE_COLORS).map(([label, color]) => (
                <span key={label}>
                  <i style={{ background: color }} />
                  {label}
                </span>
              ))
            )}
          </div>
        </section>

        <section className="epa-reading">
          <p className="epa-overline">How to read a map that is not a map</p>
          <div className="epa-reading-grid">
            <article>
              <span className="epa-mark epa-mark--dots" />
              <h2>Dots turn polygons into signal</h2>
              <p>
                A dot field still carries projected area and coastline, but its
                visible unit is the sample cell. More columns reveal finer
                edges; fewer columns make the raster construction explicit.
              </p>
            </article>
            <article>
              <span className="epa-mark epa-mark--square" />
              <h2>Squares make a table geographic</h2>
              <p>
                A tile cartogram is a table with a spatial memory. It keeps broad
                direction and familiar neighbors while making alignment and
                label scanning unusually strong.
              </p>
            </article>
            <article>
              <span className="epa-mark epa-mark--circle" />
              <h2>Circles can refuse territory</h2>
              <p>
                Switch to place tiles and equal circles give every state or
                country one visual voice. That is a different question from
                sampling land, so the interface names the representation.
              </p>
            </article>
          </div>
        </section>

        <section className="epa-method">
          <div>
            <p className="epa-overline">Method</p>
            <h2>Two grid contracts, one geographic scene</h2>
          </div>
          <div className="epa-method-copy">
            <p>
              <code>geographicDotGridLayout</code> samples fitted polygons in
              screen space. It inverts each lattice center through the current
              projection, tests that longitude/latitude against the GeoJSON
              mask, and emits a mark only for occupied cells. The chart-wide
              origin keeps the grid regular through resizing.
            </p>
            <p>
              <code>geographicGridLayout</code> remains alongside it for a
              separate task: one mark per named place. The U.S. version uses an
              authored state table; the world version snaps projected country
              centroids to free cells. Both paths emit native{" "}
              <code>GeoCustomChart</code> scene nodes for canvas performance,
              SSR, selection, and reusable styling.
            </p>
            <p className="epa-source">
              U.S. population:{" "}
              <a href={CENSUS_SOURCE} target="_blank" rel="noopener noreferrer">
                2020 Census resident population
              </a>
              . World geometry: Natural Earth via the bundled world-atlas
              reference. Coarse dot grids can omit islands smaller than a sample
              cell; place grids intentionally make boundaries, exact distance,
              and land area schematic.
            </p>
          </div>
        </section>
      </div>
    </ExamplePageLayout>
  )
}

function ControlGroup({ label, children }) {
  return (
    <div className="epa-control-group">
      <span>{label}</span>
      <div role="group" aria-label={label}>
        {children}
      </div>
    </div>
  )
}

function AtlasButton({ active, children, ...props }) {
  return (
    <button
      type="button"
      className={active ? "is-active" : ""}
      aria-pressed={active}
      {...props}
    >
      {children}
    </button>
  )
}

function PlaceDetail({
  datum,
  scope,
  sizing,
  shape,
  representation,
  columns,
}) {
  if (representation === "dots") {
    return (
      <aside className="epa-detail epa-detail--sample">
        <p className="epa-detail-index">SAMPLE RULE</p>
        <h3>One cell, one test</h3>
        <p>
          Semiotic inverts each projected grid center. If that geographic point
          falls inside the land mask, this view draws a {shape}; otherwise it
          draws nothing.
        </p>
        <dl>
          <div>
            <dt>Grid</dt>
            <dd>{columns} columns</dd>
          </div>
          <div>
            <dt>Unit</dt>
            <dd>Occupied cell</dd>
          </div>
          <div>
            <dt>Projection</dt>
            <dd>{scope === "usa" ? "Albers USA" : "Equal Earth"}</dd>
          </div>
        </dl>
      </aside>
    )
  }

  if (!datum) {
    return (
      <aside className="epa-detail">
        <p className="epa-detail-index">FIELD NOTE</p>
        <h3>Select a place</h3>
        <p>
          Hover for a quick reading. Click, tap, or use the chart keyboard
          navigation to hold a place in this field note.
        </p>
        <dl>
          <div>
            <dt>Unit</dt>
            <dd>{scope === "usa" ? "State" : "Country"}</dd>
          </div>
          <div>
            <dt>Mark</dt>
            <dd>{shape}</dd>
          </div>
          <div>
            <dt>Area</dt>
            <dd>{sizing === "equal" ? "One place" : "Population"}</dd>
          </div>
        </dl>
      </aside>
    )
  }

  const name = datum.name ?? datum.label ?? datum.id
  return (
    <aside className="epa-detail" aria-live="polite">
      <p className="epa-detail-index">
        CELL {Number(datum.gridRow) + 1} · {Number(datum.gridColumn) + 1}
      </p>
      <h3>{name}</h3>
      {scope === "usa" ? (
        <>
          <p>
            {datum.abbr} receives one authored slot in the U.S. table. Its
            location is schematic, not a projected centroid.
          </p>
          <dl>
            <div>
              <dt>Region</dt>
              <dd>{datum.region}</dd>
            </div>
            <div>
              <dt>2020 population</dt>
              <dd>{formatPopulation(datum.population)}</dd>
            </div>
            <div>
              <dt>Area now means</dt>
              <dd>{sizing === "equal" ? "State identity" : "Population"}</dd>
            </div>
          </dl>
        </>
      ) : (
        <>
          <p>
            The projected country centroid was snapped to a unique grid cell.
            Broad direction survives; exact boundary and distance do not.
          </p>
          <dl>
            <div>
              <dt>Latitude band</dt>
              <dd>{worldLatitudeBand(datum)}</dd>
            </div>
            <div>
              <dt>Area now means</dt>
              <dd>Country identity</dd>
            </div>
            <div>
              <dt>Source geometry</dt>
              <dd>Natural Earth</dd>
            </div>
          </dl>
        </>
      )}
    </aside>
  )
}

function StateTooltip(datum) {
  return (
    <div className="epa-tooltip">
      <strong>{datum.name}</strong>
      <span>{datum.region}</span>
      <small>2020 population {formatPopulation(datum.population)}</small>
    </div>
  )
}

function WorldTooltip(datum) {
  return (
    <div className="epa-tooltip">
      <strong>{datum.name ?? datum.id}</strong>
      <span>{worldLatitudeBand(datum)}</span>
      <small>One country · one mark</small>
    </div>
  )
}
