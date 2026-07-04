import React from "react"
import {
  geoHitTarget,
  hatchFill,
  hitTargetRect,
  networkHitTarget,
  unitize,
} from "semiotic/recipes"
import {
  ISOTYPE,
  IsotypeGlyph,
  isotypeGlyphDef,
  unwrapIsotypeDatum,
} from "./isotypeCharts.jsx"
import {
  GREAT_LAKES,
  MAP_SECTIONS,
  NATIONAL_RESOURCES,
  PROFILE_MAX_FEET,
  STATUS_META,
  US_OUTLINE,
  outlineExtentAtLatitude,
  powerIconUnits,
  profileElevationAt,
} from "./data/dataCenterIsotypeData"

// ─── The cross-section map ────────────────────────────────────────────────────
// After the 1943 ISOTYPE spread "Altitude and Vegetation, United States":
// a ghost map with hatched water, five west-to-east relief sections drawn as
// dark silhouettes at their latitudes, and the buildings standing on the
// terrain as `glyph` scene nodes — canvas-painted pictograms with partial
// fills straight from the unitize tally.

const PROFILE_MAX_PX = 34
const SIGN_SIZE = 11
const SIGN_ROW = 6

// Which relief section each site stands on, plus hand-set collision nudges
// (px along the section) and label placement — this is a poster, and posters
// are kerned by hand.
export const SECTION_PLACEMENT = {
  fairwater: { section: "section-43", nudge: -16, mapLabel: "FAIRWATER", labelDx: -8, labelDy: -6 },
  chicago: { section: "section-43", nudge: 14, mapLabel: "CHICAGO", labelDx: 9, labelDy: -6 },
  lordstown: { section: "section-43", nudge: 0, mapLabel: "LORDSTOWN", labelDx: 10, labelDy: -8 },
  "northern-virginia": { section: "section-39", nudge: 0, mapLabel: "NORTHERN VIRGINIA", labelDx: 11, labelDy: -4 },
  "silicon-valley": { section: "section-39", nudge: 4, mapLabel: "SILICON VALLEY", labelDx: 10, labelDy: -8 },
  colossus: { section: "section-36", nudge: 0, mapLabel: "COLOSSUS 1 · MEMPHIS", labelDx: 12, labelDy: -6 },
  phoenix: { section: "section-33", nudge: 0, mapLabel: "PHOENIX", labelDx: -10, labelDy: -6 },
  "dona-ana": { section: "section-33", nudge: -4, mapLabel: "DOÑA ANA", labelDx: -12, labelDy: -16 },
  abilene: { section: "section-33", nudge: -10, mapLabel: "ABILENE", labelDx: -10, labelDy: -4 },
  shackelford: { section: "section-33", nudge: 12, mapLabel: "SHACKELFORD", labelDx: 10, labelDy: -22 },
  dallas: { section: "section-33", nudge: 6, mapLabel: "DALLAS–FORT WORTH", labelDx: 9, labelDy: -8 },
  hyperion: { section: "section-33", nudge: 0, mapLabel: "HYPERION", labelDx: 11, labelDy: -6 },
  milam: { section: "section-30", nudge: 0, mapLabel: "STARGATE · MILAM COUNTY", labelDx: 14, labelDy: -10 },
}

function nearestSection(latitude) {
  return MAP_SECTIONS.reduce((best, section) =>
    Math.abs(section.latitude - latitude) < Math.abs(best.latitude - latitude)
      ? section
      : best,
  )
}

// Rows of repeated server signs standing on the terrain as feet-anchored
// glyph scene nodes, back rows first so the front row overlaps them the way
// the original's tree clusters do. Partial signs ride the glyph node's
// `fraction` + `ghostColor` — no clipPath bookkeeping.
function serverSignNodes(site, x, surfaceY, color) {
  const units = powerIconUnits(site.powerMW)
  if (!units.length) {
    return {
      undisclosed: true,
      height: 16,
      nodes: [
        {
          type: "glyph",
          x,
          y: surfaceY,
          size: 13,
          glyph: isotypeGlyphDef("server"),
          color,
          accent: ISOTYPE.white,
          style: {},
          datum: null,
        },
      ],
    }
  }
  const rowCount = Math.ceil(units.length / SIGN_ROW)
  const nodes = []
  for (let row = rowCount - 1; row >= 0; row -= 1) {
    const rowUnits = units.slice(row * SIGN_ROW, (row + 1) * SIGN_ROW)
    const stagger = row % 2 === 1 ? SIGN_SIZE / 2 : 0
    const rowWidth = rowUnits.length * (SIGN_SIZE + 1) - 1
    const startX = x - rowWidth / 2 + stagger
    const feetY = surfaceY - row * (SIGN_SIZE - 1)
    rowUnits.forEach((unit, column) => {
      nodes.push({
        type: "glyph",
        x: startX + column * (SIGN_SIZE + 1) + SIGN_SIZE / 2,
        y: feetY,
        size: SIGN_SIZE,
        glyph: isotypeGlyphDef("server"),
        color,
        accent: ISOTYPE.white,
        fraction: unit.fraction < 1 ? unit.fraction : undefined,
        ghostColor: unit.fraction < 1 ? ISOTYPE.paperDeep : undefined,
        style: {},
        datum: null,
      })
    })
  }
  return { undisclosed: false, height: rowCount * (SIGN_SIZE - 1) + 2, nodes }
}

