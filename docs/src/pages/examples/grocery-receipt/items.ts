import type { GroceryItem } from "./types"

// Frozen against the downloaded BLS ap.series dictionary. Definitions belong
// to this example adapter, not the library's general calculation API.
export const ITEMS: GroceryItem[] = [
  {
    itemId: "bananas",
    seriesId: "APU0000711211",
    label: "Bananas",
    quantityUnit: "lb",
    defaultQuantity: 2,
    sourceTitle:
      "Bananas, per lb. (453.6 gm) in U.S. city average, average price, not seasonally adjusted",
  },
  {
    itemId: "bread",
    seriesId: "APU0000702111",
    label: "White pan bread",
    quantityUnit: "lb",
    defaultQuantity: 2,
    sourceTitle:
      "Bread, white, pan, per lb. (453.6 gm) in U.S. city average, average price, not seasonally adjusted",
  },
  {
    itemId: "eggs",
    seriesId: "APU0000708111",
    label: "Large grade-A eggs",
    quantityUnit: "dozen",
    defaultQuantity: 1,
    sourceTitle:
      "Eggs, grade A, large, per doz. in U.S. city average, average price, not seasonally adjusted",
  },
  {
    itemId: "milk",
    seriesId: "APU0000709112",
    label: "Whole fortified milk",
    quantityUnit: "gallon",
    defaultQuantity: 1,
    sourceTitle:
      "Milk, fresh, whole, fortified, per gal. (3.8 lit) in U.S. city average, average price, not seasonally adjusted",
  },
  {
    itemId: "chicken",
    seriesId: "APU0000706111",
    label: "Fresh whole chicken",
    quantityUnit: "lb",
    defaultQuantity: 4,
    sourceTitle:
      "Chicken, fresh, whole, per lb. (453.6 gm) in U.S. city average, average price, not seasonally adjusted",
  },
  {
    itemId: "chuck",
    seriesId: "APU0000703111",
    label: "Ground chuck",
    quantityUnit: "lb",
    defaultQuantity: 1,
    sourceTitle:
      "Ground chuck, 100% beef, per lb. (453.6 gm) in U.S. city average, average price, not seasonally adjusted",
  },
]

export const TRANSFORM_VERSION = "e01-basket-1"
export const STORY_PATH = "/examples/grocery-bill"
export const STORY_URL = `https://semiotic.nteract.io${STORY_PATH}`
export const QUALIFICATION = "Illustrative basket using national average prices"
