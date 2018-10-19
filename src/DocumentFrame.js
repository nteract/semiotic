import React from "react"
import { OrdinalFrame } from "semiotic"
import { processNodes } from "./process"

const objectToString = obj => {
  let newObj = "{ "

  Object.keys(obj).forEach(k => {
    newObj += "\n    "
    newObj += k + ": " + propertyToString(obj[k])
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
  }

  return string
}

class DocumentOrdinalFrame extends React.Component {
  onComponentDidMount() {
    window.Prism.highlightAll()
  }

  render() {
    const {
      props,
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
        framePropsString += "\n// " + d.label + "\n"
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
      <pre className="language-jxs">
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

    // const markdown = (
    //   <pre className="language-jxs">
    //     <code className="language-jsx">
    //       {reactElementToJSXString(<Frame {...frameProps} />, )}
    //     </code>
    //   </pre>
    // )
    // console.log(markdown)

    // console.log(reactElementToJSXString(<div a="1" b="2">Hello, world!</div>));

    return (
      <div>
        <Frame {...frameProps} />

        <div>{markdown}</div>
      </div>
    )
  }
}
export default DocumentOrdinalFrame
