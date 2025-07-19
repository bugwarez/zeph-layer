import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import { visualizer } from "rollup-plugin-visualizer";

export default {
  input: "src/index.ts",
  output: [
    {
      file: "dist/index.cjs.js",
      format: "cjs",
      exports: "auto",
      sourcemap: true,
    },
    { file: "dist/index.esm.js", format: "esm", sourcemap: true },
  ],
  external: ["cross-fetch"],
  plugins: [
    resolve(),
    typescript({
      tsconfig: "./tsconfig.json",
      declaration: true,
      declarationDir: "dist",
      rootDir: "src",
    }),
    terser(),
    process.env.ANALYZE
      ? visualizer({ open: true, filename: "../bundle-analysis.html" })
      : undefined,
  ].filter(Boolean),
};
