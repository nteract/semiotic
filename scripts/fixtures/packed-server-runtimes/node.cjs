const verifyRender = require("./render.cjs")
verifyRender(require("semiotic/server"))
console.log(require.resolve("semiotic/server"))
