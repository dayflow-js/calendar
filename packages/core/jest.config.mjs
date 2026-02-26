export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^preact$': '<rootDir>/node_modules/preact/dist/preact.js',
    '^preact/hooks$': '<rootDir>/node_modules/preact/hooks/dist/hooks.js',
    '^preact/jsx-runtime$':
      '<rootDir>/node_modules/preact/jsx-runtime/dist/jsxRuntime.js',
    '^preact/compat$': '<rootDir>/node_modules/preact/compat/dist/compat.js',
    '^preact/test-utils$':
      '<rootDir>/node_modules/preact/test-utils/dist/testUtils.js',
    '^@testing-library/preact$':
      '<rootDir>/node_modules/@testing-library/preact/dist/cjs/index.js',
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/index.ts'],
  coverageThreshold: {
    global: {
      lines: 50,
      branches: 50,
      functions: 50,
      statements: 50,
    },
  },
};
