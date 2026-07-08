// Pure code-string generation for LiveExample.
//
// Extracted from LiveExample.js so the (React-free) generation logic is unit-
// testable in isolation — it imports only the pure `processNodes` ordering
// table and the `theme` palette, never React or the semiotic bundle.
//
// Two output modes share this code:
//   • Display (readable): `trimmed: true` slices long arrays and honors the
//     page's `overrideProps` display substitutions (e.g. showing a short
//     `data: [ … ]` stub instead of 200 rows). Optimized for reading.
//   • Copy (faithful): `faithful: true` serializes the REAL `frameProps` the
//     chart actually rendered with, ignoring the display-only `overrideProps`
//     stubs, so the copied code reproduces the example rather than referencing
//     a trimmed/elided value. "What you copy runs."

import { processNodes } from "../process.js"
import theme from "../theme.js"

const objectToString = (obj, indent, trimmed) => {
  if (!obj) return ""
  let newObj = "{ "
  const keys = Object.keys(obj),
    len = keys.length - 1

  keys.forEach((k, i) => {
    newObj += k + ": " + propertyToString(obj[k], indent + 1, trimmed)
    if (i !== len) newObj += ", "
  })

  newObj += " }"
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
      "[" +
      arr.map((d) => propertyToString(d, indent + 1, trimmed)) +
      `${value.length > 2 && trimmed ? ", ... " : ""}]`
    ).replace(/},{/g, `},\n${spaces}    {`)
  } else {
    string = JSON.stringify(value)
  }
  return string
}

export const getFunctionString = (functions, overrideProps) => {
  let functionsString = ""

  Object.keys(functions).forEach((d) => {
    functionsString += overrideProps[d] || functions[d]
    functionsString += "\n"
  })

  if (functionsString) functionsString += "\n"

  return functionsString
}

/** A React element — can't be serialized to runnable source. */
const isReactElement = (value) =>
  value != null && typeof value === "object" && Boolean(value.$$typeof)

export const getFramePropsString = (
  frameProps,
  functions,
  overrideProps,
  trimmed,
  hiddenProps,
  faithful = false
) => {
  const frameString = Object.keys(frameProps)
    .filter((d) => !hiddenProps[d])
    .map((d) => {
      const order = processNodes.findIndex((p) => p.keys.indexOf(d) !== -1)
      const match = processNodes[order]

      return {
        key: d,
        value: frameProps[d],
        label: match ? match.label : "Other",
        order: match
          ? order + (match.keys.indexOf(d) / match.keys.length)
          : processNodes.length,
      }
    })
    .sort((a, b) => a.order - b.order)

  let framePropsString = "const frameProps = { ",
    category

  frameString.forEach((d, i) => {
    if (i !== 0) framePropsString += "\n"

    if (category !== d.label && trimmed) {
      framePropsString += "\n/* --- " + d.label + " --- */\n"
      category = d.label
    }

    let string
    if (functions[d.key]) {
      // Functions are emitted by name and defined in the prepended
      // functionsString — same in both modes.
      string = functions[d.key].name || d.key
    } else if (faithful && !isReactElement(d.value)) {
      // Copy path: serialize the actual value the chart rendered with, full
      // and untrimmed, so the copied code is runnable. Ignores the display-only
      // overrideProps stub. React elements can't be serialized to source, so
      // they fall through to the override representation below.
      string = propertyToString(d.value, 0, false)
    } else if (overrideProps[d.key] !== undefined && overrideProps[d.key] !== "") {
      string =
        typeof overrideProps[d.key] === "string"
          ? overrideProps[d.key]
          : propertyToString(overrideProps[d.key], 0, trimmed)
    } else {
      string = propertyToString(d.value, 0, trimmed)
    }

    if (string !== "" && string !== undefined) {
      framePropsString += `  ${d.key}: ${string}${
        (i !== frameString.length - 1 && ",") || ""
      }`
    }
  })

  framePropsString += "\n}"
  return framePropsString
}

export const getCodeBlock = (
  frameName,
  pre,
  functionsString,
  framePropsString,
  overrideRender,
  importStatement
) => {
  const importTheme = `const theme = ${JSON.stringify(theme)}`
  const resolvedImport =
    importStatement || `import { ${frameName} } from "semiotic"`

  let render =
    overrideRender ||
    `export default () => {
  return <${frameName} {...frameProps} />
}`

  let codeblock = `${resolvedImport}
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
