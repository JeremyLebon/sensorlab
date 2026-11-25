import globals from 'globals';
export default [{
  files: ['src/**/*.js'],
  languageOptions: {ecmaVersion: 2022, sourceType: 'module', globals: globals.browser},
  rules: {'no-undef': 'error', 'no-shadow': 'error', 'no-unused-vars': ['warn', {vars: 'local', args: 'none'}]}
}];
