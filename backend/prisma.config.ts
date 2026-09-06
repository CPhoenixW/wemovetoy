import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Backend commands run from backend/, while the shared development settings live at the repository root.
config({ path: "../.env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
