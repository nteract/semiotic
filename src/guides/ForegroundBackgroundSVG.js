import React from "react";
// import DocumentFrame from "../DocumentFrame";
import MarkdownText from "../MarkdownText";

export default function CreateALineChart() {
  return (
    <div>
      <MarkdownText
        text={`
In each Frame, there is a svg behind the data viusalization and one in front. You can pass any svg elements you want to those layers to be rendered.

The properties are \`foregroundGraphics\` and \`backgroundGraphics\` and they accept arrays of svg elements.

See the Homerun Map example for liberal use of background graphics. 
`}
      />
    </div>
  );
}
