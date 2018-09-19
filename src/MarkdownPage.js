import React from "react"

import marked from "marked"
const ROOT = process.env.PUBLIC_URL

export default class MarkdownPage extends React.Component {
  state = {}

  componentWillMount() {
    const readmePath = `${ROOT}/markdown/${this.props.filename}.md`

    fetch(readmePath)
      .then(response => {
        return response.text()
      })
      .then(text => {
        this.setState({
          markdown: marked(text)
        })
      })
  }

  render() {
    const { markdown } = this.state

    return (
      <div
        className="markdown"
        dangerouslySetInnerHTML={{ __html: markdown }}
      />
    )
  }
}
