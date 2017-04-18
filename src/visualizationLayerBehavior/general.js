import Mark from '../components/Mark'
import { line, area, curveLinear } from 'd3-shape'
import { clone } from 'lodash'

export function lineGeneratorDecorator({ generator, props, xScale, yScale, interpolator, singleLine }) {
    const { x, y, yTop, yBottom } = props.projectedCoordinateNames

  generator
    .x(d => xScale(d[x]))
    .curve(interpolator)

  if (singleLine) {
    generator
      .y(d => yScale(d[y]))
  } else {
    generator
      .y0(d => yScale(d[yBottom]))
      .y1(d => yScale(d[yTop]))
  }

  if (props.defined) {
    generator.defined(p => p._xyFrameUndefined || props.defined(p))
  }
  else {
    generator.defined(p => !p._xyFrameUndefined)
  }
}

export function createPoints({ xScale, yScale, canvasDrawing, data, props }) {
  const { y, x } = props.projectedCoordinateNames
  const mappedPoints = []
  data.forEach((d, i) => {

    const dX = xScale(d[x])
    const dY = yScale(d[y])
    let markProps = props.customPointMark ? clone(props.customPointMark(d,i).props) : { key: "piece-" + i, markType: "circle", r: 2 }

    if (props.canvasPoints && props.canvasPoints(d,i) === true) {
      const canvasPoint = { type: "point", baseClass: "frame-piece", tx: dX, ty: dY, d, i, markProps, props, styleFn: props.pointStyle, renderFn: props.pointRenderMode, classFn: props.pointClass }
      canvasDrawing.push(canvasPoint)
    }
    else {
      mappedPoints.push(clonedAppliedElement({ baseClass: "frame-piece", tx: dX, ty: dY, d, i, markProps, props, styleFn: props.pointStyle, renderFn: props.pointRenderMode, classFn: props.pointClass }))
    }

  })
  return mappedPoints
}

export function createLines({ xScale, yScale, props, canvasDrawing, lineData }) {
  const customLine = typeof props.customLineType === "object" ? props.customLineType : { type: props.customLineType }
  const interpolator = customLine.interpolator ? customLine.interpolator : curveLinear
  const lineGenerator = area()

  lineGeneratorDecorator({ props, interpolator, generator: lineGenerator, xScale, yScale })

  const mappedLines = []
  lineData.forEach((d, i) => {
    if (props.customLineMark && typeof props.customLineMark === "function") {
      mappedLines.push(props.customLineMark({ d, i, xScale, yScale, props, canvasDrawing }))
    }
    else {
      const markProps = { markType: "path", d: lineGenerator(d.data) }
      if (props.canvasLines && props.canvasLines(d,i) === true) {
        const canvasLine = { type: "line", baseClass: "xyframe-line", tx: 0, ty: 0, d, i, markProps, props, styleFn: props.lineStyle, renderFn: props.lineRenderMode, classFn: props.lineClass }
        canvasDrawing.push(canvasLine)
      }
      else {
        mappedLines.push(clonedAppliedElement({ baseClass: "xyframe-line", d, i, markProps, props, styleFn: props.lineStyle, renderFn: props.lineRenderMode, classFn: props.lineClass }))
      }
    }

  })

  if (customLine.type === "difference" && lineData.length === 2) {
      //Create the overlay line for the difference chart

      const diffdataA = lineData[0].data.map((basedata, baseI) => {
        const linePoint = basedata._xyfYTop > lineData[1].data[baseI]._xyfYTop ? basedata._xyfYTop : basedata._xyfYBottom
        return {
          _xyfX: basedata._xyfX,
          _xyfY: linePoint,
          _xyfYBottom: linePoint,
          _xyfYTop: linePoint
        }
      })

      const diffdataB = lineData[0].data.map((basedata, baseI) => {
        const linePoint = lineData[1].data[baseI]._xyfYTop > basedata._xyfYTop ? lineData[1].data[baseI]._xyfYTop : lineData[1].data[baseI]._xyfYBottom
        return {
          _xyfX: basedata._xyfX,
          _xyfY: linePoint,
          _xyfYBottom: linePoint,
          _xyfYTop: linePoint
        }
      })

      let doClassname = props.lineClass ? "xyframe-line " + props.lineClass(diffdataA) : "xyframe-line"

      const overLine = line()

      lineGeneratorDecorator({ props, generator: overLine, xScale, yScale, interpolator, singleLine: true })

//      let baseStyle = props.lineStyle ? props.lineStyle(diffdata, 0) : {}
      let diffOverlayA = <Mark key={"xyline-diff-a"} className={doClassname + " difference-overlay-a"} markType="path" d={overLine(diffdataA)} style={{ fill: "none", pointerEvents: "none" }} />
      mappedLines.push(diffOverlayA)

      let diffOverlayB = <Mark key={"xyline-diff-b"} className={doClassname + " difference-overlay-b"} markType="path" d={overLine(diffdataB)} style={{ fill: "none", pointerEvents: "none" }} />
      mappedLines.push(diffOverlayB)

    }

  return mappedLines
}

export function createAreas(xScale, yScale, props) {
  const areaDataAccessor = props.areaDataAccessor || (d => d.coordinates)

  let areaData = props.areas;

  if (!Array.isArray(areaData)) {
    areaData = [ areaData ];
  }

  return areaData.map((d, i) => {
    let className = "xyframe-area";
    if (props.areaClass) {
      className = "xyframe-area " + props.areaClass(d);
    }

    const drawD = "M" + areaDataAccessor(d).map((p,q) => xScale(props.xAccessor(p,q)) + "," + yScale(props.yAccessor(p,q))).join("L") + "Z";

    return <Mark className={className} markType="path" d={drawD} style={props.areaStyle ? props.areaStyle(d, i) : {}} />
  })

}

export function clonedAppliedElement({ tx, ty, d, i, markProps, styleFn, renderFn, classFn, baseClass }) {

    markProps.style = styleFn ? styleFn(d, i) : {}

    markProps.renderMode = renderFn ? renderFn(d, i) : undefined

    if (tx || ty) {
      markProps.transform = "translate(" + (tx || 0) + "," + (ty || 0) + ")";
    }

    markProps.className = baseClass;

    markProps.key = baseClass + "-" + (d.key === undefined ? i : d.key);

    if (classFn) {
      markProps.className = baseClass + " " + classFn(d, i);
    }

    return <Mark {...markProps} />;
}
