import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    globalSetup: "./test/global-setup.ts",
    // One throwaway SQLite file shared by all files, so run them serially.
    fileParallelism: false,
    env: {
      DATABASE_URL: "file:./test.db",
      JWT_SECRET: "test-secret",
      WEB_ORIGIN: "http://localhost:5173",
      WELCOME_BONUS_CENTS: "1000000",
      REFERRAL_BONUS_CENTS: "500000",
    },
  },
});
