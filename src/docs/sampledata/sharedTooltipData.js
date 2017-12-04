const ordinalColors = ["#9c7561", "#e15759", "#f0cd6b", "#fabfd2", "#8cd17d"]
let lines = []

function generateDataArray(numPoints) {
  let data = []
  if (numPoints <= 0) {
    return data
  }
  let pointer = 0
  while (pointer < numPoints) {
    let date = new Date()
    date.setDate(date.getDate() - pointer)
    data.push({
      x: date,
      y:
        pointer === 0
          ? Math.floor(Math.random() * (100 - 10) + 10)
          : data[pointer - 1].y +
            Math.floor(Math.random() * (10 - 1) + 1) *
              (Math.floor(Math.random() * 2) === 1 ? 1 : -1)
    })
    pointer++
  }
  return data
}

;[
  "BoJack Horseman",
  "Todd Chavez",
  "Mr. Peanutbutter",
  "Princess Carolyn",
  "Diane Nguyen"
].forEach((d, i) => {
  lines.push({
    id: d,
    color: ordinalColors[i],
    data: generateDataArray(20)
  })
})

export default lines
