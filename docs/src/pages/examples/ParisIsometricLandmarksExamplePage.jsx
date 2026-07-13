import React, { useCallback, useEffect, useMemo, useState } from "react"
import { GeoCustomChart } from "semiotic/geo"
import {
  isometricLandmarkLayout,
  selectIsometricLandmarks,
  unwrapDatum,
  allocateCells,
} from "semiotic/recipes"
import CodeBlock from "../../components/CodeBlock"
import { StatStrip } from "../../components/StatStrip"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import { buildTerrainGrid, CITY_LANDMARKS, CITY_OPTIONS } from "./data/cityLandmarks"
import { fetchDbpediaLandmarks } from "./dbpediaParisLandmarks"
import {
  DBPEDIA_LANDMARK_DATA_ADAPTER,
  createDbpediaMixedProvenance,
  createDbpediaSnapshotProvenance,
} from "./dbpediaLandmarkDataState"
import { createLiveDataRequestVersioner } from "./liveDataAdapter"

const MIN_CHART_WIDTH = 620
const CHART_HEIGHT = 440
const ZOOM_LEVELS = [
  { gridSize: 3, tileWidth: 180, tileHeight: 90, resourceSpriteSize: 96, citySpriteSize: 132 },
  { gridSize: 5, tileWidth: 108, tileHeight: 54, resourceSpriteSize: 72, citySpriteSize: 104 },
  { gridSize: 7, tileWidth: 77, tileHeight: 38.5, resourceSpriteSize: 56, citySpriteSize: 80 },
  { gridSize: 9, tileWidth: 60, tileHeight: 30, resourceSpriteSize: 44, citySpriteSize: 64 },
]
const DEFAULT_ZOOM_INDEX = 1
const FEATURE_INTEREST = {
  city: 0,
  defense: 1,
  culture: 2,
  monument: 3,
  knowledge: 4,
  nature: 5,
  faith: 6,
  arena: 7,
  transport: 8,
}
const LANDMARK_SPRITES = {
  arena: new URL("../../../../map_icons/arena.png", import.meta.url).href,
  city: new URL("../../../../map_icons/city.png", import.meta.url).href,
  culture: new URL("../../../../map_icons/culture.png", import.meta.url).href,
  defense: new URL("../../../../map_icons/defense.png", import.meta.url).href,
  faith: new URL("../../../../map_icons/faith.png", import.meta.url).href,
  knowledge: new URL("../../../../map_icons/knowledge.png", import.meta.url).href,
  monument: new URL("../../../../map_icons/monument.png", import.meta.url).href,
  nature: new URL("../../../../map_icons/nature.png", import.meta.url).href,
  transport: new URL("../../../../map_icons/transport.png", import.meta.url).href,
}
const FEATURE_LEGEND = [
  ["city", "City"],
  ["culture", "Museum"],
  ["monument", "Monument"],
  ["faith", "Faith"],
  ["nature", "Green space"],
  ["knowledge", "University"],
  ["defense", "Castle"],
  ["arena", "Arena"],
  ["transport", "Transport"],
]
const TERRAIN_COLORS = {
  ocean: "#4d8192",
  urban: "#86866f",
  forest: "#4f7c4b",
  grassland: "#8eaa68",
  cropland: "#a6a568",
  wetland: "#668f79",
  scrub: "#9b9665",
}
const TERRAIN_LABELS = {
  ocean: "Ocean",
  urban: "Urban",
  forest: "Forest",
  grassland: "Grassland",
  cropland: "Cropland",
  wetland: "Wetland",
  scrub: "Scrubland",
}
const BASE_LAYOUT_CONFIG = {
  gridRadiusKm: 65,
  showCityLabel: true,
  candidatePriorityAccessor: (datum) =>
    (FEATURE_INTEREST[datum.kind] ?? 9) * 100 + (datum.source === "fixture" ? 1 : 0),
  sprites: LANDMARK_SPRITES,
  terrainColors: ["#78985c", "#86a568", "#6c8d55", "#91ad70"],
  terrainPalette: TERRAIN_COLORS,
  tileStroke: "#304936",
}
const FEATURE_TYPE_COLORS = {
  city: "#d8b45b",
  culture: "#a877b5",
  monument: "#c8b990",
  faith: "#d9c36d",
  nature: "#5f974f",
  knowledge: "#5f91b8",
  defense: "#8d9296",
  arena: "#cb8056",
  transport: "#6d9fc5",
}
const WAFFLE_CELL_COUNT = 50