export function dataCenterMapLayout(ctx) {
  const path = ctx.scales.geoPath
  const P = (lon, lat) => ctx.scales.projectedPoint(lon, lat)
  const sites = ctx.points.map(unwrapIsotypeDatum).filter(Boolean)
  const outline = ctx.areas[0]
  const landPath = outline ? path(outline) : null
  const lakesPath = path(GREAT_LAKES)
  const bounds = outline
    ? path.bounds(outline)
    : [[0, 0], [ctx.dimensions.width, ctx.dimensions.height]]

  // hatchFill's base line is vertical; rotate 90° for the original's
  // horizontal water lines.
  const water = hatchFill({
    id: "dc-map-water",
    color: ISOTYPE.bluePale,
    angle: 90,
    spacing: 4.5,
    strokeWidth: 1.5,
    opacity: 0.85,
  })

  // Section geometry: pixel extent + baseline for each drawn latitude.
  const sections = MAP_SECTIONS.map((section) => {
    const extent = outlineExtentAtLatitude(US_OUTLINE, section.latitude)
    if (!extent) return null
    const west = P(extent[0], section.latitude)
    const east = P(extent[1], section.latitude)
    return { ...section, extent, x0: west[0], x1: east[0], baseY: west[1] }
  }).filter(Boolean)
  const sectionById = new Map(sections.map((section) => [section.id, section]))

  // Every visible site stands on its section at its longitude.
  const placedSites = sites
    .map((site) => {
      const placement = SECTION_PLACEMENT[site.id] || {}
      const section =
        sectionById.get(placement.section) || nearestSection(site.lat)
      if (!section) return null
      const rawT = (site.lon - section.extent[0]) / (section.extent[1] - section.extent[0])
      const x =
        section.x0 +
        Math.max(0.015, Math.min(0.985, rawT)) * (section.x1 - section.x0) +
        (placement.nudge || 0)
      const t = (x - section.x0) / (section.x1 - section.x0)
      const surfaceY =
        section.baseY - profileElevationAt(section.profile, t) * PROFILE_MAX_PX
      return { site, placement, section, x, surfaceY }
    })
    .filter(Boolean)

  const stacks = placedSites.map(({ site, placement, x, surfaceY }) => {
    const color = STATUS_META[site.status].color
    const stack =
      site.status === "legacy"
        ? {
            undisclosed: false,
            height: 22,
            nodes: [
              {
                type: "glyph",
                x,
                y: surfaceY,
                size: 22,
                glyph: isotypeGlyphDef("city"),
                color,
                accent: ISOTYPE.white,
                style: {},
                datum: null,
              },
            ],
          }
        : serverSignNodes(site, x, surfaceY, color)
    return { site, placement, x, surfaceY, color, stack }
  })

  // Scale chrome: 500 miles of longitude at the map's middle latitude, and a
  // feet wedge matched to the drawn profile scale.
  const lonProbeA = P(-100, 38)
  const lonProbeB = P(-90, 38)
  const pxPerLon = (lonProbeB[0] - lonProbeA[0]) / 10
  const milesPx = (500 / (69.172 * Math.cos((38 * Math.PI) / 180))) * pxPerLon
  const wedgeHeight = (10000 / PROFILE_MAX_FEET) * PROFILE_MAX_PX

  const canadaLine = [[-124.7, 48.5], [-110, 49], [-96, 49], [-89, 48], [-83, 46]]
    .map((point, index) => `${index === 0 ? "M" : "L"}${P(point[0], point[1])}`)
    .join(" ")
  const mexicoLine = [[-117, 32.5], [-111, 31.3], [-106.5, 31.8], [-103, 29], [-97, 26]]
    .map((point, index) => `${index === 0 ? "M" : "L"}${P(point[0], point[1])}`)
    .join(" ")
  const canadaLabel = P(-98, 49)
  const mexicoLabel = P(-104.6, 28.1)
  const lakesLabel = P(-80.7, 46.7)

  return {
    nodes: [
      ...(outline && landPath
        ? [
            {
              type: "geoarea",
              pathData: landPath,
              bounds,
              centroid: path.centroid(outline),
              screenArea: Math.abs(
                (bounds[1][0] - bounds[0][0]) * (bounds[1][1] - bounds[0][1]),
              ),
              style: { fill: ISOTYPE.paper, stroke: ISOTYPE.bluePale, strokeWidth: 1.6 },
              datum: outline.properties,
              id: "contiguous-us",
              group: "base map",
            },
          ]
        : []),
      // geoHitTarget: one interaction target per site (the stack reads as one
      // mark); the visible signs are datum-less glyph nodes below.
      ...stacks.map(({ site, x, surfaceY, stack }) => ({
        ...geoHitTarget({
          x,
          y: surfaceY - stack.height / 2,
          r: Math.max(14, stack.height * 0.75),
          datum: site,
          id: site.id,
        }),
        group: site.status,
      })),
      ...stacks.flatMap(({ stack }) => stack.nodes),
    ],
    overlays: (
      <g>
        <defs>
          {water.def}
          <mask id="dc-map-sea">
            <rect
              x={bounds[0][0] - 60}
              y={bounds[0][1] - 40}
              width={bounds[1][0] - bounds[0][0] + 120}
              height={bounds[1][1] - bounds[0][1] + 90}
              fill="white"
            />
            {landPath && <path d={landPath} fill="black" />}
          </mask>
        </defs>

        {/* Hatched sea hugging the coast, and the hatched Great Lakes. */}
        {landPath && (
          <path
            d={landPath}
            fill="none"
            stroke={water.fill}
            strokeWidth="26"
            mask="url(#dc-map-sea)"
          />
        )}
        {lakesPath && (
          <path d={lakesPath} fill={water.fill} stroke={ISOTYPE.bluePale} strokeWidth="1" />
        )}

        {/* Neighbors, in the original's dashed hand. */}
        <path d={canadaLine} fill="none" stroke={ISOTYPE.muted} strokeWidth="1.2" strokeDasharray="2 5" />
        <path d={mexicoLine} fill="none" stroke={ISOTYPE.muted} strokeWidth="1.2" strokeDasharray="2 5" />
        <text x={canadaLabel[0]} y={canadaLabel[1] - 8} fill={ISOTYPE.ink} fontSize="10" fontWeight="900" letterSpacing="2" textAnchor="middle">
          CANADA
        </text>
        <text x={mexicoLabel[0]} y={mexicoLabel[1]} fill={ISOTYPE.ink} fontSize="10" fontWeight="900" letterSpacing="2" textAnchor="middle">
          MEXICO
        </text>
        <text x={lakesLabel[0]} y={lakesLabel[1]} fill={ISOTYPE.blue} fontSize="8.5" fontWeight="900" letterSpacing="1.5" textAnchor="middle">
          GREAT LAKES
        </text>

        {/* The five relief sections. */}
        {sections.map((section) => {
          const spanX = section.x1 - section.x0
          const surface = section.profile
            .map(
              ([t, elevation]) =>
                `L${section.x0 + t * spanX},${section.baseY - elevation * PROFILE_MAX_PX}`,
            )
            .join(" ")
          return (
            <g key={section.id}>
              <path
                d={`M${section.x0},${section.baseY} ${surface} L${section.x1},${section.baseY} Z`}
                fill={ISOTYPE.ink}
              />
              <line
                x1={section.x0 - 8}
                x2={section.x1 + 8}
                y1={section.baseY}
                y2={section.baseY}
                stroke={ISOTYPE.ink}
                strokeWidth="1.4"
              />
              <text
                x={section.x0 + 2}
                y={section.baseY + 10}
                fill={ISOTYPE.muted}
                fontSize="7.5"
                fontWeight="900"
                paintOrder="stroke"
                stroke={ISOTYPE.paper}
                strokeWidth="3"
              >
                {section.label}
              </text>
            </g>
          )
        })}

        {/* Labels, leader lines, undisclosed marks — the signs themselves
            are canvas glyph nodes. */}
        {stacks.map(({ site, placement, x, surfaceY, color, stack }) => {
          const topY = surfaceY - stack.height
          const dx = placement.labelDx ?? 10
          const dy = placement.labelDy ?? -6
          const labelX = x + dx
          const labelY = topY + dy
          const anchor = dx > 4 ? "start" : dx < -4 ? "end" : "middle"
          return (
            <g key={site.id}>
              {stack.undisclosed && (
                <text x={x + 9} y={surfaceY - 7} fill={color} fontSize="12" fontWeight="900">
                  ?
                </text>
              )}
              {Math.abs(dx) > 12 && (
                <line
                  x1={x}
                  y1={topY - 2}
                  x2={labelX - Math.sign(dx) * 2}
                  y2={labelY + 2}
                  stroke={color}
                  strokeWidth="1"
                />
              )}
              <text
                x={labelX}
                y={labelY}
                fill={ISOTYPE.ink}
                fontSize={site.status === "legacy" ? "7.5" : "8.5"}
                fontWeight="900"
                textAnchor={anchor}
                paintOrder="stroke"
                stroke={ISOTYPE.paper}
                strokeWidth="4"
              >
                {placement.mapLabel || site.label.toUpperCase()}
              </text>
            </g>
          )
        })}

        {/* Key, bottom left — the original's "green: wheat, maize…" line. */}
        <g transform={`translate(${bounds[0][0] + 2} ${bounds[1][1] + 14})`}>
          <IsotypeGlyph kind="server" size={12} color={ISOTYPE.ink} />
          <text x="17" y="10" fill={ISOTYPE.ink} fontSize="8.5" fontWeight="900">
            EACH SERVER SIGN = 100 MW OF DISCLOSED CAPACITY · ? = NOT DISCLOSED
          </text>
          <IsotypeGlyph kind="city" x={0} y={16} size={12} color={ISOTYPE.ink} />
          <text x="17" y="26" fill={ISOTYPE.ink} fontSize="8.5" fontWeight="900">
            CITY SIGN = MARKET ESTABLISHED BEFORE CHATGPT · SECTIONS ARE SCHEMATIC RELIEF
          </text>
        </g>

        {/* Scale chrome, bottom right — feet wedge and miles bar. */}
        <g transform={`translate(${bounds[1][0] - milesPx - 6} ${bounds[1][1] + 18})`}>
          <path d={`M${milesPx - 44},0 h44 v${-wedgeHeight} Z`} fill={ISOTYPE.ink} />
          <text x={milesPx - 50} y="-2" fill={ISOTYPE.ink} fontSize="8.5" fontWeight="900" textAnchor="end">
            10,000 FEET
          </text>
          <line x1="0" x2={milesPx} y1="10" y2="10" stroke={ISOTYPE.ink} strokeWidth="2.4" />
          <line x1="0" x2="0" y1="6" y2="14" stroke={ISOTYPE.ink} strokeWidth="1.6" />
          <line x1={milesPx} x2={milesPx} y1="6" y2="14" stroke={ISOTYPE.ink} strokeWidth="1.6" />
          <text x="0" y="24" fill={ISOTYPE.ink} fontSize="8.5" fontWeight="900">
            500 MILES
          </text>
        </g>
      </g>
    ),
  }
}

