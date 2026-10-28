import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // The database is created at build time and the exams are read from disk at runtime,
  // so both must be shipped with every serverless function.
  outputFileTracingIncludes: { "/**": ["./data/*", "./content/**/*"] },
  serverExternalPackages: ["better-sqlite3"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
