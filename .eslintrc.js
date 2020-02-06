module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
  },
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'airbnb-base',
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/typescript',
  ],
  rules: {
    'lines-between-class-members': 'off',
    '@typescript-eslint/ban-ts-ignore': 'off',
    'max-len': ['error', { 'code': 100 }],
    'no-console': 'off',
  },
};