// ─── Operational hyperscale capacity: a Merchant Marine unit grid ─────────────

const HYPERSCALE_COLORS = {
  "united-states": ISOTYPE.red,
  china: ISOTYPE.blue,
  europe: ISOTYPE.green,
  other: ISOTYPE.ink,
}
const HYPERSCALE_UNIT = 2
const HYPERSCALE_PER_ROW = 10

export function hyperscaleCapacityLayout(ctx) {
  const rows = ctx.data.map(unwrapIsotypeDatum).filter(Boolean)
  const { width, height } = ctx.dimensions.plot
  const labelWidth = Math.min(148, width * 0.32)
  const gridWidth = width - labelWidth
  const iconSize = Math.min(26, Math.max(14, gridWidth / (HYPERSCALE_PER_ROW * 1.32)))
  const gapX = iconSize * 0.18
  const midGap = iconSize * 0.5
  const rowGapY = 4

  // Variable row heights: the United States wraps to three rows of signs.
  let cursorY = 4
  const regions = rows.map((row) => {
    const units = unitize(row.share, { unit: HYPERSCALE_UNIT, maxUnits: 40 }).units
    const signRows = Math.max(1, Math.ceil(units.length / HYPERSCALE_PER_ROW))
    const blockHeight = signRows * (iconSize + rowGapY) + 18
    const region = { row, units, y: cursorY, blockHeight }
    cursorY += blockHeight
    return region
  })

  const signX = (index) => {
    const column = index % HYPERSCALE_PER_ROW
    return (
      labelWidth +
      column * (iconSize + gapX) +
      (column >= HYPERSCALE_PER_ROW / 2 ? midGap : 0)
    )
  }

  return {
    nodes: [
      ...regions.map(({ row, y, blockHeight }) =>
        hitTargetRect({
          x: 0,
          y,
          width,
          height: blockHeight - 6,
          datum: row,
          id: row.id,
          group: "hyperscale capacity",
        }),
      ),
      // The signs: datum-less glyph nodes — the region row above is the
      // single interaction target, ISOTYPE-style (count signs, hover rows).
      ...regions.flatMap(({ row, units, y }) => {
        const color = HYPERSCALE_COLORS[row.id] || ISOTYPE.ink
        return units.map((unit) => ({
          type: "glyph",
          x: signX(unit.index) + iconSize / 2,
          y: y + Math.floor(unit.index / HYPERSCALE_PER_ROW) * (iconSize + rowGapY) + iconSize,
          size: iconSize,
          glyph: isotypeGlyphDef("server"),
          color,
          accent: ISOTYPE.white,
          fraction: unit.fraction < 1 ? unit.fraction : undefined,
          ghostColor: unit.fraction < 1 ? ISOTYPE.paperDeep : undefined,
          style: {},
          datum: null,
        }))
      }),
    ],
    overlays: (
      <g>
        {regions.map(({ row, y, blockHeight }) => {
          const color = HYPERSCALE_COLORS[row.id] || ISOTYPE.ink
          return (
            <g key={row.id}>
              <text x="0" y={y + 15} fill={ISOTYPE.ink} fontSize="13" fontWeight="900">
                {row.label.toUpperCase()}
              </text>
              <text x="0" y={y + 34} fill={color} fontSize="19" fontWeight="900">
                {row.exactness === "reported" ? "" : "≈"}
                {row.share}%
              </text>
              <line
                x1="0"
                x2={width}
                y1={y + blockHeight - 8}
                y2={y + blockHeight - 8}
                stroke={ISOTYPE.muted}
                strokeWidth=".8"
              />
            </g>
          )
        })}
        <text x="0" y={height - 2} fill={ISOTYPE.ink} fontSize="9" fontWeight="900">
          EACH SIGN = 2% OF WORLD HYPERSCALE CRITICAL IT LOAD · HALF SIGNS = ROUNDED SHARES
        </text>
      </g>
    ),
  }
}

