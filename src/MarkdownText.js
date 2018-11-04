import React from "react"

import marked from "marked"

export default ({ text }) => {
  const markdown = marked(text)
  return (
    <div className="markdown" dangerouslySetInnerHTML={{ __html: markdown }} />
  )
}
