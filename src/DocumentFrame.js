import React from "react"
import { OrdinalFrame } from "semiotic"
import { processNodes } from "./process"

const objectToString = (obj, indent, trimmed) => {
  if (!obj) return ""
  let newObj = "{ "
  const keys = Object.keys(obj),
    len = keys.length - 1

  keys.forEach((k, i) => {
    newObj += k + ": " + propertyToString(obj[k], indent + 1, trimmed)
    if (i !== len) newObj += ", "
  })

  newObj += ` }`
  return newObj
}

const propertyToString = (value, indent, trimmed) => {
  let string
  const type = typeof value
  const isArray = Array.isArray(value)
  let spaces = ""
  let x = 0
  for (x; x <= indent - 1; x++) {
    spaces += "  "
  }
  if (type === "function") {
    string = value.toString()
  } else if (type === "object" && !isArray) {
    string = objectToString(value, indent, trimmed)
  } else if (isArray) {
    const arr = trimmed ? value.slice(0, 2) : value
    string = (
      `[` +
      arr.map(d => propertyToString(d, indent + 1, trimmed)) +
      `${value.length > 2 && trimmed ? `, ... ` : ""}]`
    ).replace(/},{/g, `},\n${spaces}    {`)
  } else {
    string = JSON.stringify(value)
  }
  return string
}

const getFunctionString = (functions, overrideProps) => {
  let functionsString = ""

  Object.keys(functions).forEach(d => {
    functionsString += overrideProps[d] || functions[d]
    functionsString += "\n"
  })

  if (functionsString) functionsString += "\n"

  return functionsString
}

const getFramePropsString = (frameProps, functions, overrideProps, trimmed) => {
  const frameString = Object.keys(frameProps)
    .map(d => {
      const order = processNodes.findIndex(p => p.keys.indexOf(d) !== -1)

      const { label } = processNodes[order]

      return {
        key: d,
        value: frameProps[d],
        label,
        order:
          order +
          processNodes[order].keys.indexOf(d) / processNodes[order].keys.length
      }
    })
    .sort((a, b) => {
      return a.order - b.order
    })

  let framePropsString = "const frameProps = { ",
    category

  frameString.forEach((d, i) => {
    if (i !== 0) framePropsString += "\n"

    if (category !== d.label) {
      framePropsString += "\n/* --- " + d.label + " --- */\n"
      category = d.label
    }

    let string =
      (functions[d.key] && (functions[d.key].name || d.key)) ||
      overrideProps[d.key] ||
      propertyToString(d.value, 0, trimmed)

    framePropsString += `  ${d.key}: ${string}${(i !== frameString.length - 1 &&
      ",") ||
      ""}`
  })

  framePropsString += "\n}"
  return framePropsString
}

const getCodeBlock = (frameName, functionsString, framePropsString) => {
  return (
    <code className="language-jsx">
      {`import { ${frameName} } from "semiotic/lib/${frameName}"\n\n`}

      {functionsString}

      {framePropsString}
      {"\n\n"}
      {`export default () => {

  return <${frameName} {...frameProps} />

}`}
    </code>
  )
}

const styles = {
  hidden: {
    display: "none"
  },
  expanded: {},
  collapsed: {
    maxHeight: 350
  }
}

const hiddenStyle = { opacity: 0, height: 0, margin: 0, padding: 0 }

class DocumentFrame extends React.Component {
  constructor(props) {
    super(props)

    this.onClick = this.onClick.bind(this)
    this.onCopy = this.onCopy.bind(this)

    this.state = {
      codeBlock: props.startHidden ? "hidden" : "collapsed"
    }
  }

  componentDidMount() {
    window.Prism.highlightAll()
  }

  onClick(e) {
    this.setState({ codeBlock: e.target.value })
  }

  onCopy() {
    const text = this.copy.textContent
    const callback = e => {
      e.clipboardData.clearData()
      e.clipboardData.setData("text/plain", text)
      e.preventDefault()
      document.removeEventListener("copy", callback)
    }
    document.addEventListener("copy", callback)
    document.execCommand("copy")
  }

  render() {
    const {
      frameProps,
      type = OrdinalFrame,
      overrideProps = {},
      functions = {}
    } = this.props
    const Frame = type

    const framePropsString = getFramePropsString(
      frameProps,
      functions,
      overrideProps
    )
    const trimmedFramePropsString = getFramePropsString(
      frameProps,
      functions,
      overrideProps,
      true
    )
    const functionsString = getFunctionString(functions, overrideProps)

    const frameName = Frame.displayName

    const markdown = (
      <pre
        className="language-jxs"
        ref={el => (this.copy = el)}
        style={hiddenStyle}
      >
        {getCodeBlock(frameName, functionsString, framePropsString)}
      </pre>
    )

    const trimmedMarkdown = (
      <pre className="language-jxs" style={styles[this.state.codeBlock]}>
        {getCodeBlock(frameName, functionsString, trimmedFramePropsString)}
      </pre>
    )

    return (
      <div>
        <Frame {...frameProps} />

        <div className="toolbar">
          <button value="collapsed" onClick={this.onClick}>
            Show Code
          </button>
          <button value="hidden" onClick={this.onClick}>
            Hide Code
          </button>

          <button value="copy" onClick={this.onCopy}>
            Copy Code
          </button>
        </div>
        <div>{markdown}</div>
        <div>{trimmedMarkdown}</div>
      </div>
    )
  }
}
export default DocumentFrame