// ─── Training compute: chips against benchmark bolts ──────────────────────────

const CHIP_SIZE = 12
const CHIPS_PER_GROUP = 10
const CHIP_GROUPS_PER_ROW = 2
const MMLU_UNIT = 5

export function modelComputeLayout(ctx) {
  const rows = ctx.data.map(unwrapIsotypeDatum).filter(Boolean)
  const { width, height } = ctx.dimensions.plot
  const compact = width < 560
  const labelWidth = compact ? 86 : 156
  const scoreWidth = compact ? 74 : 158
  const chipSize = compact ? 8 : CHIP_SIZE
  const chipStep = chipSize + 2
  const groupGap = chipSize * 0.7
  const perRow = CHIPS_PER_GROUP * (compact ? 1 : CHIP_GROUPS_PER_ROW)
  const rowHeight = height / rows.length

  const chipX = (index) => {
    const column = index % perRow
    const group = Math.floor(column / CHIPS_PER_GROUP)
    return labelWidth + column * chipStep + group * groupGap
  }
  const chipY = (rowTop, index) => rowTop + 12 + Math.floor(index / perRow) * (chipSize + 2)

  return {
    nodes: [
      ...rows.map((row, index) =>
        hitTargetRect({
          x: 0,
          y: index * rowHeight + 3,
          width,
          height: rowHeight - 6,
          datum: row,
          id: row.id,
          group: row.era,
        }),
      ),
      // Chip and bolt tallies as datum-less glyph nodes; the model row is
      // the interaction target.
      ...rows.flatMap((row, rowIndex) => {
        const y = rowIndex * rowHeight
        const chips = Math.max(1, Math.round(row.relative))
        const bolts = unitize(row.mmlu, { unit: MMLU_UNIT, maxUnits: 20 }).units
        const color = row.era === "after" ? ISOTYPE.red : ISOTYPE.ink
        const boltSize = compact ? 9 : 13
        const perScoreRow = compact ? 5 : 10
        return [
          ...Array.from({ length: chips }, (_, index) => ({
            type: "glyph",
            x: chipX(index) + chipSize / 2,
            y: chipY(y, index) + chipSize,
            size: chipSize,
            glyph: isotypeGlyphDef("chip"),
            color,
            accent: ISOTYPE.white,
            style: {},
            datum: null,
          })),
          ...bolts.map((unit) => ({
            type: "glyph",
            x: width - scoreWidth + (unit.index % perScoreRow) * (boltSize + 1) + boltSize / 2,
            y: y + 14 + Math.floor(unit.index / perScoreRow) * (boltSize + 3) + boltSize,
            size: boltSize,
            glyph: isotypeGlyphDef("bolt"),
            color: ISOTYPE.yellow,
            accent: ISOTYPE.white,
            fraction: unit.fraction < 1 ? unit.fraction : undefined,
            ghostColor: unit.fraction < 1 ? ISOTYPE.paperDeep : undefined,
            style: {},
            datum: null,
          })),
        ]
      }),
    ],
    overlays: (
      <g>
        {rows.map((row, rowIndex) => {
          const y = rowIndex * rowHeight
          const bolts = unitize(row.mmlu, { unit: MMLU_UNIT, maxUnits: 20 }).units
          const color = row.era === "after" ? ISOTYPE.red : ISOTYPE.ink
          const boltSize = compact ? 9 : 13
          const perScoreRow = compact ? 5 : 10
          const boltRows = Math.ceil(bolts.length / perScoreRow)
          return (
            <g key={row.id}>
              <text x="0" y={y + 24} fill={color} fontSize={compact ? 12 : 16} fontWeight="900">
                {row.model}
              </text>
              <text x="0" y={y + 39} fill={ISOTYPE.ink} fontSize="10" fontWeight="800">
                {row.year}
              </text>
              <text x="0" y={y + 53} fill={ISOTYPE.muted} fontSize={compact ? 7 : 9} fontWeight="800">
                {row.computeLabel}
              </text>
              <text x="0" y={y + 74} fill={color} fontSize={compact ? 11 : 15} fontWeight="900">
                {Number.isInteger(row.relative) ? `×${row.relative}` : `≈×${Math.round(row.relative)}`}
              </text>
              <text
                x={width - 2}
                y={y + 14 + boltRows * (boltSize + 3) + 12}
                fill={ISOTYPE.ink}
                fontSize={compact ? 9 : 12}
                fontWeight="900"
                textAnchor="end"
              >
                MMLU {row.mmlu}%
              </text>
              <line
                x1="0"
                x2={width}
                y1={y + rowHeight - 2}
                y2={y + rowHeight - 2}
                stroke={ISOTYPE.muted}
                strokeWidth=".8"
              />
            </g>
          )
        })}
        <text x={labelWidth} y={height - 4} fill={ISOTYPE.ink} fontSize={compact ? 7 : 9} fontWeight="900">
          EACH CHIP SIGN = GPT-3&apos;S ENTIRE TRAINING COMPUTE · EACH BOLT = 5 MMLU POINTS
        </text>
      </g>
    ),
  }
}

