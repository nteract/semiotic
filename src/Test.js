import React from "react"
import OrdinalFrame from "semiotic/lib/OrdinalFrame"
import { scaleSqrt } from "d3-scale"
const theme = [
  "#ac58e5",
  "#E0488B",
  "#9fd0cb",
  "#e0d33a",
  "#7566ff",
  "#533f82",
  "#7a255d",
  "#365350",
  "#a19a11",
  "#3f4482"
]
const frameProps = {
  data: [
    { user: "Jason", tweets: 40, retweets: 5, favorites: 15 },
    { user: "Susie", tweets: 5, retweets: 25, favorites: 100 },
    { user: "Matt", tweets: 20, retweets: 25, favorites: 50 },
    { user: "Betty", tweets: 30, retweets: 20, favorites: 10 },
    { user: "Ian", tweets: 5, retweets: 45, favorites: 100 },
    { user: "Noah", tweets: 10, retweets: 5, favorites: 15 },
    { user: "Shirley", tweets: 20, retweets: 25, favorites: 50 },
    { user: "Rachel", tweets: 30, retweets: 20, favorites: 10 },
    { user: "Nadieh", tweets: 30, retweets: 20, favorites: 15 },
    { user: "Jim", tweets: 20, retweets: 25, favorites: 50 },
    { user: "Zan", tweets: 5, retweets: 32, favorites: 100 },
    { user: "Shelby", tweets: 30, retweets: 20, favorites: 10 }
  ],
  size: [400, 400],
  margin: 70,
  type: "bar",
  projection: "radial",

  rScaleType: scaleSqrt(),
  oAccessor: "user",
  rAccessor: ["tweets", "retweets", "favorites"],
  style: d => {
    return {
      fill: theme[d.rIndex],
      stroke: "white"
    }
  },
  title: "Tweets",
  axes: true,
  oSort: function oSort(a, b, c, d) {
    return (
      c[0].tweets +
      c[0].retweets +
      c[0].favorites -
      d[0].tweets -
      d[0].retweets -
      d[0].favorites
    )
  },
  oLabel: true
}

export default () => {
  return <OrdinalFrame {...frameProps} />
}
