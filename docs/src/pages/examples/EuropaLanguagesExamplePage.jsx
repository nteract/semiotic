import React, { useCallback, useEffect, useMemo, useState } from "react"
import { ThemeProvider } from "semiotic"
import { StreamGeoFrame, resolveReferenceGeography } from "semiotic/geo"
import { createRoughRenderMode } from "semiotic/rough"
import { unwrapDatum } from "semiotic/recipes"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  AUSFELD_SOURCE,
  EUROPE_EXTENT,
  LANGUAGE_GROUPS,
  prepareEuropaFeatures,
} from "./data/europaLanguages"
import "./EuropaLanguagesExamplePage.css"

const INK = "#2a2218"
const PAPER = "#f6f0e4"
const MAP_MARGIN = Object.freeze({ top: 6, right: 10, bottom: 10, left: 6 })

export default function EuropaLanguagesExamplePage() {
  const [world, setWorld] = useState(null)
  const [hoverId, setHoverId] = useState(null)
  const [width, hostRef] = useResponsiveWidth(320, 900)

  useEffect(() => {
    let alive = true
    resolveReferenceGeography("world-110m")
      .then((features) => {
        if (alive) setWorld(features)
      })
      .catch(() => {
        if (alive) setWorld([])
      })
    return () => {
      alive = false
    }
  }, [])

  const areas = useMemo(() => prepareEuropaFeatures(world || []), [world])
  const mapWidth = Math.max(320, width)
  const mapHeight = Math.max(380, Math.round(mapWidth * 0.78))

  // One memoized Rough mode for the whole plate — seed is stable so re-renders
  // do not re-doodle country outlines.
  const roughMode = useMemo(
    () =>
      createRoughRenderMode({
        seed: 1840,
        roughness: 1.2,
        bowing: 0.9,
        fillStyle: "zigzag",
        hachureGap: 3.6,
        hachureAngle: 58,
        fillWeight: 1.9,
        simplification: 0.6,
        disableMultiStroke: false,
      }),
    [],
  )

  const renderMode = useCallback(
    (_datum, node) => (node?.type === "geoarea" ? roughMode : undefined),
    [roughMode],
  )

  const areaStyle = useCallback(
    (feature) => {
      const props = feature?.properties || {}
      const active = hoverId == null || hoverId === props.languageId
      return {
        fill: props.languageColor || PAPER,
        fillOpacity: active ? 0.92 : 0.28,
        stroke: INK,
        strokeWidth: active && hoverId === props.languageId ? 1.35 : 0.75,
        strokeOpacity: 0.85,
      }
    },
    [hoverId],
  )

  const handleObservation = useCallback((obs) => {
    if (!obs) return
    if (obs.type === "hover-end") {
      setHoverId(null)
      return
    }
    if (obs.type !== "hover") return
    const raw = unwrapDatum(obs.datum)
    const languageId = raw?.languageId || raw?.properties?.languageId || null
    setHoverId(languageId)
  }, [])

  return (
    <ExamplePageLayout title="Europa nach den lebenden Sprachen">
      <div className="europa-page">
        <p className="europa-lede">
          A rough-ink remake of Karl von Ausfeld&apos;s 1840 plate{" "}
          <em>Europa nach den lebenden Sprachen</em> — Europe tinted by living language families.
          The countries are still real map shapes you can hover, keyboard-navigate, and read in a
          data table. Only the ink is rough: hand-tinted hachure in the spirit of a copperplate,
          without inventing new borders.
        </p>

        <div className="europa-plate" aria-label="Historical language map of Europe">
          <aside className="europa-legend" aria-label="Language family legend">
            <p className="europa-legend__title">Achte Stämme mit ihren Hauptzweigen.</p>
            {LANGUAGE_GROUPS.filter((group) => group.id !== "other").map((group) => (
              <div key={group.id} className="europa-legend__group">
                <div className="europa-legend__group-head">
                  <span className="europa-legend__roman">{group.roman}.</span>
                  <span>{group.label}</span>
                </div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {group.entries.map((entry) => (
                    <li
                      key={entry.id}
                      className="europa-legend__leaf"
                      data-active={hoverId === entry.id ? "true" : undefined}
                      style={{
                        opacity: hoverId == null || hoverId === entry.id ? 1 : 0.4,
                      }}
                    >
                      <span
                        className="europa-legend__swatch"
                        style={{ background: entry.color }}
                        aria-hidden="true"
                      />
                      <span>{entry.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </aside>

          <div className="europa-map-col" ref={hostRef}>
            <div className="europa-map-shell">
              {!world ? (
                <div className="europa-map-loading">Loading Natural Earth…</div>
              ) : (
                <ThemeProvider theme="carbon">
                  <StreamGeoFrame
                    key={`europa-${mapWidth}x${mapHeight}-${areas.length}`}
                    chartId="europa-living-languages"
                    areas={areas}
                    projection="equirectangular"
                    projectionExtent={[
                      [EUROPE_EXTENT[0][0], EUROPE_EXTENT[0][1]],
                      [EUROPE_EXTENT[1][0], EUROPE_EXTENT[1][1]],
                    ]}
                    size={[mapWidth, mapHeight]}
                    margin={MAP_MARGIN}
                    background={PAPER}
                    areaStyle={areaStyle}
                    renderMode={renderMode}
                    width={mapWidth}
                    height={mapHeight}
                    enableHover
                    tooltip={europaTooltip}
                    onObservation={handleObservation}
                    description="Equirectangular choropleth of Europe colored by language family after Ausfeld 1840, painted with a Rough.js hachure backend."
                    summary="Hover a country to isolate its language family in the legend and on the plate. Fills are illustrative modern-border proxies, not 1840 political units."
                    accessibleTable
                  />
                </ThemeProvider>
              )}
            </div>

            <div className="europa-map-caption">
              <p className="europa-hint">Hover a region · keyboard-navigable · rough hachure ink</p>
              <div className="europa-title-block">
                <h1 className="europa-title">Europa</h1>
                <p className="europa-subtitle">nach den lebenden Sprachen.</p>
                <p className="europa-credit">
                  {AUSFELD_SOURCE.author} · {AUSFELD_SOURCE.year}
                </p>
              </div>
            </div>
          </div>
        </div>

        <section className="europa-notes" aria-labelledby="europa-notes-heading">
          <h2 id="europa-notes-heading">How the rough plate is built</h2>
          <p>
            <code>resolveReferenceGeography(&quot;world-110m&quot;)</code> supplies Natural Earth
            borders; <code>prepareEuropaFeatures</code> keeps the Europe-centered plate and attaches
            a language-family leaf color. <code>StreamGeoFrame</code> projects with{" "}
            <code>projectionExtent</code> so the view locks to the historical frame.{" "}
            <code>renderMode</code> is a function that returns a single memoized{" "}
            <code>
              createRoughRenderMode(&#123; fillStyle: &quot;hachure&quot;, seed: 1840 &#125;)
            </code>{" "}
            for <code>geoarea</code> nodes only — points, chrome, and tooltips stay on the default
            renderer. Geometry, selection, and accessibility never pass through Rough.js.
          </p>
        </section>
      </div>
    </ExamplePageLayout>
  )
}

function europaTooltip(datum) {
  if (!datum) return null
  const d = unwrapDatum(datum) || {}
  const props = d.properties || d
  return (
    <div style={{ fontFamily: "Georgia, serif", fontSize: 12, lineHeight: 1.4, maxWidth: 220 }}>
      <strong>{props.name || "Region"}</strong>
      <div style={{ opacity: 0.8, marginTop: 2 }}>
        {props.languageGroup || "—"}
        {props.languageLabel ? ` · ${props.languageLabel}` : ""}
      </div>
      {props.languageRoman ? (
        <div style={{ opacity: 0.65, marginTop: 2 }}>Stamm {props.languageRoman}</div>
      ) : null}
    </div>
  )
}
