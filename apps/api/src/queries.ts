export const currentUserContextSql = `
  SELECT account.display_name, m.condominium_id, c.name AS condominium_name, m.role,
         unit.id AS unit_id, unit.label AS unit_label
    FROM memberships m
    JOIN condominiums c ON c.id = m.condominium_id
    JOIN users account ON account.id = m.user_id AND account.status = 'active'
    LEFT JOIN membership_units mu
      ON mu.membership_id = m.id
     AND mu.valid_from <= now()
     AND (mu.valid_to IS NULL OR mu.valid_to > now())
    LEFT JOIN units unit ON unit.id = mu.unit_id AND unit.active = true
   WHERE m.user_id = $1
     AND m.valid_from <= now()
     AND (m.valid_to IS NULL OR m.valid_to > now())
   ORDER BY c.name, unit.label`;
