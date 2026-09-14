import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships WASM + data files that must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Migrations are read from disk at runtime.
  outputFileTracingIncludes: {
    "/**": ["./drizzle/**/*"],
  },
};

export default nextConfig;
