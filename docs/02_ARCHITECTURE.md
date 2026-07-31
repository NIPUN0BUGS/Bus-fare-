# BusLanka — System Architecture

**Version:** 1.0  
**Date:** 2026-07-30

---

## 1. Architecture Overview

BusLanka is a multi-tenant platform serving passengers, operators, conductors, and administrators through distinct interfaces backed by a shared API layer. The architecture is designed to be horizontally scalable, cloud-provider-agnostic, and deployable via containers.

```
┌────────────────────────────────────────────────────────────────────┐
│                          CLIENTS                                    │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  ┌──────────┐ │
│  │  Passenger   │  │  Passenger   │  │  Operator  │  │  Admin   │ │
│  │  Web (PWA)   │  │  Mobile App  │  │   Portal   │  │  Portal  │ │
│  │  (Next.js)   │  │  (Flutter)   │  │  (Next.js) │  │ (Next.js)│ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘  └────┬─────┘ │
│         │                 │                 │               │       │
│  ┌──────┴─────────────────┴─────────────────┴───────────────┴─────┐ │
│  │               Conductor / Driver App (Flutter)                  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┬─────────────┘
                                                       │ HTTPS / WSS
                              ┌────────────────────────┴──────────────┐
                              │          API GATEWAY / CDN             │
                              │  (Rate limiting, TLS termination,      │
                              │   Auth header injection, DDoS shield)  │
                              └───────────────┬───────────────────────┘
                                              │
              ┌───────────────────────────────┼───────────────────────────┐
              │                               │                           │
  ┌───────────▼───────────┐   ┌──────────────▼──────────┐  ┌────────────▼──────────┐
  │   Passenger API       │   │   Operator API           │  │  Admin API             │
  │   (NestJS)            │   │   (NestJS)               │  │  (NestJS)              │
  │   REST + WebSocket    │   │   REST + WebSocket        │  │  REST                  │
  └───────────┬───────────┘   └──────────────┬──────────┘  └────────────┬──────────┘
              │                               │                           │
              └──────────────────┬────────────┘                          │
                                 │                                        │
                    ┌────────────▼────────────────────────────────────────▼──────────┐
                    │                    CORE SERVICES LAYER                          │
                    │                                                                  │
                    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
                    │  │   Route &    │  │   Fare       │  │  Tracking Service    │  │
                    │  │   Search     │  │   Engine     │  │  (GPS ingest/fan-out)│  │
                    │  │   Service    │  │              │  │                      │  │
                    │  └──────────────┘  └──────────────┘  └──────────────────────┘  │
                    │                                                                  │
                    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
                    │  │   Ticketing  │  │  Notification│  │  Analytics Service   │  │
                    │  │   Service    │  │  Service     │  │                      │  │
                    │  └──────────────┘  └──────────────┘  └──────────────────────┘  │
                    │                                                                  │
                    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
                    │  │  Auth &      │  │  Operator    │  │  Data Validation     │  │
                    │  │  Identity    │  │  Integration │  │  Service             │  │
                    │  │  Service     │  │  Service     │  │                      │  │
                    │  └──────────────┘  └──────────────┘  └──────────────────────┘  │
                    └────────────────────────────────────┬─────────────────────────────┘
                                                         │
                    ┌────────────────────────────────────▼─────────────────────────────┐
                    │                       DATA LAYER                                  │
                    │                                                                    │
                    │  ┌──────────────────┐  ┌────────┐  ┌───────────┐  ┌───────────┐ │
                    │  │  PostgreSQL +    │  │ Redis  │  │  Object   │  │  Message  │ │
                    │  │  PostGIS         │  │        │  │  Storage  │  │  Queue    │ │
                    │  │  (primary store) │  │(cache/ │  │  (docs,   │  │  (events) │ │
                    │  │                  │  │session)│  │  exports) │  │           │ │
                    │  └──────────────────┘  └────────┘  └───────────┘  └───────────┘ │
                    └────────────────────────────────────────────────────────────────────┘
```

---

## 2. Application Layer

### 2.1 Passenger Web Application

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript (strict mode)
- **Rendering:** Server-side rendering for journey search (SEO-friendly), client-side for live tracking map
- **PWA:** Service worker for offline caching; manifest for install prompt
- **Maps:** Abstracted map provider (default: Mapbox GL JS; swappable to Google Maps or OpenLayers)
- **Styling:** Tailwind CSS with design-token system
- **i18n:** next-i18next with separate JSON files per locale (en, si, ta)
- **State:** React Query for server state; Zustand for UI state
- **WebSocket:** Native browser WebSocket for live tracking subscription

### 2.2 Passenger Mobile Application

