const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

module.exports = createJestConfig({
  testEnvironment: 'node',
  testMatch: [
    '**/tests/unit/**/*.test.js',
    '**/tests/integration/**/*.test.js',
  ],
  collectCoverageFrom: [
    'src/lib/**/*.js',
    '!src/lib/**/*.test.js',
  ],
  coverageThreshold: {
    './src/lib/': {
      lines: 80,
    },
  },
});
