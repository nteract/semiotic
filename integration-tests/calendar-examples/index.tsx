import * as React from "react"
import { createRoot } from "react-dom/client"
import { XYCustomChart } from "semiotic/xy"
import { calendarLayout } from "semiotic/recipes"

const data = [
  { date: new Date(2025, 0, 1), value: 0 },
  { date: new Date(2025, 0, 3), value: 10 },
  { date: new Date(2024, 0, 1), value: 10000 }
]
function App() {
  const [width, setWidth] = React.useState(640)
  return (
    <main>
      <XYCustomChart
        data={data}
        layout={calendarLayout}
        layoutConfig={{
          dateAccessor: "date",
          valueAccessor: "value",
          year: 2025,
          missingColor: "#888888",
          colorRamp: ["#ffffff", "#0000ff"]
        }}
        width={width}
        height={160}
        margin={{ left: 20, right: 20, top: 20, bottom: 20 }}
        tooltip={(datum) => (
          <span>
            Jan {(datum.date as Date).getDate()}:{" "}
            {datum.missing ? "No measurement" : String(datum.value)}
          </span>
        )}
      />
      <button onClick={() => setWidth(740)}>Resize calendar</button>
    </main>
  )
}
createRoot(document.getElementById("root")!).render(<App />)
