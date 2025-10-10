import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier/flat";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { ecmaVersion: "latest", globals: globals.node },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "no-debugger": "error",
      "prefer-const": "warn",
      eqeqeq: ["warn", "always"],
      curly: ["warn", "all"],
      "no-var": "error",
    },
  },
  globalIgnores(["src/generated/**"]),
  tseslint.configs.recommended,
  // optional: tests
  {
    files: ["**/*.test.ts", "**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
    },
  },
  eslintConfigPrettier,
]);