// ─── Power, water, heat: an arrow-per-unit process picture ────────────────────
// After the ISOTYPE "Imports and Exports per Head" spread: every arrow is a
// fixed quantity, partial arrows preserve the reported amount, and the two
// water numbers rise from one shared baseline so the 12× gap is undeniable.

export const ARROW_UNIT_TWH = 25
export const ARROW_UNIT_BGAL = 25

// The IEA puts 70–80% of data-center heat within reach of a heat pump where a
// heat network exists; 0.75 is the mid-point we draw solid, the rest ghosted.
export const RECOVERABLE_HEAT_FRACTION = 0.75

// The cooling-design trade-off is directional, not a measured ratio: an
// evaporative tower spends water to save compressor energy; a dry/air-cooled
// closed loop spends energy to save water. These illustrative counts encode
// the DIRECTION the two resources move, and are labeled as such.
const COOLING_MODES = [
  { id: "evaporative", label: "EVAPORATIVE TOWER", water: 5, energy: 1, note: "less energy · more water" },
  { id: "dry", label: "DRY / AIR-COOLED", water: 1, energy: 5, note: "more energy · less water" },
]

// Arrow-per-unit allocation: the library's unitize with sliver-dropping —
// 176 TWh is seven arrows, not seven arrows and a 4% stub.
export function arrowUnits(value, unit, minFraction = 0.08) {
  return unitize(value, { unit, minFraction }).units
}

