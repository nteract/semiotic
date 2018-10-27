import React from "react"
import { OrdinalFrame } from "semiotic"
import { processNodes } from "./process"

const objectToString = obj => {
  let newObj = "{ "

  const keys = Object.keys(obj),
    len = keys.length - 1

  keys.forEach((k, i) => {
    newObj += "\n    "
    newObj += k + ": " + propertyToString(obj[k])
    if (i !== len) newObj += ", "
  })

  newObj += "\n  }"

  return newObj
}

const propertyToString = value => {
  let string
  const type = typeof value
  const isArray = Array.isArray(value)

  if (type === "function") {
    string = value.toString()
  } else if (type === "object" && !isArray) {
    string = objectToString(value)
  } else {
    string = JSON.stringify(value)
      .replace(/,{/g, ",\n    {")
      .replace(/:/g, ": ")
      .replace(/"coordinates"/g, '\n   "coordinates"')
  }

  return string
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

const hiddenStyle = { opacity: 0, height: 0 }

class DocumentFrame extends React.Component {
  constructor(props) {
    super(props)

    this.onClick = this.onClick.bind(this)
    this.onCopy = this.onCopy.bind(this)
  }

  state = {
    codeBlock: "collapsed" //can be collapsed, expanded, hidden
  }
  componentDidMount() {
    window.Prism.highlightAll()
  }

  onClick(e) {
    this.setState({ codeBlock: e.target.value })
  }

  onCopy() {
    // this.copy.select()
    const text = this.copy.textContent
    const callback = e => {
      e.clipboardData.clearData()
      e.clipboardData.setData("text/plain", text)
      e.preventDefault()
      document.removeEventListener("copy", callback)
    }
    document.addEventListener("copy", callback)

    document.execCommand("copy")

    // window.copy(this.copy.textContent)
    // this.setState({ codeBlock: e.target.value })
  }

  render() {
    const {
      // props,
      frameProps,
      type = OrdinalFrame,
      overrideProps = {},
      functions = {}
    } = this.props
    const Frame = type

    // let category =
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
            processNodes[order].keys.indexOf(d) /
              processNodes[order].keys.length
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
        propertyToString(d.value)

      framePropsString += `  ${d.key}: ${string}${(i !==
        frameString.length - 1 &&
        ",") ||
        ""}`
    })

    framePropsString += "\n}"

    let functionsString = ""

    Object.keys(functions).forEach(d => {
      functionsString += functions[d]
      functionsString += "\n"
    })

    const frameName = Frame.name

    const markdown = (
      <pre
        className="language-jxs"
        ref={el => (this.copy = el)}
        style={hiddenStyle}
      >
        <code className="language-jsx">
          {`import { ${frameName} } from "semiotic/lib/${frameName}"\n\n`}

          {functionsString && functionsString + "\n"}

          {framePropsString}
          {"\n\n"}
          {`export default () => {

  return <${frameName} {...frameProps} />

}`}
        </code>
      </pre>
    )

    const trimmedMarkdown = (
      <pre className="language-jxs" style={styles[this.state.codeBlock]}>
        <code className="language-jsx">
          {`import { ${frameName} } from "semiotic/lib/${frameName}"\n\n`}

          {functionsString && functionsString + "\n"}

          {framePropsString}
          {"\n\n"}
          {`export default () => {

  return <${frameName} {...frameProps} />

}`}
        </code>
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
