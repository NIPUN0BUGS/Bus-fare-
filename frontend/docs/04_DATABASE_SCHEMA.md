# BusLanka — Database Schema

**Version:** 1.0  
**Date:** 2026-07-30  
**Database:** PostgreSQL 15+ with PostGIS 3.x  
**Convention:** snake_case table and column names; `id` columns are UUID v4; all timestamps in UTC.

---

## 1. Schema Conventions

```sql
-- Every table has these columns unless noted:
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
deleted_at  TIMESTAMPTZ          -- soft delete; NULL = active

-- Soft-delete view pattern (example):
CREATE VIEW active_routes AS SELECT * FROM routes WHERE deleted_at IS NULL;
```

---

## 2. Identity and Authentication

### users

```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone           VARCHAR(20)  UNIQUE,
  email           VARCHAR(320) UNIQUE,
  email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  phone_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  password_hash   VARCHAR(255),            -- NULL for social-only accounts
  role            user_role NOT NULL DEFAULT 'PASSENGER',
  status          user_status NOT NULL DEFAULT 'ACTIVE',
  locale          CHAR(2) NOT NULL DEFAULT 'en', -- 'en' | 'si' | 'ta'
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE TYPE user_role AS ENUM (
  'PASSENGER', 'OPERATOR_ADMIN', 'OPERATOR_USER',
  'CONDUCTOR', 'DRIVER', 'PLATFORM_ADMIN', 'PLATFORM_SUPERADMIN'
);

CREATE TYPE user_status AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION', 'DELETED');
```

### social_accounts

```sql
CREATE TABLE social_accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider    VARCHAR(32) NOT NULL,     -- 'GOOGLE' | 'APPLE'
  provider_id VARCHAR(255) NOT NULL,
  email       VARCHAR(320),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_id)
);
```

### otp_codes

```sql
CREATE TABLE otp_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  channel     VARCHAR(16) NOT NULL,     -- 'SMS' | 'EMAIL'
  code_hash   VARCHAR(255) NOT NULL,    -- bcrypt hash of the 6-digit code
  purpose     VARCHAR(32) NOT NULL,     -- 'REGISTER' | 'LOGIN' | 'RESET_PASSWORD'
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### refresh_tokens

```sql
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL UNIQUE,
  device_id   VARCHAR(255),
  user_agent  TEXT,
  ip_address  INET,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### passenger_profiles

```sql
CREATE TABLE passenger_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name    VARCHAR(100),
  nic_number      TEXT,                -- AES-256 encrypted
  date_of_birth   DATE,
  passenger_type  passenger_type NOT NULL DEFAULT 'ADULT',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE passenger_type AS ENUM ('ADULT', 'CHILD', 'STUDENT', 'SENIOR', 'CONCESSION');
```

---

## 3. Operators and Staff

### operators

```sql
CREATE TABLE operators (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(200) NOT NULL,
  name_si             VARCHAR(200),             -- Sinhala name
  name_ta             VARCHAR(200),             -- Tamil name
  ntc_licence_number  VARCHAR(50) UNIQUE,
  registration_number VARCHAR(50),              -- Company/business reg
  contact_email       VARCHAR(320) NOT NULL,
  contact_phone       VARCHAR(20),
  address_text        TEXT,
  service_area        GEOMETRY(MULTIPOLYGON, 4326), -- PostGIS: approved service area
  status              operator_status NOT NULL DEFAULT 'PENDING',
  approved_at         TIMESTAMPTZ,
  approved_by         UUID REFERENCES users(id),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ
);

CREATE TYPE operator_status AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED');
```

### operator_users

```sql
CREATE TABLE operator_users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  operator_id     UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  operator_role   operator_user_role NOT NULL,
  invited_by      UUID REFERENCES users(id),
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, operator_id)
);

CREATE TYPE operator_user_role AS ENUM (
  'OPERATOR_ADMIN', 'ROUTE_MANAGER', 'FARE_MANAGER', 'FLEET_MANAGER', 'FINANCE_MANAGER'
);
```

### drivers

