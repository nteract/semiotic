import React from "react"

export default props => {
  const shouldRender =
    typeof props.shouldRender !== "undefined"
      ? props.shouldRender
      : process.env.NODE_ENV !== "production"

  if (!shouldRender) return null

  return <div class="abacus-debug">{props.children}</div>
}
