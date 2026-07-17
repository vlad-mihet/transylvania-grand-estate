import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Flat config (matches the other apps). The previous FlatCompat form threw a
// circular-reference error during config validation under the current eslint,
// so academy never actually linted — BUG-101.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Playwright output — bundled trace-viewer assets are minified vendor JS.
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
