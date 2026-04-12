DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'measurement_health') THEN
        CREATE TYPE measurement_health AS ENUM ('healthy', 'stressed', 'diseased', 'dead');
    END IF;
END $$;

CREATE TABLE telemetry_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tree_id         UUID NOT NULL REFERENCES tree_instances(id) ON DELETE CASCADE,
    event_timestamp TIMESTAMPTZ NOT NULL,
    height_cm       NUMERIC(8,2) NOT NULL CHECK (height_cm > 0),
    diameter_cm     NUMERIC(8,2) NOT NULL CHECK (diameter_cm > 0),
    health_status   measurement_health NOT NULL DEFAULT 'healthy',
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_telemetry_tree ON telemetry_events(tree_id);
CREATE INDEX idx_telemetry_timestamp ON telemetry_events(event_timestamp);

CREATE TABLE carbon_audits (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id   UUID NOT NULL REFERENCES land_parcels(id) ON DELETE CASCADE,
    co2e_kg     NUMERIC(18,4) NOT NULL,
    agb_kg      NUMERIC(18,4) NOT NULL,
    bgb_kg      NUMERIC(18,4) NOT NULL,
    tree_count  INTEGER NOT NULL,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hash        CHAR(64) NOT NULL,
    prev_hash   CHAR(64) NOT NULL DEFAULT ''
);

CREATE INDEX idx_carbon_audits_parcel ON carbon_audits(parcel_id);
CREATE INDEX idx_carbon_audits_computed ON carbon_audits(computed_at DESC);
