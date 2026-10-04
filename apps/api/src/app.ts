import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import helmet from "helmet";
import type { PoolClient } from "pg";
import { z } from "zod";
import { requireIdentity } from "./auth.js";
import { config } from "./config.js";
import { pool } from "./db.js";
import { HttpError, errorHandler } from "./errors.js";
import { currentUserContextSql } from "./queries.js";
import {
  createRequestSchema,
  requestCursorSchema,
  requestListQuerySchema,
  type RequestCursor,
} from "./requests.schemas.js";

const app = express();
const oidcOrigin = config.OIDC_ISSUER ? new URL(config.OIDC_ISSUER).origin : null;

app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "connect-src": ["'self'", ...(oidcOrigin ? [oidcOrigin] : [])],
      "frame-ancestors": ["'none'"],
      "object-src": ["'none'"],
    },
  },
}));
app.use(express.json({ limit: "32kb" }));

app.get("/api/health", async (_request, response, next) => {
  try {
    await pool.query("SELECT 1");
    response.json({ status: "ok" });
  } catch (error) {
    next(error);
  }
});

app.get("/api/health/live", (_request, response) => {
  response.json({ status: "ok" });
});

app.get("/api/health/ready", async (_request, response, next) => {
  try {
    await pool.query("SELECT 1");
    response.json({ status: "ready" });
  } catch (error) {
    next(error);
  }
});

app.use("/api/v1", requireIdentity);

