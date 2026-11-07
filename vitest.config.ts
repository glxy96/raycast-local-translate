import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // @raycast/api only works inside Raycast; tests get a small in-memory stand-in.
    alias: { "@raycast/api": fileURLToPath(new URL("./test/raycast-api.ts", import.meta.url)) },
  },
  test: { include: ["test/**/*.test.ts"] },
});
