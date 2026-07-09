/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        useESM: false,
      },
    ],
    '^.+\\.m?js$': [
      'ts-jest',
      {
        tsconfig: {
          allowJs: true,
          esModuleInterop: true,
        },
        useESM: false,
      },
    ],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(nanoid|chalk|ansi-styles|supports-color)/)',
    '<rootDir>/test/tmp-utils-test/',
    '<rootDir>/test/setup.js',
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};
