module.exports = {
  preset: 'jest-expo',
  resolver: '<rootDir>/tests/resolver.cjs',
  testMatch: ['**/tests/**/*.test.[jt]s?(x)'],
  setupFiles: ['<rootDir>/tests/setup.cjs'],
  clearMocks: true,
};
