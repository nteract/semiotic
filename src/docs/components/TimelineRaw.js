import React from "react";
import { ORFrame } from "../../components";

const data = [
  {
    name: "George Washington",
    birth: 1732,
    start: 1789,
    end: 1797,
    death: 1799
  },
  { name: "John Adams", birth: 1735, start: 1797, end: 1801, death: 1826 },
  {
    name: "Thomas Jefferson",
    birth: 1743,
    start: 1801,
    end: 1809,
    death: 1826
  },
  { name: "James Madison", birth: 1751, start: 1809, end: 1817, death: 1836 },
  { name: "James Monroe", birth: 1758, start: 1817, end: 1825, death: 1831 },
  {
    name: "John Quincy Adams",
    birth: 1767,
    start: 1825,
    end: 1829,
    death: 1848
  },
  { name: "Andrew Jackson", birth: 1767, start: 1829, end: 1837, death: 1845 },
  {
    name: "Martin Van Buren",
    birth: 1782,
    start: 1837,
    end: 1841,
    death: 1862
  },
  {
    name: "William Henry Harrison",
    birth: 1773,
    start: 1841,
    end: 1841,
    death: 1841
  },

  { name: "John Tyler", birth: 1790, start: 1841, end: 1845, death: 1863 },
  { name: "James K. Polk", birth: 1795, start: 1845, end: 1849, death: 1849 },
  { name: "Zachary Taylor", birth: 1784, start: 1849, end: 1850, death: 1850 },
  {
    name: "Millard Fillmore",
    birth: 1800,
    start: 1850,
    end: 1853,
    death: 1874
  },
  { name: "Franklin Pierce", birth: 1804, start: 1853, end: 1857, death: 1869 },
  { name: "James Buchanan", birth: 1791, start: 1857, end: 1861, death: 1868 },
  { name: "Abraham Lincoln", birth: 1809, start: 1861, end: 1865, death: 1865 },
  { name: "Andrew Johnson", birth: 1808, start: 1865, end: 1869, death: 1875 },
  {
    name: "Ulysses S. Grant",
    birth: 1822,
    start: 1869,
    end: 1877,
    death: 1875
  },
  {
    name: "Rutherford B. Hayes",
    birth: 1822,
    start: 1877,
    end: 1881,
    death: 1893
  },
  {
    name: "James A. Garfield",
    birth: 1831,
    start: 1881,
    end: 1881,
    death: 1881
  },
  {
    name: "Chester A. Arthur",
    birth: 1829,
    start: 1881,
    end: 1885,
    death: 1886
  },

  {
    name: "Grover Cleveland",
    birth: 1837,
    start: 1885,
    end: 1889,
    death: 1908
  },
  {
    name: "Grover Cleveland",
    birth: 1837,
    start: 1893,
    end: 1897,
    death: 1908
  },
  {
    name: "Benjamin Harrison",
    birth: 1833,
    start: 1889,
    end: 1893,
    death: 1901
  },
  {
    name: "William McKinley",
    birth: 1843,
    start: 1897,
    end: 1901,
    death: 1901
  },
  {
    name: "Theodore Roosevelt",
    birth: 1858,
    start: 1901,
    end: 1909,
    death: 1919
  },
  { name: "William H. Taft", birth: 1857, start: 1909, end: 1913, death: 1930 },
  { name: "Woodrow Wilson", birth: 1856, start: 1913, end: 1921, death: 1924 },
  {
    name: "Warren G. Harding",
    birth: 1865,
    start: 1921,
    end: 1923,
    death: 1923
  },
  { name: "Calvin Coolidge", birth: 1872, start: 1923, end: 1929, death: 1933 },
  { name: "Herbert Hoover", birth: 1874, start: 1929, end: 1933, death: 1964 },
  {
    name: "Franklin D. Roosevelt",
    birth: 1882,
    start: 1933,
    end: 1945,
    death: 1945
  },
  { name: "Harry S. Truman", birth: 1884, start: 1945, end: 1953, death: 1972 },
  {
    name: "Dwight D. Eisenhower",
    birth: 1890,
    start: 1953,
    end: 1961,
    death: 1969
  },
  { name: "John F. Kennedy", birth: 1917, start: 1961, end: 1963, death: 1963 },
  {
    name: "Lyndon B. Johnson",
    birth: 1908,
    start: 1963,
    end: 1969,
    death: 1973
  },
  {
    name: "Richard M. Nixon",
    birth: 1913,
    start: 1969,
    end: 1974,
    death: 1994
  },
  { name: "Gerald R. Ford", birth: 1913, start: 1974, end: 1977, death: 2006 },
  { name: "Jimmy Carter", birth: 1924, start: 1977, end: 1981, death: 2018 },
  { name: "Ronald Reagan", birth: 1911, start: 1981, end: 1989, death: 2004 },
  {
    name: "George H. W. Bush",
    birth: 1924,
    start: 1989,
    end: 1993,
    death: 2018
  },
  { name: "Bill Clinton", birth: 1946, start: 1993, end: 2001, death: 2018 },
  { name: "George W. Bush", birth: 1946, start: 2001, end: 2009, death: 2018 },
  { name: "Barack Obama", birth: 1961, start: 2009, end: 2017, death: 2018 },
  { name: "Donald Trump", birth: 1946, start: 2017, end: 2018, death: 2018 }
];

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
);
