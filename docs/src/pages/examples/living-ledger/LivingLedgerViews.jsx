import React, { useMemo } from "react"
import { LineChart, QuadrantChart } from "semiotic/xy"
import { GeoCustomChart, geoHitTarget } from "semiotic/geo"
import { OrdinalCustomChart } from "semiotic/ordinal"
import { StreamNetworkFrame } from "semiotic/network"
import { hitTargetRect, unwrapDatum } from "semiotic/recipes"
import useResponsiveWidth from "../../../hooks/useResponsiveWidth"

export const SERVICE_COLORS = Object.freeze({
  "regulation-maintenance": "#57c7b7",
  provisioning: "#d6a758",
  "non-material": "#bd86c8",
})

export const ALERT_META = Object.freeze({
  observe: { label: "Observe", shape: "circle", color: "#8db2ab" },
  watch: { label: "Watch", shape: "notched", color: "#dfc46a" },
  warning: { label: "Warning", shape: "triangle", color: "#e28b55" },
  action: { label: "Action", shape: "diamond", color: "#ea654f" },
  critical: { label: "Critical", shape: "flare", color: "#ff4f52" },
  unknown: { label: "Unknown", shape: "crosshatch", color: "#8ba09b" },
})

const EVIDENCE_SYMBOLS = Object.freeze({
  "validated-threshold": "diamond",
  "validated-operational": "diamond",
  "governance-threshold": "square",
  "pressure-event": "triangle",
  "reference-anomaly": "cross",
  "trend-change": "triangle",
  "data-observability": "square",
  "not-comparable": "cross",
  "modeled-gap": "circle",
  "forecast-crossing": "chevron",
  trend: "triangle",
})

const LEDGER_DIMENSIONS = [
  "ecologicalSupply",
  "anthropogenicContribution",
  "demand",
  "use",
  "instrumentalValue",
  "relationalValue",
]

const PUBLIC_LEDGER_LABELS = Object.freeze({
  ecologicalSupply: ["What nature can provide", "Ecological supply"],
  anthropogenicContribution: ["What people add", "Human contribution"],
  demand: ["What is needed", "Demand"],
  use: ["What is received", "Use"],
  instrumentalValue: ["What it makes possible", "Instrumental value"],
  relationalValue: ["What the place means", "Relational value"],
})

const SCIENCE_LEDGER_LABELS = Object.freeze({
  ecologicalSupply: ["Ecological supply", "EESV / capacity"],
  anthropogenicContribution: ["Anthropogenic contribution", "EESV / contribution"],
  demand: ["Demand", "EESV / demand"],
  use: ["Realized use", "EESV / use"],
  instrumentalValue: ["Instrumental value", "EESV / value"],
  relationalValue: ["Relational value", "EESV / value"],
})

const PIPELINE_NODES = Object.freeze([
  { id: "receive", label: "Receive", x: 0.05, y: 0.46 },
  { id: "geolocate", label: "Locate", x: 0.17, y: 0.46 },
  { id: "normalize", label: "Units", x: 0.29, y: 0.46 },
  { id: "validate", label: "Validate", x: 0.41, y: 0.46 },
  { id: "freshness", label: "Freshness", x: 0.54, y: 0.46 },
  { id: "corroborate", label: "Corroborate", x: 0.67, y: 0.46 },
  { id: "indicator", label: "Indicator", x: 0.8, y: 0.46 },
  { id: "threshold", label: "Threshold", x: 0.94, y: 0.46 },
  { id: "review", label: "Review basin", x: 0.54, y: 0.78 },
  { id: "quarantine", label: "Quarantine", x: 0.41, y: 0.14 },
])

const PIPELINE_GATES = PIPELINE_NODES.slice(0, 8)

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})

const COMPACT_NUMBER = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
})

export function serviceSystemId(system) {
  return system?.serviceSystemId ?? system?.id ?? ""
}

export function systemRiskLevel(system) {
  if (system?.freshness === "stale" || system?.freshness === "unknown") return "unknown"
  const explicit =
    system?.risk?.level ?? system?.alert?.level ?? system?.alertLevel ?? system?.status
  const normalized = String(explicit ?? "observe").toLowerCase()
  return ALERT_META[normalized] ? normalized : "observe"
}

export function systemLabel(system) {
  return (
    system?.plainName ??
    system?.shortName ??
    system?.serviceName ??
    system?.name ??
    system?.label ??
    system?.service?.plainName ??
    serviceSystemId(system)
  )
}

function serviceFamily(system) {
  return (
    system?.serviceDefinition?.section ??
    system?.section ??
    (SERVICE_COLORS[system?.serviceFamily] ? system.serviceFamily : null) ??
    "regulation-maintenance"
  )
}

function familyColor(system) {
  return SERVICE_COLORS[serviceFamily(system)] ?? SERVICE_COLORS["regulation-maintenance"]
}

function estimateValue(estimate, fallback = 0) {
  if (Number.isFinite(estimate)) return Number(estimate)
  if (!estimate || typeof estimate !== "object") return fallback
  const value = estimate.normalized ?? estimate.index ?? estimate.value
  return Number.isFinite(value) ? Number(value) : fallback
}

function confidenceLabel(value) {
  return value === "high"
    ? "high confidence"
    : value === "medium"
      ? "medium confidence"
      : "low confidence"
}

function datumFrom(value) {
  return unwrapDatum(value?.datum ?? value?.data ?? value) ?? value
}

export function StatusGlyph({ level = "observe", size = 18, color, className = "", title }) {
  const meta = ALERT_META[level] ?? ALERT_META.unknown
  const stroke = color ?? meta.color
  const half = size / 2
  const common = {
    fill: level === "observe" || level === "unknown" ? "none" : stroke,
    fillOpacity: level === "watch" ? 0.12 : 0.2,
    stroke,
    strokeWidth: Math.max(1.5, size / 9),
  }

  return (
    <svg
      className={`ll-status-glyph ${className}`.trim()}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : "true"}
      aria-label={title}
    >
      {meta.shape === "triangle" ? (
        <path d={`M${half} 1 L${size - 1} ${size - 2} L1 ${size - 2} Z`} {...common} />
      ) : meta.shape === "diamond" ? (
        <path d={`M${half} 1 L${size - 1} ${half} L${half} ${size - 1} L1 ${half} Z`} {...common} />
      ) : meta.shape === "flare" ? (
        <path
          d={`M${half} 0 L${half + 2} ${half - 3} L${size} ${half} L${half + 2} ${half + 3} L${half} ${size} L${half - 2} ${half + 3} L0 ${half} L${half - 2} ${half - 3} Z`}
          {...common}
        />
      ) : meta.shape === "crosshatch" ? (
        <>
          <circle cx={half} cy={half} r={half - 2} {...common} strokeDasharray="3 2" />
          <path
            d={`M3 ${size - 3} L${size - 3} 3 M1 ${half} L${half} 1 M${half} ${size - 1} L${size - 1} ${half}`}
            stroke={stroke}
            strokeWidth="1"
            opacity="0.7"
          />
        </>
      ) : (
        <>
          <circle cx={half} cy={half} r={half - 2} {...common} />
          {meta.shape === "notched" ? (
            <path d={`M${half} 0 L${half} 5`} stroke={stroke} strokeWidth={Math.max(2, size / 7)} />
          ) : null}
        </>
      )}
    </svg>
  )
}

export function ServiceWeatherMap({ areas, systems, selectedId, onSelect, audience = "public" }) {
  const [width, hostRef] = useResponsiveWidth(280, 1160)
  const height = Math.max(280, Math.min(520, Math.round(width * 0.46)))
  const selected = systems.find((system) => serviceSystemId(system) === selectedId)

  return (
    <div ref={hostRef} className="ll-chart-host ll-map-host">
      {areas?.length ? (
        <GeoCustomChart
          chartId="living-ledger-service-weather"
          areas={areas}
          points={systems}
          projection="equirectangular"
          layout={serviceWeatherLayout}
          layoutConfig={{ selectedId, audience }}
          width={width}
          height={height}
          margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
          enableHover
          accessibleTable
          onClick={(datum) => {
            const system = datumFrom(datum)
            const id = serviceSystemId(system)
            if (id) onSelect(id, "map")
          }}
          tooltip={(datum) => {
            const system = datumFrom(datum)
            if (!serviceSystemId(system)) return null
            const level = systemRiskLevel(system)
            return (
              <div className="ll-tooltip">
                <strong>{systemLabel(system)}</strong>
                <span>
                  {system.bioregionName ??
                    system.regionName ??
                    system.bioregion ??
                    "Monitored service system"}
                </span>
                <span>
                  {ALERT_META[level]?.label ?? level} ·{" "}
                  {confidenceLabel(system.risk?.confidence ?? system.confidence)}
                </span>
                <small>
                  {system.freshness === "stale"
                    ? "Evidence is stale. Gray is not good."
                    : (system.claim ?? "Select to inspect the claim.")}
                </small>
              </div>
            )
          }}
          description="World Service Weather. Ecological service systems are shown in ecological regions rather than ranked by country."
          summary={`${systems.length} service systems are visible. ${selected ? `${systemLabel(selected)} is selected.` : "No service system is selected."} Color identifies service family; shape identifies alert state.`}
          frameProps={{
            background: "transparent",
            allowTooltipOverflow: true,
          }}
        />
      ) : (
        <div className="ll-map-loading" role="status">
          Preparing the atlas…
        </div>
      )}
    </div>
  )
}

