import type { Config } from 'jest';

/**
 * Unit-test configuration. No globalSetup (→ no Postgres, no testcontainers)
 * so pure-function tests (e.g. common/** utilities) run in under a second
 * instead of the ~minute cold-start that the e2e config pays.
 *
 * testMatch deliberately excludes `test/**` so the slower e2e suites don't
 * get pulled into `pnpm test:unit`. Run e2e via `pnpm test:e2e`.
 */
const config: Config = {
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      { tsconfig: '<rootDir>/tsconfig.json', isolatedModules: true },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@tge/types/(.*)$': '<rootDir>/../../packages/types/src/$1',
    '^@tge/types$': '<rootDir>/../../packages/types/src',
  },
  testTimeout: 5_000,
};

export default config;
