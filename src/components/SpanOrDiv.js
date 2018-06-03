// @flow
import React from "react"
import type { Node } from "react"

type Props = {
  style?: Object,
  className?: string,
  children: Node,
  span: boolean
}

export default (props:Props) => {
  const { style, className, children, span } = props
  if (span)
    return (
      <span className={className} style={{ display: "block", ...style }}>
        {children}
      </span>
    )

  return (
    <div className={className} style={style}>
      {children}
    </div>
  )
}