app.get("/api/v1/me", async (request, response, next) => {
  try {
    const memberships = await pool.query<{
      display_name: string;
      condominium_id: string;
      condominium_name: string;
      role: string;
      unit_id: string | null;
      unit_label: string | null;
    }>(
      currentUserContextSql,
      [request.userId],
    );
    if (memberships.rowCount === 0) {
      throw new HttpError(403, "no_active_membership", "Nenhum vínculo ativo foi encontrado.");
    }

    const first = memberships.rows[0]!;
    response.json({
      user: { id: request.userId, display_name: first.display_name },
      condominiums: memberships.rows.reduce<Array<{
        id: string;
        name: string;
        roles: string[];
        units: Array<{ id: string; label: string }>;
      }>>((items, row) => {
        let item = items.find((candidate) => candidate.id === row.condominium_id);
        if (!item) {
          item = {
            id: row.condominium_id,
            name: row.condominium_name,
            roles: [],
            units: [],
          };
          items.push(item);
        }
        if (!item.roles.includes(row.role)) item.roles.push(row.role);
        if (row.unit_id && row.unit_label && !item.units.some((unit) => unit.id === row.unit_id)) {
          item.units.push({ id: row.unit_id, label: row.unit_label });
        }
        return items;
      }, []),
      active_context_id: first.condominium_id,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/condominiums/:condominiumId/categories", async (request, response, next) => {
  try {
    const condominiumId = z.string().uuid().parse(request.params.condominiumId);
    const membership = await pool.query(
      `SELECT 1 FROM memberships
        WHERE user_id = $1 AND condominium_id = $2
          AND valid_from <= now() AND (valid_to IS NULL OR valid_to > now())
        LIMIT 1`,
      [request.userId, condominiumId],
    );
    if (membership.rowCount === 0) {
      throw new HttpError(404, "resource_not_found", "Condomínio não encontrado.");
    }

    const categories = await pool.query(
      `SELECT id, code, name FROM categories
        WHERE condominium_id = $1 AND active = true
        ORDER BY sort_order, name`,
      [condominiumId],
    );
    response.json({ items: categories.rows });
  } catch (error) {
    next(error);
  }
});

app.get("/api/v1/condominiums/:condominiumId/service-requests", async (request, response, next) => {
  try {
    const { limit, cursor: rawCursor } = requestListQuerySchema.parse(request.query);
    const condominiumId = z.string().uuid().parse(request.params.condominiumId);
    const cursor = rawCursor ? decodeRequestCursor(rawCursor) : null;
    const access = await pool.query<{ role: string; unit_id: string | null }>(
      `SELECT m.role, mu.unit_id
         FROM memberships m
         LEFT JOIN membership_units mu
           ON mu.membership_id = m.id
          AND mu.valid_from <= now()
          AND (mu.valid_to IS NULL OR mu.valid_to > now())
        WHERE m.user_id = $1 AND m.condominium_id = $2
          AND m.valid_from <= now() AND (m.valid_to IS NULL OR m.valid_to > now())`,
      [request.userId, condominiumId],
    );
    if (access.rowCount === 0) {
      throw new HttpError(404, "resource_not_found", "Condomínio não encontrado.");
    }

    const canViewQueue = access.rows.some((row) => row.role === "operator" || row.role === "manager");
    const unitIds = [...new Set(access.rows.flatMap((row) => row.unit_id ? [row.unit_id] : []))];
    const summary = await pool.query<{
      open_requests: number;
      in_progress_requests: number;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'closed', 'cancelled'))::int
           AS open_requests,
         COUNT(*) FILTER (
           WHERE status IN ('in_progress', 'waiting_resident', 'waiting_third_party')
         )::int AS in_progress_requests
         FROM service_requests r
        WHERE r.condominium_id = $1
          AND ($2::boolean OR r.requester_user_id = $3 OR r.unit_id = ANY($4::uuid[]))`,
      [condominiumId, canViewQueue, request.userId, unitIds],
    );

    const requests = await pool.query(
      `SELECT r.id, r.public_number, r.subject, r.location_label, r.status,
              r.priority, r.created_at, c.name AS category_name
         FROM service_requests r
         JOIN categories c
           ON c.id = r.category_id AND c.condominium_id = r.condominium_id
        WHERE r.condominium_id = $1
          AND ($2::boolean OR r.requester_user_id = $3 OR r.unit_id = ANY($4::uuid[]))
          AND ($5::timestamptz IS NULL OR (r.created_at, r.id) < ($5::timestamptz, $6::uuid))
        ORDER BY r.created_at DESC, r.id DESC
        LIMIT $7`,
      [
        condominiumId,
        canViewQueue,
        request.userId,
        unitIds,
        cursor?.created_at ?? null,
        cursor?.id ?? null,
        limit + 1,
      ],
    );

    const hasMore = requests.rows.length > limit;
    const items = hasMore ? requests.rows.slice(0, limit) : requests.rows;
    const lastItem = items.at(-1) as { id: string; created_at: Date } | undefined;
    response.json({
      items,
      summary: {
        open_requests: Number(summary.rows[0]?.open_requests ?? 0),
        in_progress_requests: Number(summary.rows[0]?.in_progress_requests ?? 0),
      },
      next_cursor: hasMore && lastItem
        ? Buffer.from(JSON.stringify({
          created_at: lastItem.created_at.toISOString(),
          id: lastItem.id,
        })).toString("base64url")
        : null,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/condominiums/:condominiumId/service-requests", async (request, response, next) => {
  let client: PoolClient;
  try {
    client = await pool.connect();
  } catch (error) {
    next(error);
    return;
  }
  let transactionStarted = false;
  try {
    const condominiumId = z.string().uuid().parse(request.params.condominiumId);
    const userId = request.userId!;
    const input = createRequestSchema.parse(request.body);
    const idempotencyKey = request.header("idempotency-key");
    if (!idempotencyKey || idempotencyKey.length > 128) {
      throw new HttpError(400, "idempotency_key_required", "Envie uma chave de idempotência válida.");
    }
    const requestHash = createRequestHash({ condominium_id: condominiumId, payload: input });

    await client.query("BEGIN");
    transactionStarted = true;
    const membership = await client.query<{ id: string; role: string }>(
      `SELECT m.id, m.role
         FROM memberships m
        WHERE m.user_id = $1 AND m.condominium_id = $2
          AND m.role = 'resident'
          AND m.valid_from <= now() AND (m.valid_to IS NULL OR m.valid_to > now())
        LIMIT 1`,
      [userId, condominiumId],
    );
    if (membership.rowCount === 0) {
      throw new HttpError(404, "resource_not_found", "Condomínio não encontrado.");
    }

    const unitId = input.unit_id ?? null;
    if (unitId) {
      const unitAccess = await client.query(
        `SELECT 1
           FROM membership_units mu
           JOIN units u ON u.id = mu.unit_id AND u.condominium_id = mu.condominium_id
          WHERE mu.membership_id = $1 AND mu.condominium_id = $2
            AND mu.unit_id = $3 AND u.active = true
            AND mu.valid_from <= now() AND (mu.valid_to IS NULL OR mu.valid_to > now())
          LIMIT 1`,
        [membership.rows[0]!.id, condominiumId, unitId],
      );
      if (unitAccess.rowCount === 0) {
        throw new HttpError(404, "resource_not_found", "Local não encontrado.");
      }
    }

    const category = await client.query(
      `SELECT 1 FROM categories
        WHERE id = $1 AND condominium_id = $2 AND active = true`,
      [input.category_id, condominiumId],
    );
    if (category.rowCount === 0) {
      throw new HttpError(400, "invalid_category", "Selecione uma categoria disponível.");
    }

    const idempotency = await client.query<{ service_request_id: string | null }>(
      `INSERT INTO idempotency_keys (user_id, idempotency_key, request_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, idempotency_key) DO NOTHING
       RETURNING service_request_id`,
      [userId, idempotencyKey, requestHash],
    );
    if (idempotency.rowCount === 0) {
      const existing = await client.query<{
        request_hash: string;
        service_request_id: string | null;
      }>(
        `SELECT request_hash, service_request_id
           FROM idempotency_keys
          WHERE user_id = $1 AND idempotency_key = $2`,
        [userId, idempotencyKey],
      );
      const prior = existing.rows[0];
      if (!prior || prior.request_hash !== requestHash || !prior.service_request_id) {
        throw new HttpError(409, "idempotency_conflict", "A chave já foi utilizada em outra operação.");
      }
      const created = await client.query(
        `SELECT id, public_number, status, created_at, version
           FROM service_requests
          WHERE id = $1 AND condominium_id = $2`,
        [prior.service_request_id, condominiumId],
      );
      await client.query("COMMIT");
      transactionStarted = false;
      response.status(200).json(created.rows[0]);
      return;
    }

    const condominium = await client.query<{ os_prefix: string; next_request_number: string }>(
      `UPDATE condominiums
          SET next_request_number = next_request_number + 1, updated_at = now()
        WHERE id = $1 AND status = 'active'
        RETURNING os_prefix, next_request_number - 1 AS next_request_number`,
      [condominiumId],
    );
    if (condominium.rowCount === 0) {
      throw new HttpError(404, "resource_not_found", "Condomínio não encontrado.");
    }
    const sequence = Number(condominium.rows[0]!.next_request_number);
    const publicNumber = `${condominium.rows[0]!.os_prefix}-${String(sequence).padStart(5, "0")}`;
    const requestId = randomUUID();
    const created = await client.query<{
      id: string;
      public_number: string;
      status: string;
      created_at: Date;
      version: number;
    }>(
      `INSERT INTO service_requests (
         id, condominium_id, public_number, requester_user_id, unit_id,
         location_label, category_id, subject, description, source
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'resident_portal')
       RETURNING id, public_number, status, created_at, version`,
      [
        requestId,
        condominiumId,
        publicNumber,
        userId,
        unitId,
        input.location_label ?? null,
        input.category_id,
        input.subject,
        input.description,
      ],
    );
    await client.query(
      `INSERT INTO request_events (
         condominium_id, service_request_id, actor_user_id,
         event_type, to_status, public_note
       ) VALUES ($1, $2, $3, 'created', 'open', 'Solicitação aberta pelo morador.')`,
      [condominiumId, requestId, userId],
    );
    await client.query(
      `INSERT INTO outbox_events (condominium_id, aggregate_type, aggregate_id, event_type, payload)
       VALUES ($1, 'service_request', $2, 'ServiceRequestCreated', $3::jsonb)`,
      [
        condominiumId,
        requestId,
        JSON.stringify({ service_request_id: requestId, public_number: publicNumber }),
      ],
    );
    await client.query(
      `UPDATE idempotency_keys SET service_request_id = $3
        WHERE user_id = $1 AND idempotency_key = $2`,
      [userId, idempotencyKey, requestId],
    );
    await client.query("COMMIT");
    transactionStarted = false;
    response.status(201).json(created.rows[0]);
  } catch (error) {
    if (transactionStarted) await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

function createRequestHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function decodeRequestCursor(value: string): RequestCursor {
  try {
    const decoded: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    return requestCursorSchema.parse(decoded);
  } catch {
    throw new HttpError(400, "invalid_cursor", "O cursor de paginação é inválido.");
  }
}

app.use("/api", (_request, response) => {
  response.status(404).json({
    type: "request_error",
    code: "resource_not_found",
    message: "Recurso não encontrado.",
    correlation_id: "unavailable",
  });
});

const webBuildPath = resolve(fileURLToPath(new URL("../../web/dist", import.meta.url)));
if (existsSync(webBuildPath)) {
  app.use(express.static(webBuildPath, {
    index: false,
    maxAge: "1y",
    immutable: true,
    setHeaders(response, path) {
      if (/[\\/](index\.html|sw\.js|manifest\.webmanifest)$/.test(path)) {
        response.setHeader("Cache-Control", "no-cache");
      }
    },
  }));
  app.get("*", (_request, response, next) => {
    response.sendFile(resolve(webBuildPath, "index.html"), (error) => {
      if (error) next(error);
    });
  });
}

app.use(errorHandler);
export { app };
