export default {
  "*.{ts,tsx}": ["prettier --write", "eslint --fix", () => "tsc --noEmit"],
  "*.{js,jsx,cjs,mjs}": ["prettier --write", "eslint --fix"],
  "*.{json,md,css,html,yml,yaml}": ["prettier --write"],
};
