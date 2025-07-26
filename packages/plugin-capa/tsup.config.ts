import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    outDir: "dist",
    sourcemap: true,
    clean: true,
    format: ["esm"],
    external: [
        "dotenv",
        "fs",
        "path",
        "crypto",
        "util",
        "axios",
        "@reflink/reflink",
        "@node-llama-cpp",
        "agentkeepalive",
    ],
    treeshake: true,
    splitting: false,
    minify: true,
    dts: true,
}); 