export function ServiceFlowerBand({ systems, selectedId, onSelect }) {
  return (
    <div className="ll-flower-band" role="group" aria-label="Service-system flower stations">
      {systems.map((system, index) => {
        const id = serviceSystemId(system)
        const patternId = `ll-flower-band-stale-${index}`
        return (
          <button
            key={id}
            type="button"
            aria-label={`Select ${systemLabel(system)} from the flower stations`}
            aria-pressed={id === selectedId}
            title={systemLabel(system)}
            onClick={() => onSelect(id, "flower stations")}
          >
            <span>{system.stationId ?? `Station ${String(index + 1).padStart(2, "0")}`}</span>
            <svg viewBox="-34 -34 68 68" aria-hidden="true">
              <defs>
                <pattern
                  id={patternId}
                  width="5"
                  height="5"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(45)"
                >
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="5"
                    stroke="#a0b4ac"
                    strokeWidth="1"
                    opacity="0.65"
                  />
                </pattern>
              </defs>
              <ServiceFlower
                system={system}
                color={familyColor(system)}
                missingFill={`url(#${patternId})`}
              />
            </svg>
            <small>{system.shortName ?? system.serviceName ?? systemLabel(system)}</small>
          </button>
        )
      })}
    </div>
  )
}

export function policyAction(system) {
  const level = systemRiskLevel(system)
  if (level === "unknown") return "Verify evidence"
  if (level === "critical" || level === "action") return "Prepare response"
  if (level === "warning") return "Review intervention"
  if (level === "watch") return "Assign a watch"
  return "Maintain watch"
}

export function PolicySignalBand({ systems, selectedId, onSelect }) {
  const maxExposure = Math.max(
    1,
    ...systems.map((system) => estimateValue(system.risk?.exposure ?? system.exposure, 0)),
  )
  return (
    <div className="ll-policy-band" role="group" aria-label="Policy decision signals">
      {systems.map((system) => {
        const id = serviceSystemId(system)
        const action = policyAction(system)
        return (
          <button
            key={id}
            type="button"
            aria-label={`Review ${systemLabel(system)}: ${action}`}
            aria-pressed={id === selectedId}
            title={`${systemLabel(system)} — ${action}`}
            onClick={() => onSelect(id, "policy signals")}
          >
            <span>{system.stationId ?? systemLabel(system)}</span>
            <PolicySignalGlyph system={system} maxExposure={maxExposure} />
            <small>{action}</small>
          </button>
        )
      })}
    </div>
  )
}

function PolicySignalGlyph({ system, maxExposure }) {
  const level = systemRiskLevel(system)
  const color = (ALERT_META[level] ?? ALERT_META.unknown).color
  const condition = Math.max(0, Math.min(4, Number(system.risk?.ecologicalSeverity ?? 0)))
  const deficit = Math.max(0, Math.min(4, Number(system.risk?.serviceDeficit ?? 0)))
  const exposure = estimateValue(system.risk?.exposure ?? system.exposure, 0)
  const radius = 2.5 + 4.5 * Math.sqrt(Math.max(0, exposure) / maxExposure)
  return (
    <svg className="ll-policy-signal" viewBox="0 0 64 38" aria-hidden="true">
      <path d="M4 9H43 M4 23H43" stroke="#46675f" strokeWidth="1" />
      {[0, 1, 2, 3].map((index) => (
        <rect
          key={`condition-${index}`}
          x={4 + index * 10}
          y="5"
          width="7"
          height="8"
          rx="1"
          fill={index < condition ? color : "#18352f"}
          fillOpacity={index < condition ? 0.88 : 1}
        />
      ))}
      {[0, 1, 2, 3].map((index) => (
        <rect
          key={`deficit-${index}`}
          x={4 + index * 10}
          y="19"
          width="7"
          height="8"
          rx="1"
          fill={index < deficit ? color : "#18352f"}
          fillOpacity={index < deficit ? 0.88 : 1}
        />
      ))}
      <circle cx="54" cy="19" r={radius} fill={color} fillOpacity="0.24" stroke={color} />
      <path d="M54 7V31" stroke={color} strokeOpacity="0.55" strokeDasharray="2 2" />
    </svg>
  )
}

export function ScienceEvidenceBand({ systems, selectedId, onSelect }) {
  return (
    <div className="ll-science-band" role="group" aria-label="Scientific evidence profiles">
      {systems.map((system) => {
        const id = serviceSystemId(system)
        const freshness = system.freshness ?? system.risk?.freshness ?? "unknown"
        const confidence = system.risk?.confidence ?? system.confidence ?? "low"
        return (
          <button
            key={id}
            type="button"
            aria-label={`Inspect evidence for ${systemLabel(system)}: ${confidence} confidence, ${freshness}`}
            aria-pressed={id === selectedId}
            title={`${systemLabel(system)} — ${confidence} confidence, ${freshness}`}
            onClick={() => onSelect(id, "scientific evidence profiles")}
          >
            <span>{system.stationId ?? systemLabel(system)}</span>
            <ScienceEvidenceGlyph system={system} />
            <small>{`${confidence} · ${freshness}`}</small>
          </button>
        )
      })}
    </div>
  )
}

function ScienceEvidenceGlyph({ system }) {
  const level = systemRiskLevel(system)
  const color = (ALERT_META[level] ?? ALERT_META.unknown).color
  const estimate = system.ecosystemCondition ?? {}
  const value = Math.max(0, Math.min(100, estimateValue(estimate, 50)))
  const confidence = system.risk?.confidence ?? estimate.confidence ?? "low"
  const spread = confidence === "high" ? 7 : confidence === "medium" ? 13 : 21
  const lower = Math.max(0, Number.isFinite(estimate.lower) ? estimate.lower : value - spread)
  const upper = Math.min(100, Number.isFinite(estimate.upper) ? estimate.upper : value + spread)
  const x = (number) => 4 + (56 * number) / 100
  const velocity = estimateValue(system.risk?.velocity, 0)
  const trendY = Math.max(8, Math.min(29, 20 - velocity * 8))
  return (
    <svg className="ll-science-signal" viewBox="0 0 64 38" aria-hidden="true">
      <path d="M4 29H60" stroke="#46675f" strokeWidth="1" />
      <path d="M4 19H60" stroke="#36574f" strokeWidth="1" strokeDasharray="2 2" />
      <line x1={x(lower)} x2={x(upper)} y1="19" y2="19" stroke={color} strokeWidth="2" />
      <line x1={x(lower)} x2={x(lower)} y1="15" y2="23" stroke={color} />
      <line x1={x(upper)} x2={x(upper)} y1="15" y2="23" stroke={color} />
      <circle cx={x(value)} cy="19" r="3.2" fill="#071816" stroke={color} strokeWidth="1.5" />
      <path d={`M4 28 L20 24 L36 ${trendY} L60 ${Math.max(8, trendY - velocity * 4)}`} fill="none" stroke={color} strokeOpacity="0.72" strokeWidth="1.4" />
    </svg>
  )
}

