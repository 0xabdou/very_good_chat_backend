module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['./jest.setup.ts'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/features/**/*',
    'src/shared/middlewares/*',
    'src/shared/return-types.ts',
  ],
};