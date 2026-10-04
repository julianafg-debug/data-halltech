import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { config } from "./config.js";
import { pool } from "./db.js";
import { HttpError } from "./errors.js";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

let jwksPromise: Promise<JWTVerifyGetKey> | undefined;

export async function requireIdentity(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    let identitySubject: string;

    if (config.OIDC_ISSUER && config.OIDC_AUDIENCE) {
      const authorization = request.header("authorization");
      const match = authorization?.match(/^Bearer ([^\s]+)$/i);
      if (!match || !config.OIDC_ISSUER || !config.OIDC_AUDIENCE) {
        throw new HttpError(401, "authentication_required", "Autentique-se para continuar.");
      }

      let jwks: JWTVerifyGetKey;
      try {
        jwks = await getJwks();
      } catch {
        throw new HttpError(
          503,
          "identity_provider_unavailable",
          "O serviço de autenticação está temporariamente indisponível.",
        );
      }

      let payload;
      try {
        ({ payload } = await jwtVerify(match[1]!, jwks, {
          issuer: config.OIDC_ISSUER,
          audience: config.OIDC_AUDIENCE,
          algorithms: ["RS256"],
          requiredClaims: ["sub", "exp", "iat"],
        }));
      } catch {
        throw new HttpError(401, "invalid_identity_token", "O token de acesso é inválido ou expirou.");
      }
      if (typeof payload.sub !== "string" || payload.sub.length === 0) {
        throw new HttpError(401, "invalid_identity_token", "A identidade recebida é inválida.");
      }
      identitySubject = `${config.OIDC_ISSUER}|${payload.sub}`;
    } else if (config.NODE_ENV !== "production") {
      identitySubject = "development:resident";
    } else {
      throw new HttpError(503, "authentication_not_configured", "Autenticação não está configurada.");
    }

    const result = await pool.query<{ id: string; status: string }>(
      "SELECT id, status FROM users WHERE identity_subject = $1",
      [identitySubject],
    );
    const user = result.rows[0];
    if (!user || user.status !== "active") {
      throw new HttpError(403, "identity_not_provisioned", "A identidade não possui acesso ativo.");
    }

    request.userId = user.id;
    next();
  } catch (error) {
    next(error);
  }
}

async function getJwks(): Promise<JWTVerifyGetKey> {
  if (!config.OIDC_ISSUER) {
    throw new Error("OIDC issuer is not configured.");
  }
  jwksPromise ??= discoverJwks();
  try {
    return await jwksPromise;
  } catch (error) {
    jwksPromise = undefined;
    throw error;
  }
}

async function discoverJwks(): Promise<JWTVerifyGetKey> {
  const issuer = config.OIDC_ISSUER!;
  const metadataUrl = new URL(
    ".well-known/openid-configuration",
    `${issuer.replace(/\/+$/, "")}/`,
  );
  const response = await fetch(metadataUrl, { signal: AbortSignal.timeout(5_000) });
  if (!response.ok) throw new Error("OIDC discovery endpoint is unavailable.");

  const metadata: unknown = await response.json();
  if (
    typeof metadata !== "object" ||
    metadata === null ||
    !("issuer" in metadata) ||
    metadata.issuer !== issuer ||
    !("jwks_uri" in metadata) ||
    typeof metadata.jwks_uri !== "string"
  ) {
    throw new Error("OIDC discovery metadata does not match the configured issuer.");
  }
  const jwksUrl = new URL(metadata.jwks_uri);
  if (jwksUrl.protocol !== "https:" || jwksUrl.origin !== new URL(issuer).origin) {
    throw new Error("OIDC signing keys must use the configured issuer's HTTPS origin.");
  }
  return createRemoteJWKSet(jwksUrl);
}
