import React from "react"
import { marked } from "marked"
import { gfmHeadingId } from "marked-gfm-heading-id"

// marked v12 dropped the built-in `headerIds` option; this extension restores
// the pre-v5 behavior of emitting slug ids on every heading, which the regex
// below relies on to wrap each heading in a self-linking anchor.
marked.use(gfmHeadingId())

export default class MarkdownText extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      marked: props.text
        ? marked.parse(props.text)
            .replace(
              /<h(\d) id="(.*?)"/g,
              `<a class="heading-link" href="#$2">$&`
            )
            .replace(/<\/h[0-9]>/g, "$&</a>")
        : ""
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
