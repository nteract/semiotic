"use strict"

const data =
  " Almost Certainly,Highly Likely,Very Good Chance,Probable,Likely,Probably,We Believe,Better Than Even,About Even,We Doubt,Improbable,Unlikely,Probably Not,Little Chance,Almost No Chance,Highly Unlikely,Chances Are Slight\n95,80,85,75,66,75,66,55,50,40,20,30,15,20,5,25,25\n95,75,75,51,75,51,51,51,50,20,49,25,49,5,5,10,5\n95,85,85,70,75,70,80,60,50,30,10,25,25,20,1,5,15\n95,85,85,70,75,70,80,60,50,30,10,25,25,20,1,5,15\n98,95,80,70,70,75,65,60,50,10,50,5,20,5,1,2,10\n95,99,85,90,75,75,80,65,50,7,15,8,15,5,1,3,20\n85,95,65,80,40,45,80,60,45,45,35,20,40,20,10,20,30\n97,95,75,70,70,80,75,55,50,25,30,15,25,20,3,5,10\n95,95,80,70,65,80,65,55,50,20,30,35,35,15,5,15,10\n90,85,90,70,75,70,65,60,52,60,20,30,45,20,10,6,25\n90,90,85,70,60,75,80,60,50,25,1,15,40,20,15,10,15\n99,97,70,75,75,75,90,67,50,17,10,10,25,17,2,3,5\n60,80,70,70,60,55,60,55,50,20,5,30,30,10,5,5,15\n88.7,69,80,51,70,60,50,5,50,30,49,20,40,13,2,3,5\n99,98,85,85,75,65,5,65,50,100,1,10,100,100,95,90,35\n95,90,80,70,70,80,85,60,50,30,40,30,40,15,1,5,10\n97,90,70,51,65,60,75,51,50,5,10,15,10,15,2,7,5\n99,95,75,60,65,75,80,55,50,25,3,15,30,10,1,5,40\n95,95,90,60,80,75,75,60,50,25,10,10,20,25,5,5,10\n95,90,75,80,75,75,50,50.1,50,25,20,25,49.9,25,5,5,10\n90,80,80,75,80,75,60,60,50,40,30,10,25,20,5,5,5\n92,85,75,60,70,60,85,57,50,25,33,10,10,7,3,3,13\n98,90,75,80,85,85,85,60,49,5,15,2,10,2,5,5,5\n98,92,91,85,85,85,70,60,50,30,7,18,27,17,2,3,10\n90,90,75,75,65,80,80,60,50,12,25,35,30,20,2,10,20\n95,85,80,75,65,75,50,60,50,33,10,25,25,10,2,5,5\n95,90,80,60,75,60,60,51,50,10,49,20,40,15,5,20,10\n98,95,75,85,90,85,75,98,50,40,7,10,25,10,2,5,5\n85,85,90,60,65,76,50,51,50,33,25,25,20,10,1,15,15\n80,15,74,65,65,65,60,60,50,38,29,36,34,29,7,15,30\n98,80,75,65,70,55,60,55,50,25,20,12,35,15,1,8,15\n96,85,80,75,70,90,80,60,50,5,9,3,20,20,10,5,12\n99,85,75,80,75,90,50,51,50,1,0.001,10,10,5,0.05,10,5\n85,84,87,50,60,65,50,60,50,60,3,24,30,20,5,15,30\n90,95,80,70,90,60,60,80,40,25,3,5,20,4,2,2,30\n95,85,80,64,80,80,75,80,50,10,10,25,20,8,2,5,5\n98,96,90,90,90,80,70,53,50,40,4,30,30,8,1,5,10\n98,96,82,75,86,80,45,69,52,21,12,34,26,18,7,3,13\n80,90,70,80,80,80,70,60,50,10,0,20,30,10,1,10,10\n95,90,90,80,90,90,85,55,48,15,20,35,15,15,5,8,10\n99,90,80,90,60,50,90,60,50,40,20,10,40,5,1,30,15\n85,80,80,70,70,70,65,51,45,30,15,35,30,10,5,15,20\n90,70,80,75,70,65,70,60,50,15,35,20,25,5,2,10,10\n95,80,90,75,70,75,100,60,50,10,5,10,20,10,1,5,5\n85,90,75,65,65,60,95,55,50,95,5,20,40,25,2,5,10\n95,80,75,75,60,68,55,51,49,25,20,35,40,17,5,10,15"

let _Semiotic = Semiotic,
  ResponsiveOrdinalFrame = _Semiotic.ResponsiveOrdinalFrame

const parsedAnswers = d3.csvParse(data)

const atomicData = []

const colors = [
  "#2c0845",
  "#6782c9",
  "#99ceeb",
  "#203f52",
  "#24ffcd",
  "#069668",
  "#b1f65d",
  "#02531d",
  "#d8e9b2",
  "#96a467",
  "#66050d",
  "#d73e50",
  "#c99084",
  "#704b0c",
  "#3ff44c",
  "#4ba40b",
  "#f3d426",
  "#f6932e",
  "#fe5900",
  "#3441c5",
  "#d38ffd",
  "#a113b2",
  "#fb5de7",
  "#8a4488",
  "#270fe2"
]

parsedAnswers.forEach((answer, i) => {
  Object.keys(answer).forEach(key => {
    answer[key] = +answer[key]
    atomicData.push({
      respondent: `person ${i}`,
      response: key,
      value: answer[key]
    })
  })
  answer.respondent = `person ${i}`
})

ReactDOM.render(
  React.createElement("div", null, [
    React.createElement(ResponsiveOrdinalFrame, {
      title: "Simple Bars",
      size: [200, 200],
      projection: "horizontal",
      data: [5, 7, 8, 20, 10],
      type: "bar",
      style: { fill: "lightblue", stroke: "darkblue", opacity: 0.5 },
      axis: {
        orient: "left"
      },
      margin: 20,
      oPadding: 5
    }),
    React.createElement(ResponsiveOrdinalFrame, {
      title: "Joy Plot",
      size: [800, 400],
      projection: "horizontal",
      data: atomicData,
      oAccessor: "response",
      rAccessor: "value",
      summaryType: { type: "joy", amplitude: 100 },
      style: { fill: "lightblue", stroke: "darkblue", opacity: 0.5 },
      summaryStyle: function summaryStyle(d, i) {
        return {
          fill: colors[i % colors.length],
          stroke: "grey",
          fillOpacity: 0.75
        }
      },
      axis: {
        orient: "left",
        tickValues: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
        tickFormat: function tickFormat(d) {
          return `${d}%`
        }
      },
      oLabel: function oLabel(d) {
        return React.createElement(
          "text",
          { fontSize: "8px", textAnchor: "end", y: 3, x: -3 },
          d
        )
      },
      margin: { left: 100, right: 50, bottom: 28, top: 40 },
      oPadding: 5
    }),
    React.createElement(ResponsiveOrdinalFrame, {
      title: "Nightingale",
      size: [200, 200],
      projection: "horizontal",
      data: [5, 7, 8, 20, 10],
      type: "bar",
      projection: "radial",
      dynamicWidth: "value",
      style: { fill: "darkred", stroke: "darkblue", opacity: 0.5 },
      axis: {
        orient: "left"
      },
      margin: 20,
      oPadding: 5
    })
  ]),
  document.getElementById("main")
)