function arrowRightPath(length, thickness) {
  const head = Math.min(length * 0.5, thickness * 1.9)
  const half = thickness / 2
  const flare = thickness * 0.75
  return `M0 ${-half} H${length - head} V${-(half + flare)} L${length} 0 L${length - head} ${half + flare} V${half} H0 Z`
}

function arrowUpPath(length, thickness) {
  const head = Math.min(length * 0.5, thickness * 1.9)
  const half = thickness / 2
  const flare = thickness * 0.75
  return `M${-half} 0 V${-(length - head)} H${-(half + flare)} L0 ${-length} L${half + flare} ${-(length - head)} H${half} V0 Z`
}

export const RESOURCE_NODES = [
  {
    id: "plant",
    label: "Power plants",
    value: "176 TWh GENERATED",
    note: "The electricity system behind the buildings; the grid mix decides the indirect footprint",
    kind: "plant",
    color: ISOTYPE.ink,
  },
  {
    id: "centers",
    label: "Data centers",
    value: "4.4% OF U.S. ELECTRICITY",
    note: "All U.S. data centers in 2023, not AI alone",
    kind: "server",
    color: ISOTYPE.ink,
  },
  {
    id: "electricity",
    label: "Electricity",
    value: `${NATIONAL_RESOURCES.electricityTWh} TWh`,
    note: "U.S. data-center electricity in 2023 — each arrow is 25 TWh",
    kind: "bolt",
    color: ISOTYPE.yellow,
  },
  {
    id: "heat",
    label: "Low-grade heat",
    value: "≈ INPUT POWER",
    note: "Nearly all electricity leaves as heat; the IEA puts 70–80% within reach of heat pumps",
    kind: "flame",
    color: ISOTYPE.red,
  },
  {
    id: "water",
    label: "On-site cooling water",
    value: "17B GAL",
    note: "Direct water consumed in cooling, 2023 — two-thirds of a single arrow",
    kind: "water",
    color: ISOTYPE.blue,
  },
  {
    id: "indirect",
    label: "Water at the power plants",
    value: "211B GAL",
    note: "Indirect water consumed generating the electricity, 2023 — over twelve times the on-site figure",
    kind: "pipe",
    color: ISOTYPE.green,
  },
]

export const RESOURCE_EDGES = [
  { source: "plant", target: "centers", label: "powers" },
  { source: "centers", target: "heat", label: "rejects" },
  { source: "water", target: "centers", label: "cools" },
  { source: "indirect", target: "plant", label: "is consumed generating the electricity" },
]