- **Framework:** Flutter (Dart)
- **Target:** Android 8.0+ (API 26+) and iOS 14+
- **State:** Riverpod
- **Offline storage:** SQLite via drift for structured data; Hive for key-value cache
- **Maps:** Flutter Map (Leaflet wrapper) with swappable tile provider
- **Push notifications:** Firebase Cloud Messaging (Android and iOS)
- **Background sync:** WorkManager (Android) / BGTaskScheduler (iOS)

### 2.3 Conductor / Driver Application

- **Framework:** Flutter (shared codebase with passenger app, different entry point)
- **Authentication:** Operator-issued credential, PIN fallback
- **QR scanning:** Device camera via `mobile_scanner` package
- **Offline mode:** All core actions (trip start/end, QR validation, delay reporting) work without connectivity; syncs on reconnect

### 2.4 Operator Web Portal

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Role-based rendering:** Operator admin sees all features; route manager and scheduler have scoped views
- **Map tools:** Draw route paths on map; place bus stops
- **File uploads:** CSV import for bulk stops and schedules

### 2.5 Administration Portal

- **Framework:** Next.js 14+ (same monorepo, separate app entry)
- **Language:** TypeScript
- **Data tables:** TanStack Table for sortable, filterable, paginated admin grids
- **Charts:** Recharts or Tremor for analytics dashboards

---

## 3. API Layer

### 3.1 API Gateway

- Handles: TLS termination, rate limiting (per IP and per API key), JWT validation, request logging, CORS policy, DDoS protection headers
- Implementation: NGINX or Traefik reverse proxy in production; Kong optional for managed API features
- WebSocket: Sticky sessions for WebSocket connections (or Redis-backed pub/sub to avoid stickiness requirement)

### 3.2 Backend Services

All services are NestJS modules in a single deployable monolith for Phase 1, structured to be extracted into microservices in Phase 3 if scale demands it.

| Service | Responsibility |
|---------|---------------|
| **AuthService** | Registration, login, OTP, JWT, refresh tokens, social OAuth, role assignment |
| **RouteService** | Route CRUD, stop management, PostGIS geospatial queries, nearest-stop search |
| **SearchService** | Journey planning, graph traversal for transfers, result ranking |
| **FareEngine** | Fare stage resolution, passenger type pricing, promotion application, fare record retrieval |
| **TrackingService** | GPS data ingest from operators, WebSocket fan-out to subscribers, staleness detection |
| **ScheduleService** | Trip and timetable management, schedule-based ETA calculation |
| **TicketingService** | Booking lifecycle, QR generation, seat reservation, idempotent payment intent |
| **PaymentService** | Abstracted payment gateway adapter, refund processing, webhook verification |
| **NotificationService** | Push, SMS, and in-app notification dispatch, user preference enforcement |
| **OperatorService** | Operator registration, credential management, portal features |
| **AdminService** | User management, audit retrieval, data quality review, system configuration |
| **ValidationService** | Async data-quality checks: GPS bounds, fare plausibility, duplicate detection |
| **AnalyticsService** | Event aggregation, report generation, export |

### 3.3 WebSocket Protocol

Two categories of WebSocket connections:

**Passenger tracking subscription**
```
Client → Server: { type: "SUBSCRIBE_TRIP", routeId: "...", tripId: "..." }
Server → Client: { type: "VEHICLE_POSITION", vehicleId: "...", lat: ..., lng: ..., heading: ..., speed: ..., nextStop: "...", eta: "...", occupancy: "LOW|MED|HIGH|FULL", updatedAt: "ISO8601" }
Server → Client: { type: "SERVICE_ALERT", severity: "INFO|WARNING|CRITICAL", message: "...", affectedStops: [...] }
Server → Client: { type: "TRACKING_UNAVAILABLE", reason: "...", resumesAt: "ISO8601|null" }
```

**Operator GPS submission**
```
Operator → Server: { type: "LOCATION_UPDATE", vehicleId: "...", lat: ..., lng: ..., heading: ..., speed: ..., occupancy: "...", timestamp: "ISO8601" }
Server → Operator: { type: "ACK", id: "...", receivedAt: "ISO8601" }
Server → Operator: { type: "REJECTED", id: "...", reason: "OUT_OF_BOUNDS|STALE|INVALID_VEHICLE" }
```

---

## 4. Data Layer

### 4.1 PostgreSQL + PostGIS

Primary data store for all persistent entities. PostGIS extension enables:
- Nearest-stop queries: `ST_DWithin(stop.geom, ST_MakePoint(lng, lat)::geography, 500)`
- Route path storage: `LINESTRING` geometry for display and proximity checks
- GPS bounds validation: `ST_Within(point, operator_service_area)`

Connection pooling: PgBouncer in transaction mode.  
Read replicas: One replica per region for read-heavy search queries.

### 4.2 Redis

