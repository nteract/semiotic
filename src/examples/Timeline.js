import React from "react"
import DocumentFrame from "../DocumentFrame"
import { OrdinalFrame } from "semiotic"
import theme from "../theme"
import MarkdownText from "../MarkdownText"

const data = [
  {
    name: "George Washington",
    start: 1789,
    end: 1797,
    party: "None"
  },
  { name: "John Adams", start: 1797, end: 1801, party: "Federalist" },
  {
    name: "Thomas Jefferson",

    start: 1801,
    end: 1809,
    party: "Democratic-Republican"
  },
  {
    name: "James Madison",
    start: 1809,
    end: 1817,
    party: "Democratic-Republican"
  },
  {
    name: "James Monroe",
    start: 1817,
    end: 1825,
    party: "Democratic-Republican"
  },
  {
    name: "John Quincy Adams",

    start: 1825,
    end: 1829,
    party: "Democratic-Republican"
  },
  { name: "Andrew Jackson", start: 1829, end: 1837, party: "Democratic" },
  {
    name: "Martin Van Buren",

    start: 1837,
    end: 1841,
    party: "Democratic"
  },
  {
    name: "William Henry Harrison",

    start: 1841,
    end: 1841,
    party: "Whig"
  },

  { name: "John Tyler", start: 1841, end: 1845, party: "Whing" },
  { name: "James K. Polk", start: 1845, end: 1849, party: "Democratic" },
  { name: "Zachary Taylor", start: 1849, end: 1850, party: "Whig" },
  {
    name: "Millard Fillmore",

    start: 1850,
    end: 1853,
    party: "Whig"
  },
  { name: "Franklin Pierce", start: 1853, end: 1857, party: "Democratic" },
  { name: "James Buchanan", start: 1857, end: 1861, party: "Democratic" },
  { name: "Abraham Lincoln", start: 1861, end: 1865, party: "Republican" },
  { name: "Andrew Johnson", start: 1865, end: 1869, party: "National Union" },
  {
    name: "Ulysses S. Grant",

    start: 1869,
    end: 1877,
    party: "Republican"
  },
  {
    name: "Rutherford B. Hayes",

    start: 1877,
    end: 1881,
    party: "Republican"
  },
  {
    name: "James A. Garfield",

    start: 1881,
    end: 1881,
    party: "Republican"
  },
  {
    name: "Chester A. Arthur",

    start: 1881,
    end: 1885,
    party: "Republican"
  },

  {
    name: "Grover Cleveland",

    start: 1885,
    end: 1889,
    party: "Democratic"
  },
  {
    name: "Grover Cleveland",

    start: 1893,
    end: 1897,
    party: "Democratic"
  },
  {
    name: "Benjamin Harrison",

    start: 1889,
    end: 1893,
    party: "Republican"
  },
  {
    name: "William McKinley",

    start: 1897,
    end: 1901,
    party: "Republican"
  },
  {
    name: "Theodore Roosevelt",

    start: 1901,
    end: 1909,
    party: "Republican"
  },
  { name: "William H. Taft", start: 1909, end: 1913, party: "Republican" },
  { name: "Woodrow Wilson", start: 1913, end: 1921, party: "Democratic" },
  {
    name: "Warren G. Harding",

    start: 1921,
    end: 1923,
    party: "Republican"
  },
  { name: "Calvin Coolidge", start: 1923, end: 1929, party: "Republican" },
  { name: "Herbert Hoover", start: 1929, end: 1933, party: "Republican" },
  {
    name: "Franklin D. Roosevelt",

    start: 1933,
    end: 1945,
    party: "Democratic"
  },
  { name: "Harry S. Truman", start: 1945, end: 1953, party: "Democratic" },
  {
    name: "Dwight D. Eisenhower",

    start: 1953,
    end: 1961,
    party: "Republican"
  },
  { name: "John F. Kennedy", start: 1961, end: 1963, party: "Democratic" },
  {
    name: "Lyndon B. Johnson",

    start: 1963,
    end: 1969,
    party: "Democratic"
  },
  {
    name: "Richard M. Nixon",

    start: 1969,
    end: 1974,
    party: "Republican"
  },
  { name: "Gerald R. Ford", start: 1974, end: 1977, party: "Republican" },
  { name: "Jimmy Carter", start: 1977, end: 1981, party: "Democratic" },
  { name: "Ronald Reagan", start: 1981, end: 1989, party: "Republican" },
  {
    name: "George H. W. Bush",
    start: 1989,
    end: 1993,
    party: "Republican"
  },
  { name: "Bill Clinton", start: 1993, end: 2001, party: "Democratic" },
  { name: "George W. Bush", start: 2001, end: 2009, party: "Republican" },
  { name: "Barack Obama", start: 2009, end: 2017, party: "Democratic" },
  { name: "Donald Trump", start: 2017, end: 2021, party: "Republican" }
]

const colors = {
  Democratic: 4,
  Republican: 1,
  "Democratic-Republican": 2,
  Whig: 3
}

const frameProps = {
  size: [900, 800],
  rAccessor: d => [d.start, d.end],
  oAccessor: "name",
  projection: "horizontal",
  axis: { orient: "left", ticks: 10 },
  type: "timeline",
  oLabel: (d, i) => {
    return (
      <text
        y={3}
        textAnchor="end"
        fontSize="11"
        fill={theme[colors[i[0].party] || 0]}
      >
        {d}
      </text>
    )
  },
  margin: { left: 200, top: 40, bottom: 50, right: 20 },
  oPadding: 2,
  data,

  title: "U.S. Presidential Terms",
  style: d => ({
    fill: theme[colors[d.party] || 0],
    stroke: theme[(colors[d.party] || 0) + 5]
  }),
  foregroundGraphics: Object.keys(colors)
    .concat(["Other"])
    .map((d, i) => (
      <text key={d} x={700} y={i * 20 + 60}>
        <tspan fontSize="20" fill={theme[colors[d] || 0]}>
          ●
        </tspan>{" "}
        {d}
      </text>
    ))
}

const overrideProps = {
  style: `d => ({
    fill: theme[colors[d.party] || 0],
    stroke: theme[(colors[d.party] || 0) + 5]
  })`,
  oLabel: ` d => (
    <text textAnchor="end" fontSize="11">
      {d}
    </text>
  )`,
  foregroundGraphics: `Object.keys(colors)
  .concat(["Other"])
  .map((d, i) => (
    <text key={d} x={700} y={i * 20 + 60}>
      <tspan fontSize="20" fill={theme[colors[d] || 0]}>
        ●
      </tspan>{" "}
      {d}
    </text>
  ))`
}

const Timeline = () => {
  return (
    <div>
      <MarkdownText
        text={`

The Dot Plot compares changes between two values across categories. The initial data array needs to be turned into an array of points at the start and end, which can then be connected with a custom annotation rule.

Because annotations are drawn on top of the visualization layer, we need to account for the size of each dot in where we draw the lines so they don't overlap. We also adjust the labels a bit so they line up with the dots.

This data is from the [List of Presidents of the United States](https://en.wikipedia.org/wiki/List_of_Presidents_of_the_United_States) Wikipedia page.

`}
      />
      <DocumentFrame
        frameProps={frameProps}
        overrideProps={overrideProps}
        type={OrdinalFrame}
        pre={`const colors = {
  Democratic: 4,
  Republican: 1,
  "Democratic-Republican": 2,
  Whig: 3
}`}
        useExpanded
      />
    </div>
  )
}

export default Timeline
