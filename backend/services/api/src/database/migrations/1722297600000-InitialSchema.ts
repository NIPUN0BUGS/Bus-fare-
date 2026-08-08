import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1722297600000 implements MigrationInterface {
  name = 'InitialSchema1722297600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // ── Extensions ──────────────────────────────────────────────────────────
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "postgis"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);

    // ── Enums ────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE user_role AS ENUM (
        'PASSENGER','OPERATOR_ADMIN','OPERATOR_USER',
        'CONDUCTOR','DRIVER','PLATFORM_ADMIN','PLATFORM_SUPERADMIN'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE user_status AS ENUM ('ACTIVE','SUSPENDED','PENDING_VERIFICATION','DELETED')
    `);
    await queryRunner.query(`
      CREATE TYPE passenger_type AS ENUM ('ADULT','CHILD','STUDENT','SENIOR','CONCESSION')
    `);
    await queryRunner.query(`
      CREATE TYPE operator_status AS ENUM ('PENDING','ACTIVE','SUSPENDED','REJECTED')
    `);
    await queryRunner.query(`
      CREATE TYPE operator_user_role AS ENUM (
        'OPERATOR_ADMIN','ROUTE_MANAGER','FARE_MANAGER','FLEET_MANAGER','FINANCE_MANAGER'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE staff_status AS ENUM ('ACTIVE','INACTIVE','SUSPENDED')
    `);
    await queryRunner.query(`
      CREATE TYPE bus_category AS ENUM (
        'ORDINARY','SEMI_LUXURY','LUXURY','EXPRESSWAY','AC','SCHOOL','SPECIAL','EXPRESS'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE vehicle_status AS ENUM ('ACTIVE','INACTIVE','UNDER_MAINTENANCE','RETIRED')
    `);
    await queryRunner.query(`
      CREATE TYPE route_status AS ENUM ('DRAFT','PENDING_APPROVAL','ACTIVE','SUSPENDED','ARCHIVED')
    `);
    await queryRunner.query(`
      CREATE TYPE stop_status AS ENUM ('ACTIVE','INACTIVE','UNDER_REVIEW')
    `);
    await queryRunner.query(`
      CREATE TYPE fare_source_type AS ENUM ('NTC_OFFICIAL','OPERATOR','ESTIMATED','UNAVAILABLE')
    `);
    await queryRunner.query(`
      CREATE TYPE trip_status AS ENUM (
        'SCHEDULED','IN_PROGRESS','COMPLETED','DELAYED','CANCELLED','BREAKDOWN','DIVERTED'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE occupancy_level AS ENUM ('EMPTY','LOW','MEDIUM','HIGH','FULL')
    `);
    await queryRunner.query(`
      CREATE TYPE alert_type AS ENUM (
        'DELAY','CANCELLATION','DIVERSION','BREAKDOWN',
        'ROUTE_CHANGE','FARE_CHANGE','SERVICE_DISRUPTION','GENERAL'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE alert_severity AS ENUM ('INFO','WARNING','CRITICAL')
    `);
    await queryRunner.query(`
      CREATE TYPE booking_status AS ENUM (
        'PENDING','CONFIRMED','CANCELLED','EXPIRED',
        'REFUND_REQUESTED','REFUNDED','NO_SHOW'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE ticket_status AS ENUM ('ISSUED','VALIDATED','EXPIRED','CANCELLED','INVALID')
    `);
    await queryRunner.query(`
      CREATE TYPE payment_method AS ENUM (
        'CARD','MOBILE_WALLET','BANK_TRANSFER','CASH_ON_BOARDING','OPERATOR_METHOD'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE payment_status AS ENUM (
        'PENDING','PROCESSING','SUCCEEDED','FAILED','REFUNDED','PARTIALLY_REFUNDED'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE refund_status AS ENUM ('REQUESTED','PROCESSING','COMPLETED','REJECTED')
    `);
    await queryRunner.query(`
      CREATE TYPE notification_type AS ENUM (
        'BUS_APPROACHING','DEPARTURE_REMINDER','DELAY','CANCELLATION',
        'ROUTE_CHANGE','FARE_CHANGE','BOOKING_CONFIRMED','BOOKING_CANCELLED',
        'REFUND_INITIATED','REFUND_COMPLETED','SERVICE_DISRUPTION','SYSTEM'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE complaint_category AS ENUM (
        'INCORRECT_FARE','BUS_LATE','UNSAFE_DRIVING','CONDUCTOR_BEHAVIOR',
        'TICKETING_ISSUE','APP_ERROR','OTHER'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE complaint_status AS ENUM ('OPEN','UNDER_REVIEW','RESOLVED','REFERRED','CLOSED')
    `);

    // ── Reference tables ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE provinces (
        id       SMALLINT PRIMARY KEY,
        name     VARCHAR(50) NOT NULL,
        name_si  VARCHAR(100),
        name_ta  VARCHAR(100)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE districts (
        id           SMALLINT PRIMARY KEY,
        province_id  SMALLINT NOT NULL REFERENCES provinces(id),
        name         VARCHAR(50) NOT NULL,
        name_si      VARCHAR(100),
        name_ta      VARCHAR(100)
      )
    `);

    // ── Users ────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE users (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone            VARCHAR(20)  UNIQUE,
        email            VARCHAR(320) UNIQUE,
        email_verified   BOOLEAN NOT NULL DEFAULT FALSE,
        phone_verified   BOOLEAN NOT NULL DEFAULT FALSE,
        password_hash    VARCHAR(255),
        role             user_role NOT NULL DEFAULT 'PASSENGER',
        status           user_status NOT NULL DEFAULT 'PENDING_VERIFICATION',
        locale           CHAR(2) NOT NULL DEFAULT 'en',
        last_login_at    TIMESTAMPTZ,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at       TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE TABLE social_accounts (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider     VARCHAR(32) NOT NULL,
        provider_id  VARCHAR(255) NOT NULL,
        email        VARCHAR(320),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (provider, provider_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE otp_codes (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
        channel     VARCHAR(16) NOT NULL,
        code_hash   VARCHAR(255) NOT NULL,
        purpose     VARCHAR(32) NOT NULL,
        expires_at  TIMESTAMPTZ NOT NULL,
        used_at     TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE refresh_tokens (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash   VARCHAR(255) NOT NULL UNIQUE,
        device_id    VARCHAR(255),
        user_agent   TEXT,
        ip_address   INET,
        expires_at   TIMESTAMPTZ NOT NULL,
        revoked_at   TIMESTAMPTZ,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE passenger_profiles (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        display_name    VARCHAR(100),
        date_of_birth   DATE,
        passenger_type  passenger_type NOT NULL DEFAULT 'ADULT',
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // ── Operators ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE operators (
        id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name                 VARCHAR(200) NOT NULL,
        name_si              VARCHAR(200),
        name_ta              VARCHAR(200),
        ntc_licence_number   VARCHAR(50) UNIQUE,
        registration_number  VARCHAR(50),
        contact_email        VARCHAR(320) NOT NULL,
        contact_phone        VARCHAR(20),
        address_text         TEXT,
        service_area         GEOMETRY(MULTIPOLYGON, 4326),
        status               operator_status NOT NULL DEFAULT 'PENDING',
        approved_at          TIMESTAMPTZ,
        approved_by          UUID REFERENCES users(id),
        notes                TEXT,
        created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at           TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE TABLE operator_users (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        operator_id    UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
        operator_role  operator_user_role NOT NULL,
        invited_by     UUID REFERENCES users(id),
        active         BOOLEAN NOT NULL DEFAULT TRUE,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (user_id, operator_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE drivers (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id          UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        operator_id      UUID NOT NULL REFERENCES operators(id),
        licence_number   VARCHAR(50) NOT NULL,
        licence_expiry   DATE,
        status           staff_status NOT NULL DEFAULT 'ACTIVE',
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at       TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE TABLE conductors (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        operator_id   UUID NOT NULL REFERENCES operators(id),
        badge_number  VARCHAR(50),
        status        staff_status NOT NULL DEFAULT 'ACTIVE',
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at    TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE TABLE api_credentials (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        operator_id   UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
        key_hash      VARCHAR(255) NOT NULL UNIQUE,
        label         VARCHAR(100),
        scopes        TEXT[] NOT NULL DEFAULT '{}',
        last_used_at  TIMESTAMPTZ,
        expires_at    TIMESTAMPTZ,
        revoked_at    TIMESTAMPTZ,
        created_by    UUID REFERENCES users(id),
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // ── Fleet ────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE vehicle_types (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name           VARCHAR(100) NOT NULL,
        name_si        VARCHAR(100),
        name_ta        VARCHAR(100),
        category       bus_category NOT NULL,
        seat_capacity  INT NOT NULL,
        has_ac         BOOLEAN NOT NULL DEFAULT FALSE,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE vehicles (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        operator_id       UUID NOT NULL REFERENCES operators(id),
        vehicle_type_id   UUID NOT NULL REFERENCES vehicle_types(id),
        registration      VARCHAR(20) NOT NULL,
        fleet_id          VARCHAR(50),
        year              SMALLINT,
        status            vehicle_status NOT NULL DEFAULT 'ACTIVE',
        gps_enabled       BOOLEAN NOT NULL DEFAULT FALSE,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at        TIMESTAMPTZ,
        UNIQUE (operator_id, registration)
      )
    `);

    // ── Stops and Routes ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE bus_stops (
        id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        stop_code               VARCHAR(20) UNIQUE,
        name                    VARCHAR(200) NOT NULL,
        name_si                 VARCHAR(200),
        name_ta                 VARCHAR(200),
        district_id             SMALLINT REFERENCES districts(id),
        lat                     DOUBLE PRECISION NOT NULL,
        lng                     DOUBLE PRECISION NOT NULL,
        geom                    GEOMETRY(POINT, 4326)
                                  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)) STORED,
        address_text            TEXT,
        is_terminus             BOOLEAN NOT NULL DEFAULT FALSE,
        has_shelter             BOOLEAN NOT NULL DEFAULT FALSE,
        wheelchair_accessible   BOOLEAN NOT NULL DEFAULT FALSE,
        status                  stop_status NOT NULL DEFAULT 'ACTIVE',
        added_by_operator_id    UUID REFERENCES operators(id),
        created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at              TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_bus_stops_geom ON bus_stops USING GIST(geom)`);
    await queryRunner.query(`
      CREATE INDEX idx_bus_stops_fts ON bus_stops
        USING GIN(to_tsvector('simple',
          coalesce(name,'') || ' ' || coalesce(name_si,'') || ' ' || coalesce(name_ta,'')
        ))
    `);

    await queryRunner.query(`
      CREATE TABLE stop_aliases (
        id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        stop_id  UUID NOT NULL REFERENCES bus_stops(id) ON DELETE CASCADE,
        alias    VARCHAR(300) NOT NULL,
        locale   CHAR(2),
        UNIQUE (stop_id, alias)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE routes (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        operator_id      UUID NOT NULL REFERENCES operators(id),
        route_number     VARCHAR(20) NOT NULL,
        name             VARCHAR(300) NOT NULL,
        name_si          VARCHAR(300),
        name_ta          VARCHAR(300),
        origin_stop_id   UUID NOT NULL REFERENCES bus_stops(id),
        dest_stop_id     UUID NOT NULL REFERENCES bus_stops(id),
        bus_category     bus_category NOT NULL,
        district_from    SMALLINT REFERENCES districts(id),
        district_to      SMALLINT REFERENCES districts(id),
        path             GEOMETRY(LINESTRING, 4326),
        status           route_status NOT NULL DEFAULT 'DRAFT',
        approved_at      TIMESTAMPTZ,
        approved_by      UUID REFERENCES users(id),
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at       TIMESTAMPTZ
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_routes_path ON routes USING GIST(path)`);
    await queryRunner.query(`CREATE INDEX idx_routes_operator ON routes(operator_id) WHERE deleted_at IS NULL`);

    await queryRunner.query(`
      CREATE TABLE route_directions (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        route_id   UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
        direction  SMALLINT NOT NULL CHECK (direction IN (0,1)),
        name       VARCHAR(200),
        path       GEOMETRY(LINESTRING, 4326),
        UNIQUE (route_id, direction)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE route_stops (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        route_id              UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
        direction             SMALLINT NOT NULL CHECK (direction IN (0,1)),
        stop_id               UUID NOT NULL REFERENCES bus_stops(id),
        sequence              INT NOT NULL,
        fare_stage_number     SMALLINT,
        is_boarding_point     BOOLEAN NOT NULL DEFAULT TRUE,
        is_alighting_point    BOOLEAN NOT NULL DEFAULT TRUE,
        distance_from_origin  NUMERIC(8,3),
        created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (route_id, direction, sequence)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_route_stops_lookup ON route_stops(route_id, stop_id)`);

    await queryRunner.query(`
      CREATE TABLE fare_stages (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        route_id      UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
        stage_number  SMALLINT NOT NULL,
        name          VARCHAR(200) NOT NULL,
        name_si       VARCHAR(200),
        name_ta       VARCHAR(200),
        stop_id       UUID NOT NULL REFERENCES bus_stops(id),
        UNIQUE (route_id, stage_number)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE fare_revisions (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        revision_code   VARCHAR(50) UNIQUE NOT NULL,
        title           TEXT NOT NULL,
        effective_date  TIMESTAMPTZ NOT NULL,
        gazette_url     TEXT,
        notes           TEXT,
        published_by    UUID REFERENCES users(id),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE fare_rules (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        route_id          UUID NOT NULL REFERENCES routes(id),
        operator_id       UUID NOT NULL REFERENCES operators(id),
        bus_category      bus_category NOT NULL,
        stage_from        SMALLINT NOT NULL,
        stage_to          SMALLINT NOT NULL,
        passenger_type    passenger_type NOT NULL,
        base_fare         NUMERIC(10,2) NOT NULL,
        currency          CHAR(3) NOT NULL DEFAULT 'LKR',
        effective_from    TIMESTAMPTZ NOT NULL,
        effective_to      TIMESTAMPTZ,
        source_type       fare_source_type NOT NULL DEFAULT 'OPERATOR',
        ntc_revision_id   UUID REFERENCES fare_revisions(id),
        submitted_by      UUID REFERENCES users(id),
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_fare_rules_lookup
        ON fare_rules(route_id, bus_category, stage_from, stage_to, passenger_type)
    `);

    // ── Schedules and Trips ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE schedules (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        route_id      UUID NOT NULL REFERENCES routes(id),
        direction     SMALLINT NOT NULL CHECK (direction IN (0,1)),
        name          VARCHAR(200),
        valid_from    DATE NOT NULL,
        valid_to      DATE,
        days_of_week  SMALLINT[] NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE trips (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        schedule_id     UUID NOT NULL REFERENCES schedules(id),
        route_id        UUID NOT NULL REFERENCES routes(id),
        direction       SMALLINT NOT NULL CHECK (direction IN (0,1)),
        vehicle_id      UUID REFERENCES vehicles(id),
        driver_id       UUID REFERENCES drivers(id),
        conductor_id    UUID REFERENCES conductors(id),
        departure_time  TIME NOT NULL,
        arrival_time    TIME NOT NULL,
        status          trip_status NOT NULL DEFAULT 'SCHEDULED',
        actual_start    TIMESTAMPTZ,
        actual_end      TIMESTAMPTZ,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_trips_route_date ON trips(route_id, departure_time)`);

    await queryRunner.query(`
      CREATE TABLE trip_stop_times (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        trip_id           UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        route_stop_id     UUID NOT NULL REFERENCES route_stops(id),
        sequence          INT NOT NULL,
        scheduled_arrive  TIME,
        scheduled_depart  TIME,
        actual_arrive     TIMESTAMPTZ,
        actual_depart     TIMESTAMPTZ,
        UNIQUE (trip_id, sequence)
      )
    `);

    // ── Tracking ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE vehicle_locations (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vehicle_id   UUID NOT NULL REFERENCES vehicles(id),
        trip_id      UUID REFERENCES trips(id),
        lat          DOUBLE PRECISION NOT NULL,
        lng          DOUBLE PRECISION NOT NULL,
        geom         GEOMETRY(POINT, 4326)
                       GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)) STORED,
        heading      SMALLINT CHECK (heading BETWEEN 0 AND 359),
        speed_kmh    NUMERIC(6,2),
        occupancy    occupancy_level,
        recorded_at  TIMESTAMPTZ NOT NULL,
        received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        is_stale     BOOLEAN NOT NULL DEFAULT FALSE
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_vehicle_loc_vehicle_time ON vehicle_locations(vehicle_id, recorded_at DESC)`);
    await queryRunner.query(`CREATE INDEX idx_vehicle_loc_geom ON vehicle_locations USING GIST(geom)`);

    await queryRunner.query(`
      CREATE TABLE service_alerts (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        operator_id     UUID REFERENCES operators(id),
        route_id        UUID REFERENCES routes(id),
        trip_id         UUID REFERENCES trips(id),
        vehicle_id      UUID REFERENCES vehicles(id),
        alert_type      alert_type NOT NULL,
        severity        alert_severity NOT NULL DEFAULT 'INFO',
        title           TEXT NOT NULL,
        title_si        TEXT,
        title_ta        TEXT,
        description     TEXT,
        affected_stops  UUID[],
        starts_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        ends_at         TIMESTAMPTZ,
        created_by      UUID REFERENCES users(id),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // ── Ticketing ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE seats (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vehicle_id    UUID NOT NULL REFERENCES vehicles(id),
        seat_number   VARCHAR(10) NOT NULL,
        seat_type     VARCHAR(20) NOT NULL DEFAULT 'STANDARD',
        row_number    SMALLINT,
        column_number SMALLINT,
        is_window     BOOLEAN NOT NULL DEFAULT FALSE,
        accessible    BOOLEAN NOT NULL DEFAULT FALSE,
        active        BOOLEAN NOT NULL DEFAULT TRUE,
        UNIQUE (vehicle_id, seat_number)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE bookings (
        id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reference          VARCHAR(30) NOT NULL UNIQUE,
        passenger_id       UUID NOT NULL REFERENCES users(id),
        trip_id            UUID NOT NULL REFERENCES trips(id),
        from_stop_id       UUID NOT NULL REFERENCES bus_stops(id),
        to_stop_id         UUID NOT NULL REFERENCES bus_stops(id),
        passenger_type     passenger_type NOT NULL,
        bus_category       bus_category NOT NULL,
        seat_number        VARCHAR(10),
        fare_amount        NUMERIC(10,2) NOT NULL,
        fare_currency      CHAR(3) NOT NULL DEFAULT 'LKR',
        fare_rule_id       UUID REFERENCES fare_rules(id),
        status             booking_status NOT NULL DEFAULT 'PENDING',
        expires_at         TIMESTAMPTZ,
        cancelled_at       TIMESTAMPTZ,
        cancellation_reason TEXT,
        created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_bookings_passenger ON bookings(passenger_id, created_at DESC)`);
    await queryRunner.query(`CREATE INDEX idx_bookings_trip ON bookings(trip_id)`);

    await queryRunner.query(`
      CREATE TABLE tickets (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id       UUID NOT NULL UNIQUE REFERENCES bookings(id),
        qr_payload       TEXT NOT NULL,
        qr_version       SMALLINT NOT NULL DEFAULT 1,
        issued_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        valid_from       TIMESTAMPTZ NOT NULL,
        valid_to         TIMESTAMPTZ NOT NULL,
        validated_at     TIMESTAMPTZ,
        validated_by     UUID REFERENCES conductors(id),
        validation_mode  VARCHAR(20),
        status           ticket_status NOT NULL DEFAULT 'ISSUED',
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE seat_reservations (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id   UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
        trip_id      UUID NOT NULL REFERENCES trips(id),
        seat_id      UUID NOT NULL REFERENCES seats(id),
        locked_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        released_at  TIMESTAMPTZ,
        UNIQUE (trip_id, seat_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE payments (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id          UUID NOT NULL REFERENCES bookings(id),
        amount              NUMERIC(10,2) NOT NULL,
        currency            CHAR(3) NOT NULL DEFAULT 'LKR',
        method              payment_method NOT NULL,
        gateway             VARCHAR(50) NOT NULL,
        gateway_intent_id   VARCHAR(255) UNIQUE,
        gateway_charge_id   VARCHAR(255),
        status              payment_status NOT NULL DEFAULT 'PENDING',
        failure_reason      TEXT,
        initiated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        completed_at        TIMESTAMPTZ,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE refunds (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payment_id        UUID NOT NULL REFERENCES payments(id),
        booking_id        UUID NOT NULL REFERENCES bookings(id),
        amount            NUMERIC(10,2) NOT NULL,
        currency          CHAR(3) NOT NULL DEFAULT 'LKR',
        reason            TEXT NOT NULL,
        gateway_refund_id VARCHAR(255),
        status            refund_status NOT NULL DEFAULT 'REQUESTED',
        requested_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        processed_at      TIMESTAMPTZ,
        processed_by      UUID REFERENCES users(id),
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // ── User Features ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE saved_routes (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        route_id      UUID NOT NULL REFERENCES routes(id),
        from_stop_id  UUID NOT NULL REFERENCES bus_stops(id),
        to_stop_id    UUID NOT NULL REFERENCES bus_stops(id),
        label         VARCHAR(100),
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (user_id, route_id, from_stop_id, to_stop_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE search_history (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
        session_id    VARCHAR(100),
        from_text     VARCHAR(300),
        to_text       VARCHAR(300),
        from_lat      DOUBLE PRECISION,
        from_lng      DOUBLE PRECISION,
        to_lat        DOUBLE PRECISION,
        to_lng        DOUBLE PRECISION,
        result_count  INT,
        searched_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE notifications (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type        notification_type NOT NULL,
        title       TEXT NOT NULL,
        body        TEXT NOT NULL,
        data        JSONB,
        channel     VARCHAR(20) NOT NULL,
        status      VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        sent_at     TIMESTAMPTZ,
        read_at     TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC)`);

    await queryRunner.query(`
      CREATE TABLE notification_preferences (
        user_id                UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        bus_approaching        BOOLEAN NOT NULL DEFAULT TRUE,
        departure_reminder     BOOLEAN NOT NULL DEFAULT TRUE,
        delays                 BOOLEAN NOT NULL DEFAULT TRUE,
        cancellations          BOOLEAN NOT NULL DEFAULT TRUE,
        fare_changes           BOOLEAN NOT NULL DEFAULT TRUE,
        booking_updates        BOOLEAN NOT NULL DEFAULT TRUE,
        service_disruptions    BOOLEAN NOT NULL DEFAULT TRUE,
        channel_push           BOOLEAN NOT NULL DEFAULT TRUE,
        channel_sms            BOOLEAN NOT NULL DEFAULT FALSE,
        channel_email          BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE complaints (
        id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reference          VARCHAR(30) NOT NULL UNIQUE,
        user_id            UUID NOT NULL REFERENCES users(id),
        operator_id        UUID REFERENCES operators(id),
        route_id           UUID REFERENCES routes(id),
        booking_id         UUID REFERENCES bookings(id),
        category           complaint_category NOT NULL,
        description        TEXT NOT NULL,
        fare_charged       NUMERIC(10,2),
        fare_expected      NUMERIC(10,2),
        evidence_urls      TEXT[],
        status             complaint_status NOT NULL DEFAULT 'OPEN',
        resolved_at        TIMESTAMPTZ,
        resolution_note    TEXT,
        handled_by         UUID REFERENCES users(id),
        created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // ── Audit and Integration ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_id     UUID REFERENCES users(id),
        actor_role   user_role,
        action       VARCHAR(100) NOT NULL,
        resource     VARCHAR(100) NOT NULL,
        resource_id  UUID,
        old_value    JSONB,
        new_value    JSONB,
        ip_address   INET,
        user_agent   TEXT,
        occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_audit_actor ON audit_logs(actor_id, occurred_at DESC)`);
    await queryRunner.query(`CREATE INDEX idx_audit_resource ON audit_logs(resource, resource_id, occurred_at DESC)`);

    await queryRunner.query(`
      CREATE TABLE integration_events (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        operator_id   UUID NOT NULL REFERENCES operators(id),
        event_type    VARCHAR(100) NOT NULL,
        payload       JSONB NOT NULL,
        source_ip     INET,
        status        VARCHAR(20) NOT NULL DEFAULT 'RECEIVED',
        processed_at  TIMESTAMPTZ,
        error_message TEXT,
        received_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'integration_events', 'audit_logs', 'complaints', 'notification_preferences',
      'notifications', 'search_history', 'saved_routes', 'refunds', 'payments',
      'seat_reservations', 'tickets', 'bookings', 'seats', 'service_alerts',
      'vehicle_locations', 'trip_stop_times', 'trips', 'schedules', 'fare_rules',
      'fare_revisions', 'fare_stages', 'route_stops', 'route_directions', 'routes',
      'stop_aliases', 'bus_stops', 'vehicles', 'vehicle_types', 'api_credentials',
      'conductors', 'drivers', 'operator_users', 'operators', 'passenger_profiles',
      'refresh_tokens', 'otp_codes', 'social_accounts', 'users',
      'districts', 'provinces',
    ];

    for (const table of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }

    const enums = [
      'complaint_status', 'complaint_category', 'notification_type', 'refund_status',
      'payment_status', 'payment_method', 'ticket_status', 'booking_status',
      'alert_severity', 'alert_type', 'occupancy_level', 'trip_status',
      'fare_source_type', 'stop_status', 'route_status', 'vehicle_status',
      'bus_category', 'staff_status', 'operator_user_role', 'operator_status',
      'passenger_type', 'user_status', 'user_role',
    ];

    for (const e of enums) {
      await queryRunner.query(`DROP TYPE IF EXISTS ${e}`);
    }
  }
}
