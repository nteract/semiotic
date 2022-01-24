import React from "react"
import { marked } from "marked"

export default class MarkdownText extends React.Component {
  state = { marked: "" }

  componentWillMount() {
    if (this.props.text) {
      this.setState({
        marked: marked(this.props.text, { headerIds: true })
          .replace(
            /<h(\d) id="(.*?)"/g,
            `<a class="heading-link" href="#$2">$&`
          )
          .replace(/<\/h[0-9]>/g, "$&</a>")
      })
    }
  }

  componentDidMount() {
    if (
      window.location.hash &&
      this.state.marked.indexOf(window.location.hash) !== -1
    ) {
      const element = document.querySelector(window.location.hash)
      element && element.scrollIntoView()
    }

    if (this.props.text.indexOf("```") !== -1) {
      window.Prism && window.Prism.highlightAll()
    }
  }

  render() {
    const { text } = this.props
    if (!text) return null

    return (
      <div
        className="markdown"
        dangerouslySetInnerHTML={{ __html: this.state.marked }}
      />
    )
  }
}