```sql
CREATE TABLE drivers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  operator_id     UUID NOT NULL REFERENCES operators(id),
  licence_number  VARCHAR(50) NOT NULL,
  licence_expiry  DATE,
  status          staff_status NOT NULL DEFAULT 'ACTIVE',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);
```

### conductors

```sql
CREATE TABLE conductors (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  operator_id  UUID NOT NULL REFERENCES operators(id),
  badge_number VARCHAR(50),
  status       staff_status NOT NULL DEFAULT 'ACTIVE',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

CREATE TYPE staff_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
```

---

## 4. Fleet

### vehicle_types

```sql
CREATE TABLE vehicle_types (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  name_si       VARCHAR(100),
  name_ta       VARCHAR(100),
  category      bus_category NOT NULL,
  seat_capacity INT NOT NULL,
  has_ac        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE bus_category AS ENUM (
  'ORDINARY', 'SEMI_LUXURY', 'LUXURY', 'EXPRESSWAY', 'AC',
  'SCHOOL', 'SPECIAL', 'EXPRESS'
);
```

### vehicles

```sql
CREATE TABLE vehicles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id      UUID NOT NULL REFERENCES operators(id),
  vehicle_type_id  UUID NOT NULL REFERENCES vehicle_types(id),
  registration     VARCHAR(20) NOT NULL,          -- e.g. WP-KP-3847
  fleet_id         VARCHAR(50),                   -- operator's internal ID
  year             SMALLINT,
  status           vehicle_status NOT NULL DEFAULT 'ACTIVE',
  gps_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ,
  UNIQUE (operator_id, registration)
);

CREATE TYPE vehicle_status AS ENUM ('ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE', 'RETIRED');
```

---

## 5. Routes, Stops, and Schedules

### districts and provinces (reference data)

```sql
CREATE TABLE provinces (
  id    SMALLINT PRIMARY KEY,
  name  VARCHAR(50) NOT NULL,
  name_si VARCHAR(100),
  name_ta VARCHAR(100)
);

CREATE TABLE districts (
  id           SMALLINT PRIMARY KEY,
  province_id  SMALLINT NOT NULL REFERENCES provinces(id),
  name         VARCHAR(50) NOT NULL,
  name_si      VARCHAR(100),
  name_ta      VARCHAR(100)
);
```

### bus_stops

```sql
CREATE TABLE bus_stops (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stop_code     VARCHAR(20) UNIQUE,               -- e.g. CMB-FORT-01
  name          VARCHAR(200) NOT NULL,
  name_si       VARCHAR(200),
  name_ta       VARCHAR(200),
  district_id   SMALLINT REFERENCES districts(id),
  geom          GEOMETRY(POINT, 4326) NOT NULL,    -- PostGIS point
  address_text  TEXT,
  is_terminus   BOOLEAN NOT NULL DEFAULT FALSE,
  has_shelter   BOOLEAN NOT NULL DEFAULT FALSE,
  wheelchair_accessible BOOLEAN NOT NULL DEFAULT FALSE,
  status        stop_status NOT NULL DEFAULT 'ACTIVE',
  added_by_operator_id UUID REFERENCES operators(id), -- NULL = platform-managed
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_bus_stops_geom ON bus_stops USING GIST(geom);

CREATE TYPE stop_status AS ENUM ('ACTIVE', 'INACTIVE', 'UNDER_REVIEW');
```

### stop_aliases (for search normalisation)

```sql
CREATE TABLE stop_aliases (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stop_id   UUID NOT NULL REFERENCES bus_stops(id) ON DELETE CASCADE,
  alias     VARCHAR(300) NOT NULL,
  locale    CHAR(2),     -- NULL = all locales
  UNIQUE (stop_id, alias)
);
```

### routes

