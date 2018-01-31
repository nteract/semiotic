import React from "react"

import PropTypes from "prop-types"

export default props => {
  const { style, className, children } = props
  if (props.span) {
    return (
      <span className={className} style={{ display: "block", ...style }}>
        {children}
      </span>
    )
  }
  return (
    <div className={className} style={style}>
      {children}
    </div>
  )
}
