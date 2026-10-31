"use client"
import * as React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import type { WordCloudProps } from "../charts/wordcloud/WordCloud"
import type { Datum } from "../charts/shared/datumTypes"
import type { useChartSelection } from "../charts/shared/hooks"
import { useFrame } from "./useFrame"
import type { FrameMargin } from "./useFrame"
import { useFrameCanvasHost } from "./useCanvasFrameHost"
import { useHydration, useWasHydratingFromSSR } from "./useHydration"
import { prepareCanvas, getDevicePixelRatio } from "./canvasSetup"
import { textSceneNodeToSVG, renderCanvasText, hitTestText } from "./textScene"
import type { TextSceneNode } from "./textScene"
import { wordCloudTableScene } from "../wordcloud/wordCloudTable"
import { useWordCloudLayout } from "../wordcloud/useWordCloudLayout"
import { AccessibleDataTableSlot } from "./AccessibleDataTable"
import { SR_ONLY_STYLE } from "../screenReaderStyles"
import { FlippingTooltip } from "../Tooltip/FlippingTooltip"
import {
  hasOwnTooltipChrome,
  hasTooltipContent
} from "../Tooltip/tooltipChrome"
import { useHighContrast } from "./useMediaPreferences"

interface Props extends Omit<WordCloudProps, "margin"> {
  margin?: Partial<FrameMargin>
  colorScale?: (key: string) => string
  interaction: ReturnType<typeof useChartSelection>
  tooltipContent: (hover: Datum) => React.ReactNode
}
const NO_MARGIN = { top: 0, right: 0, bottom: 0, left: 0 }

