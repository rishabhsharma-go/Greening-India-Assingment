CREATE EXTENSION IF NOT EXISTS postgis;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'soil_type') THEN
        CREATE TYPE soil_type AS ENUM ('alluvial', 'black', 'red', 'laterite', 'arid');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
        CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'flagged');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tree_health') THEN
        CREATE TYPE tree_health AS ENUM ('alive', 'dead', 'damaged');
    END IF;
END $$;

CREATE TABLE species (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name              VARCHAR(255) NOT NULL UNIQUE,
    wood_density_rho  NUMERIC(6,4) NOT NULL,
    agb_coefficient_a NUMERIC(10,6) NOT NULL,
    agb_coefficient_b NUMERIC(10,6) NOT NULL
);

CREATE TABLE land_parcels (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id          UUID REFERENCES projects(id) ON DELETE SET NULL,
    polygon             GEOMETRY(MULTIPOLYGON, 4326) NOT NULL,
    soil_type           soil_type NOT NULL DEFAULT 'alluvial',
    asi_score           NUMERIC(5,2),
    verification_status verification_status NOT NULL DEFAULT 'pending',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_land_parcels_polygon ON land_parcels USING GIST(polygon);
CREATE INDEX idx_land_parcels_owner ON land_parcels(owner_id);
CREATE INDEX idx_land_parcels_project ON land_parcels(project_id);

CREATE TABLE tree_instances (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id     UUID NOT NULL REFERENCES land_parcels(id) ON DELETE CASCADE,
    species_id    UUID NOT NULL REFERENCES species(id),
    gps_point     GEOMETRY(POINT, 4326) NOT NULL,
    planting_date DATE NOT NULL,
    status        tree_health NOT NULL DEFAULT 'alive',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tree_instances_parcel ON tree_instances(parcel_id);
CREATE INDEX idx_tree_instances_gps ON tree_instances USING GIST(gps_point);
