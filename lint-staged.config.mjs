const lintStagedConfig = {
  '*.{js,jsx,ts,tsx,mjs,cjs}': ['eslint --fix --no-warn-ignored', 'prettier --write'],

  '*.{json,md,css}': ['prettier --write'],
};

export default lintStagedConfig;
