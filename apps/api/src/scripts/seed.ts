import { config } from "../config.js";
import { pool } from "../db.js";

if (config.NODE_ENV === "production") {
  throw new Error("Development seed is disabled in production.");
}

const condominiumId = "00000000-0000-4000-8000-000000000002";
const userId = "00000000-0000-4000-8000-000000000001";
const membershipId = "00000000-0000-4000-8000-000000000003";
const unitId = "00000000-0000-4000-8000-000000000004";
const categoryIds = [
  "00000000-0000-4000-8000-000000000010",
  "00000000-0000-4000-8000-000000000011",
  "00000000-0000-4000-8000-000000000012",
];

const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query(
    `INSERT INTO condominiums (id, name, os_prefix)
     VALUES ($1, 'Residencial Parque Firenze', 'FIR')
     ON CONFLICT (id) DO NOTHING`,
    [condominiumId],
  );
  await client.query(
    `INSERT INTO users (id, identity_subject, display_name, email)
     VALUES ($1, 'development:resident', 'Morador de desenvolvimento', 'dev@example.invalid')
     ON CONFLICT (id) DO NOTHING`,
    [userId],
  );
  await client.query(
    `INSERT INTO memberships (id, condominium_id, user_id, role)
     VALUES ($1, $2, $3, 'resident')
     ON CONFLICT (id) DO NOTHING`,
    [membershipId, condominiumId, userId],
  );
  await client.query(
    `INSERT INTO units (id, condominium_id, label)
     VALUES ($1, $2, 'Conjunto 03 • Torre B • Unidade 1704')
     ON CONFLICT (id) DO NOTHING`,
    [unitId, condominiumId],
  );
  await client.query(
    `INSERT INTO membership_units (membership_id, condominium_id, unit_id)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [membershipId, condominiumId, unitId],
  );

  const categories = [
    [categoryIds[0], "maintenance", "Manutenção", 1],
    [categoryIds[1], "security", "Segurança", 2],
    [categoryIds[2], "common_areas", "Áreas comuns", 3],
  ] as const;
  for (const [id, code, name, sortOrder] of categories) {
    await client.query(
      `INSERT INTO categories (id, condominium_id, code, name, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [id, condominiumId, code, name, sortOrder],
    );
  }

  await client.query(
    `INSERT INTO service_requests (
       condominium_id, public_number, requester_user_id, unit_id, location_label,
       category_id, subject, description, status, source
     )
     VALUES (
       $1, 'FIR-01842', $2, $3, 'Corredor / hall', $4,
       'Infiltração no corredor',
       'Chamado de demonstração para validar a fila local.',
       'in_progress', 'resident_portal'
     )
     ON CONFLICT (condominium_id, public_number) DO NOTHING`,
    [condominiumId, userId, unitId, categoryIds[0]],
  );
  await client.query(
    `UPDATE condominiums
        SET next_request_number = GREATEST(next_request_number, 1843)
      WHERE id = $1`,
    [condominiumId],
  );
  await client.query("COMMIT");
  console.log("Inserted local development fixtures.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
