export const trueAxis = (orient, props) => {
  if (props.projection === "horizontal" && [ "top", "bottom" ].indexOf(orient) === -1) {
    return "bottom"
  }
  else if ((!props.projection || props.projection === "vertical") && [ "left", "right" ].indexOf(orient) === -1) {
    return "left"
  }
  else if (!orient && props.projection === "horizontal") {
    return "bottom"
  }
  else if (!orient) {
    return "left"
  }
  return orient

}

export const calculateMargin = props => {
  if (props.margin) {
    if (typeof props.margin !== "object") {
      return { top: props.margin, bottom: props.margin, left: props.margin, right: props.margin }
    }
    return Object.assign({ top: 0, bottom: 0, left: 0, right: 0 }, props.margin)
  }
  const margin = { top: 0, bottom: 0, left: 0, right: 0 }
  if (props.title && props.title.length !== 0) {
    margin.top = 30
  }
  let orient = trueAxis(null, props)
  if (props.axis) {
    orient = trueAxis(props.axis.orient, props)
    margin[orient] += 50
  }
  if (props.axes) {
    props.axes.forEach(axis => {
      orient = axis.orient
      margin[orient] += 50
    })
  }
  if (props.oLabel) {
    if (orient === "bottom" || orient === "top") {
      margin.left += 50
    }
    else {
      margin.bottom += 50
    }
  }
  return margin
}