function serviceWeatherLayout(ctx) {
  const selectedId = ctx.config.selectedId
  const land = ctx.areas.flatMap((feature, index) => {
    const pathData = ctx.scales.geoPath(feature)
    if (!pathData) return []
    const bounds = ctx.scales.geoPath.bounds(feature)
    const centroid = ctx.scales.geoPath.centroid(feature)
    if (!bounds.flat().every(Number.isFinite) || !centroid.every(Number.isFinite)) return []
    const width = Math.abs(bounds[1][0] - bounds[0][0])
    const height = Math.abs(bounds[1][1] - bounds[0][1])
    return [
      {
        type: "geoarea",
        pathData,
        centroid,
        bounds,
        screenArea: width * height,
        style: {
          fill: index % 4 === 0 ? "#102a27" : "#0d2422",
          stroke: "#789087",
          strokeOpacity: 0.35,
          strokeWidth: 0.55,
        },
        datum: {
          id: `atlas-area-${feature.id ?? index}`,
          label: feature.properties?.name ?? "Reference geography",
        },
        interactive: false,
      },
    ]
  })

  const placed = ctx.points.flatMap((value) => {
    const system = datumFrom(value)
    const [longitude, latitude] = system.coordinates ?? [system.lon, system.lat]
    const point = ctx.scales.projectedPoint(Number(longitude), Number(latitude))
    if (!point) return []
    return [{ system, x: point[0], y: point[1] }]
  })

  const stations = placed.map(({ system, x, y }) =>
    geoHitTarget({
      x,
      y,
      r: serviceSystemId(system) === selectedId ? 29 : 17,
      datum: system,
      id: serviceSystemId(system),
      group: serviceFamily(system),
    }),
  )

  return {
    nodes: [...land, ...stations],
    overlays:
      land.length || placed.length ? (
        <ServiceWeatherOverlay stations={placed} selectedId={selectedId} />
      ) : null,
  }
}

function ServiceWeatherOverlay({ stations, selectedId }) {
  return (
    <g className="ll-service-weather-overlay" aria-hidden="true" pointerEvents="none">
      <defs>
        <pattern
          id="ll-map-stale"
          width="5"
          height="5"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="5" stroke="#a0b4ac" strokeWidth="1" opacity="0.65" />
        </pattern>
        <filter id="ll-station-glow" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g opacity="0.12">
        {[0.22, 0.38, 0.54, 0.7, 0.86].map((fraction) => (
          <line
            key={fraction}
            x1={`${fraction * 100}%`}
            x2={`${fraction * 100}%`}
            y1="0"
            y2="100%"
            stroke="#b9d4ca"
            strokeDasharray="2 9"
          />
        ))}
      </g>
      {stations.map(({ system, x, y }, index) => {
        const id = serviceSystemId(system)
        const selected = id === selectedId
        const level = systemRiskLevel(system)
        const color = familyColor(system)
        return (
          <g key={id} transform={`translate(${x},${y})`}>
            {selected ? (
              <ServiceFlower system={system} color={color} />
            ) : (
              <MapStatusMark level={level} color={color} stale={system.freshness === "stale"} />
            )}
            <text className="ll-station-number" x={selected ? 32 : 12} y={selected ? -19 : -9}>
              {String(index + 1).padStart(2, "0")}
            </text>
            {selected ? (
              <g className="ll-map-selection-label" transform="translate(33,-6)">
                <rect x="-5" y="-12" width="170" height="38" rx="2" />
                <text y="1">{systemLabel(system)}</text>
                <text y="16">
                  {system.bioregionName ??
                    system.regionName ??
                    system.bioregion ??
                    "selected station"}
                </text>
              </g>
            ) : null}
          </g>
        )
      })}
    </g>
  )
}

function MapStatusMark({ level, color, stale }) {
  const meta = ALERT_META[level] ?? ALERT_META.unknown
  const fill = stale ? "url(#ll-map-stale)" : color
  const common = {
    fill: level === "observe" ? "#071816" : fill,
    fillOpacity: stale ? 0.8 : level === "observe" ? 0.95 : 0.28,
    stroke: stale ? "#a0b4ac" : meta.color,
    strokeWidth: level === "watch" ? 2.5 : 1.8,
    filter: "url(#ll-station-glow)",
  }
  if (meta.shape === "triangle") return <path d="M0 -9 L9 8 L-9 8 Z" {...common} />
  if (meta.shape === "diamond") return <path d="M0 -10 L10 0 L0 10 L-10 0 Z" {...common} />
  if (meta.shape === "flare")
    return <path d="M0 -12 L3 -3 L12 0 L3 3 L0 12 L-3 3 L-12 0 L-3 -3 Z" {...common} />
  return (
    <g>
      <circle r="8" {...common} strokeDasharray={stale ? "3 2" : undefined} />
      {meta.shape === "notched" ? (
        <path d="M0 -11 L0 -5" stroke={meta.color} strokeWidth="3" />
      ) : null}
    </g>
  )
}

function ServiceFlower({ system, color, missingFill = "url(#ll-map-stale)" }) {
  const estimates = LEDGER_DIMENSIONS.map((key) => system.eesv?.[key])
  return (
    <g className="ll-service-flower">
      <circle r="29" fill="#071816" stroke={color} strokeOpacity="0.35" />
      {estimates.map((estimate, index) => {
        const missing = estimate == null || (estimate.value == null && estimate.qualitative == null)
        const angle = index * 60 - 90
        const length = missing
          ? 10
          : 12 +
            Math.max(
              0,
              Math.min(
                1,
                estimateValue(estimate, 50) > 1
                  ? estimateValue(estimate, 50) / 100
                  : estimateValue(estimate, 0.5),
              ),
            ) *
              10
        return (
          <path
            key={LEDGER_DIMENSIONS[index]}
            d={`M0 -5 C5 -9 6 -${length - 3} 0 -${length} C-6 -${length - 3} -5 -9 0 -5 Z`}
            transform={`rotate(${angle})`}
            fill={missing ? missingFill : color}
            fillOpacity={missing ? 0.65 : 0.22 + index * 0.06}
            stroke={missing ? "#9cb0a8" : color}
            strokeWidth="1"
            strokeDasharray={estimate?.confidence === "low" ? "2 2" : undefined}
          />
        )
      })}
      <circle
        r="7"
        fill="#071816"
        stroke={(ALERT_META[systemRiskLevel(system)] ?? ALERT_META.unknown).color}
        strokeWidth="2.5"
      />
    </g>
  )
}

