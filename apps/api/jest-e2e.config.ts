import type { Config } from 'jest';

/**
 * E2E test configuration. Distinct from any future unit-test config so we can
 * opt in to a live Postgres container and longer timeouts per suite without
 * bogging down fast unit runs. `maxWorkers: 1` because each suite shares a
 * single Testcontainers-managed Postgres \u2014 parallel suites would stomp on
 * each other's rows until we shard.
 */
const config: Config = {
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
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
  globalSetup: '<rootDir>/test/global-setup.ts',
  globalTeardown: '<rootDir>/test/global-teardown.ts',
  setupFilesAfterEach: ['<rootDir>/test/per-test-reset.ts'],
  testTimeout: 60_000,
  maxWorkers: 1,
};

export default config;
