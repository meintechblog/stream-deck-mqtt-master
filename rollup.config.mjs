import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/plugin.ts",
  output: {
    file: "io.github.meintechblog.mqtt-master.sdPlugin/bin/plugin.js",
    format: "cjs",
    sourcemap: true,
  },
  plugins: [
    typescript(),
    resolve({ preferBuiltins: true }),
    commonjs(),
    json(),
  ],
};