export function TriageField({ systems, selectedId, onSelect, audience = "public" }) {
  const [width, hostRef] = useResponsiveWidth(280, 1160)
  const height = Math.max(310, Math.min(500, Math.round(width * 0.46)))
  const data = useMemo(
    () =>
      systems.map((system) => {
        const rawAdequacy =
          system.triage?.adequacy ??
          system.adequacyScore ??
          system.serviceAdequacy?.normalized ??
          (Number.isFinite(system.serviceAdequacy) ? system.serviceAdequacy : null)
        const comparable = rawAdequacy != null && system.supplyDemandComparable !== false
        const adequacy = comparable
          ? Number(rawAdequacy) <= 2
            ? Number(rawAdequacy) * 100
            : Number(rawAdequacy)
          : 100
        return {
          ...system,
          serviceSystemId: serviceSystemId(system),
          condition: Number(
            system.triage?.condition ??
              system.conditionScore ??
              system.ecosystemCondition?.normalized ??
              estimateValue(system.ecosystemCondition, 50),
          ),
          adequacy,
          adequacyComparable: comparable,
          exposed: Number(
            system.risk?.exposure?.value ?? system.exposure?.value ?? system.exposed ?? 1,
          ),
          evidenceShape: comparable
            ? (system.triage?.evidenceShape ??
              system.warningKind ??
              system.alert?.warningKind ??
              system.alert?.kind ??
              "reference-anomaly")
            : "not-comparable",
          anthropogenicShare:
            system.triage?.supplementation ??
            system.anthropogenicSupplementation ??
            system.anthropogenicShare ??
            0,
          confidence: system.risk?.confidence ?? system.confidence ?? "low",
          family: serviceFamily(system),
        }
      }),
    [systems],
  )
  const maxExposure = useMemo(
    () => Math.max(1, ...data.map((system) => Number(system.exposed ?? 0))),
    [data],
  )

  const lens = triageLens(audience)

  return (
    <div
      ref={hostRef}
      className={`ll-chart-host ll-triage-host ll-triage-host--${audience}`}
      data-lens={audience}
    >
      <QuadrantChart
        chartId="living-ledger-triage"
        data={data}
        xAccessor="condition"
        yAccessor="adequacy"
        xCenter={70}
        yCenter={100}
        quadrants={lens.quadrants}
        centerlineStyle={{ stroke: "#789087", strokeWidth: 1, strokeDasharray: [4, 6] }}
        quadrantLabelSize={10}
        colorBy="family"
        colorScheme={SERVICE_COLORS}
        sizeBy="exposed"
        sizeRange={lens.sizeRange}
        pointIdAccessor="serviceSystemId"
        width={width}
        height={height}
        showAxes
        showGrid
        showLegend={false}
        xLabel={lens.xLabel}
        yLabel={lens.yLabel}
        xFormat={(value) => `${Math.round(value)}`}
        yFormat={(value) => `${Math.round(value)}`}
        accessibleTable
        tooltip={(datum) => {
          const system = datumFrom(datum)
          return (
            <div className="ll-tooltip">
              <strong>{systemLabel(system)}</strong>
              <span>{triageTooltipSummary(system, audience)}</span>
              <span>
                {ALERT_META[systemRiskLevel(system)]?.label} ·{" "}
                {system.warningKindLabel ??
                  system.alert?.warningKind ??
                  system.warningKind ??
                  "observed change"}
              </span>
              <small>{triageTooltipDetail(system, audience)}</small>
            </div>
          )
        }}
        onClick={(datum) => {
          const id = serviceSystemId(datumFrom(datum))
          if (id) onSelect(id, "triage")
        }}
        description={lens.description}
        summary={lens.summary(data.length)}
        frameProps={{
          background: "transparent",
          xExtent: [45, 95],
          yExtent: [80, 145],
          scalePadding: 12,
          symbolAccessor: "evidenceShape",
          symbolMap: EVIDENCE_SYMBOLS,
          foregroundGraphics: ({ scales }) =>
            audience === "public" ? null : (
              <>
                <TriageTails data={data} scales={scales} selectedId={selectedId} />
                {audience === "science" ? <TriageEvidenceRanges data={data} scales={scales} /> : null}
              </>
            ),
          pointStyle: (datum) => {
            const system = datumFrom(datum)
            const active = serviceSystemId(system) === selectedId
            const radius = triageExposureRadius(system.exposed, maxExposure)
            const alertColor = (ALERT_META[systemRiskLevel(system)] ?? ALERT_META.unknown).color
            return {
              fill: audience === "public" ? alertColor : familyColor(system),
              fillOpacity: active ? 0.95 : audience === "science" ? 0.62 : 0.7,
              stroke: active
                ? "#f5efda"
                : audience === "science"
                  ? confidenceColor(system.confidence)
                  : alertColor,
              strokeWidth:
                active ? 2.5 : audience === "public" ? 1.8 : 1.1 + Number(system.anthropogenicShare ?? 0) * 2.4,
              r: active ? radius + 1.5 : audience === "science" ? Math.max(3.5, radius - 1) : radius,
            }
          },
        }}
      />
    </div>
  )
}

function triageLens(audience) {
  if (audience === "policy") {
    return {
      quadrants: {
        topRight: { label: "MAINTAIN", color: "#4cb7a3", opacity: 0.045 },
        topLeft: { label: "SUBSIDIZE", color: "#8e9fc9", opacity: 0.055 },
        bottomRight: { label: "TARGET SUPPORT", color: "#d2ab57", opacity: 0.055 },
        bottomLeft: { label: "ESCALATE", color: "#d2644e", opacity: 0.07 },
      },
      sizeRange: [3, 8],
      xLabel: "Ecosystem condition →",
      yLabel: "Service adequacy →",
      description: "Policy decision field comparing ecosystem condition with whether delivery is keeping up with demand.",
      summary: (count) => `${count} service systems arranged by decision posture. Point area is the exposed reach, not a combined score.`,
    }
  }
  if (audience === "science") {
    return {
      quadrants: {
        topRight: { label: "HIGH / ADEQUATE", color: "#4cb7a3", opacity: 0.035 },
        topLeft: { label: "LOW / ADEQUATE", color: "#8e9fc9", opacity: 0.045 },
        bottomRight: { label: "HIGH / DEFICIT", color: "#d2ab57", opacity: 0.045 },
        bottomLeft: { label: "LOW / DEFICIT", color: "#d2644e", opacity: 0.055 },
      },
      sizeRange: [3, 7],
      xLabel: "Condition index (0–100) →",
      yLabel: "Adequacy estimate (%) →",
      description: "Condition–adequacy diagnostic. Horizontal whiskers show confidence-scaled condition uncertainty and tails show recent movement.",
      summary: (count) => `${count} service systems. This diagnostic preserves non-comparable systems and does not infer a global score.`,
    }
  }
  return {
    quadrants: {
      topRight: { label: "KEEPING UP", color: "#4cb7a3", opacity: 0.045 },
      topLeft: { label: "PEOPLE FILLING THE GAP", color: "#8e9fc9", opacity: 0.055 },
      bottomRight: { label: "NEEDS ATTENTION", color: "#d2ab57", opacity: 0.055 },
      bottomLeft: { label: "SERVICE AT RISK", color: "#d2644e", opacity: 0.06 },
    },
    sizeRange: [4, 9],
    xLabel: "Nature's condition →",
    yLabel: "Service keeping up →",
    description: "A plain-language view of whether ecosystems are in condition to keep providing the service people rely on.",
    summary: (count) => `${count} service systems. The four areas help compare the condition of nature with whether the service is keeping up.`,
  }
}

function triageTooltipSummary(system, audience) {
  const adequacy = system.adequacyComparable ? `${Math.round(system.adequacy)}%` : "not comparable"
  if (audience === "policy") return `decision posture: ${policyAction(system).toLowerCase()} · reach ${formatExposure(system.exposed)}`
  if (audience === "science") return `condition ${Math.round(system.condition)} · adequacy ${adequacy} · ${system.confidence} confidence`
  return `nature ${Math.round(system.condition)} / service ${adequacy}`
}

function triageTooltipDetail(system, audience) {
  if (audience === "science") {
    return system.adequacyComparable
      ? "Whisker width reflects evidence confidence; the tail is the prior 30-day condition estimate."
      : "Adequacy is not comparable for this service; its position is a diagnostic placeholder."
  }
  if (audience === "policy") {
    return system.anthropogenicShare
      ? `${Math.round(system.anthropogenicShare * 100)}% human supplementation · point area is exposed reach`
      : "No quantified supplementation · point area is exposed reach"
  }
  return system.anthropogenicShare
    ? `${Math.round(system.anthropogenicShare * 100)}% of delivery is human supplementation.`
    : "No quantified human supplementation."
}

function formatExposure(value) {
  const number = Math.max(0, Number(value) || 0)
  return number >= 1_000_000 ? `${(number / 1_000_000).toFixed(1)}M` : number >= 1000 ? `${Math.round(number / 1000)}K` : String(Math.round(number))
}

function confidenceColor(confidence) {
  return confidence === "high" ? "#d4e7df" : confidence === "medium" ? "#9ab7c8" : "#8b9c97"
}

export function triageExposureRadius(exposure, maxExposure) {
  const value = Math.max(0, Number(exposure) || 0)
  const maximum = Math.max(1, Number(maxExposure) || 1)
  return Math.max(3, Math.min(8, 8 * Math.sqrt(value / maximum)))
}

function TriageTails({ data, scales, selectedId }) {
  if (!scales?.x || !scales?.y) return null
  return (
    <g aria-hidden="true" pointerEvents="none">
      {data.flatMap((system) => {
        const fromCondition = Number(system.triage?.tail?.fromCondition)
        if (!Number.isFinite(fromCondition)) return []
        const x1 = scales.x(fromCondition)
        const x2 = scales.x(system.condition)
        const y = scales.y(system.adequacy)
        const active = serviceSystemId(system) === selectedId
        return [
          <g key={`tail-${serviceSystemId(system)}`}>
            <line
              x1={x1}
              x2={x2}
              y1={y}
              y2={y}
              stroke={active ? "#f5efda" : familyColor(system)}
              strokeWidth={active ? 2.2 : 1.1}
              strokeDasharray={system.adequacyComparable ? undefined : "3 3"}
              opacity={active ? 0.8 : 0.42}
            />
            <circle
              cx={x1}
              cy={y}
              r={active ? 2.6 : 1.8}
              fill="#071816"
              stroke={active ? "#f5efda" : familyColor(system)}
              opacity={active ? 0.9 : 0.58}
            />
          </g>,
        ]
      })}
    </g>
  )
}