| Use | Key Pattern | TTL |
|-----|------------|-----|
| Session store | `session:{jti}` | 24 h |
| JWT blacklist | `revoked:{jti}` | 7 d |
| Journey search cache | `search:{hash(origin,dest,date)}` | 2 min |
| Live GPS state | `gps:{vehicleId}` | 90 s |
| Rate limit counters | `rl:{ip}:{window}` | 60 s |
| Operator API health | `api_health:{operatorId}` | 5 min |
| Fare cache | `fare:{routeId}:{stageFrom}:{stageTo}:{paxType}:{busType}` | 30 min |

### 4.3 Object Storage

- Operator registration documents (company licence, NTC certificate)
- Profile images
- Route shapefiles uploaded by operators
- Generated PDF tickets
- Analytics exports (CSV, PDF)
- Audit log exports

Compatible with AWS S3 API (MinIO for self-hosted, S3 or Wasabi for cloud).

### 4.4 Message Queue

- Technology: BullMQ (Redis-backed) for Phase 1; RabbitMQ or AWS SQS in Phase 3
- Queues:

| Queue | Purpose |
|-------|---------|
| `gps.ingest` | Buffer operator GPS updates before DB write |
| `notifications.push` | Fan-out push notifications to FCM/APNs |
| `notifications.sms` | SMS OTP and alerts |
| `bookings.confirm` | Async booking confirmation emails |
| `payments.webhook` | Process incoming payment gateway webhooks |
| `data.validation` | Background quality checks on operator submissions |
| `analytics.events` | Passenger and operator event ingestion |
| `exports.generate` | Generate large CSV/PDF exports asynchronously |

---

## 5. Integration Architecture

### 5.1 Operator API Integration

Operators can submit data in two ways:

**Pull model (REST):** BusLanka polls operator endpoint at configured intervals. Used for schedules and fare tables that change infrequently.

**Push model (REST + WebSocket):** Operator calls BusLanka's ingest API. Preferred for GPS updates and service alerts.

```
Operator System                          BusLanka Ingest API
─────────────────                        ───────────────────
                                         POST /v1/operator/vehicles/{id}/location
  GPS Device ──────────────────────────► (every 10 s per vehicle)
                                         
  Schedule System ─────────────────────► POST /v1/operator/trips
  (on change or nightly)
  
  Fare System ──────────────────────────► POST /v1/operator/fares
  (on NTC revision)
  
  Alert System ─────────────────────────► POST /v1/operator/alerts
  (on event)
```

### 5.2 Payment Gateway

An abstracted `PaymentGateway` interface decouples the platform from any single provider. Initial integration will target a PSP that supports Sri Lankan cards and wallets.

```typescript
interface PaymentGateway {
  createIntent(params: PaymentIntentParams): Promise<PaymentIntent>;
  confirmIntent(intentId: string, paymentMethod: PaymentMethod): Promise<PaymentResult>;
  refund(params: RefundParams): Promise<RefundResult>;
  verifyWebhook(headers: Record<string, string>, rawBody: string): boolean;
}
```

### 5.3 Map Provider

An abstracted map layer allows switching tile providers and geocoding services.

```typescript
interface MapProvider {
  geocode(query: string, locale: string): Promise<GeocodedPlace[]>;
  reverseGeocode(lat: number, lng: number): Promise<GeocodedPlace>;
  getTileUrl(style: 'standard' | 'dark' | 'satellite'): string;
}
```

### 5.4 Notification Provider

Abstracted over FCM (push), Twilio or similar (SMS), and SMTP (email).

---

## 6. Security Architecture

### 6.1 Authentication

- **Passengers:** Phone number or email + OTP, with optional Google/Apple social login
- **Operators:** Email + password (bcrypt hashed), 2FA required for admin portal actions
- **Conductors:** Operator-issued username + PIN; session tied to operator and vehicle
- **Administrators:** Email + password + mandatory TOTP (Google Authenticator or Authy)
- **API clients (operators):** OAuth 2.0 client credentials flow or HMAC-signed API keys

### 6.2 Authorisation

Role-based access control (RBAC) enforced in the API layer. Roles are additive:

| Role | Scope |
|------|-------|
| `PASSENGER` | Own profile, own bookings |
| `OPERATOR_ADMIN` | Own operator's routes, fares, schedules, fleet, bookings |
| `OPERATOR_USER` | Scoped features within own operator |
| `CONDUCTOR` | Assigned trips, QR validation, event reporting |
| `DRIVER` | Assigned trips, GPS submission, event reporting |
| `PLATFORM_ADMIN` | All operators, all routes, system configuration |
| `PLATFORM_SUPERADMIN` | All above plus user management and audit logs |

### 6.3 Data Security

