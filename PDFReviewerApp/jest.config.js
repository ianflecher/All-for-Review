/**
 * Covers the pure logic — dates, money, scheduling, text analysis — which is
 * where the bugs that matter have actually turned up. These modules import no
 * React Native, so they run under plain ts-jest with no native transform.
 *
 * Testing a screen would need the jest-expo preset and react-test-renderer on
 * top of this; nothing here blocks that being added later.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  clearMocks: true,
};