function TriageEvidenceRanges({ data, scales }) {
  if (!scales?.x || !scales?.y) return null
  return (
    <g aria-hidden="true" pointerEvents="none">
      {data.map((system) => {
        const spread = system.confidence === "high" ? 2.5 : system.confidence === "medium" ? 5 : 8
        const x1 = scales.x(Math.max(0, system.condition - spread))
        const x2 = scales.x(Math.min(100, system.condition + spread))
        const y = scales.y(system.adequacy)
        const color = confidenceColor(system.confidence)
        return (
          <g key={`evidence-range-${serviceSystemId(system)}`}>
            <line x1={x1} x2={x2} y1={y} y2={y} stroke={color} strokeOpacity="0.58" />
            <line x1={x1} x2={x1} y1={y - 2.5} y2={y + 2.5} stroke={color} strokeOpacity="0.58" />
            <line x1={x2} x2={x2} y1={y - 2.5} y2={y + 2.5} stroke={color} strokeOpacity="0.58" />
          </g>
        )
      })}
    </g>
  )
}

export function ServicePulse({ system, pulse, audience = "public" }) {
  const [width, hostRef] = useResponsiveWidth(280, 720)
  const height = Math.max(300, Math.min(430, Math.round(width * 0.58)))
  const rows = useMemo(() => pulse?.points ?? [], [pulse])
  const thresholds = pulse?.thresholds ?? []
  const alertEvents = pulse?.alertEvents ?? []
  const unit = pulse?.unit ?? "local reference"
  const normalized = useMemo(() => normalizePulseRows(rows), [rows])
  const lens = pulseLens(audience)
  const displayedRows = useMemo(() => {
    const filtered = normalized.filter((row) => lens.include(row))
    return filtered.length ? filtered : normalized
  }, [lens, normalized])
  const finiteValues = displayedRows
    .flatMap((row) => [row.value, row.referenceLow, row.referenceHigh, row.lower, row.upper])
    .filter(Number.isFinite)
  const thresholdValues = thresholds.flatMap((threshold) =>
    (threshold.levels ?? []).map((level) => Number(level.value)).filter(Number.isFinite),
  )
  const allValues = [...finiteValues, ...thresholdValues]
  const min = Math.min(...allValues, 0)
  const max = Math.max(...allValues, 1)
  const padding = Math.max(1, (max - min) * 0.12)
  const yExtent = [Math.max(0, min - padding), max + padding]

  return (
    <div
      ref={hostRef}
      className={`ll-chart-host ll-pulse-host ll-pulse-host--${audience}`}
      data-lens={audience}
    >
      <LineChart
        chartId="living-ledger-service-pulse"
        data={displayedRows}
        xAccessor="dayIndex"
        yAccessor="value"
        lineBy="series"
        colorBy="series"
        colorScheme={{ Observed: familyColor(system), Modeled: "#9ab7c8", Forecast: "#d9b269" }}
        width={width}
        height={height}
        xExtent={[0, Math.max(179, ...displayedRows.map((row) => row.dayIndex))]}
        yExtent={yExtent}
        curve="monotoneX"
        gapStrategy="break"
        lineWidth={lens.lineWidth}
        showPoints={lens.showPoints}
        pointRadius={lens.pointRadius}
        showGrid={lens.showGrid}
        showLegend={lens.showLegend}
        legendPosition="top"
        xLabel={lens.xLabel}
        yLabel={lens.yLabel(pulse?.label ?? "Indicator", unit)}
        xFormat={(value) => pulseDateLabel(displayedRows, value)}
        yFormat={(value) => formatPulseValue(value)}
        accessibleTable
        tooltip={(datum) => {
          const row = datumFrom(datum)
          return (
            <div className="ll-tooltip">
              <strong>
                {row.date
                  ? DATE_FORMAT.format(new Date(row.date))
                  : `Replay day ${row.dayIndex + 1}`}
              </strong>
              <span>
                {row.series}: {formatPulseValue(row.value, row.unit ?? unit)}
              </span>
              {Number.isFinite(row.lower) && Number.isFinite(row.upper) ? (
                <span>
                  {formatPulseValue(row.lower, row.unit)}–{formatPulseValue(row.upper, row.unit)}{" "}
                  interval
                </span>
              ) : null}
              <small>
                {row.sourceRole ?? row.evidenceRole ?? "observation"} ·{" "}
                {row.confidence ?? "confidence not assigned"}
              </small>
            </div>
          )
        }}
        description={lens.description(system)}
        summary={lens.summary(system, displayedRows.length)}
        frameProps={{
          background: "transparent",
          lineStyle: (_datum, group) => ({
            stroke:
              group === "Observed"
                ? familyColor(system)
                : group === "Forecast"
                  ? "#d9b269"
                  : "#9ab7c8",
            strokeWidth: group === "Observed" ? lens.observedWidth : lens.secondaryWidth,
            strokeDasharray: group === "Forecast" ? "5 4" : group === "Modeled" ? "2 3" : undefined,
            opacity: group === "Observed" ? 1 : lens.secondaryOpacity,
          }),
          pointStyle: (datum) => ({
            fill: datum.series === "Observed" ? familyColor(system) : "#071816",
            stroke:
              datum.series === "Forecast"
                ? "#d9b269"
                : datum.series === "Modeled"
                  ? "#9ab7c8"
                  : familyColor(system),
            strokeWidth: audience === "science" ? 1.2 : 1.6,
            r: datum.series === "Observed" ? lens.pointRadius + 0.2 : lens.pointRadius,
          }),
          foregroundGraphics: ({ scales }) => (
            <PulseOverlay
              rows={displayedRows}
              thresholds={thresholds}
              alertEvents={alertEvents}
              scales={scales}
              audience={audience}
            />
          ),
        }}
      />
    </div>
  )
}

function pulseLens(audience) {
  if (audience === "policy") {
    return {
      include: (row) => row.series === "Observed" || row.series === "Forecast",
      lineWidth: 2.6,
      observedWidth: 2.8,
      secondaryWidth: 2.4,
      secondaryOpacity: 1,
      showPoints: true,
      pointRadius: 2.6,
      showGrid: true,
      showLegend: true,
      xLabel: "Replay and decision horizon",
      yLabel: (label, unit) => `${label} (${unit})`,
      description: (system) => `Decision horizon for ${systemLabel(system)}. Recorded values and the near-term forecast are shown alongside the registered action lines.`,
      summary: (system, count) => `${count} recorded or forecast values for ${systemLabel(system)}. Forecasts are planning signals, not observed outcomes.`,
    }
  }
  if (audience === "science") {
    return {
      include: () => true,
      lineWidth: 2.2,
      observedWidth: 2.6,
      secondaryWidth: 1.8,
      secondaryOpacity: 0.85,
      showPoints: true,
      pointRadius: 2.4,
      showGrid: true,
      showLegend: true,
      xLabel: "Days since replay start",
      yLabel: (label, unit) => `${label} (${unit})`,
      description: (system) => `Evidence pulse for ${systemLabel(system)}. Observations, models, forecasts, reference ranges, uncertainty intervals, and data gaps remain distinct.`,
      summary: (system, count) => `${count} evidence values for ${systemLabel(system)}. The chart retains uncertainty and freshness rather than smoothing them into one trajectory.`,
    }
  }
  return {
    include: (row) => row.series === "Observed",
    lineWidth: 3,
    observedWidth: 3,
    secondaryWidth: 0,
    secondaryOpacity: 0,
    showPoints: false,
    pointRadius: 2.4,
    showGrid: false,
    showLegend: false,
    xLabel: "Six-month replay",
    yLabel: (label) => label,
    description: (system) => `Plain-language service change for ${systemLabel(system)}. The chart shows recorded values and the alert line, not a blended score.`,
    summary: (system, count) => `${count} recorded values for ${systemLabel(system)}. The alert line marks a rule; it does not prove the whole service has failed.`,
  }
}

function normalizePulseRows(rows = []) {
  return rows
    .map((row, index) => {
      const rawValue = row.value ?? row.estimate ?? row.observed
      return {
        ...row,
        dayIndex: Number(row.dayIndex ?? row.day ?? index),
        value: rawValue == null ? null : Number(rawValue),
        lower: finiteOrUndefined(row.lower ?? row.uncertaintyLow ?? row.forecastLow),
        upper: finiteOrUndefined(row.upper ?? row.uncertaintyHigh ?? row.forecastHigh),
        referenceLow: finiteOrUndefined(row.referenceLow ?? row.baselineLow ?? row.envelopeLow),
        referenceHigh: finiteOrUndefined(row.referenceHigh ?? row.baselineHigh ?? row.envelopeHigh),
        gap: row.dataGap ?? row.gap,
        series: normalizeSeries(row.series ?? row.kind ?? row.method ?? row.estimateType),
      }
    })
    .filter((row) => row.value == null || Number.isFinite(row.value))
}