/** Word-cloud frame: shared responsive canvas host, retained text, and semantic interactions. */
export function StreamWordCloudFrame(props: Props) {
  const dirtyRef = useRef(true)
  const storeRef = useRef({})
  const hydrated = useHydration()
  const wasHydratingFromSSR = useWasHydratingFromSSR()
  const forcedColors = useHighContrast()
  const frame = useFrame({
    sizeProp: [
      props.width ?? props.layout?.width ?? 640,
      props.height ?? props.layout?.height ?? 400
    ],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    userMargin: props.margin,
    marginDefault: NO_MARGIN,
    themeDirtyRef: dirtyRef
  })
  const { size, margin, currentTheme } = frame
  const plotWidth = Math.floor(frame.adjustedWidth),
    plotHeight = Math.floor(frame.adjustedHeight)
  const { layout, error, pending } = useWordCloudLayout(
    props,
    plotWidth,
    plotHeight
  )
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)
  const { activeSelectionHook, hoverSelectionHook } = props.interaction
  const { data, colorBy, colorScale, onClick, selection } = props
  const scene = useMemo<TextSceneNode[]>(
    () =>
      (layout?.words ?? []).map((word) => {
        const datum = data[word.sourceIndex]
        const category =
          typeof colorBy === "function"
            ? colorBy(datum)
            : String(datum?.[colorBy ?? ""] ?? "")
        const selected =
          (!activeSelectionHook?.isActive ||
            activeSelectionHook.predicate(datum)) &&
          (!hoverSelectionHook?.isActive || hoverSelectionHook.predicate(datum))
        return {
          ...word,
          type: "text",
          x: word.x + plotWidth / 2,
          y: word.y + plotHeight / 2,
          datum,
          style: {
            fill: forcedColors
              ? "CanvasText"
              : (colorScale?.(category) ?? currentTheme.colors.text),
            opacity: selected
              ? 1
              : (selection?.unselectedOpacity ??
                currentTheme.colors.selectionOpacity ??
                0.25),
            cursor: onClick || selection ? "pointer" : undefined,
            ...(selected
              ? selection?.selectedStyle
              : selection?.unselectedStyle),
            ...(forcedColors ? { fill: "CanvasText" } : {})
          },
          accessibility: {
            label: word.text,
            tableFields: {
              ...datum,
              term: word.text,
              value: word.value,
              placement: "placed"
            }
          }
        }
      }),
    [
      layout,
      data,
      colorBy,
      colorScale,
      onClick,
      selection,
      activeSelectionHook,
      hoverSelectionHook,
      currentTheme,
      forcedColors,
      plotWidth,
      plotHeight
    ]
  )
  const valueAccessor = props.valueAccessor
  const textAccessor = props.textAccessor
  const tableScene = useMemo(
    () => wordCloudTableScene({ data, valueAccessor, textAccessor }, layout),
    [layout, data, valueAccessor, textAccessor]
  )
  const host = useFrameCanvasHost(frame, {
    storeRef,
    dirtyRef,
    hydrated,
    wasHydratingFromSSR,
    size,
    maxDevicePixelRatio: props.maxDevicePixelRatio,
    canvasPaintDependencies: [scene, size[0], size[1], margin, props.renderAs]
  })
  frame.renderFnRef.current = () => {
    const canvas = host.canvasRef.current
    if (!canvas) return
    const ctx = prepareCanvas(
      canvas,
      size,
      margin,
      getDevicePixelRatio(props.maxDevicePixelRatio, size)
    )
    if (!ctx) return
    ctx.clearRect(-margin.left, -margin.top, size[0], size[1])
    renderCanvasText(ctx, scene)
    dirtyRef.current = false
  }
  const behavior = useRef(props.interaction)
  behavior.current = props.interaction
  const hitAt = (clientX: number, clientY: number) => {
    const box = frame.responsiveRef.current?.getBoundingClientRect()
    if (!box || !box.width || !box.height) return undefined
    const x = ((clientX - box.left) * size[0]) / box.width - margin.left
    const y = ((clientY - box.top) * size[1]) / box.height - margin.top
    return [...scene].reverse().find((node) => hitTestText(node, x, y))
  }
  const selectHover = (node?: TextSceneNode, keyboard = false) => {
    setHoverId(node?.id ?? null)
    behavior.current.customHoverBehavior(
      node ? { data: node.datum, x: node.x, y: node.y } : null,
      keyboard ? { type: "focus", inputType: "keyboard" } : undefined
    )
  }
  frame.hoverHandlerRef.current = ({ clientX, clientY }) => {
    if (props.enableHover === false) return
    const node = hitAt(clientX, clientY)
    if ((node?.id ?? null) !== hoverId) selectHover(node)
    if (host.canvasRef.current)
      host.canvasRef.current.style.cursor = node?.style.cursor ?? ""
  }
  frame.hoverLeaveRef.current = () => {
    selectHover()
    if (host.canvasRef.current) host.canvasRef.current.style.cursor = ""
  }
  useEffect(() => {
    setHoverId(null)
    behavior.current.customHoverBehavior(null)
  }, [layout])
  useEffect(() => () => behavior.current.customHoverBehavior(null), [])
  const focusedIndex = Math.max(
    0,
    scene.findIndex((word) => word.id === focusId)
  )
  const focusWord = (index: number) => {
    const node = scene[index]
    if (!node) return
    setFocusId(node.id)
    document
      .getElementById(`${frame.tableId}-word-${encodeURIComponent(node.id)}`)
      ?.focus()
  }
  const hover = scene.find((word) => word.id === hoverId)
  const tooltip =
    hover && props.enableHover !== false
      ? props.tooltipContent({
          ...hover.datum,
          data: hover.datum,
          text: hover.text,
          value: layout?.words.find((word) => word.id === hover.id)?.value,
          x: hover.x,
          y: hover.y
        })
      : null
  const svgPaint = props.renderAs === "svg" || !hydrated || forcedColors
  return (
    <div
      className={`stream-wordcloud-frame ${props.className ?? ""}`}
      role="group"
      aria-label={props.title ?? "Word cloud"}
    >
      <div
        ref={frame.responsiveRef}
        aria-busy={pending}
        data-wordcloud-state={error ? "error" : pending ? "preparing" : "ready"}
        data-placed-count={layout?.words.length ?? 0}
        data-omitted-count={layout?.omitted.length ?? 0}
        style={{
          position: "relative",
          width: props.responsiveWidth ? "100%" : size[0],
          height: props.responsiveHeight ? "100%" : size[1]
        }}
        onPointerMove={frame.onPointerMove}
        onPointerLeave={frame.onPointerLeave}
        onClick={(event) => {
          frame.flushPointerMove(event)
          const node = hitAt(event.clientX, event.clientY)
          if (node)
            behavior.current.customClickBehavior(
              { data: node.datum, x: node.x, y: node.y },
              { type: "activate", inputType: "pointer" }
            )
        }}
      >
        {!svgPaint && (
          <canvas
            ref={host.canvasRef}
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              width: size[0],
              height: size[1]
            }}
          />
        )}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          role="group"
          aria-label={props.title ?? "Word cloud terms"}
          width={size[0]}
          height={size[1]}
          style={{ position: "absolute", inset: 0, overflow: "visible" }}
        >
          {props.title && <title>{props.title}</title>}
          {(props.description || props.summary) && (
            <desc>
              {[props.description, props.summary].filter(Boolean).join(" ")}
            </desc>
          )}
          <g transform={`translate(${margin.left},${margin.top})`}>
            {svgPaint && (
              <g aria-hidden="true">
                {scene.map((node) => textSceneNodeToSVG(node))}
              </g>
            )}
            {scene.map((node, i) => (
              <g
                key={node.id}
                id={`${frame.tableId}-word-${encodeURIComponent(node.id)}`}
                data-word-id={node.id}
                data-word-x={node.x}
                data-word-y={node.y}
                role="button"
                tabIndex={i === focusedIndex ? 0 : -1}
                aria-label={`${node.text}: ${layout?.words[i].value}`}
                onFocus={() => {
                  setFocusId(node.id)
                  selectHover(node, true)
                }}
                onBlur={() => {
                  setFocusId(null)
                  selectHover()
                }}
                onKeyDown={(event) => {
                  if (
                    [
                      "ArrowRight",
                      "ArrowDown",
                      "ArrowLeft",
                      "ArrowUp",
                      "Home",
                      "End"
                    ].includes(event.key)
                  ) {
                    event.preventDefault()
                    focusWord(
                      event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? scene.length - 1
                          : (i +
                              (event.key === "ArrowRight" ||
                              event.key === "ArrowDown"
                                ? 1
                                : -1) +
                              scene.length) %
                            scene.length
                    )
                  } else if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    behavior.current.customClickBehavior(
                      { data: node.datum, x: node.x, y: node.y },
                      { type: "activate", inputType: "keyboard" }
                    )
                  } else if (event.key === "Escape") {
                    event.preventDefault()
                    selectHover()
                  }
                }}
              >
                <rect
                  x={node.x + node.x0}
                  y={node.y + node.y0}
                  width={node.x1 - node.x0}
                  height={node.y1 - node.y0}
                  fill="transparent"
                  pointerEvents="none"
                  stroke={
                    focusId === node.id
                      ? "var(--semiotic-focus, #2563eb)"
                      : "none"
                  }
                  strokeWidth={2}
                />
              </g>
            ))}
            {(props.annotations ?? []).map((annotation, i) => {
              const word = scene.find((node) => node.id === annotation.id)
              if (!word) return null
              const x = word.x + (annotation.dx ?? 24),
                y = word.y + (annotation.dy ?? -30)
              return (
                <g key={i} role="note">
                  <line
                    x1={word.x}
                    y1={word.y}
                    x2={x}
                    y2={y}
                    stroke={currentTheme.colors.text}
                  />
                  <text
                    x={x}
                    y={y}
                    fill={currentTheme.colors.text}
                    fontSize={12}
                  >
                    {annotation.label}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>
        {pending && (
          <div role="status" style={{ position: "absolute", inset: 16 }}>
            Preparing words…
          </div>
        )}
        {error && (
          <div role="alert" style={{ position: "absolute", inset: 16 }}>
            {error.message}
          </div>
        )}
        {!pending && !error && scene.length === 0 && (
          <div role="status" style={{ position: "absolute", inset: 16 }}>
            No terms could be placed. See the data summary for omitted terms.
          </div>
        )}
        {hover && hasTooltipContent(tooltip) && (
          <FlippingTooltip
            x={hover.x}
            y={hover.y}
            containerWidth={plotWidth}
            containerHeight={plotHeight}
            margin={margin}
            contentOwnsChrome={hasOwnTooltipChrome(props.tooltipContent)}
            className="stream-wordcloud-tooltip"
          >
            {tooltip}
          </FlippingTooltip>
        )}
      </div>
      <div aria-live="polite" style={SR_ONLY_STYLE}>
        {focusId && hover
          ? `${hover.text}: ${layout?.words.find((w) => w.id === hover.id)?.value}`
          : ""}
      </div>
      <AccessibleDataTableSlot
        accessibleTable={props.accessibleTable ?? true}
        scene={tableScene}
        chartType="word cloud"
        chartTitle={props.title}
        tableId={frame.tableId}
      />
    </div>
  )
}