export function resourceFlowLayout(ctx) {
  const { width, height } = ctx.dimensions.plot
  const compact = width < 470
  const rawNodes = ctx.nodes.map((node) => node.data ?? node)
  const byId = new Map(rawNodes.map((node) => [node.id, node]))

  const plantX = width * (compact ? 0.13 : 0.15)
  const centersX = width * 0.58
  const figureY = height * 0.075
  const glyphSize = compact ? 34 : 42
  const arrowThickness = compact ? 5 : 6
  const arrowGap = compact ? 2.5 : 3.5

  const electricity = arrowUnits(NATIONAL_RESOURCES.electricityTWh, ARROW_UNIT_TWH)
  const heat = electricity // rejected heat ≈ input power, arrow for arrow
  const recoverableArrows = heat.length * RECOVERABLE_HEAT_FRACTION
  const indirect = arrowUnits(NATIONAL_RESOURCES.indirectWaterBillionGallons, ARROW_UNIT_BGAL)
  const direct = arrowUnits(NATIONAL_RESOURCES.directWaterBillionGallons, ARROW_UNIT_BGAL)

  const laneY = figureY + glyphSize / 2
  const elecX0 = plantX + glyphSize / 2 + 8
  const elecX1 = centersX - glyphSize / 2 - 8
  const heatX0 = centersX + glyphSize / 2 + 8
  const heatX1 = width * 0.97
  const bundleTop = (count) => laneY - (count * (arrowThickness + arrowGap) - arrowGap) / 2
  const heatBottom = bundleTop(heat.length) + heat.length * (arrowThickness + arrowGap)

  // Band two — the cooling trade-off. Illustrative direction, not a ratio.
  const coolTop = height * 0.4
  const coolRowH = compact ? 26 : 30
  const coolLabelW = compact ? 96 : 118
  const coolGlyph = compact ? 12 : 15
  const coolStep = coolGlyph + (compact ? 2 : 3)

  // Band three — the two water numbers, one baseline.
  const waterBaseY = height * 0.94
  const waterLength = height * 0.26
  const waterStep = arrowThickness + (compact ? 3.5 : 4.5)
  const indirectX0 = plantX - ((indirect.length - 1) * waterStep) / 2
  const labelBoxWidth = compact ? 120 : 148

  const bundles = [
    {
      id: "electricity",
      x: elecX0,
      y: bundleTop(electricity.length),
      width: elecX1 - elecX0,
      height: electricity.length * (arrowThickness + arrowGap),
    },
    {
      id: "heat",
      x: heatX0,
      y: bundleTop(heat.length),
      width: heatX1 - heatX0,
      height: heat.length * (arrowThickness + arrowGap),
    },
    {
      id: "indirect",
      x: indirectX0 - waterStep / 2,
      y: waterBaseY - waterLength,
      width: indirect.length * waterStep,
      height: waterLength,
    },
    {
      id: "water",
      x: centersX - waterStep,
      y: waterBaseY - waterLength,
      width: waterStep * 2,
      height: waterLength,
    },
  ]

  const coolingRow = (mode, rowIndex) => {
    const rowY = coolTop + rowIndex * coolRowH
    const iconY = rowY - coolGlyph + 2
    const glyphs = []
    let gx = coolLabelW
    for (let i = 0; i < mode.water; i += 1) {
      glyphs.push(
        <IsotypeGlyph key={`w-${i}`} kind="water" x={gx} y={iconY} size={coolGlyph} color={ISOTYPE.blue} />,
      )
      gx += coolStep
    }
    gx += coolStep * 0.4
    for (let i = 0; i < mode.energy; i += 1) {
      glyphs.push(
        <IsotypeGlyph key={`e-${i}`} kind="bolt" x={gx} y={iconY} size={coolGlyph} color={ISOTYPE.yellow} />,
      )
      gx += coolStep
    }
    return (
      <g key={mode.id}>
        <text x="0" y={rowY - 2} fill={ISOTYPE.ink} fontSize={compact ? 7.5 : 8.5} fontWeight="900">
          {mode.label}
        </text>
        {glyphs}
        {!compact && (
          <text x={gx + 6} y={rowY - 3} fill={ISOTYPE.muted} fontSize="8" fontWeight="800">
            {mode.note}
          </text>
        )}
      </g>
    )
  }

  return {
    sceneNodes: [
      // The two figures ARE interactive glyph nodes — canvas-painted,
      // hit-tested, focus-ringed, annotation-anchorable by id.
      {
        type: "glyph",
        cx: plantX,
        cy: laneY,
        size: glyphSize,
        glyph: isotypeGlyphDef("plant"),
        color: ISOTYPE.ink,
        accent: ISOTYPE.white,
        style: {},
        datum: byId.get("plant"),
        id: "plant",
        label: "Power plants",
      },
      {
        type: "glyph",
        cx: centersX,
        cy: laneY,
        size: glyphSize,
        glyph: isotypeGlyphDef("server"),
        color: ISOTYPE.ink,
        accent: ISOTYPE.white,
        style: {},
        datum: byId.get("centers"),
        id: "centers",
        label: "Data centers",
      },
      ...bundles
        .filter((bundle) => byId.get(bundle.id))
        .map((bundle) =>
          networkHitTarget({
            x: bundle.x,
            y: bundle.y,
            width: bundle.width,
            height: bundle.height,
            datum: byId.get(bundle.id),
            id: bundle.id,
            label: byId.get(bundle.id).label,
          }),
        ),
    ],
    overlays: (
      <g>
        {/* ── Band one: generation → computation → heat, and how much of that
              heat can be recovered. ─────────────────────────────────────── */}
        {electricity.map((unit, index) => (
          <path
            key={`elec-${index}`}
            transform={`translate(${elecX0} ${bundleTop(electricity.length) + index * (arrowThickness + arrowGap) + arrowThickness / 2})`}
            d={arrowRightPath((elecX1 - elecX0) * unit.fraction, arrowThickness)}
            fill={ISOTYPE.yellow}
          />
        ))}
        {/* Every heat arrow is drawn ghosted (all electricity leaves as heat);
            the recoverable ~75% is over-painted solid from the base. */}
        {heat.map((unit, index) => {
          const fullLen = (heatX1 - heatX0) * unit.fraction
          const solidFrac = Math.max(0, Math.min(1, recoverableArrows - index))
          const ty = bundleTop(heat.length) + index * (arrowThickness + arrowGap) + arrowThickness / 2
          return (
            <g key={`heat-${index}`} transform={`translate(${heatX0} ${ty})`}>
              {/* Full heat arrow, ghosted (all electricity leaves as heat)… */}
              <path d={arrowRightPath(fullLen, arrowThickness)} fill={ISOTYPE.red} opacity={0.28} />
              {/* …with the recoverable share over-painted as a solid arrow, so
                  a fully-recoverable arrow reads as a solid arrow, head and all. */}
              {solidFrac > 0 && (
                <path d={arrowRightPath(fullLen * solidFrac, arrowThickness)} fill={ISOTYPE.red} />
              )}
            </g>
          )
        })}
        <text x={plantX} y={heatBottom + 14} fill={ISOTYPE.ink} fontSize={compact ? 9 : 10} fontWeight="900" textAnchor="middle">
          POWER PLANTS
        </text>
        <text x={centersX} y={heatBottom + 14} fill={ISOTYPE.ink} fontSize={compact ? 9 : 10} fontWeight="900" textAnchor="middle">
          DATA CENTERS
        </text>
        <text x={(elecX0 + elecX1) / 2} y={bundleTop(electricity.length) - 7} fill={ISOTYPE.yellow} fontSize="9.5" fontWeight="900" textAnchor="middle">
          176 TWH · 2023
        </text>
        <text x={heatX1} y={bundleTop(heat.length) - 7} fill={ISOTYPE.red} fontSize="9.5" fontWeight="900" textAnchor="end">
          ≈ ALL OF IT, AS HEAT
        </text>
        <text x={heatX1} y={heatBottom + 30} fill={ISOTYPE.red} fontSize={compact ? 7.5 : 8.5} fontWeight="900" textAnchor="end">
          SOLID ≈ 75% RECOVERABLE (IEA 70–80%)
        </text>

        {/* ── Band two: cooling design trades water for energy. ─────────────── */}
        <text x="0" y={coolTop - coolRowH + 2} fill={ISOTYPE.ink} fontSize={compact ? 8.5 : 10} fontWeight="900">
          COOLING DESIGN SETS THE ON-SITE WATER
        </text>
        {COOLING_MODES.map((mode, index) => coolingRow(mode, index))}
        <text x="0" y={coolTop + COOLING_MODES.length * coolRowH + 2} fill={ISOTYPE.muted} fontSize={compact ? 7 : 7.5} fontWeight="800">
          {compact ? "SCHEMATIC DIRECTION, NOT A RATIO" : "BLUE = WATER · YELLOW = ENERGY · SCHEMATIC DIRECTION, NOT A MEASURED RATIO"}
        </text>

        {/* ── Band three: the two water numbers, one unit, one baseline. ────── */}
        <line
          x1={indirectX0 - waterStep}
          x2={centersX + waterStep * 1.6}
          y1={waterBaseY}
          y2={waterBaseY}
          stroke={ISOTYPE.ink}
          strokeWidth="1.6"
        />
        {indirect.map((unit, index) => (
          <path
            key={`ind-${index}`}
            transform={`translate(${indirectX0 + index * waterStep} ${waterBaseY})`}
            d={arrowUpPath(waterLength * unit.fraction, arrowThickness)}
            fill={ISOTYPE.green}
          />
        ))}
        {direct.map((unit, index) => (
          <path
            key={`dir-${index}`}
            transform={`translate(${centersX} ${waterBaseY})`}
            d={arrowUpPath(waterLength * unit.fraction, arrowThickness)}
            fill={ISOTYPE.blue}
          />
        ))}
        <g transform={`translate(${plantX - labelBoxWidth / 2} ${waterBaseY - waterLength - 40})`}>
          <rect width={labelBoxWidth} height="30" fill={ISOTYPE.ink} />
          <text x={labelBoxWidth / 2} y="13" fill={ISOTYPE.white} fontSize="9" fontWeight="900" textAnchor="middle">
            211B GALLONS
          </text>
          <text x={labelBoxWidth / 2} y="24" fill={ISOTYPE.green} fontSize="8" fontWeight="900" textAnchor="middle">
            AT THE POWER PLANTS
          </text>
        </g>
        <g transform={`translate(${centersX - labelBoxWidth / 2} ${waterBaseY - waterLength - 40})`}>
          <rect width={labelBoxWidth} height="30" fill={ISOTYPE.ink} />
          <text x={labelBoxWidth / 2} y="13" fill={ISOTYPE.white} fontSize="9" fontWeight="900" textAnchor="middle">
            17B GALLONS
          </text>
          <text x={labelBoxWidth / 2} y="24" fill={ISOTYPE.blue} fontSize="8" fontWeight="900" textAnchor="middle">
            ON SITE
          </text>
        </g>
        <text x={indirectX0 - waterStep} y={waterBaseY + 14} fill={ISOTYPE.ink} fontSize="8.5" fontWeight="900">
          WATER CONSUMED IN 2023 · ONE BASELINE, ONE SCALE
        </text>

        {/* Key. */}
        <text x="0" y={height - 2} fill={ISOTYPE.ink} fontSize="8.5" fontWeight="900">
          EACH ARROW = 25 TWH OR 25 BILLION GALLONS · PARTIAL ARROWS KEEP THE REPORTED AMOUNT
        </text>
      </g>
    ),
  }
}
