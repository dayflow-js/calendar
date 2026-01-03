const config = {
  plugins: [
    "@tailwindcss/postcss",
    ["cssnano", { preset: ["default", { mergeRules: false }] }]
  ],
};

export default config;
