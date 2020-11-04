import React, { useState, useEffect, useRef } from "react"
import { usePopper } from "react-popper"

const TooltipPositioner = (props) => {
  const { tooltipContent, tooltipContentArgs = true } = props
  const [referenceElement, setReferenceElement] = useState(null)
  const [popperElement, setPopperElement] = useState(null)
  const [arrowElement, setArrowElement] = useState(null)

  const { styles, attributes, forceUpdate } = usePopper(
    referenceElement,
    popperElement,
    {
      modifiers: [
        { name: "arrow", options: { element: arrowElement } },
        { name: "preventOverflow" },
        { name: "offset", options: { offset: [0, 20] } }
      ]
    }
  )

  // Popper doesn't recalculate positions unless any ref elements changed
  // This is a problem because semiotic only adjusts the position of the annotation component
  // (when hovering to another data point), and Popper won't help us detect any resulting
  // boundary collision. It seems that using `forceUpdate` when the tooltipContentArgs
  // changes solves this issue.
  useEffect(() => {
    if (forceUpdate) {
      forceUpdate()
    }
  }, [tooltipContentArgs])

  const refElementStyle: React.CSSProperties = {
    width: "1px",
    height: "1px",
    visibility: "hidden"
  }

  return (
    <>
      <div style={refElementStyle} ref={setReferenceElement}></div>
      <div
        className="tooltip"
        ref={setPopperElement}
        style={styles.popper}
        {...attributes.popper}
      >
        {tooltipContent({ ...tooltipContentArgs })}
        <div
          className="tooltip-arrow"
          ref={setArrowElement}
          style={styles.arrow}
        />
      </div>
    </>
  )
}

export default TooltipPositioner