function normalizeSeries(value) {
  const text = String(value ?? "observed").toLowerCase()
  if (text.includes("forecast")) return "Forecast"
  if (text.includes("model")) return "Modeled"
  return "Observed"
}

function finiteOrUndefined(value) {
  if (value == null) return undefined
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

function pulseDateLabel(rows, value) {
  const closest = rows.reduce(
    (best, row) =>
      !best || Math.abs(row.dayIndex - value) < Math.abs(best.dayIndex - value) ? row : best,
    null,
  )
  return closest?.date ? DATE_FORMAT.format(new Date(closest.date)) : `d${Math.round(value) + 1}`
}

function formatPulseValue(value, unit = "") {
  if (value == null) return "not observed"
  if (!Number.isFinite(Number(value))) return "not observed"
  const number = Number(value)
  const formatted =
    Math.abs(number) >= 100
      ? Math.round(number).toLocaleString()
      : number.toFixed(number < 10 ? 1 : 0)
  return unit ? `${formatted} ${unit}` : formatted
}

function PulseOverlay({ rows, thresholds, alertEvents = [], scales, audience = "public" }) {
  if (!scales?.x || !scales?.y || rows.length === 0) return null
  const referenceRows =
    audience === "public"
      ? []
      : rows.filter(
          (row) => Number.isFinite(row.referenceLow) && Number.isFinite(row.referenceHigh),
        )
  const intervalRows =
    audience === "science"
      ? rows.filter(
          (row) =>
            row.series !== "Observed" && Number.isFinite(row.lower) && Number.isFinite(row.upper),
        )
      : []
  const gapRuns = audience === "science" ? contiguousRuns(rows, (row) => row.gap || row.freshness === "stale") : []
  const width = Math.max(...rows.map((row) => scales.x(row.dayIndex)), 0)
  const height = Math.max(
    ...rows.flatMap((row) => [
      Number.isFinite(row.value) ? scales.y(row.value) : 0,
      Number.isFinite(row.referenceLow) ? scales.y(row.referenceLow) : 0,
    ]),
    0,
  )
  return (
    <g className="ll-pulse-overlay" aria-hidden="true" pointerEvents="none">
      <defs>
        <pattern
          id="ll-reference-hatch"
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="8" stroke="#8db2ab" strokeWidth="1" opacity="0.45" />
        </pattern>
        <pattern id="ll-forecast-stipple" width="7" height="7" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.9" fill="#d9b269" opacity="0.65" />
        </pattern>
        <pattern id="ll-gap-crosshatch" width="7" height="7" patternUnits="userSpaceOnUse">
          <path d="M0 0 L7 7 M7 0 L0 7" stroke="#92a39e" strokeWidth="0.7" opacity="0.42" />
        </pattern>
      </defs>
      {referenceRows.length > 1 ? (
        <path
          d={bandPath(referenceRows, scales, "referenceLow", "referenceHigh")}
          fill="url(#ll-reference-hatch)"
          stroke="#8db2ab"
          strokeOpacity="0.28"
        />
      ) : null}
      {intervalRows.length > 1 ? (
        <path
          d={bandPath(intervalRows, scales, "lower", "upper")}
          fill="url(#ll-forecast-stipple)"
          stroke="#d9b269"
          strokeOpacity="0.42"
        />
      ) : null}
      {gapRuns.map((run, index) => {
        const x0 = scales.x(run[0].dayIndex)
        const x1 = scales.x(run[run.length - 1].dayIndex + 1)
        return (
          <rect
            key={index}
            x={x0}
            y="0"
            width={Math.max(2, x1 - x0)}
            height={height || 280}
            fill="url(#ll-gap-crosshatch)"
          />
        )
      })}
      {thresholds.flatMap((threshold) =>
        (threshold.levels ?? []).map((level) => {
          const y = scales.y(Number(level.value))
          if (!Number.isFinite(y)) return null
          const alert = ALERT_META[level.level] ?? ALERT_META.warning
          return (
            <g key={`${threshold.id}-${level.level}`}>
              <line
                x1="0"
                x2={width}
                y1={y}
                y2={y}
                stroke={alert.color}
                strokeWidth="1.5"
                strokeDasharray="7 5"
              />
              <rect x="4" y={y - 17} width="142" height="15" fill="#071816" fillOpacity="0.88" />
              <text x="8" y={y - 6} fill={alert.color}>
                {alert.label} · {level.value} {threshold.unit}
              </text>
            </g>
          )
        }),
      )}
      {alertEvents.map((event) => {
        const x = scales.x(event.dayIndex)
        return (
          <g key={event.id ?? `event-${event.dayIndex}-${event.level}`}>
            <line
              x1={x}
              x2={x}
              y1="0"
              y2={height || 280}
              stroke="#f0e7cf"
              strokeWidth="1"
              strokeDasharray="2 4"
              opacity="0.65"
            />
            <text x={x + 4} y="13" fill="#f0e7cf">
              {event.level ?? event.type}
            </text>
          </g>
        )
      })}
    </g>
  )
}

function bandPath(rows, scales, lowKey, highKey) {
  const top = rows.map((row) => `${scales.x(row.dayIndex)},${scales.y(row[highKey])}`)
  const bottom = [...rows]
    .reverse()
    .map((row) => `${scales.x(row.dayIndex)},${scales.y(row[lowKey])}`)
  return `M${top.join(" L")} L${bottom.join(" L")} Z`
}

function contiguousRuns(rows, predicate) {
  const runs = []
  let run = []
  for (const row of rows) {
    if (predicate(row)) run.push(row)
    else if (run.length) {
      runs.push(run)
      run = []
    }
  }
  if (run.length) runs.push(run)
  return runs
}

export function LivingLedgerMatrix({ rows, audience = "public", onInspect }) {
  const [width, hostRef] = useResponsiveWidth(280, 720)
  const compact = width < 610
  const height = compact ? 500 : 270
  const normalized = useMemo(
    () =>
      LEDGER_DIMENSIONS.map((id, index) => {
        const match = rows.find((row) => row.dimension === id || row.id === id) ?? rows[index] ?? {}
        return { ...match, id, position: index + 1 }
      }),
    [rows],
  )

  return (
    <div ref={hostRef} className="ll-chart-host ll-ledger-host">
      <OrdinalCustomChart
        chartId="living-ledger-six-dimensions"
        data={normalized}
        layout={livingLedgerLayout}
        layoutConfig={{ audience, compact }}
        categoryAccessor="id"
        valueAccessor="position"
        width={width}
        height={height}
        margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
        enableHover
        accessibleTable
        onClick={(datum) => onInspect?.(datumFrom(datum))}
        description="The Living Ledger separates ecological supply, human contribution, demand, use, instrumental value, and relational value."
        summary="Six evidence cells. Their units are not assumed to be commensurable, so the chart does not calculate a total or supply-demand ratio."
        frameProps={{
          background: "transparent",
          tooltipContent: (datum) => {
            const row = datumFrom(datum)
            return (
              <div className="ll-tooltip">
                <strong>{row.label ?? PUBLIC_LEDGER_LABELS[row.id]?.[0]}</strong>
                <span>{ledgerDisplayValue(row)}</span>
                <span>{row.trendLabel ?? row.trend ?? "trend not assessed"}</span>
                <small>
                  {row.method ?? row.estimate?.method ?? "method not supplied"} ·{" "}
                  {row.freshness ?? row.estimate?.freshness ?? "freshness unknown"}
                </small>
              </div>
            )
          },
        }}
      />
    </div>
  )
}

function livingLedgerLayout(ctx) {
  const rows = ctx.data.map(datumFrom)
  const compact = Boolean(ctx.config.compact)
  const audience = ctx.config.audience ?? "public"
  const columns = compact ? 2 : 6
  const rowCount = Math.ceil(rows.length / columns)
  const gap = compact ? 8 : 6
  const cellWidth = (ctx.dimensions.width - gap * (columns - 1)) / columns
  const cellHeight = (ctx.dimensions.height - gap * (rowCount - 1)) / rowCount
  const cells = rows.map((row, index) => {
    const column = index % columns
    const gridRow = Math.floor(index / columns)
    return {
      row,
      x: column * (cellWidth + gap),
      y: gridRow * (cellHeight + gap),
      width: cellWidth,
      height: cellHeight,
    }
  })
  return {
    nodes: cells.map((cell) =>
      hitTargetRect({
        x: cell.x,
        y: cell.y,
        width: cell.width,
        height: cell.height,
        datum: cell.row,
        id: cell.row.id,
        group: "ledger-dimension",
      }),
    ),
    overlays: <LivingLedgerOverlay cells={cells} audience={audience} />,
  }
}

function LivingLedgerOverlay({ cells, audience }) {
  const labels = audience === "science" ? SCIENCE_LEDGER_LABELS : PUBLIC_LEDGER_LABELS
  return (
    <g className="ll-ledger-overlay" aria-hidden="true" pointerEvents="none">
      <defs>
        <pattern
          id="ll-ledger-low-confidence"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="6" stroke="#91a59e" strokeWidth="1" opacity="0.32" />
        </pattern>
        <pattern
          id="ll-ledger-medium-confidence"
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="2" cy="2" r="0.8" fill="#91a59e" opacity="0.48" />
        </pattern>
      </defs>
      {cells.map(({ row, x, y, width, height }) => {
        const confidence = row.confidence ?? row.estimate?.confidence ?? "low"
        const fill =
          confidence === "low"
            ? "url(#ll-ledger-low-confidence)"
            : confidence === "medium"
              ? "url(#ll-ledger-medium-confidence)"
              : "#102824"
        const pair = labels[row.id] ?? [row.label ?? row.id, row.id]
        return (
          <g key={row.id} transform={`translate(${x},${y})`}>
            <rect
              width={width}
              height={height}
              rx="2"
              fill={fill}
              stroke="#365850"
              strokeWidth="1"
              strokeDasharray={
                (row.freshness ?? row.estimate?.freshness) === "stale" ? "5 4" : undefined
              }
            />
            <rect x="0" y="0" width="4" height={height} fill={trendColor(row.trend)} />
            <text className="ll-ledger-primary" x="13" y="22">
              {truncate(pair[0], width > 170 ? 28 : 20)}
            </text>
            <text className="ll-ledger-secondary" x="13" y="39">
              {truncate(pair[1], width > 170 ? 31 : 21)}
            </text>
            <text className="ll-ledger-value" x="13" y={Math.min(height - 42, 78)}>
              {truncate(ledgerDisplayValue(row), width > 170 ? 27 : 18)}
            </text>
            <text className="ll-ledger-trend" x="13" y={height - 24}>
              {truncate(row.trendLabel ?? row.trend ?? "not assessed", width > 170 ? 26 : 18)}
            </text>
            <text className="ll-ledger-meta" x="13" y={height - 9}>
              {confidence} · {row.freshness ?? row.estimate?.freshness ?? "unknown"}
            </text>
          </g>
        )
      })}
    </g>
  )
}

function ledgerDisplayValue(row) {
  if (row.displayValue) return row.displayValue
  const estimate = row.estimate ?? row
  if (estimate.qualitative) return estimate.qualitative
  if (row.qualitative) return row.qualitative
  if (Number.isFinite(estimate.value))
    return `${estimate.value}${estimate.unit ? ` ${estimate.unit}` : ""}`
  if (Number.isFinite(row.value)) return `${row.value}${row.unit ? ` ${row.unit}` : ""}`
  return "Not assessed"
}

function trendColor(trend) {
  const text = String(trend ?? "").toLowerCase()
  if (
    text.includes("↓") ||
    text.includes("down") ||
    text.includes("declin") ||
    text.includes("wors")
  )
    return "#df7857"
  if (
    text.includes("↑") ||
    text.includes("up") ||
    text.includes("rising") ||
    text.includes("increas")
  )
    return "#d8b85d"
  return "#6faea2"
}

function truncate(value, limit) {
  const text = String(value ?? "")
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text
}

export function DependencyEvidenceWeb({ graph, mode, reducedMotion = false }) {
  const [width, hostRef] = useResponsiveWidth(280, 720)
  const height = Math.max(320, Math.min(470, Math.round(width * 0.62)))
  const nodes = graph?.nodes ?? []
  const edges = graph?.edges ?? []
  return (
    <div ref={hostRef} className="ll-chart-host ll-network-host">
      <StreamNetworkFrame
        chartId={`living-ledger-${mode}-web`}
        chartType="sankey"
        nodes={nodes}
        edges={edges}
        nodeIDAccessor="id"
        sourceAccessor="source"
        targetAccessor="target"
        valueAccessor={(edge) => Number(edge.value ?? edge.weight ?? 1)}
        edgeIdAccessor="id"
        orientation="horizontal"
        nodeAlign="justify"
        nodeWidth={9}
        nodePaddingRatio={0.42}
        iterations={38}
        size={[width, height]}
        margin={{
          top: 25,
          right: width < 500 ? 82 : 124,
          bottom: 25,
          left: width < 500 ? 82 : 124,
        }}
        background="transparent"
        nodeStyle={(datum) => {
          const node = datumFrom(datum)
          const kind = node.kind ?? node.type
          return {
            fill:
              kind === "pressure"
                ? "#bd624e"
                : kind === "beneficiary"
                  ? "#b884bd"
                  : kind === "source"
                    ? "#76a6bd"
                    : kind === "threshold"
                      ? "#dfb75f"
                      : "#58bbaa",
            stroke: "#f0e7cf",
            strokeWidth: kind === "threshold" ? 2 : 1,
            opacity: node.restricted ? 0.45 : 0.9,
          }
        }}
        edgeStyle={(datum) => {
          const edge = datumFrom(datum)
          const kind = edge.edgeType ?? edge.kind
          return {
            stroke: kind === "pressure" ? "#bd624e" : mode === "evidence" ? "#77a9bd" : "#58bbaa",
            strokeWidth: 1.1,
            strokeDasharray: edge.inferred ? "4 4" : undefined,
            opacity: edge.inferred ? 0.34 : 0.55,
          }
        }}
        edgeColorBy={(edge) =>
          (edge.edgeType ?? edge.kind) === "pressure"
            ? "#bd624e"
            : mode === "evidence"
              ? "#77a9bd"
              : "#58bbaa"
        }
        edgeOpacity={0.54}
        nodeLabel={(node) => node.data?.label ?? node.label ?? node.id}
        showLabels
        showParticles={false}
        enableHover
        accessibleTable
        tooltipContent={(hover) => {
          const datum = datumFrom(hover)
          return (
            <div className="ll-tooltip">
              <strong>{datum.label ?? datum.id ?? "Evidence path"}</strong>
              {datum.source ? (
                <span>
                  {datum.source} → {datum.target}
                </span>
              ) : null}
              <span>
                {datum.relation ??
                  datum.role ??
                  datum.edgeType ??
                  datum.kind ??
                  datum.type ??
                  "dependency"}
              </span>
              <small>
                {datum.note ?? (datum.inferred ? "Modeled or inferred link" : "Recorded link")}
              </small>
            </div>
          )
        }}
        title={mode === "evidence" ? "How do we know?" : "What depends on it?"}
        description={
          mode === "evidence"
            ? "An evidence lineage from observations through models and a registered threshold to the selected claim."
            : "A dependency network from ecological capacity through service delivery to exposed beneficiaries and values."
        }
        summary={`${nodes.length} nodes and ${edges.length} connections. ${mode === "evidence" ? "This view follows the claim backward." : "This view follows consequences forward."}`}
        seed={14}
        animate={!reducedMotion}
      />
    </div>
  )
}

export function ObservationPipeline({ events = [], audience = "public", selectedId }) {
  const selectedEvents = useMemo(
    () => events.filter((event) => !selectedId || event.serviceSystemId === selectedId),
    [events, selectedId],
  )

  return (
    <div className={`ll-pipeline-host ll-pipeline-host--${audience}`} data-lens={audience}>
      {audience === "policy" ? (
        <PolicyExceptionQueue events={events} />
      ) : audience === "science" ? (
        <ScienceEventTrace events={selectedEvents} />
      ) : (
        <PublicClaimJourney events={selectedEvents} />
      )}
    </div>
  )
}

function pipelineCounts(events) {
  const counts = events.reduce(
    (acc, event) => {
      const outcome = event.outcome ?? event.status ?? (event.stale ? "stale" : "accepted")
      if (event.pipelineStatus === "processing" || event.pipelineStatus === "queued") {
        acc.queued += 1
      }
      else if (outcome === "review" || outcome === "conflict") acc.review += 1
      else if (outcome === "quarantine" || outcome === "failed") acc.quarantine += 1
      else {
        acc.accepted += 1
        if (outcome === "stale" || event.freshness === "stale") acc.stale += 1
      }
      return acc
    },
    { accepted: 0, queued: 0, review: 0, quarantine: 0, stale: 0 },
  )
  return counts
}

function PublicClaimJourney({ events }) {
  const counts = pipelineCounts(events)
  const needsCheck = counts.queued + counts.review + counts.quarantine + counts.stale
  const claimState = needsCheck
    ? "Some records still need attention, so the claim stays limited."
    : "The checked records can inform an indicator, not a promise about the whole service."
  return (
    <section className="ll-public-journey" aria-label="How a reading earns a careful claim">
      <header>
        <span>How a reading earns a careful claim</span>
        <p>One selected service system · {events.length} replay records</p>
      </header>
      <ol>
        <li className="is-received">
          <b>1</b>
          <div>
            <strong>A reading arrives</strong>
            <p>{events.length} record{events.length === 1 ? "" : "s"} from this service system entered the replay.</p>
          </div>
        </li>
        <li className={needsCheck ? "is-checking" : "is-checked"}>
          <b>2</b>
          <div>
            <strong>We check it before using it</strong>
            <p>{publicCheckSummary(counts)}</p>
          </div>
        </li>
        <li className={needsCheck ? "is-limited" : "is-ready"}>
          <b>3</b>
          <div>
            <strong>Then we make a limited statement</strong>
            <p>{claimState}</p>
          </div>
        </li>
      </ol>
    </section>
  )
}

function publicCheckSummary(counts) {
  const exceptions = [
    counts.queued ? `${counts.queued} still moving through checks` : null,
    counts.review ? `${counts.review} in review` : null,
    counts.quarantine ? `${counts.quarantine} stopped for data quality` : null,
    counts.stale ? `${counts.stale} stale` : null,
  ].filter(Boolean)
  return exceptions.length
    ? `${counts.accepted} checked; ${exceptions.join(" · ")}.`
    : `${counts.accepted} record${counts.accepted === 1 ? " has" : "s have"} passed the checks in this replay.`
}

function PolicyExceptionQueue({ events }) {
  const counts = pipelineCounts(events)
  const queue = [
    {
      key: "ready",
      count: counts.accepted,
      label: "Ready for indicator",
      note: "Checked records can inform the monitored indicator.",
    },
    {
      key: "review",
      count: counts.review + counts.queued,
      label: "Needs review",
      note: "Late or conflicting records need a decision before they inform policy.",
    },
    {
      key: "quarantine",
      count: counts.quarantine,
      label: "Data-quality stop",
      note: "Failed validation stays outside the indicator until corrected.",
    },
    {
      key: "stale",
      count: counts.stale,
      label: "Refresh evidence",
      note: "The last accepted reading has aged past its freshness window.",
    },
  ]
  return (
    <section className="ll-policy-queue" aria-label="Evidence exception queue">
      <header>
        <div>
          <span>Evidence exception queue</span>
          <h4>What needs attention before a decision?</h4>
        </div>
        <p>{events.length} records across the current service scope</p>
      </header>
      <ol>
        {queue.map((item) => (
          <li key={item.key} className={`is-${item.key}`}>
            <strong>{item.count}</strong>
            <div>
              <b>{item.label}</b>
              <small>{item.note}</small>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function ScienceEventTrace({ events }) {
  const records = [...events].slice(-6).reverse()
  return (
    <section className="ll-science-trace" aria-label="Selected-service observation record trace">
      <header>
        <div>
          <span>Selected-service record trace</span>
          <h4>Each mark is one replay record, not an aggregate particle.</h4>
        </div>
        <p>{events.length} records in scope</p>
      </header>
      <div className="ll-science-trace-scroll">
        <div className="ll-science-trace-gates" aria-hidden="true">
          <span>Record</span>
          {PIPELINE_GATES.map((gate) => (
            <span key={gate.id}>{gate.label}</span>
          ))}
          <span>Source / unit</span>
        </div>
        <ol>
          {records.map((event) => (
            <li key={event.id}>
              <div className="ll-science-trace-record">
                <strong>{event.label ?? event.id}</strong>
                <small>{event.observedAt ? DATE_FORMAT.format(new Date(event.observedAt)) : "date unknown"}</small>
              </div>
              <div className="ll-science-trace-steps" aria-label={`Processing steps for ${event.label ?? event.id}`}>
                {PIPELINE_GATES.map((gate) => {
                  const state = traceGateState(event, gate.id)
                  return <i key={gate.id} className={`is-${state}`} title={`${gate.label}: ${state}`} />
                })}
              </div>
              <small className="ll-science-trace-source">
                {event.sourceType ?? event.sourceId ?? "source unknown"} · {formatPulseValue(event.value, event.unit)}
              </small>
            </li>
          ))}
        </ol>
      </div>
      <p className="ll-science-trace-key">
        <i className="is-passed" /> passed <i className="is-current" /> current / late <i className="is-review" /> review <i className="is-failed" /> failed <i className="is-pending" /> not reached
      </p>
    </section>
  )
}

function traceGateState(event, gateId) {
  const steps = event.completedJourney ?? event.journey ?? []
  const gateSteps = steps.filter((step) => step.gateId === gateId)
  const latest = gateSteps.at(-1)
  if (gateSteps.some((step) => step.status === "failed")) return "failed"
  if (gateSteps.some((step) => step.status === "review")) return "review"
  if (gateSteps.some((step) => step.status === "late")) return "late"
  if (event.currentGateId === gateId && event.pipelineStatus !== "settled") return "current"
  if (latest?.status === "passed" || latest?.status === "resolved") return "passed"
  return "pending"
}

export function ServiceSystemTable({ systems, selectedId, onSelect }) {
  return (
    <div className="ll-system-table-wrap">
      <table className="ll-system-table">
        <caption>Accessible service-system projection</caption>
        <thead>
          <tr>
            <th>Service system</th>
            <th>Region</th>
            <th>Condition</th>
            <th>Adequacy</th>
            <th>Claim</th>
            <th>Confidence</th>
            <th>Freshness</th>
          </tr>
        </thead>
        <tbody>
          {systems.map((system) => {
            const id = serviceSystemId(system)
            return (
              <tr key={id} className={id === selectedId ? "is-selected" : ""}>
                <th scope="row">
                  <button type="button" onClick={() => onSelect(id, "table")}>
                    <StatusGlyph level={systemRiskLevel(system)} size={16} />
                    {systemLabel(system)}
                  </button>
                </th>
                <td>
                  {system.bioregionName ?? system.regionName ?? system.bioregion ?? "Not recorded"}
                </td>
                <td>
                  {Math.round(system.conditionScore ?? estimateValue(system.ecosystemCondition, 0))}
                </td>
                <td>
                  {Number.isFinite(system.serviceAdequacy)
                    ? `${Math.round(system.serviceAdequacy * 100)}%`
                    : "not comparable"}
                </td>
                <td>
                  {system.warningKindLabel ??
                    system.alert?.warningKind ??
                    system.warningKind ??
                    "Observe"}
                </td>
                <td>{system.risk?.confidence ?? system.confidence ?? "unknown"}</td>
                <td>{system.freshness ?? system.risk?.freshness ?? "unknown"}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function EvidenceLog({ events, limit = 6 }) {
  const recent = [...events].slice(-limit).reverse()
  return (
    <ol className="ll-evidence-log">
      {recent.map((event, index) => (
        <li
          key={event.id ?? `${event.observedAt}-${index}`}
          data-outcome={event.outcome ?? event.status ?? "accepted"}
        >
          <span>
            {event.observedAt
              ? DATE_FORMAT.format(new Date(event.observedAt))
              : `event ${events.length - index}`}
          </span>
          <strong>{event.label ?? event.sourceName ?? event.sourceType ?? "Observation"}</strong>
          <small>{event.note ?? event.message ?? event.outcome ?? "accepted"}</small>
        </li>
      ))}
    </ol>
  )
}

export function ExposureLabel({ system }) {
  const estimate = system?.risk?.exposure ?? system?.exposure
  const value = estimate?.value ?? system?.exposed
  const unit = estimate?.unit ?? "people / assets"
  return Number.isFinite(Number(value))
    ? `${COMPACT_NUMBER.format(Number(value))} ${unit}`
    : "Exposure not quantified"
}
