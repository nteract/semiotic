import * as React from "react"

type Props = {
  style?: object
  className?: string
  children: React.ReactNode | React.ReactNode[]
  span: boolean
}

class SpanOrDiv extends React.PureComponent<Props> {
  render() {
    const { style, className, span, children } = this.props

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
}

export const HOCSpanOrDiv = span => {
  if (span) {
    return props => {
      const { className, style, children } = props
      return (
        <span className={className} style={{ display: "block", ...style }}>
          {children}
        </span>
      )
    }
  }
  return props => {
    const { className, style, children } = props
    return (
      <div className={className} style={style}>
        {children}
      </div>
    )
  }
}

export default SpanOrDiv
