import assert from "node:assert/strict";
import test from "node:test";
import {
  createRequestSchema,
  requestCursorSchema,
  requestListQuerySchema,
} from "./requests.schemas.js";

test("accepts a valid request and normalizes surrounding whitespace", () => {
  const parsed = createRequestSchema.parse({
    unit_id: null,
    category_id: "00000000-0000-4000-8000-000000000010",
    subject: "  Vazamento  ",
    description: "  Há água no corredor próximo à entrada.  ",
  });

  assert.equal(parsed.subject, "Vazamento");
  assert.equal(parsed.description, "Há água no corredor próximo à entrada.");
});

test("rejects client-supplied status and oversized descriptions", () => {
  const result = createRequestSchema.safeParse({
    category_id: "00000000-0000-4000-8000-000000000010",
    subject: "Vazamento",
    description: "x".repeat(5001),
    status: "closed",
  });

  assert.equal(result.success, false);
});

test("bounds list page size", () => {
  assert.equal(requestListQuerySchema.parse({ limit: "50" }).limit, 50);
  assert.equal(requestListQuerySchema.safeParse({ limit: "101" }).success, false);
});

test("validates stable request cursors", () => {
  assert.equal(
    requestCursorSchema.safeParse({
      created_at: "2026-10-03T20:00:00.000Z",
      id: "00000000-0000-4000-8000-000000000010",
    }).success,
    true,
  );
  assert.equal(
    requestCursorSchema.safeParse({ created_at: "yesterday", id: "not-a-uuid" }).success,
    false,
  );
});
