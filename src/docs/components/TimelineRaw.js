import React from "react"
import { ORFrame } from "../../components"

const data = [
  {
    name: "George Washington",
    start: 1789,
    end: 1797
  },
  { name: "John Adams", start: 1797, end: 1801 },
  {
    name: "Thomas Jefferson",

    start: 1801,
    end: 1809
  },
  { name: "James Madison", start: 1809, end: 1817 },
  { name: "James Monroe", start: 1817, end: 1825 },
  {
    name: "John Quincy Adams",

    start: 1825,
    end: 1829
  },
  { name: "Andrew Jackson", start: 1829, end: 1837 },
  {
    name: "Martin Van Buren",

    start: 1837,
    end: 1841
  },
  {
    name: "William Henry Harrison",

    start: 1841,
    end: 1841
  },

  { name: "John Tyler", start: 1841, end: 1845 },
  { name: "James K. Polk", start: 1845, end: 1849 },
  { name: "Zachary Taylor", start: 1849, end: 1850 },
  {
    name: "Millard Fillmore",

    start: 1850,
    end: 1853
  },
  { name: "Franklin Pierce", start: 1853, end: 1857 },
  { name: "James Buchanan", start: 1857, end: 1861 },
  { name: "Abraham Lincoln", start: 1861, end: 1865 },
  { name: "Andrew Johnson", start: 1865, end: 1869 },
  {
    name: "Ulysses S. Grant",

    start: 1869,
    end: 1877
  },
  {
    name: "Rutherford B. Hayes",

    start: 1877,
    end: 1881
  },
  {
    name: "James A. Garfield",

    start: 1881,
    end: 1881
  },
  {
    name: "Chester A. Arthur",

    start: 1881,
    end: 1885
  },

  {
    name: "Grover Cleveland",

    start: 1885,
    end: 1889
  },
  {
    name: "Grover Cleveland",

    start: 1893,
    end: 1897
  },
  {
    name: "Benjamin Harrison",

    start: 1889,
    end: 1893
  },
  {
    name: "William McKinley",

    start: 1897,
    end: 1901
  },
  {
    name: "Theodore Roosevelt",

    start: 1901,
    end: 1909
  },
  { name: "William H. Taft", start: 1909, end: 1913 },
  { name: "Woodrow Wilson", start: 1913, end: 1921 },
  {
    name: "Warren G. Harding",

    start: 1921,
    end: 1923
  },
  { name: "Calvin Coolidge", start: 1923, end: 1929 },
  { name: "Herbert Hoover", start: 1929, end: 1933 },
  {
    name: "Franklin D. Roosevelt",

    start: 1933,
    end: 1945
  },
  { name: "Harry S. Truman", start: 1945, end: 1953 },
  {
    name: "Dwight D. Eisenhower",

    start: 1953,
    end: 1961
  },
  { name: "John F. Kennedy", start: 1961, end: 1963 },
  {
    name: "Lyndon B. Johnson",

    start: 1963,
    end: 1969
  },
  {
    name: "Richard M. Nixon",

    start: 1969,
    end: 1974
  },
  { name: "Gerald R. Ford", start: 1974, end: 1977 },
  { name: "Jimmy Carter", start: 1977, end: 1981 },
  { name: "Ronald Reagan", start: 1981, end: 1989 },
  {
    name: "George H. W. Bush",

    start: 1989,
    end: 1993
  },
  { name: "Bill Clinton", start: 1993, end: 2001 },
  { name: "George W. Bush", start: 2001, end: 2009 },
  { name: "Barack Obama", start: 2009, end: 2017 },
  { name: "Donald Trump", start: 2017, end: 2018 }
]

export default (
  <ORFrame
    size={[700, 500]}
    data={data}
    rAccessor={d => [d.start, d.end]}
    oAccessor="name"
    type="timeline"
    projection="horizontal"
    oPadding={2}
    annotations={[
      {
        type: "category",
        categories: ["George Washington", "Abraham Lincoln"],
        label: "Antebellum",
        position: "left",
        offset: 80
      }
    ]}
    style={{ fill: "lightblue", stroke: "blue" }}
    axis={{ orient: "left" }}
    margin={{ left: 200, top: 20, right: 20, bottom: 50 }}
    oLabel={d => (
      <text y={2} textAnchor="end" fontSize={8}>
        {d}
      </text>
    )}
    pieceHoverAnnotation={true}
  />
)
