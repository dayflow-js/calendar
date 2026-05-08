const coreModules = '<rootDir>/../../packages/core/node_modules';

export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react-jsx',
        jsxImportSource: 'preact',
      },
    },
  },
  moduleNameMapper: {
    '^@caldav/(.*)$': '<rootDir>/src/$1',
    // Use a slim core entry that avoids JSX/renderer imports
    '^@dayflow/core$': '<rootDir>/../../packages/core/src/caldav-entry.ts',
    '^@/(.*)$': '<rootDir>/../../packages/core/src/$1',
    '^preact$': `${coreModules}/preact/dist/preact.js`,
    '^preact/hooks$': `${coreModules}/preact/hooks/dist/hooks.js`,
    '^preact/jsx-runtime$': `${coreModules}/preact/jsx-runtime/dist/jsxRuntime.js`,
    '^preact/compat$': `${coreModules}/preact/compat/dist/compat.js`,
    '^preact/test-utils$': `${coreModules}/preact/test-utils/dist/testUtils.js`,
    // CSS modules are not used in caldav tests, but core imports some
    '\\.(css|less|scss|sass)$': `${coreModules}/identity-obj-proxy`,
    '@dayflow/ui-context-menu': `${coreModules}/../../../packages/ui/context-menu/src/index.ts`,
    '@dayflow/ui-range-picker': `${coreModules}/../../../packages/ui/range-picker/src/index.ts`,
  },
};
