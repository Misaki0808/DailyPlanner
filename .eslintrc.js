module.exports = {
  extends: 'expo',
  rules: {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      // jest.mock() hoist edildiği için ve jest.resetModules() sonrası modülün
      // yeniden değerlendirilmesi gerektiği için testlerde require() zorunludur.
      files: ['__tests__/**/*.ts', '__tests__/**/*.tsx'],
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
      },
    },
  ],
};
