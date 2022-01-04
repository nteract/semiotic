import React from "react"
import { OrdinalFrame } from "semiotic"
import { processNodes } from "./process"
import theme from "./theme"

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

export const propertyToString = (value, indent, trimmed) => {
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

const getFramePropsString = (
  frameProps,
  functions,
  overrideProps,
  trimmed,
  hiddenProps
) => {
  const frameString = Object.keys(frameProps)
    .filter(d => !hiddenProps[d])
    .map(d => {
      const order = processNodes.findIndex(p => p.keys.indexOf(d) !== -1)

      const match = processNodes[order]

      if (!match) console.log(`ERROR: no label found for ${d}`)

      return {
        key: d,
        value: frameProps[d],
        label: match && match.label,
        order:
          order + ((match && match.keys.indexOf(d) / match.keys.length) || 0)
      }
    })
    .sort((a, b) => {
      return a.order - b.order
    })

  let framePropsString = "const frameProps = { ",
    category

  frameString.forEach((d, i) => {
    if (i !== 0) framePropsString += "\n"

    if (category !== d.label && trimmed) {
      framePropsString += "\n/* --- " + d.label + " --- */\n"
      category = d.label
    }

    let string =
      (functions[d.key] && (functions[d.key].name || d.key)) ||
      (overrideProps[d.key] && typeof overrideProps[d.key] === "string"
        ? overrideProps[d.key]
        : propertyToString(overrideProps[d.key], 0, trimmed)) ||
      propertyToString(d.value, 0, trimmed)

    if (string !== "") {
      framePropsString += `  ${d.key}: ${string}${(i !==
        frameString.length - 1 &&
        ",") ||
        ""}`
    }
  })

  framePropsString += "\n}"
  return framePropsString
}

const getCodeBlock = (
  frameName,
  pre,
  functionsString,
  framePropsString,
  overrideRender
) => {
  const importTheme = `const theme = ${JSON.stringify(theme)}`

  let render =
    overrideRender ||
    `export default () => {
  return <${frameName} {...frameProps} />
}`

  let codeblock = `import { ${frameName} } from "semiotic"
${pre || ""}${(pre && "\n") || ""}${importTheme}
${functionsString}${framePropsString}

${render}`
  let addImport = false

  if (codeblock.indexOf("theme") !== -1) {
    codeblock = codeblock.replace(/theme\[(.*?)]/g, (s, m) => {
      const tryParse = parseInt(m, 10)
      if (isNaN(tryParse)) {
        addImport = true
        return s
      }

      return `"${theme[m]}"`
    })
  }

  if (!addImport) {
    codeblock = codeblock.replace(importTheme + "\n", "")
  }

  return codeblock
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

class DocumentFrame extends React.Component {
  constructor(props) {
    super(props)

    this.onClick = this.onClick.bind(this)
    this.onCopy = this.onCopy.bind(this)

    this.state = {
      codeBlock: props.startHidden
        ? "hidden"
        : props.useExpanded
        ? "expanded"
        : "collapsed"
    }
  }

  componentDidMount() {
    if (this.state.codeBlock !== "hidden") window.Prism.highlightAll()
  }

  onClick(e) {
    this.setState({ codeBlock: e.target.value })
  }

  onCopy() {
    const {
      frameProps,
      type = OrdinalFrame,
      overrideProps = {},
      functions = {},
      pre,
      overrideRender,
      hiddenProps = {}
    } = this.props

    const Frame = type

    const framePropsString = getFramePropsString(
      frameProps,
      functions,
      overrideProps,
      false,
      hiddenProps
    )

    const functionsString = getFunctionString(functions, overrideProps)

    const frameName = Frame.displayName

    const text = getCodeBlock(
      frameName,
      pre,
      functionsString,
      framePropsString,
      overrideRender
    )

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
      functions = {},
      pre,
      useExpanded,
      overrideRender,
      hiddenProps = {}
    } = this.props
    const Frame = type

    const trimmedFramePropsString = getFramePropsString(
      frameProps,
      functions,
      overrideProps,
      true,
      hiddenProps
    )
    const functionsString = getFunctionString(functions, overrideProps)

    const frameName = Frame.displayName

    const trimmedMarkdown = (
      <pre className="language-jxs" style={styles[this.state.codeBlock]}>
        <code className="language-jsx">
          {getCodeBlock(
            frameName,
            pre,
            functionsString,
            trimmedFramePropsString,
            overrideRender
          )}{" "}
        </code>
      </pre>
    )

    return (
      <div className="relative">
        <Frame {...frameProps} />

        <div className="toolbar">
          <button
            value={useExpanded ? "expanded" : "collapsed"}
            onClick={this.onClick}
          >
            Show Code
          </button>
          <button value="hidden" onClick={this.onClick}>
            Hide Code
          </button>

          <button value="copy" onClick={this.onCopy}>
            Copy Full Code
          </button>
        </div>
        <div>{trimmedMarkdown}</div>
      </div>
    )
  }
}
export default DocumentFrame
