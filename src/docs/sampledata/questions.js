import { csvParse } from "d3-dsv"

const question_data = `question,1,2,3,4,5,n
Question 1,24,294,594,1927,376,3215
Question 2,2,2,0,7,0,11
Question 3,2,0,2,4,2,10
Question 4,0,2,1,7,6,16
Question 5,0,1,3,16,4,24
Question 6,1,1,2,9,3,16
Question 7,0,0,1,4,0,5
Question 8,0,0,0,0,2,2`

const processedQuestions = csvParse(question_data)

const processedAnswers = []

processedQuestions.forEach(d => {
  processedAnswers.push({
    question: d.question,
    type: "disagree",
    color: "#d38779",
    value: -parseInt(d["2"], 10),
    percent: -(parseInt(d["2"], 10) / parseInt(d["n"], 10))
  })
  processedAnswers.push({
    question: d.question,
    type: "stronglydisagree",
    color: "#b3331d",
    value: -parseInt(d["1"], 10),
    percent: -(parseInt(d["1"], 10) / parseInt(d["n"], 10))
  })
  processedAnswers.push({
    question: d.question,
    type: "agree",
    color: "#00a2ce",
    value: parseInt(d["4"], 10),
    percent: parseInt(d["4"], 10) / parseInt(d["n"], 10)
  })
  processedAnswers.push({
    question: d.question,
    type: "stronglyagree",
    color: "#007190",
    value: parseInt(d["5"], 10),
    percent: parseInt(d["5"], 10) / parseInt(d["n"], 10)
  })
})

export const answers = processedAnswers
