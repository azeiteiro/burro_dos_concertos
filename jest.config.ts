import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/?(*.)+(spec|test).[jt]s?(x)"],
  clearMocks: true,

  // Coverage settings
  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/__tests__/mocks/**",
    "!src/config/**",
    "!src/generated/**",
    "!src/types/**",
  ],
  coverageDirectory: "<rootDir>/coverage",
  coverageReporters: ["text", "lcov", "json-summary"],
  coveragePathIgnorePatterns: ["/node_modules/", "prisma/client", "/dist/"],

  // Minimum coverage enforcement
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};

export default config;
