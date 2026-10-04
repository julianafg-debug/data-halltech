import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: resolve(fileURLToPath(new URL("../../..", import.meta.url)), ".env") });

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1).optional(),
  OIDC_ISSUER: z.string().url().optional(),
  OIDC_AUDIENCE: z.string().min(1).optional(),
  HOST: z.string().optional(),
  DEV_USER_ID: z.string().uuid().default("00000000-0000-4000-8000-000000000001"),
});

const environment = environmentSchema.parse(process.env);

if (environment.NODE_ENV === "production" &&
    (!environment.OIDC_ISSUER || !environment.OIDC_AUDIENCE)) {
  throw new Error("OIDC_ISSUER and OIDC_AUDIENCE are required in production.");
}
if (environment.NODE_ENV === "production" && !environment.DATABASE_URL) {
  throw new Error("DATABASE_URL is required in production.");
}
if (
  environment.NODE_ENV === "production" &&
  (!environment.OIDC_ISSUER?.startsWith("https://") ||
    !environment.DATABASE_URL?.startsWith("postgres"))
) {
  throw new Error("Production OIDC and PostgreSQL endpoints must use HTTPS/TLS.");
}

export const config = {
  ...environment,
  DATABASE_URL: environment.DATABASE_URL ??
    "postgresql://centralhall:centralhall@localhost:5432/centralhall",
  HOST: environment.HOST ?? (environment.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1"),
};
