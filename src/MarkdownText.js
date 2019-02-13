import React from "react";

import marked from "marked";

export default ({ text }) => {
  if (!text) return null;
  const markdown = marked(text, { headerIds: true })
    .replace(/<h(\d) id="(.*?)"/g, `<a class="heading-link" href="#$2">$&`)
    .replace(/<\/h[0-9]>/g, "$&</a>");

  return (
    <div className="markdown" dangerouslySetInnerHTML={{ __html: markdown }} />
  );
};