```sql
CREATE TABLE routes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id     UUID NOT NULL REFERENCES operators(id),
  route_number    VARCHAR(20) NOT NULL,
  name            VARCHAR(300) NOT NULL,
  name_si         VARCHAR(300),
  name_ta         VARCHAR(300),
  origin_stop_id  UUID NOT NULL REFERENCES bus_stops(id),
  dest_stop_id    UUID NOT NULL REFERENCES bus_stops(id),
  bus_category    bus_category NOT NULL,
  district_from   SMALLINT REFERENCES districts(id),
  district_to     SMALLINT REFERENCES districts(id),
  path            GEOMETRY(LINESTRING, 4326),  -- route geometry
  status          route_status NOT NULL DEFAULT 'DRAFT',
  approved_at     TIMESTAMPTZ,
  approved_by     UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_routes_path ON routes USING GIST(path);
CREATE TYPE route_status AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');
```

### route_directions

```sql
CREATE TABLE route_directions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id    UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  direction   SMALLINT NOT NULL CHECK (direction IN (0, 1)), -- 0=outbound, 1=inbound
  name        VARCHAR(200),           -- e.g. "Colombo → Kandy"
  path        GEOMETRY(LINESTRING, 4326),
  UNIQUE (route_id, direction)
);
```

### route_stops

```sql
CREATE TABLE route_stops (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id              UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  direction             SMALLINT NOT NULL CHECK (direction IN (0, 1)),
  stop_id               UUID NOT NULL REFERENCES bus_stops(id),
  sequence              INT NOT NULL,       -- 1-based stop order
  fare_stage_number     SMALLINT,           -- which fare stage this stop belongs to
  is_boarding_point     BOOLEAN NOT NULL DEFAULT TRUE,
  is_alighting_point    BOOLEAN NOT NULL DEFAULT TRUE,
  distance_from_origin  NUMERIC(8,3),       -- km from first stop
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (route_id, direction, sequence)
);
```

### fare_stages

```sql
CREATE TABLE fare_stages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id      UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  stage_number  SMALLINT NOT NULL,
  name          VARCHAR(200) NOT NULL,
  name_si       VARCHAR(200),
  name_ta       VARCHAR(200),
  stop_id       UUID NOT NULL REFERENCES bus_stops(id), -- representative stop for this stage
  UNIQUE (route_id, stage_number)
);
```

### fare_rules

```sql
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
);

CREATE TYPE fare_source_type AS ENUM ('NTC_OFFICIAL', 'OPERATOR', 'ESTIMATED', 'UNAVAILABLE');

CREATE INDEX idx_fare_rules_lookup
  ON fare_rules(route_id, bus_category, stage_from, stage_to, passenger_type)
  WHERE effective_to IS NULL OR effective_to > now();
```

### fare_revisions

```sql
CREATE TABLE fare_revisions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_code   VARCHAR(50) UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  effective_date  TIMESTAMPTZ NOT NULL,
  gazette_url     TEXT,
  notes           TEXT,
  published_by    UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### schedules

```sql
CREATE TABLE schedules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id        UUID NOT NULL REFERENCES routes(id),
  direction       SMALLINT NOT NULL CHECK (direction IN (0, 1)),
  name            VARCHAR(200),
  valid_from      DATE NOT NULL,
  valid_to        DATE,
  days_of_week    SMALLINT[] NOT NULL, -- [1,2,3,4,5] = Mon-Fri (ISO: 1=Mon)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### trips

```sql
CREATE TABLE trips (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id     UUID NOT NULL REFERENCES schedules(id),
  route_id        UUID NOT NULL REFERENCES routes(id),
  direction       SMALLINT NOT NULL CHECK (direction IN (0, 1)),
  vehicle_id      UUID REFERENCES vehicles(id),
  driver_id       UUID REFERENCES drivers(id),
  conductor_id    UUID REFERENCES conductors(id),
  departure_time  TIME NOT NULL,              -- scheduled departure at origin
  arrival_time    TIME NOT NULL,              -- scheduled arrival at destination
  status          trip_status NOT NULL DEFAULT 'SCHEDULED',
  actual_start    TIMESTAMPTZ,
  actual_end      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE trip_status AS ENUM (
  'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED',
  'CANCELLED', 'BREAKDOWN', 'DIVERTED'
);
```

### trip_stop_times