- All data in transit: TLS 1.3
- Passwords: bcrypt (cost factor 12)
- Sensitive fields at rest: AES-256 encryption (e.g. payment tokens, NIC numbers)
- Payment cards: Never stored; tokenised through payment gateway
- JWT: RS256-signed; short-lived access tokens (15 min) + refresh tokens (7 d, stored in httpOnly cookie)
- API keys: Stored as SHA-256 hash; shown to operator once on creation
- Secrets: Environment variables injected by CI/CD; never in code or config files

### 6.4 Input Validation

- All API inputs validated with class-validator (NestJS) or Zod (Next.js API routes)
- SQL injection: Prevented by TypeORM parameterised queries exclusively
- XSS: Content Security Policy headers + React's default escaping
- CSRF: SameSite=Strict cookies + custom header verification for state-changing requests
- File uploads: Type-checked, size-limited, virus-scanned before storage

---

## 7. Deployment Architecture

### 7.1 Containerisation

All services run as Docker containers. Docker Compose for local development. Kubernetes or Docker Swarm for production.

```
buslanka/
├── apps/
│   ├── web/                 # Passenger web (Next.js)
│   ├── operator-portal/     # Operator portal (Next.js)
│   ├── admin-portal/        # Admin portal (Next.js)
│   └── mobile/              # Flutter app
├── services/
│   └── api/                 # NestJS monolith (phase 1)
├── packages/
│   ├── shared-types/        # TypeScript types shared across apps
│   ├── fare-engine/         # Fare calculation (used by API and tested standalone)
│   └── ui/                  # Shared component library (web)
├── infra/
│   ├── docker/              # Dockerfiles and compose files
│   ├── k8s/                 # Kubernetes manifests
│   ├── terraform/           # Infrastructure as code
│   └── nginx/               # Reverse proxy config
└── docs/
```

### 7.2 Environments

| Environment | Purpose | Data |
|-------------|---------|------|
| `local` | Developer workstation | Seeded fake data |
| `dev` | Shared development | Seeded fake data |
| `staging` | Pre-production testing | Anonymised production snapshot |
| `production` | Live traffic | Real data |

### 7.3 CI/CD

- Code linting and type checking on every push
- Unit and integration tests on every PR
- Docker image build and push on merge to main
- Staging deployment on merge to main (automatic)
- Production deployment on tagged release (manual approval gate)
- Database migrations run as a pre-deployment job; rollback if migration fails

### 7.4 Observability

- **Logging:** Structured JSON logs to centralised log aggregator (Loki or Elasticsearch)
- **Metrics:** Prometheus metrics exported from each service; Grafana dashboards
- **Tracing:** OpenTelemetry distributed traces
- **Error monitoring:** Sentry (web, mobile, API)
- **Uptime monitoring:** External HTTP checks every 60 seconds; alert on 2 consecutive failures
- **Alerting:** PagerDuty or Opsgenie for critical alerts; Slack for warnings

### 7.5 Backup and Recovery

- PostgreSQL: Continuous WAL archiving + daily base backup; 30-day retention
- Redis: AOF persistence + daily snapshot
- Object storage: Versioning enabled; lifecycle rules for archival after 90 days
- Recovery time objective (RTO): 4 hours for full service restoration
- Recovery point objective (RPO): 1 hour maximum data loss

---

## 8. Scalability Plan

| Phase | Expected Traffic | Architecture |
|-------|-----------------|--------------|
| Phase 1 | < 5,000 DAU | Single API instance, single PG primary, Redis single node |
| Phase 2 | 5,000–50,000 DAU | Horizontal API scaling, PG read replica, Redis cluster |
| Phase 3 | 50,000–200,000 DAU | Extract TrackingService and FareEngine as separate services; CDN for static assets |
| Phase 4 | 200,000+ DAU | Regional deployments, event-driven architecture, read-optimised analytics cluster |

---

## 9. Architectural Decision Records

| ADR | Decision | Rationale |
|-----|----------|-----------|
| ADR-001 | Monorepo with Turborepo | Single repository reduces coordination overhead; shared packages avoid type drift |
| ADR-002 | NestJS monolith before microservices | Premature distribution adds operational complexity before usage patterns are understood |
| ADR-003 | Flutter over React Native | Superior rendering on low-end Android devices common in Sri Lanka; single codebase for crew app |
| ADR-004 | PostGIS for all geospatial data | Avoiding a separate geospatial service reduces infrastructure; PostGIS is mature and well-supported |
| ADR-005 | BullMQ over raw Redis pub/sub | Persistent queues, retry logic, and monitoring dashboard reduce reliability risk for GPS ingest |
| ADR-006 | Fare calculation server-side only | Prevents client-side manipulation; all fares auditable with server-side timestamp |
| ADR-007 | Abstraction layers for map, payment, notification providers | Enables provider switching without application code changes; critical for Sri Lanka market where provider availability may change |
| ADR-008 | RS256 JWT over HS256 | Supports multi-service token verification without sharing a secret |
