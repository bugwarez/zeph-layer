import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/index.ts",
  output: [
    { file: "dist/index.cjs.js", format: "cjs", exports: "auto" },
    { file: "dist/index.esm.js", format: "esm" },
  ],
  external: ["cross-fetch"],
  plugins: [resolve(), typescript({ tsconfig: "./tsconfig.json" })],
};
