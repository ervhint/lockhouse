import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  // One file at a time: house.test.ts briefly moves Tari, whom items.test.ts uses as a reader on the same Staging rows.
  test: { include: ["tests/**/*.test.ts"], testTimeout: 30000, fileParallelism: false },
});
