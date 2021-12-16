module.exports = {
  verbose: true,
  preset: "ts-jest",
  collectCoverage: true,
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.js"],
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.{js,jsx,mjs}",
    "<rootDir>/src/**/?(*.)(spec|test).{ts,js,jsx,mjs}"
  ],
  testEnvironment: "jsdom",
  testURL: "http://localhost",
  transform: {
    "\\.(ts|tsx)$": "ts-jest",
    "^.+\\.(js|jsx|mjs)$": "<rootDir>/config/jest/jsTransformer.js",
    "^.+\\.css$": "<rootDir>/config/jest/cssTransform.js",
    "^(?!.*\\.(js|jsx|mjs|css|json)$)": "<rootDir>/config/jest/fileTransform.js"
  },
  transformIgnorePatterns: ["[/\\\\]node_modules[/\\\\].+\\.(js|jsx|mjs)$"],
  moduleNameMapper: {
    "^react-native$": "react-native-web"
  },
  moduleFileExtensions: [
    "web.js",
    "mjs",
    "js",
    "ts",
    "json",
    "web.jsx",
    "jsx",
    "tsx",
    "node"
  ]
}
