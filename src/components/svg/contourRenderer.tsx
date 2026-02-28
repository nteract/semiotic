import { contouring } from "../svg/areaDrawing"

const contourMap = (d) => [d.xy.x, d.xy.y]

export function contourRenderFn({
  data,
  type,
  renderMode,
  eventListenersGenerator,
  styleFn,
  classFn,
  adjustedSize
}) {
  const keys = Object.keys(data)
  const renderedSummaryMarks = []
  const summaryXYCoords = []

  keys.forEach((key, ordsetI) => {
    const ordset = data[key]
    type.thresholds = type.thresholds || 8
    type.bandwidth = type.bandwidth || 12
    type.resolution = type.resolution || 1000

    const projectedOrd = [
      { id: ordset, _xyfCoordinates: ordset.xyData.map(contourMap) }
    ]

    const oContours = contouring({
      summaryType: type,
      data: projectedOrd,
      finalXExtent: [0, adjustedSize[0]],
      finalYExtent: [0, adjustedSize[1]]
    })
    const contourMarks = []
    oContours.forEach((d, i) => {
      d.coordinates.forEach((coords, ii) => {
        const eventListeners = eventListenersGenerator(d, i)
        contourMarks.push({

          ...eventListeners,

          key: `${i}-${ii}`,
          style: styleFn(ordset.pieceData[0].data, ordsetI),
          className: classFn(ordset.pieceData[0].data, ordsetI),
          markType: "path",
          d: `M${d.coordinates[0].map((p) => p.join(",")).join("L")}Z`
        })
      })
    })

    renderedSummaryMarks.push({
      containerProps: {
        key: `contour-container-${ordsetI}`,
        role: "img",
        tabIndex: -1,
        "data-o": key,
        "aria-label": `${key} boxplot showing ${summaryXYCoords
          .filter((d) => d.key === key)
          .map((d) => `${d.label} ${d.value}`)}`
      },
      //These are drawn items
      elements: contourMarks
    })
  })
  return { marks: renderedSummaryMarks, xyPoints: summaryXYCoords }
}
