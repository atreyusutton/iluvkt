import "server-only";

/** Which real backends are configured. Everything falls back to a local equivalent in dev. */
export function getServiceStatus() {
  return {
    database: process.env.DATABASE_URL ? "neon" : "local",
    recordings: process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID ? "blob" : "local",
    ai: process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN ? "gateway" : "off",
    password: process.env.APP_PASSWORD ? "on" : "off",
  } as const;
}

export type ServiceStatus = ReturnType<typeof getServiceStatus>;
