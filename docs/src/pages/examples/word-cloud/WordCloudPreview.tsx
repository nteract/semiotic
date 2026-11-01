import * as React from "react"

/** Static editorial gallery art; the interactive route owns layout preparation. */
export default function WordCloudPreview() {
  return (
    <svg viewBox="0 0 400 230" role="img" aria-label="Wonderland words in a heart-shaped reading">
      <rect width="400" height="230" fill="#fffaf1" />
      <g fontFamily="Georgia, serif" textAnchor="middle">
        <text x="126" y="69" fontSize="31" fill="#a63b3b">
          rabbit
        </text>
        <text x="272" y="69" fontSize="30" fill="#376b62">
          queen
        </text>
        <text x="200" y="114" fontSize="53" fill="#a63b3b">
          alice
        </text>
        <text x="200" y="143" fontSize="22" fill="#685987">
          wonder · time · curious
        </text>
        <text x="200" y="169" fontSize="20" fill="#376b62">
          garden · tea
        </text>
        <text x="200" y="191" fontSize="17" fill="#a63b3b">
          dream
        </text>
      </g>
    </svg>
  )
}
