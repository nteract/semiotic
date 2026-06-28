const sourceRows = `
"American Revolutionary War","4/19/1775","9/3/1783","European","https://en.wikipedia.org/wiki/American_Revolutionary_War"
"Cherokee–American wars","01/01/1776","12/31/1795","Native","https://en.wikipedia.org/wiki/Cherokee%E2%80%93American_wars"
"Northwest Indian War","01/01/1785","12/31/1795","Native","https://en.wikipedia.org/wiki/Northwest_Indian_War"
"Whiskey Rebellion","01/01/1795","12/31/1795","Internal","https://en.wikipedia.org/wiki/Whiskey_Rebellion"
"Quasi-War","01/01/1798","12/31/1800","European","https://en.wikipedia.org/wiki/Quasi-War"
"First Barbary War","5/10/1801","6/10/1805","Colonial","https://en.wikipedia.org/wiki/First_Barbary_War"
"Tecumseh's War","01/01/1811","12/31/1811","Native","https://en.wikipedia.org/wiki/Tecumseh%27s_War"
"War of 1812","6/18/1812","2/18/1815","European","https://en.wikipedia.org/wiki/War_of_1812"
"Red Stick War","01/01/1813","8/31/1814","Native","https://en.wikipedia.org/wiki/Creek_War"
"Second Barbary War","06/17/1815","06/19/1815","Colonial","https://en.wikipedia.org/wiki/Second_Barbary_War"
"First Seminole War","01/01/1817","12/31/1818","Native","https://en.wikipedia.org/wiki/Seminole_Wars#First_Seminole_War"
"Texas-Indian Wars","01/01/1820","12/31/1875","Native","https://en.wikipedia.org/wiki/Texas%E2%80%93Indian_wars"
"Arikara War","01/01/1823","12/31/1823","Native","https://en.wikipedia.org/wiki/Arikara_War"
"Aegean Sea Anti/Piracy Operations","01/01/1825","12/31/1828","Colonial","https://en.wikipedia.org/wiki/Aegean_Sea_Anti-Piracy_Operations_of_the_United_States"
"Winnebago War","01/01/1827","12/31/1827","Native","https://en.wikipedia.org/wiki/Winnebago_War"
"First Sumatran expedition","01/01/1832","12/31/1832","Colonial","https://en.wikipedia.org/wiki/First_Sumatran_expedition"
"Black Hawk War","01/01/1832","12/31/1832","Native","https://en.wikipedia.org/wiki/Black_Hawk_War"
"Second Seminole War","01/01/1835","12/31/1842","Native","https://en.wikipedia.org/wiki/Second_Seminole_War"
"Patriot War","01/01/1838","12/31/1838","European","https://en.wikipedia.org/wiki/Patriot_War"
"United States Exploring Expedition","01/01/1838","12/31/1842","Colonial","https://en.wikipedia.org/wiki/United_States_Exploring_Expedition"
"Second Sumatran expedition","01/01/1838","12/31/1838","Colonial","https://en.wikipedia.org/wiki/Second_Sumatran_expedition"
"Mexican–American War","01/01/1846","12/31/1848","Latin American","https://en.wikipedia.org/wiki/Mexican%E2%80%93American_War"
"Cayuse War","01/01/1847","12/31/1855","Native","https://en.wikipedia.org/wiki/Cayuse_War"
"Taiping Rebellion","01/01/1850","12/31/1864","Colonial","https://en.wikipedia.org/wiki/Taiping_Rebellion"
"Apache Wars","01/01/1851","12/31/1900","Native","https://en.wikipedia.org/wiki/Apache_Wars"
"Bombardment of Greytown","01/01/1854","12/31/1854","European","https://en.wikipedia.org/wiki/Bombardment_of_Greytown"
"Puget Sound War","01/01/1855","12/31/1856","Native","https://en.wikipedia.org/wiki/Puget_Sound_War"
"First Fiji Expedition","01/01/1855","12/31/1855","Colonial","https://en.wikipedia.org/wiki/First_Fiji_Expedition"
"Rogue River Wars","01/01/1855","12/31/1856","Native","https://en.wikipedia.org/wiki/Rogue_River_Wars"
"Third Seminole War","01/01/1855","12/31/1858","Native","https://en.wikipedia.org/wiki/Seminole_Wars#Third_Seminole_War"
"Yakima War","01/01/1855","12/31/1858","Native","https://en.wikipedia.org/wiki/Yakima_War"
"Filibuster War","01/01/1856","12/31/1857","Latin American","https://en.wikipedia.org/wiki/Filibuster_War"
"Second Opium War","01/01/1856","12/31/1859","Colonial","https://en.wikipedia.org/wiki/Second_Opium_War"
"Utah War","01/01/1857","12/31/1858","Internal","https://en.wikipedia.org/wiki/Utah_War"
"Navajo Wars","01/01/1858","12/31/1866","Native","https://en.wikipedia.org/wiki/Navajo_Wars"
"Second Fiji Expedition","01/01/1858","12/31/1858","Colonial","https://en.wikipedia.org/wiki/Second_Fiji_Expedition"
"First and Second Cortina War","01/01/1859","12/31/1861","Latin American","https://en.wikipedia.org/wiki/Cortina_Troubles"
"Paiute War","01/01/1860","12/31/1860","Native","https://en.wikipedia.org/wiki/Paiute_War"
"Reform War","01/01/1860","12/31/1860","Latin American","https://en.wikipedia.org/wiki/Reform_War"
"American Civil War","01/01/1861","12/31/1865","Internal","https://en.wikipedia.org/wiki/American_Civil_War"
"Bombardment of Qui Nhơn","01/01/1861","12/31/1861","Colonial","https://en.wikipedia.org/wiki/Bombardment_of_Qui_Nh%C6%A1n"
"Yavapai Wars","01/01/1861","12/31/1875","Native","https://en.wikipedia.org/wiki/Yavapai_Wars"
"Dakota War of 1862","01/01/1862","12/31/1862","Native","https://en.wikipedia.org/wiki/Dakota_War_of_1862"
"Colorado War","01/01/1863","12/31/1865","Native","https://en.wikipedia.org/wiki/Colorado_War"
"Shimonoseki War","01/01/1863","12/31/1864","Colonial","https://en.wikipedia.org/wiki/Shimonoseki_Campaign"
"Snake War","01/01/1864","12/31/1868","Native","https://en.wikipedia.org/wiki/Snake_War"
"Powder River War","01/01/1865","12/31/1865","Native","https://en.wikipedia.org/wiki/Powder_River_Expedition_(1865)"
"Red Cloud's War","01/01/1866","12/31/1868","Native","https://en.wikipedia.org/wiki/Red_Cloud%27s_War"
"Siege of Mexico City","01/01/1867","12/31/1867","Latin American","https://en.wikipedia.org/wiki/Siege_of_Mexico_City"
"Formosa Expedition","01/01/1867","12/31/1867","Colonial","https://en.wikipedia.org/wiki/Formosa_Expedition"
"Comanche Campaign","01/01/1867","12/31/1875","Native","https://en.wikipedia.org/wiki/Comanche_Campaign"
"United States expedition to Korea","01/01/1871","12/31/1871","Colonial","https://en.wikipedia.org/wiki/United_States_expedition_to_Korea"
"Modoc War","01/01/1872","12/31/1873","Native","https://en.wikipedia.org/wiki/Modoc_War"
"Red River War","01/01/1874","12/31/1875","Native","https://en.wikipedia.org/wiki/Red_River_War"
"Las Cuevas War","01/01/1875","12/31/1875","Latin American","https://en.wikipedia.org/wiki/Las_Cuevas_War"
"Great Sioux War of 1876","01/01/1876","12/31/1877","Native","https://en.wikipedia.org/wiki/Great_Sioux_War_of_1876"
"Buffalo Hunters' War","01/01/1876","12/31/1877","Native","https://en.wikipedia.org/wiki/Buffalo_Hunters%27_War"
"Nez Perce War","01/01/1877","12/31/1877","Native","https://en.wikipedia.org/wiki/Nez_Perce_War"
"San Elizario Salt War","01/01/1877","12/31/1878","Internal","https://en.wikipedia.org/wiki/San_Elizario_Salt_War"
"Bannock War","01/01/1878","12/31/1878","Native","https://en.wikipedia.org/wiki/Bannock_War"
"Cheyenne War","01/01/1878","12/31/1879","Native","https://en.wikipedia.org/wiki/Cheyenne_War"
"Sheepeater Indian War","01/01/1879","12/31/1879","Native","https://en.wikipedia.org/wiki/Sheepeater_Indian_War"
"Victorio's War","01/01/1879","12/31/1881","Latin American","https://en.wikipedia.org/wiki/Victorio%27s_War"
"White River War","01/01/1879","12/31/1880","Native","https://en.wikipedia.org/wiki/White_River_War"
"Egyptian Expedition","01/01/1882","12/31/1882","Colonial","https://en.wikipedia.org/wiki/Egyptian_Expedition_(1882)"
"Pine Ridge Campaign","01/01/1890","12/31/1891","Native","https://en.wikipedia.org/wiki/Pine_Ridge_Campaign"
"Garza Revolution","01/01/1891","12/31/1893","Latin American","https://en.wikipedia.org/wiki/Garza_Revolution"
"Overthrow of the Kingdom of Hawaii","01/01/1893","12/31/1893","Colonial","https://en.wikipedia.org/wiki/Overthrow_of_the_Kingdom_of_Hawaii"
"Brazilian Naval Revolt","01/01/1893","12/31/1894","Latin American","https://en.wikipedia.org/wiki/Revolta_da_Armada"
"Yaqui Wars","01/01/1896","12/31/1918","Latin American","https://en.wikipedia.org/wiki/Yaqui_Wars"
"Second Samoan Civil War","01/01/1898","12/31/1899","Colonial","https://en.wikipedia.org/wiki/Second_Samoan_Civil_War"
"Spanish–American War","01/01/1898","12/31/1898","European","https://en.wikipedia.org/wiki/Spanish%E2%80%93American_War"
"Philippine–American War","01/01/1899","12/31/1902","Colonial","https://en.wikipedia.org/wiki/Philippine%E2%80%93American_War"
"Moro Rebellion","01/01/1899","12/31/1913","Colonial","https://en.wikipedia.org/wiki/Moro_Rebellion"
"Boxer Rebellion","01/01/1899","12/31/1901","Colonial","https://en.wikipedia.org/wiki/Boxer_Rebellion"
"Crazy Snake Rebellion","01/01/1909","12/31/1909","Native","https://en.wikipedia.org/wiki/Crazy_Snake_Rebellion"
"Border War","01/01/1910","12/31/1919","Latin American","https://en.wikipedia.org/wiki/Border_War_(1910%E2%80%9319)"
"Negro Rebellion","01/01/1912","12/31/1912","Latin American","https://en.wikipedia.org/wiki/Negro_Rebellion"
"Occupation of Nicaragua","01/01/1912","12/31/1933","Colonial","https://en.wikipedia.org/wiki/United_States_occupation_of_Nicaragua"
"Bluff War","01/01/1914","12/31/1915","Native","https://en.wikipedia.org/wiki/Bluff_War"
"Occupation of Haiti","01/01/1915","12/31/1934","Latin American","https://en.wikipedia.org/wiki/American_occupation_of_Haiti"
"Sugar Intervention","01/01/1916","12/31/1918","Latin American","https://en.wikipedia.org/wiki/Sugar_Intervention"
"Occupation of the Dominican Republic","01/01/1916","12/31/1924","Latin American","https://en.wikipedia.org/wiki/American_occupation_of_the_Dominican_Republic_(1916%E2%80%9324)"
"World War I","01/01/1917","12/31/1918","European","https://en.wikipedia.org/wiki/World_War_I"
"Russian Civil War","01/01/1918","12/31/1920","European","https://en.wikipedia.org/wiki/Allied_intervention_in_the_Russian_Civil_War"
"Bombardment of Samsun","01/01/1922","12/31/1922","European","https://en.wikipedia.org/wiki/Bombardment_of_Samsun"
"Posey War","01/01/1923","12/31/1923","Native","https://en.wikipedia.org/wiki/Posey_War"
"World War II","01/01/1941","12/31/1945","European","https://en.wikipedia.org/wiki/World_War_II"
"Pacific War","01/01/1941","12/31/1945","Colonial","https://en.wikipedia.org/wiki/Pacific_War"
"Korean War","01/01/1950","12/31/1953","Colonial","https://en.wikipedia.org/wiki/Korean_War"
"Intervention in Lebanon","01/01/1958","12/31/1958","Colonial","https://en.wikipedia.org/wiki/1958_Lebanon_crisis"
"Bay of Pigs Invasion","01/01/1961","12/31/1961","Latin American","https://en.wikipedia.org/wiki/Bay_of_Pigs_Invasion"
"Dominican Civil War","01/01/1965","12/31/1966","Latin American","https://en.wikipedia.org/wiki/United_States_occupation_of_the_Dominican_Republic_(1965%E2%80%931966)"
"Vietnam War","01/01/1965","12/31/1973","Colonial","https://en.wikipedia.org/wiki/Vietnam_War"
"Shaba II","01/01/1978","12/31/1978","Colonial","https://en.wikipedia.org/wiki/Shaba_II"
"Multinational Force in Lebanon","01/01/1982","12/31/1984","Colonial","https://en.wikipedia.org/wiki/Multinational_Force_in_Lebanon"
"Invasion of Grenada","01/01/1983","12/31/1983","Latin American","https://en.wikipedia.org/wiki/Invasion_of_Grenada"
"Tanker War","01/01/1987","12/31/1988","Colonial","https://en.wikipedia.org/wiki/Iran%E2%80%93Iraq_War#Persian_Gulf_Tanker_War"
"Invasion of Panama","01/01/1989","12/31/1990","Latin American","https://en.wikipedia.org/wiki/United_States_invasion_of_Panama"
"Gulf War","01/01/1990","12/31/1991","Colonial","https://en.wikipedia.org/wiki/Gulf_War"
"Iraqi No/Fly Zones","01/01/1991","12/31/2003","Colonial","https://en.wikipedia.org/wiki/Iraqi_no-fly_zones"
"Somali Civil War","01/01/1992","12/31/1995","Colonial","https://en.wikipedia.org/wiki/Somali_Civil_War"
"Intervention in Haiti","01/01/1994","12/31/1995","Latin American","https://en.wikipedia.org/wiki/Operation_Uphold_Democracy"
"Bosnian War","01/01/1994","12/31/1995","European","https://en.wikipedia.org/wiki/Bosnian_War"
"Kosovo War","01/01/1998","12/31/1999","European","https://en.wikipedia.org/wiki/Kosovo_War"
"War in Afghanistan","01/01/2001","12/31/2015","Colonial","https://en.wikipedia.org/wiki/War_in_Afghanistan_(2001%E2%80%9314)"
"Iraq War","01/01/2003","12/31/2011","Colonial","https://en.wikipedia.org/wiki/Iraq_War"
"War in Pakistan","01/01/2004","12/31/2015","Colonial","https://en.wikipedia.org/wiki/War_in_North-West_Pakistan"
"Operation Ocean Shield","01/01/2009","12/31/2015","Colonial","https://en.wikipedia.org/wiki/Operation_Ocean_Shield"
"Libyan Civil War","01/01/2011","12/31/2011","Colonial","https://en.wikipedia.org/wiki/2011_military_intervention_in_Libya"
"War on ISIL","01/01/2014","12/31/2015","Colonial","https://en.wikipedia.org/wiki/Military_intervention_against_ISIL"
`

