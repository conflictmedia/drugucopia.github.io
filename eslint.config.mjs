import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, {
  rules: {
    // TypeScript rules
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/prefer-as-const": "off",
    "@typescript-eslint/no-unused-disable-directive": "off",

    // React rules
    "react-hooks/exhaustive-deps": "off",
    "react-hooks/purity": "off",
    "react-hooks/set-state-in-effect": "error",
    "react-hooks/static-components": "error",
    "react/no-unescaped-entities": "off",
    "react/display-name": "off",
    "react/prop-types": "off",
    "react-compiler/react-compiler": "off",

    // Next.js rules
    "@next/next/no-img-element": "off",
    "@next/next/no-html-link-for-pages": "off",

    // General JavaScript rules
    "prefer-const": "off",
    "no-unused-vars": "off",
    "no-console": "off",
    "no-debugger": "off",
    "no-empty": "off",
    "no-irregular-whitespace": "off",
    "no-case-declarations": "off",
    "no-fallthrough": "off",
    "no-mixed-spaces-and-tabs": "off",
    "no-redeclare": "off",
    "no-undef": "off",
    "no-unreachable": "off",
    "no-useless-escape": "off",
  },
}, {
  // File-scoped legacy baseline. New files still treat synchronous effect
  // state updates as errors; these existing components are migrated
  // incrementally without relying on version-sensitive ESLint suppressions.
  files: [
    "src/app/interactions/page.tsx",
    "src/components/changelog-popup.tsx",
    "src/components/dose-logger-modal.tsx",
    "src/components/duration-override-fields.tsx",
    "src/components/edit-dose-modal.tsx",
    "src/components/home/home-content.tsx",
    "src/components/intensity-timeline-chart.tsx",
    "src/components/intensity-timeline/IntensityTimelineChart.tsx",
    "src/components/interaction-substance-selector.tsx",
    "src/components/layout/LayoutClient.tsx",
    "src/components/milkdrop-background-wrapper.tsx",
    "src/components/milkdrop-background.tsx",
    "src/components/reminder-settings.tsx",
    "src/components/visualizer-controls.tsx",
    "src/contexts/sync-context.tsx",
    "src/hooks/use-mobile.ts",
  ],
  rules: {
    "react-hooks/set-state-in-effect": "off",
  },
}, {
  // The substances directory is an external git submodule. Keep its legacy
  // schema exception local instead of weakening this rule for application code.
  files: ["src/lib/substances/**/*.ts"],
  rules: {
    "@typescript-eslint/no-empty-object-type": "off",
  },
}, {
  ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts", "examples/**", "skills"]
}];

export default eslintConfig;
