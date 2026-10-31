// Lint del frontend: las reglas recomendadas de ESLint más las de hooks de
// React. Es lo que corre `pnpm run check` (y `make check` desde la raíz) y lo
// primero que hace `pnpm run build`.
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist", "dev-dist", "public", "node_modules", ".vite"]),
  {
    files: ["**/*.{js,jsx,mjs}"],
    extends: [js.configs.recommended],
    plugins: { "react-hooks": reactHooks },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      // __APP_VERSION__ lo inyecta Vite (define) con la versión del package.json
      globals: { ...globals.browser, __APP_VERSION__: "readonly" },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Un argumento o error capturado que empieza por "_" se ignora a propósito.
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
    },
  },
  {
    // Configuración que corre en Node, no en el navegador.
    files: ["vite.config.js", "eslint.config.js"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
]);