```sql
CREATE TABLE trip_stop_times (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id         UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  route_stop_id   UUID NOT NULL REFERENCES route_stops(id),
  sequence        INT NOT NULL,
  scheduled_arrive TIME,
  scheduled_depart TIME,
  actual_arrive   TIMESTAMPTZ,
  actual_depart   TIMESTAMPTZ,
  UNIQUE (trip_id, sequence)
);
```

---

## 6. Live Tracking

### vehicle_locations

```sql
CREATE TABLE vehicle_locations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id   UUID NOT NULL REFERENCES vehicles(id),
  trip_id      UUID REFERENCES trips(id),
  lat          DOUBLE PRECISION NOT NULL,
  lng          DOUBLE PRECISION NOT NULL,
  geom         GEOMETRY(POINT, 4326) GENERATED ALWAYS AS
               (ST_SetSRID(ST_MakePoint(lng, lat), 4326)) STORED,
  heading      SMALLINT CHECK (heading BETWEEN 0 AND 359),
  speed_kmh    NUMERIC(6,2),
  occupancy    occupancy_level,
  recorded_at  TIMESTAMPTZ NOT NULL,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_stale     BOOLEAN NOT NULL DEFAULT FALSE
);

-- Partition by recorded_at (monthly) for time-series performance
CREATE INDEX idx_vehicle_locations_vehicle_time
  ON vehicle_locations(vehicle_id, recorded_at DESC);
CREATE INDEX idx_vehicle_locations_geom
  ON vehicle_locations USING GIST(geom);

CREATE TYPE occupancy_level AS ENUM ('EMPTY', 'LOW', 'MEDIUM', 'HIGH', 'FULL');
```

### service_alerts

```sql
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
  affected_stops  UUID[],                     -- array of stop IDs
  starts_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at         TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE alert_type AS ENUM (
  'DELAY', 'CANCELLATION', 'DIVERSION', 'BREAKDOWN',
  'ROUTE_CHANGE', 'FARE_CHANGE', 'SERVICE_DISRUPTION', 'GENERAL'
);
CREATE TYPE alert_severity AS ENUM ('INFO', 'WARNING', 'CRITICAL');
```

---

## 7. Ticketing and Payments

### bookings

```sql
CREATE TABLE bookings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference         VARCHAR(30) NOT NULL UNIQUE,  -- BL-YYYYMMDD-NNNN
  passenger_id      UUID NOT NULL REFERENCES users(id),
  trip_id           UUID NOT NULL REFERENCES trips(id),
  from_stop_id      UUID NOT NULL REFERENCES bus_stops(id),
  to_stop_id        UUID NOT NULL REFERENCES bus_stops(id),
  passenger_type    passenger_type NOT NULL,
  bus_category      bus_category NOT NULL,
  seat_number       VARCHAR(10),
  fare_amount       NUMERIC(10,2) NOT NULL,
  fare_currency     CHAR(3) NOT NULL DEFAULT 'LKR',
  fare_rule_id      UUID REFERENCES fare_rules(id),
  status            booking_status NOT NULL DEFAULT 'PENDING',
  expires_at        TIMESTAMPTZ,           -- when pending booking auto-cancels
  cancelled_at      TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE booking_status AS ENUM (
  'PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED',
  'REFUND_REQUESTED', 'REFUNDED', 'NO_SHOW'
);
```

### tickets

```sql
CREATE TABLE tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL UNIQUE REFERENCES bookings(id),
  qr_payload      TEXT NOT NULL,        -- signed JWT payload for offline validation
  qr_version      SMALLINT NOT NULL DEFAULT 1,
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_from      TIMESTAMPTZ NOT NULL,
  valid_to        TIMESTAMPTZ NOT NULL,
  validated_at    TIMESTAMPTZ,
  validated_by    UUID REFERENCES conductors(id),  -- conductor who scanned
  validation_mode VARCHAR(20),                     -- 'ONLINE' | 'OFFLINE'
  status          ticket_status NOT NULL DEFAULT 'ISSUED',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE ticket_status AS ENUM ('ISSUED', 'VALIDATED', 'EXPIRED', 'CANCELLED', 'INVALID');
```