function parseDate(value) {
  const [month, day, year] = value.split("/").map(Number)
  return Date.UTC(year, month - 1, day)
}

export const US_WARS = sourceRows
  .trim()
  .split("\n")
  .map((line, index) => {
    const [name, start, end, sphere, link] = line.slice(1, -1).split('","')
    const startTime = parseDate(start)
    const endTime = parseDate(end)
    return {
      id: `war-${index}`,
      name,
      start,
      end,
      startTime,
      endTime,
      startYear: new Date(startTime).getUTCFullYear(),
      endYear: new Date(endTime).getUTCFullYear(),
      midpoint: (startTime + endTime) / 2,
      sphere,
      link,
    }
  })

export const WAR_SPHERES = [
  "European",
  "Native",
  "Colonial",
  "Latin American",
  "Internal",
]

export const WAR_COLORS = {
  European: "#8ea7ad",
  Native: "#303846",
  Colonial: "#ad8d9b",
  "Latin American": "#647795",
  Internal: "#8a6f55",
}

export const WAR_PERIODS = [
  { name: "Revolution", start: 1779, end: 1832 },
  { name: "Conquest", start: 1838, end: 1882 },
  { name: "Influence", start: 1890, end: 1943 },
  { name: "Empire", start: 1952, end: 2014 },
]

export const WAR_DOMAIN = [1770, 2015]

export const WAR_COUNTS_BY_YEAR = Array.from(
  { length: WAR_DOMAIN[1] - 1776 + 1 },
  (_, index) => {
    const year = 1776 + index
    return {
      year,
      count: US_WARS.filter(
        (war) => war.startYear <= year && war.endYear >= year
      ).length,
    }
  }
)

export const PEACE_YEARS = WAR_COUNTS_BY_YEAR
  .filter((year) => year.count === 0)
  .map((year) => year.year)