const implementationCode = `import { GeoCustomChart } from "semiotic/geo"
import { isometricLandmarkLayout } from "semiotic/recipes"

const city = cityOptions[selectedCity]
const detail = zoomLevels[zoomIndex]

<GeoCustomChart
  points={landmarks}
  projection="equirectangular"
  layout={isometricLandmarkLayout}
  layoutConfig={{
    center: city.center,
    centerId: city.center.id,
    ...detail,
    gridRadiusKm: 65,
    // Replace any placeholder without changing layout geometry:
    sprites: { culture: "/sprites/museum.png" }
  }}
/>`

export default function ParisIsometricLandmarksExamplePage() {
  const [cityKey, setCityKey] = useState("paris")
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX)
  const city = CITY_LANDMARKS[cityKey]
  const zoom = ZOOM_LEVELS[zoomIndex]
  const [landmarks, setLandmarks] = useState(city.fixture)
  const [activeLandmark, setActiveLandmark] = useState(city.center)
  const [sourceState, setSourceState] = useState(() =>
    DBPEDIA_LANDMARK_DATA_ADAPTER.createDataAdapterState({
      kind: "snapshot",
      isLoading: true,
      message: "Showing the validated " + city.label + " snapshot while DBpedia is checked.",
      provenance: [createDbpediaSnapshotProvenance(city)],
    }),
  )
  const [requestVersioner] = useState(() => createLiveDataRequestVersioner())
  const transitionSourceState = useCallback(
    (action) => {
      setSourceState((current) =>
        DBPEDIA_LANDMARK_DATA_ADAPTER.transitionDataAdapter(current, action),
      )
    },
    [],
  )
  const [chartWidth, chartHostRef] = useResponsiveWidth(MIN_CHART_WIDTH, 860)
  const cityLayoutConfig = useMemo(() => {
    const center = { lon: city.center.lon, lat: city.center.lat }
    return {
      ...BASE_LAYOUT_CONFIG,
      center,
      centerId: city.center.id,
    }
  }, [city])
  const layoutConfig = useMemo(
    () => ({
      ...cityLayoutConfig,
      ...zoom,
      terrainByCell: buildTerrainGrid(city, zoom.gridSize),
    }),
    [city, cityLayoutConfig, zoom],
  )
  const validationLayoutConfig = useMemo(
    () => ({
      ...cityLayoutConfig,
      ...ZOOM_LEVELS[DEFAULT_ZOOM_INDEX],
      terrainByCell: buildTerrainGrid(city, 5),
    }),
    [city, cityLayoutConfig],
  )

  useEffect(() => {
    const requestId = requestVersioner.next()
    const controller = new AbortController()
    let timedOut = false
    transitionSourceState({
      type: "begin-load",
      requestId,
      message: "Showing the validated " + city.label + " snapshot while DBpedia is checked.",
    })
    const timeout = window.setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 9000)

    fetchDbpediaLandmarks(city.center, controller.signal)
      .then((nextLandmarks) => {
        if (controller.signal.aborted || !requestVersioner.isCurrent(requestId)) return
        const occupied = selectIsometricLandmarks(nextLandmarks, validationLayoutConfig).filter(
          (tile) => tile.landmark,
        ).length
        if (occupied < 12) {
          throw new Error("DBpedia result did not provide enough spatial coverage")
        }
        const liveIds = new Set(nextLandmarks.map((landmark) => landmark.id))
        const merged = [
          ...nextLandmarks,
          ...city.fixture.filter((landmark) => !liveIds.has(landmark.id)),
        ]
        const mergedOccupied = selectIsometricLandmarks(merged, validationLayoutConfig).filter(
          (tile) => tile.landmark,
        ).length
        setLandmarks(merged)
        transitionSourceState({
          type: "set-result",
          requestId,
          kind: "live",
          message:
            String(nextLandmarks.length - 1) +
            " current DBpedia landmarks filled " +
            String(occupied - 1) +
            " cells; the snapshot fills " +
            String(mergedOccupied - occupied) +
            " gaps.",
          provenance: createDbpediaMixedProvenance(city),
        })
      })
      .catch((error) => {
        // Switching cities aborts the previous request. It must not overwrite
        // the next city's source status with stale closure data.
        if (!requestVersioner.isCurrent(requestId)) return
        if (controller.signal.aborted && !timedOut) return
        transitionSourceState({
          type: "set-result",
          requestId,
          kind: "snapshot",
          message:
            error?.name !== "AbortError"
              ? "DBpedia was incomplete or unavailable; the validated " +
                city.label +
                " snapshot remains in view."
              : "DBpedia exceeded the response budget; the validated " +
                city.label +
                " snapshot remains in view.",
          provenance: [createDbpediaSnapshotProvenance(city)],
        })
      })
      .finally(() => window.clearTimeout(timeout))

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [city, requestVersioner, transitionSourceState, validationLayoutConfig])

  const selectedTiles = useMemo(
    () => selectIsometricLandmarks(landmarks, layoutConfig),
    [landmarks, layoutConfig],
  )
  const representedFeatures = selectedTiles.flatMap((tile) => tile.landmarks)
  const representedKinds = new Set(representedFeatures.map((landmark) => landmark.kind)).size
  const visibleTerrainKinds = [
    ...new Set(
      Object.values(layoutConfig.terrainByCell).map((cell) =>
        typeof cell === "string" ? cell : cell.kind,
      ),
    ),
  ]
  const activeFeatures =
    activeLandmark.kind !== "terrain" && activeLandmark.features?.length
      ? activeLandmark.features
      : activeLandmark.kind === "terrain"
        ? []
        : [activeLandmark]

  const handleObservation = useCallback(
    (observation) => {
      if (observation.type === "hover" && observation.datum) {
        const datum = unwrapDatum(observation.datum)
        if (datum?.kind) setActiveLandmark(datum)
      } else if (observation.type === "hover-end") {
        setActiveLandmark(city.center)
      }
    },
    [city],
  )

  const selectCity = useCallback(
    (nextKey) => {
      if (nextKey === cityKey) return
      const nextCity = CITY_LANDMARKS[nextKey]
      setCityKey(nextKey)
      setLandmarks(nextCity.fixture)
      setActiveLandmark(nextCity.center)
      transitionSourceState({
        type: "set-view",
        kind: "snapshot",
        message:
          "Showing the validated " + nextCity.label + " snapshot while DBpedia is checked.",
        provenance: [createDbpediaSnapshotProvenance(nextCity)],
      })
    },
    [cityKey, transitionSourceState],
  )

  return (
    <ExamplePageLayout
      title={cityKey === "paris" ? "Paris, Isometric City of Lights" : `Isometric ${city.label}`}
    >
      <nav aria-label="Choose a center city" style={styles.cityPicker}>
        <span style={styles.cityPickerLabel}>Center city</span>
        <div role="group" aria-label="Available cities" style={styles.cityOptions}>
          {CITY_OPTIONS.map((option) => {
            const active = option.key === cityKey
            return (
              <button
                key={option.key}
                type="button"
                aria-pressed={active}
                onClick={() => selectCity(option.key)}
                style={{
                  ...styles.cityOption,
                  ...(active ? styles.cityOptionActive : {}),
                }}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </nav>

      <p style={styles.lede}>
        One hundred kilometers around {city.label}, compressed into a {zoom.gridSize}-by-
        {zoom.gridSize} strategy-game board. Museums, monuments, universities, parks, castles,
        arenas, and transport hubs become civic resources on an isometric landscape.
      </p>

      <StatStrip
        items={[
          { value: `${zoom.gridSize} × ${zoom.gridSize}`, label: "isometric cells" },
          { value: Math.max(0, representedFeatures.length - 1), label: "mapped landmarks" },
          { value: representedKinds, label: "resource classes" },
          { value: "100 km", label: "DBpedia search radius" },
        ]}
      />

      <section style={styles.gameShell}>
        <div style={styles.gameHeader}>
          <div>
            <div style={styles.kicker}>{city.region} · landmark survey</div>
            <h2 style={styles.gameTitle}>A civic resource map</h2>
          </div>
          <div
            role="status"
            aria-live="polite"
            style={{
              ...styles.sourceStatus,
              ...(sourceState.kind === "live" ? styles.sourceStatusLive : {}),
            }}
          >
            <span style={styles.statusLamp} aria-hidden="true" />
            {sourceState.message}
          </div>
        </div>

        <div style={styles.mapToolbar}>
          <span style={styles.zoomLabel}>Grid detail</span>
          <div role="group" aria-label="Map zoom" style={styles.zoomControls}>
            <button
              type="button"
              aria-label="Zoom out"
              disabled={zoomIndex === 0}
              onClick={() => setZoomIndex((index) => Math.max(0, index - 1))}
              style={{
                ...styles.zoomButton,
                ...(zoomIndex === 0 ? styles.zoomButtonDisabled : {}),
              }}
            >
              −
            </button>
            <output aria-live="polite" style={styles.zoomReadout}>
              {zoom.gridSize} × {zoom.gridSize}
            </output>
            <button
              type="button"
              aria-label="Zoom in"
              disabled={zoomIndex === ZOOM_LEVELS.length - 1}
              onClick={() => setZoomIndex((index) => Math.min(ZOOM_LEVELS.length - 1, index + 1))}
              style={{
                ...styles.zoomButton,
                ...(zoomIndex === ZOOM_LEVELS.length - 1 ? styles.zoomButtonDisabled : {}),
              }}
            >
              +
            </button>
          </div>
          <span style={styles.zoomHint}>
            More cells reveal more landmarks; sprites shrink to preserve the board footprint.
          </span>
        </div>

        <div style={styles.inspector} aria-live="polite">
          <div style={styles.inspectorKind}>
            {(activeLandmark.kind === "terrain"
              ? activeLandmark.terrainKind
              : activeLandmark.kind || "city"
            ).toUpperCase()}
          </div>
          <strong data-testid="active-paris-landmark">{activeLandmark.name}</strong>
          <span>
            {activeLandmark.kind === "terrain"
              ? `${TERRAIN_LABELS[activeLandmark.terrainKind] ?? activeLandmark.terrainKind} surface`
              : activeFeatures.length > 1
                ? `${activeFeatures.length} mapped features in this cell`
                : activeLandmark.distanceKm
                  ? `${activeLandmark.distanceKm.toFixed(1)} km from ${city.label}`
                  : "The major city at the center of the board"}
          </span>
          {activeLandmark.uri && (
            <a href={activeLandmark.uri} target="_blank" rel="noopener noreferrer">
              DBpedia resource ↗
            </a>
          )}
        </div>

        <div ref={chartHostRef} style={styles.chartScroller}>
          <GeoCustomChart
            points={landmarks}
            projection="equirectangular"
            layout={isometricLandmarkLayout}
            layoutConfig={layoutConfig}
            width={chartWidth}
            height={CHART_HEIGHT}
            margin={{ top: 20, right: 24, bottom: 28, left: 24 }}
            enableHover
            onObservation={handleObservation}
            tooltip={(datum) => {
              const features = datum.features?.length ? datum.features : []
              return (
                <div style={styles.tooltip}>
                  <strong>{datum.name}</strong>
                  <span>
                    {datum.kind === "terrain"
                      ? datum.terrainKind
                      : features.length > 1
                        ? `${features.length} features in this cell`
                        : datum.kind}
                  </span>
                  {features.length > 7 && <FeatureMixWaffle features={features} />}
                  {features.length > 1 && (
                    <div
                      style={{
                        ...styles.tooltipFeatureList,
                        ...(features.length > 7 ? styles.tooltipFeatureListDense : {}),
                      }}
                    >
                      {features.map((feature) => (
                        <div key={feature.id} style={styles.tooltipFeature}>
                          <span>{feature.name}</span>
                          <small>{feature.kind}</small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            }}
            description={`An isometric ${zoom.gridSize}-by-${zoom.gridSize} grid centered on ${city.label}, with nearby landmarks represented by pixel-art civic resource icons.`}
            summary={`${Math.max(0, representedFeatures.length - 1)} landmarks across ${representedKinds} resource classes are currently represented.`}
            accessibleTable
            frameProps={{
              background: "#17241d",
              allowTooltipOverflow: true,
            }}
          />
        </div>

        <div style={styles.legend} aria-label="Landmark resource classes">
          {FEATURE_LEGEND.map(([kind, label]) => (
            <span key={kind} style={styles.legendItem}>
              <img
                src={LANDMARK_SPRITES[kind]}
                alt=""
                aria-hidden="true"
                style={styles.legendIcon}
              />
              {label}
            </span>
          ))}
          {visibleTerrainKinds.map((kind) => (
            <span key={kind} style={styles.legendItem}>
              <i
                style={{
                  ...styles.legendPixel,
                  background: TERRAIN_COLORS[kind] ?? "#78985c",
                }}
              />
              {TERRAIN_LABELS[kind] ?? kind}
            </span>
          ))}
        </div>
      </section>

      <section style={styles.editorial}>
        <h2>From coordinates to grid cells</h2>
        <p>
          The layout receives ordinary longitude and latitude records. It converts them into local
          kilometer offsets, assigns each landmark to a grid cell, and chooses one representative
          per cell using an explicit civic-interest rank followed by proximity. This lets a city
          such as Oakland take precedence over a less distinctive feature in the same cell.{" "}
          {city.label} is explicitly pinned to the center. Zooming changes grid resolution without
          changing geographic extent; count badges expose cells containing additional candidates.
        </p>

        <h2>A GeoFrame custom layout</h2>
        <p>
          Each diamond is a data-bearing GeoFrame area node, so polygon hit-testing, keyboard
          navigation, tooltips, observation events, accessibility, canvas rendering, and server
          rendering remain frame responsibilities. The pixel buildings are an SVG overlay anchored
          to the same layout result.
        </p>

        <CodeBlock language="jsx" showCopyButton code={implementationCode} />

        <h2>Replaceable pixel assets</h2>
        <p>
          The supplied transparent PNG resources render between 44 and 96 pixels as grid detail
          changes; the major city scales from 64 to 132 pixels. Supply replacement URLs through{" "}
          <code>layoutConfig.sprites</code> to replace categories without changing tile geometry or
          anchors.
        </p>

        <p style={styles.sourceNote}>
          Landmark candidates are requested from the{" "}
          <a href="https://dbpedia.org/sparql" target="_blank" rel="noopener noreferrer">
            DBpedia SPARQL endpoint
          </a>{" "}
          using a 100 km spatial filter. A checked-in, spatially validated snapshot keeps the
          example deterministic when the public endpoint is slow, unavailable, or returns
          insufficient coverage. Ocean coverage was sampled procedurally from Natural Earth
          coastline geometry.
        </p>
      </section>
    </ExamplePageLayout>
  )
}

function FeatureMixWaffle({ features }) {
  const { groups, cells } = allocateFeatureMix(features, WAFFLE_CELL_COUNT)
  return (
    <div
      style={styles.waffle}
      aria-label={`Feature mix: ${groups.map((group) => `${group.count} ${group.kind}`).join(", ")}`}
    >
      <div style={styles.waffleHeader}>
        <span>Feature mix</span>
        <span>{features.length} total</span>
      </div>
      <div style={styles.waffleGrid} aria-hidden="true">
        {cells.map((kind, index) => (
          <i
            key={`${kind}-${index}`}
            title={kind}
            style={{
              ...styles.wafflePixel,
              background: FEATURE_TYPE_COLORS[kind] ?? "#c8b990",
            }}
          />
        ))}
      </div>
      <div style={styles.waffleLegend}>
        {groups.map((group) => (
          <span key={group.kind}>
            <i
              style={{
                ...styles.waffleLegendPixel,
                background: FEATURE_TYPE_COLORS[group.kind] ?? "#c8b990",
              }}
            />
            {group.kind} {group.count}
          </span>
        ))}
      </div>
    </div>
  )
}

function allocateFeatureMix(features, cellCount) {
  const counts = new Map()
  for (const feature of features) {
    const kind = feature.kind || "monument"
    counts.set(kind, (counts.get(kind) ?? 0) + 1)
  }
  // Largest-remainder grid allocation (every kind keeps at least one cell) is
  // the recipe kit's `allocateCells`; we sort kinds by frequency first so the
  // waffle and its legend read in descending order.
  const ordered = [...counts]
    .map(([kind, count]) => ({ key: kind, weight: count }))
    .sort((a, b) => b.weight - a.weight || a.key.localeCompare(b.key))
  const groups = allocateCells(ordered, cellCount, { minPerCategory: 1 }).map((group) => ({
    kind: group.key,
    count: group.weight,
    cells: group.cells,
  }))

  return {
    groups,
    cells: groups.flatMap((group) => Array(group.cells).fill(group.kind)),
  }
}

const styles = {
  cityPicker: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px 18px",
    margin: "0 0 24px",
    padding: "12px",
    border: "1px solid var(--surface-3)",
    background: "var(--surface-1)",
  },
  cityPickerLabel: {
    color: "var(--text-secondary)",
    fontFamily: "monospace",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  cityOptions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  cityOption: {
    minHeight: 34,
    padding: "7px 12px",
    border: "1px solid var(--surface-3)",
    borderRadius: 3,
    background: "transparent",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: 700,
  },
  cityOptionActive: {
    border: "1px solid #78985c",
    background: "#1d2c24",
    color: "#f5edcf",
    boxShadow: "inset 0 -2px #d7b85c",
  },
  lede: {
    maxWidth: 820,
    margin: "0 0 28px",
    color: "var(--text-secondary)",
    fontSize: "clamp(1.05rem, 2.3vw, 1.35rem)",
    lineHeight: 1.6,
  },
  gameShell: {
    overflow: "visible",
    border: "1px solid #314936",
    borderRadius: 8,
    background: "#17241d",
    color: "#f5edcf",
    boxShadow: "0 22px 60px rgba(0,0,0,0.22)",
  },
  gameHeader: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 24,
    padding: "22px 24px 16px",
    borderBottom: "1px solid #314936",
  },
  kicker: {
    color: "#aabd8d",
    fontFamily: "monospace",
    fontSize: 11,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },
  gameTitle: {
    margin: "5px 0 0",
    color: "#f5edcf",
    fontFamily: "monospace",
    fontSize: 24,
  },
  sourceStatus: {
    maxWidth: 360,
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    color: "#c7cdb5",
    fontFamily: "monospace",
    fontSize: 11,
    lineHeight: 1.45,
  },
  sourceStatusLive: { color: "#b9d89d" },
  statusLamp: {
    width: 7,
    height: 7,
    flex: "0 0 auto",
    marginTop: 4,
    background: "#9dbc72",
    boxShadow: "0 0 0 2px rgba(157,188,114,0.18)",
  },
  mapToolbar: {
    position: "relative",
    zIndex: 1,
    minHeight: 46,
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px 12px",
    padding: "8px 24px",
    borderBottom: "1px solid #314936",
    background: "#19281f",
    fontFamily: "monospace",
  },
  zoomLabel: {
    color: "#aabd8d",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  zoomControls: {
    display: "grid",
    gridTemplateColumns: "32px 68px 32px",
    alignItems: "stretch",
  },
  zoomButton: {
    minHeight: 30,
    border: "1px solid #49634c",
    background: "#253a2d",
    color: "#f5edcf",
    cursor: "pointer",
    fontFamily: "monospace",
    fontSize: 18,
    fontWeight: 700,
  },
  zoomButtonDisabled: {
    color: "#66746a",
    cursor: "not-allowed",
    opacity: 0.55,
  },
  zoomReadout: {
    display: "grid",
    placeItems: "center",
    borderTop: "1px solid #49634c",
    borderBottom: "1px solid #49634c",
    color: "#f0d36d",
    fontSize: 11,
    fontWeight: 700,
  },
  zoomHint: {
    color: "#8fa393",
    fontSize: 10,
  },
  inspector: {
    position: "relative",
    zIndex: 1,
    minHeight: 48,
    display: "grid",
    gridTemplateColumns: "84px minmax(150px, 1fr) minmax(180px, 1fr) auto",
    alignItems: "center",
    gap: 14,
    padding: "10px 24px",
    borderBottom: "1px solid #314936",
    background: "#1d2c24",
    fontFamily: "monospace",
    fontSize: 12,
    height: 60,
  },
  inspectorKind: {
    color: "#d7b85c",
    fontSize: 10,
    letterSpacing: "0.1em",
  },
  chartScroller: {
    position: "relative",
    zIndex: 2,
    overflow: "visible",
    display: "flex",
    justifyContent: "center",
  },
  legend: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px 18px",
    padding: "12px 24px 16px",
    borderTop: "1px solid #314936",
    color: "#c7cdb5",
    fontFamily: "monospace",
    fontSize: 10,
  },
  legendPixel: {
    width: 7,
    height: 7,
    display: "inline-block",
    marginRight: 6,
    background: "#d7b85c",
    boxShadow: "2px 0 #29364a, 0 2px #29364a",
  },
  legendItem: {
    minHeight: 24,
    display: "inline-flex",
    alignItems: "center",
  },
  legendIcon: {
    width: 24,
    height: 24,
    marginRight: 4,
    objectFit: "contain",
  },
  tooltip: {
    display: "grid",
    gap: 2,
    padding: "7px 9px",
    border: "2px solid #d7b85c",
    background: "#17241d",
    color: "#f5edcf",
    fontFamily: "monospace",
    fontSize: 11,
  },
  tooltipFeatureList: {
    minWidth: 230,
    maxWidth: 320,
    maxHeight: 220,
    display: "grid",
    gap: 4,
    marginTop: 5,
    paddingTop: 6,
    overflowY: "auto",
    borderTop: "1px solid #49634c",
  },
  tooltipFeatureListDense: {
    maxHeight: 86,
  },
  tooltipFeature: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: 10,
    alignItems: "baseline",
  },
  waffle: {
    display: "grid",
    gap: 6,
    marginTop: 6,
    paddingTop: 7,
    borderTop: "1px solid #49634c",
  },
  waffleHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    color: "#d7b85c",
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  waffleGrid: {
    width: 88,
    display: "grid",
    gridTemplateColumns: "repeat(10, 7px)",
    gap: 2,
  },
  wafflePixel: {
    width: 7,
    height: 7,
    display: "block",
    boxShadow: "1px 1px #0d1711",
  },
  waffleLegend: {
    display: "flex",
    flexWrap: "wrap",
    gap: "4px 10px",
    color: "#c7cdb5",
    fontSize: 9,
  },
  waffleLegendPixel: {
    width: 6,
    height: 6,
    display: "inline-block",
    marginRight: 4,
    boxShadow: "1px 1px #0d1711",
  },
  editorial: {
    maxWidth: 800,
    margin: "48px auto 0",
    color: "var(--text-primary)",
    fontSize: 16,
    lineHeight: 1.75,
  },
  sourceNote: {
    marginTop: 30,
    paddingTop: 20,
    borderTop: "1px solid var(--surface-3)",
    color: "var(--text-secondary)",
    fontSize: 13,
  },
}
