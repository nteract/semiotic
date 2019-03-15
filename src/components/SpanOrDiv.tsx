import * as React from "react"

type Props = {
  style?: object
  className?: string
  children: React.ReactNode | React.ReactNode[]
  span: boolean
}

export default (props: Props) => {
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
