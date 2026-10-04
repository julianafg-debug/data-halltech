import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { currentUserContextSql } from "./queries.js";

test("initial migration and resident context query work in PostgreSQL", async () => {
  const database = new PGlite();
  try {
    const migrationUrl = new URL("../migrations/001_initial.sql", import.meta.url);
    const migration = await readFile(fileURLToPath(migrationUrl), "utf8");
    await database.exec(migration);

    await database.query(
      `INSERT INTO condominiums (id, name, os_prefix)
       VALUES ('00000000-0000-4000-8000-000000000002', 'Condomínio de teste', 'TST')`,
    );
    await database.query(
      `INSERT INTO users (id, identity_subject, display_name)
       VALUES ('00000000-0000-4000-8000-000000000001', 'test:resident', 'Moradora de teste')`,
    );
    await database.query(
      `INSERT INTO memberships (id, condominium_id, user_id, role)
       VALUES (
         '00000000-0000-4000-8000-000000000003',
         '00000000-0000-4000-8000-000000000002',
         '00000000-0000-4000-8000-000000000001',
         'resident'
       )`,
    );
    await database.query(
      `INSERT INTO units (id, condominium_id, label)
       VALUES (
         '00000000-0000-4000-8000-000000000004',
         '00000000-0000-4000-8000-000000000002',
         'Torre B • Unidade 1704'
       )`,
    );
    await database.query(
      `INSERT INTO membership_units (membership_id, condominium_id, unit_id)
       VALUES (
         '00000000-0000-4000-8000-000000000003',
         '00000000-0000-4000-8000-000000000002',
         '00000000-0000-4000-8000-000000000004'
       )`,
    );

    const result = await database.query<{
      display_name: string;
      condominium_name: string;
      role: string;
      unit_label: string;
    }>(currentUserContextSql, ["00000000-0000-4000-8000-000000000001"]);

    assert.equal(result.rows.length, 1);
    assert.deepEqual(result.rows[0], {
      display_name: "Moradora de teste",
      condominium_id: "00000000-0000-4000-8000-000000000002",
      condominium_name: "Condomínio de teste",
      role: "resident",
      unit_id: "00000000-0000-4000-8000-000000000004",
      unit_label: "Torre B • Unidade 1704",
    });
  } finally {
    await database.close();
  }
});
