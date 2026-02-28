module.exports = {
  verbose: true,
  resetMocks: true,
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.{js,jsx,mjs,tsx}",
    "<rootDir>/src/**/?(*.)(spec|test).{ts,tsx,js,jsx,mjs}"
  ],
  testEnvironment: "jsdom",
  testEnvironmentOptions: {
    url: "http://localhost"
  },
  transform: {
    "\\.(ts|tsx)$": "ts-jest",
    "^.+\\.(js|jsx|mjs)$": "<rootDir>/config/jest/jsTransformer.js",
    "^.+\\.css$": "<rootDir>/config/jest/cssTransform.js",
    "^(?!.*\\.(js|jsx|mjs|css|json)$)": "<rootDir>/config/jest/fileTransform.js"
  },
  transformIgnorePatterns: ["node_modules/(?!d3|d3-.*)/"],
  moduleFileExtensions: [
    "js",
    "mjs",
    "ts",
    "json",
    "jsx",
    "tsx",
    "node"
  ]
}
