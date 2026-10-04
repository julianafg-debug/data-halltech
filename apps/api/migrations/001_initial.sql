CREATE TABLE IF NOT EXISTS condominiums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  os_prefix VARCHAR(12) NOT NULL CHECK (os_prefix ~ '^[A-Z0-9]+$'),
  timezone VARCHAR(64) NOT NULL DEFAULT 'America/Sao_Paulo',
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'closed')),
  next_request_number BIGINT NOT NULL DEFAULT 1 CHECK (next_request_number > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  identity_subject VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(200) NOT NULL,
  email VARCHAR(320),
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL REFERENCES condominiums(id),
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(30) NOT NULL
    CHECK (role IN ('resident', 'operator', 'manager', 'platform_admin')),
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (valid_to IS NULL OR valid_to > valid_from),
  UNIQUE (condominium_id, user_id, role, valid_from),
  UNIQUE (id, condominium_id)
);

CREATE INDEX IF NOT EXISTS memberships_user_condominium_idx
  ON memberships (user_id, condominium_id, valid_to);

CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL REFERENCES condominiums(id),
  label VARCHAR(120) NOT NULL,
  unit_type VARCHAR(30) NOT NULL DEFAULT 'residential'
    CHECK (unit_type IN ('residential', 'garage', 'common_area', 'other')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (condominium_id, label),
  UNIQUE (condominium_id, id)
);

CREATE TABLE IF NOT EXISTS membership_units (
  membership_id UUID NOT NULL REFERENCES memberships(id),
  condominium_id UUID NOT NULL,
  unit_id UUID NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_to TIMESTAMPTZ,
  PRIMARY KEY (membership_id, unit_id, valid_from),
  FOREIGN KEY (membership_id, condominium_id)
    REFERENCES memberships(id, condominium_id),
  FOREIGN KEY (condominium_id, unit_id)
    REFERENCES units(condominium_id, id),
  CHECK (valid_to IS NULL OR valid_to > valid_from)
);

CREATE INDEX IF NOT EXISTS membership_units_unit_membership_idx
  ON membership_units (unit_id, membership_id);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL REFERENCES condominiums(id),
  code VARCHAR(40) NOT NULL,
  name VARCHAR(100) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (condominium_id, code),
  UNIQUE (condominium_id, id)
);

CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL REFERENCES condominiums(id),
  public_number VARCHAR(32) NOT NULL,
  requester_user_id UUID NOT NULL REFERENCES users(id),
  unit_id UUID,
  location_label VARCHAR(200),
  category_id UUID NOT NULL,
  subject VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'triage', 'in_progress', 'waiting_resident',
      'waiting_third_party', 'resolved', 'reopened', 'closed', 'cancelled')),
  priority VARCHAR(20) NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  source VARCHAR(20) NOT NULL DEFAULT 'resident_portal'
    CHECK (source IN ('resident_portal', 'central', 'assistant', 'integration')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  FOREIGN KEY (condominium_id, unit_id)
    REFERENCES units(condominium_id, id),
  FOREIGN KEY (condominium_id, category_id)
    REFERENCES categories(condominium_id, id),
  UNIQUE (condominium_id, public_number),
  UNIQUE (condominium_id, id),
  UNIQUE (requester_user_id, id)
);

CREATE INDEX IF NOT EXISTS service_requests_condominium_status_created_idx
  ON service_requests (condominium_id, status, created_at DESC, id);

CREATE INDEX IF NOT EXISTS service_requests_requester_created_idx
  ON service_requests (requester_user_id, created_at DESC, id);

CREATE TABLE IF NOT EXISTS request_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL,
  service_request_id UUID NOT NULL,
  actor_user_id UUID REFERENCES users(id),
  event_type VARCHAR(40) NOT NULL,
  from_status VARCHAR(30),
  to_status VARCHAR(30),
  reason TEXT,
  public_note TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  correlation_id UUID,
  FOREIGN KEY (condominium_id, service_request_id)
    REFERENCES service_requests(condominium_id, id)
);

CREATE INDEX IF NOT EXISTS request_events_request_time_idx
  ON request_events (service_request_id, occurred_at, id);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  user_id UUID NOT NULL REFERENCES users(id),
  idempotency_key VARCHAR(128) NOT NULL,
  request_hash VARCHAR(64) NOT NULL,
  service_request_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, idempotency_key),
  FOREIGN KEY (user_id, service_request_id)
    REFERENCES service_requests(requester_user_id, id)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE IF NOT EXISTS outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominium_id UUID NOT NULL REFERENCES condominiums(id),
  aggregate_type VARCHAR(80) NOT NULL,
  aggregate_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS outbox_events_pending_idx
  ON outbox_events (created_at, id) WHERE published_at IS NULL;