### seats (for reservable services)

```sql
CREATE TABLE seats (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id      UUID NOT NULL REFERENCES vehicles(id),
  seat_number     VARCHAR(10) NOT NULL,
  seat_type       VARCHAR(20) NOT NULL DEFAULT 'STANDARD',  -- 'STANDARD' | 'PREMIUM'
  row_number      SMALLINT,
  column_number   SMALLINT,
  is_window       BOOLEAN NOT NULL DEFAULT FALSE,
  accessible      BOOLEAN NOT NULL DEFAULT FALSE,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (vehicle_id, seat_number)
);
```

### seat_reservations

```sql
CREATE TABLE seat_reservations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  trip_id     UUID NOT NULL REFERENCES trips(id),
  seat_id     UUID NOT NULL REFERENCES seats(id),
  locked_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ,
  UNIQUE (trip_id, seat_id)
);
```

### payments

```sql
CREATE TABLE payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          UUID NOT NULL REFERENCES bookings(id),
  amount              NUMERIC(10,2) NOT NULL,
  currency            CHAR(3) NOT NULL DEFAULT 'LKR',
  method              payment_method NOT NULL,
  gateway             VARCHAR(50) NOT NULL,        -- 'PAYHERE' | 'STRIPE' | etc.
  gateway_intent_id   VARCHAR(255) UNIQUE,         -- idempotency key at gateway
  gateway_charge_id   VARCHAR(255),
  status              payment_status NOT NULL DEFAULT 'PENDING',
  failure_reason      TEXT,
  initiated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE payment_method AS ENUM (
  'CARD', 'MOBILE_WALLET', 'BANK_TRANSFER', 'CASH_ON_BOARDING', 'OPERATOR_METHOD'
);
CREATE TYPE payment_status AS ENUM (
  'PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'
);
```

### refunds

```sql
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
);

CREATE TYPE refund_status AS ENUM ('REQUESTED', 'PROCESSING', 'COMPLETED', 'REJECTED');
```

---

## 8. User Features

### saved_routes

```sql
CREATE TABLE saved_routes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  route_id        UUID NOT NULL REFERENCES routes(id),
  from_stop_id    UUID NOT NULL REFERENCES bus_stops(id),
  to_stop_id      UUID NOT NULL REFERENCES bus_stops(id),
  label           VARCHAR(100),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, route_id, from_stop_id, to_stop_id)
);
```

### search_history

