export default function SuperpersuasionPreview() {
  return (
    <svg
      viewBox="0 0 242 96"
      aria-hidden="true"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <rect width="242" height="96" rx="6" fill="#f5f1e8" />
      <text x="13" y="18" fill="#172e34" fontSize="8" fontFamily="sans-serif" letterSpacing="1.3">
        WORTH CHOOSING
      </text>
      <g fill="none" opacity=".7">
        <path d="M22 38 C70 38 70 45 114 45 S172 35 216 35" stroke="#24766d" strokeWidth="12" />
        <path d="M22 57 C70 57 70 48 114 48 S172 58 216 58" stroke="#ba7138" strokeWidth="9" />
        <path d="M22 75 C70 75 70 72 114 72 S172 78 216 78" stroke="#a14d48" strokeWidth="7" />
      </g>
      {[22, 114, 216].map((x) => (
        <rect key={x} x={x - 2} y="29" width="4" height="53" fill="#172e34" />
      ))}
    </svg>
  )
}
