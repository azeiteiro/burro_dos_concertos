import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/?(*.)+(spec|test).[jt]s?(x)"],
  clearMocks: true,
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],

  // Coverage settings
  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/__tests__/**",
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
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^node-cron$": "<rootDir>/src/__tests__/mocks/node-cron.ts",
  },
};

export default config;