```sql
CREATE TABLE search_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,  -- NULL for guest
  session_id      VARCHAR(100),
  from_text       VARCHAR(300),
  to_text         VARCHAR(300),
  from_lat        DOUBLE PRECISION,
  from_lng        DOUBLE PRECISION,
  to_lat          DOUBLE PRECISION,
  to_lng          DOUBLE PRECISION,
  result_count    INT,
  searched_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### notifications

```sql
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            notification_type NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  data            JSONB,                  -- extra payload (route_id, booking_id, etc.)
  channel         VARCHAR(20) NOT NULL,   -- 'PUSH' | 'SMS' | 'IN_APP' | 'EMAIL'
  status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  sent_at         TIMESTAMPTZ,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE notification_type AS ENUM (
  'BUS_APPROACHING', 'DEPARTURE_REMINDER', 'DELAY', 'CANCELLATION',
  'ROUTE_CHANGE', 'FARE_CHANGE', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED',
  'REFUND_INITIATED', 'REFUND_COMPLETED', 'SERVICE_DISRUPTION', 'SYSTEM'
);
```

### notification_preferences

```sql
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
);
```

### complaints

```sql
CREATE TABLE complaints (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference       VARCHAR(30) NOT NULL UNIQUE,
  user_id         UUID NOT NULL REFERENCES users(id),
  operator_id     UUID REFERENCES operators(id),
  route_id        UUID REFERENCES routes(id),
  booking_id      UUID REFERENCES bookings(id),
  category        complaint_category NOT NULL,
  description     TEXT NOT NULL,
  fare_charged    NUMERIC(10,2),
  fare_expected   NUMERIC(10,2),
  evidence_urls   TEXT[],
  status          complaint_status NOT NULL DEFAULT 'OPEN',
  resolved_at     TIMESTAMPTZ,
  resolution_note TEXT,
  handled_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE complaint_category AS ENUM (
  'INCORRECT_FARE', 'BUS_LATE', 'UNSAFE_DRIVING', 'CONDUCTOR_BEHAVIOR',
  'TICKETING_ISSUE', 'APP_ERROR', 'OTHER'
);
CREATE TYPE complaint_status AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REFERRED', 'CLOSED');
```

---

## 9. Security and Audit

### api_credentials

```sql
CREATE TABLE api_credentials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id     UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  key_hash        VARCHAR(255) NOT NULL UNIQUE,  -- SHA-256 of the raw key
  label           VARCHAR(100),
  scopes          TEXT[] NOT NULL DEFAULT '{}',  -- ['gps:write', 'fare:write', etc.]
  last_used_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  revoked_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### audit_logs

```sql
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES users(id),
  actor_role  user_role,
  action      VARCHAR(100) NOT NULL,       -- e.g. 'FARE_RULE_UPDATED'
  resource    VARCHAR(100) NOT NULL,       -- e.g. 'fare_rules'
  resource_id UUID,
  old_value   JSONB,
  new_value   JSONB,
  ip_address  INET,
  user_agent  TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit logs are append-only; no UPDATE or DELETE granted in application role
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id, occurred_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource, resource_id, occurred_at DESC);
```

### integration_events

```sql
CREATE TABLE integration_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id     UUID NOT NULL REFERENCES operators(id),
  event_type      VARCHAR(100) NOT NULL,
  payload         JSONB NOT NULL,
  source_ip       INET,
  status          VARCHAR(20) NOT NULL DEFAULT 'RECEIVED',
  processed_at    TIMESTAMPTZ,
  error_message   TEXT,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 10. Indexes Summary

```sql
-- Geospatial
CREATE INDEX idx_bus_stops_geom        ON bus_stops USING GIST(geom);
CREATE INDEX idx_routes_path           ON routes USING GIST(path);
CREATE INDEX idx_vehicle_locations_geom ON vehicle_locations USING GIST(geom);
CREATE INDEX idx_operators_service_area ON operators USING GIST(service_area);

-- Search
CREATE INDEX idx_routes_operator       ON routes(operator_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_routes_status         ON routes(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_trips_route_date      ON trips(route_id, departure_time);
CREATE INDEX idx_bookings_passenger    ON bookings(passenger_id, created_at DESC);
CREATE INDEX idx_bookings_trip         ON bookings(trip_id);
CREATE INDEX idx_notifications_user    ON notifications(user_id, created_at DESC);

-- Full text search for stops
CREATE INDEX idx_bus_stops_name_fts    ON bus_stops
  USING GIN(to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(name_si,'') || ' ' || coalesce(name_ta,'')));
```

---

## 11. Entity-Relationship Summary

```
users ──────────────────────────── passenger_profiles
  │                                 saved_routes
  │                                 search_history
  │                                 notifications
  │                                 notification_preferences
  │                                 complaints
  │
  ├── operator_users ────────────── operators
  │                                   │
  │                                   ├── vehicles ───── vehicle_types
  │                                   │       │
  │                                   │       └── seats
  │                                   │
  │                                   ├── routes ──────── bus_stops (via route_stops)
  │                                   │       │
  │                                   │       ├── fare_stages
  │                                   │       ├── fare_rules ──── fare_revisions
  │                                   │       ├── schedules
  │                                   │       │       └── trips ──── trip_stop_times
  │                                   │       │               │
  │                                   │       │               └── service_alerts
  │                                   │       └── route_directions
  │                                   │
  │                                   └── api_credentials
  │
  ├── drivers ──────────────────── (operator_id)
  ├── conductors ──────────────── (operator_id)
  │
  └── bookings ────────────────── trips, bus_stops (from/to)
          │
          ├── tickets
          ├── seat_reservations ── seats
          └── payments
                  └── refunds
```
