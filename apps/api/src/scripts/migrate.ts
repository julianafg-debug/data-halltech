import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { pool } from "../db.js";

const migrationUrl = new URL("../../migrations/001_initial.sql", import.meta.url);
const migration = await readFile(fileURLToPath(migrationUrl), "utf8");
const checksum = createHash("sha256").update(migration).digest("hex");
const client = await pool.connect();

try {
  await client.query("BEGIN");
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(100) PRIMARY KEY,
      checksum VARCHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  const previous = await client.query<{ checksum: string }>(
    "SELECT checksum FROM schema_migrations WHERE version = $1",
    ["001_initial"],
  );
  if (previous.rowCount) {
    if (previous.rows[0]!.checksum !== checksum) {
      throw new Error("Applied migration 001_initial.sql has changed.");
    }
    await client.query("COMMIT");
    console.log("Migration 001_initial.sql is already applied.");
  } else {
    await client.query(migration);
    await client.query(
      "INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)",
      ["001_initial", checksum],
    );
    await client.query("COMMIT");
    console.log("Applied migration 001_initial.sql");
  }
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
