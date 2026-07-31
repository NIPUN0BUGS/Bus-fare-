# BusLanka — Phased Implementation Roadmap

**Version:** 1.0  
**Date:** 2026-07-30

---

## Overview

| Phase | Name | Duration | Key Outcome |
|-------|------|----------|-------------|
| 0 | Foundation | 2 weeks | Monorepo scaffolding, CI/CD, environments |
| 1 | Core Platform | 8 weeks | Route search, fare display, operator portal |
| 2 | Live & Alerts | 6 weeks | Real-time tracking, notifications, crew app |
| 3 | Ticketing | 6 weeks | Bookings, payments, QR tickets, conductor validation |
| 4 | Analytics & Scale | 4 weeks | Dashboards, exports, performance hardening |
| 5 | Polish & Launch | 4 weeks | UAT, accessibility audit, app store submission, go-live |

**Total estimated timeline: ~30 weeks** (7.5 months from foundation to public launch)

---

## Phase 0 — Foundation (Weeks 1–2)

### Goals
Establish a working, tested, deployable skeleton that all future work builds on.

### Deliverables

#### Repository Setup
- [ ] Turborepo monorepo with workspaces: `apps/web`, `apps/operator-portal`, `apps/admin-portal`, `apps/mobile`, `services/api`, `packages/shared-types`, `packages/fare-engine`, `packages/ui`
- [ ] TypeScript strict mode configured across all packages
- [ ] ESLint + Prettier enforced via pre-commit hooks
- [ ] `.env.example` files for all services (no real secrets)

#### Infrastructure
- [ ] Docker Compose for local development (Postgres + PostGIS, Redis, API, Web)
- [ ] Database migration system (TypeORM migrations or Drizzle ORM)
- [ ] Seed script for development data (stop locations, sample routes, sample operators)
- [ ] Development and staging environment configurations
- [ ] CI pipeline: lint → type-check → test → build (GitHub Actions or equivalent)
- [ ] Staging auto-deploy on merge to main

#### Core Schemas
- [ ] All database tables from schema document created as migrations
- [ ] Enums defined as PostgreSQL types
- [ ] PostGIS extension enabled
- [ ] Database role with restricted permissions (no DROP, no DELETE on audit_logs)
- [ ] Initial seed: Sri Lankan provinces and districts

#### Shared Packages
- [ ] `shared-types`: TypeScript interfaces matching all database entities
- [ ] `packages/ui`: Tailwind CSS config, design token file (colours, fonts, spacing), empty component stubs
- [ ] `fare-engine`: Package stub with test harness

### Exit Criteria
- `docker compose up` starts a running system locally
- All migrations run successfully on a clean database
- CI pipeline passes on a blank PR
- `shared-types` package compiles without errors

---

## Phase 1 — Core Platform (Weeks 3–10)

### Goals
A working end-to-end flow: operator can add routes and fares; passenger can search and see fare information.

### Week 3–4: Auth and Identity

**API**
- [ ] `POST /auth/register`, `/auth/verify-otp`, `/auth/login`, `/auth/refresh`, `/auth/logout`
- [ ] Phone/email OTP delivery (SMS via abstracted provider, email via SMTP)
- [ ] JWT (RS256): access token 15 min, refresh token 7 days in httpOnly cookie
- [ ] RBAC middleware: guard decorators for all role types
- [ ] Bcrypt password hashing (cost 12)
- [ ] Rate limiting on auth endpoints (10 req/min per IP)
- [ ] `passenger_profiles` CRUD

**Web (Passenger)**
- [ ] Login / registration screen
- [ ] OTP verification screen
- [ ] Language selection screen
- [ ] Profile screen (view/edit name, locale)
- [ ] Navigation shell with locale switcher

**Tests**
- [ ] Auth unit tests: OTP generation, JWT signing, RBAC
- [ ] Auth integration tests: register → verify → login → refresh → logout

### Week 5–6: Stops, Routes, and Operator Portal

**API**
- [ ] `bus_stops` CRUD (admin and operator)
- [ ] `routes` CRUD with PostGIS path validation
- [ ] `route_stops` and `fare_stages` management
- [ ] Nearest-stop query: `GET /search/stops/nearby`
- [ ] Stop autocomplete: `GET /search/autocomplete`
- [ ] Route validation (geometry, duplicate route check, unlicensed corridor flag)

**Operator Portal**
- [ ] Operator registration and login
- [ ] Dashboard: route count, vehicle count, API key section
- [ ] Add / edit route: form + map drawing tool
- [ ] Add route stops: drag-and-drop stop sequencing
- [ ] Add fare stages: assign stops to stages
- [ ] View routes list
- [ ] Operator approval flow (admin approves via admin portal)

**Admin Portal**
- [ ] Operator list and approval workflow
- [ ] Route list and review panel
- [ ] District and stop management

**Tests**
- [ ] Route creation validation tests
- [ ] Nearest-stop query accuracy tests (PostGIS)
- [ ] Autocomplete multilingual tests (Sinhala, Tamil, English variants)

### Week 7–8: Fare Engine and Journey Search

**Fare Engine (backend package)**
- [ ] Stage lookup from `route_stops`
- [ ] Fare rule query with priority ordering (NTC > Operator > Estimated)
- [ ] Passenger type multiplier application
- [ ] Distance-band fallback (estimated fare)
- [ ] Multi-leg fare aggregation
- [ ] Fare result type with all required fields
- [ ] All 12 fare test cases passing

**API**
- [ ] `GET /search/journey` — full journey planner
- [ ] `GET /fares` — single-leg fare lookup
- [ ] Journey graph traversal (direct + 1 transfer + 2 transfers)
- [ ] Result ranking (departure time, fare, duration, transfers)
- [ ] Search result caching (Redis, 2 min TTL)

**Web (Passenger)**
- [ ] Home screen with From/To search
- [ ] GPS location permission request and current-location use
- [ ] Search autocomplete dropdown
- [ ] Journey results screen (list view)
- [ ] Sort and filter controls
- [ ] Journey detail screen
- [ ] Fare breakdown card
- [ ] "Fare unavailable" state
- [ ] "Estimated fare" label
- [ ] "No routes found" state
- [ ] Loading skeleton states

**Mobile (Flutter)**
- [ ] Home screen with From/To search
- [ ] Autocomplete
- [ ] Journey results list
- [ ] Journey detail
- [ ] Fare breakdown

**Tests**
- [ ] Journey search integration tests (direct, 1 transfer, 2 transfers)
- [ ] Fare calculation test suite (all 12 test cases)
- [ ] Search ranking tests
- [ ] API contract tests

### Week 9–10: Operator Fare Management and Admin

**Operator Portal**
- [ ] Fare submission form with stage matrix
- [ ] NTC ceiling validation display
- [ ] Fare history view
- [ ] Schedule and trip creation (basic)
- [ ] Fleet management: add/edit vehicles

**Admin Portal**
- [ ] Fare revision management: publish NTC revision
- [ ] Route approval with map preview
- [ ] Audit log viewer
- [ ] User management (suspend, change role)

**API**
- [ ] `POST /operator/fares` — fare submission with validation
- [ ] `POST /admin/fare-revisions` — publish NTC revision
- [ ] Fare cache invalidation on submission
- [ ] Audit log writes for all operator and admin actions

**Tests**
- [ ] Fare submission validation tests (ceiling check, floor check, duplicate)
- [ ] NTC revision override test
- [ ] Audit log write tests
- [ ] Operator permission boundary tests

### Phase 1 Exit Criteria
- Operator can register, be approved, add a route with stops and fare stages, submit fares
- Passenger can search for a journey between any two stops with data
- Fare displayed with source label and timestamp
- All 12 fare test cases passing
- Multilingual UI strings complete for EN/SI/TA (passenger web)
- CI green; staging deployment working

---

## Phase 2 — Live and Alerts (Weeks 11–16)

### Goals
Real-time GPS tracking, service alerts, push notifications, conductor/driver app.

### Week 11–12: GPS Ingest and Live Tracking

**API**
- [ ] `POST /operator/vehicles/{id}/location` — GPS ingest endpoint
- [ ] GPS coordinate validation (service area bounds check via PostGIS)
- [ ] `gps.ingest` BullMQ queue
- [ ] `vehicle_locations` write with staleness detection
- [ ] Redis live state: `gps:{vehicleId}` TTL 90s
- [ ] `GET /tracking/routes/{routeId}/vehicles`
- [ ] WebSocket server: `/ws/tracking`
- [ ] WebSocket fan-out (Redis pub/sub → connected clients)
- [ ] `TRACKING_UNAVAILABLE` event when operator GPS stale > 60s

**Web (Passenger)**
- [ ] Live tracking map (Mapbox GL JS or Leaflet)
- [ ] Bus stop markers
- [ ] Live vehicle markers with heading indicator
- [ ] Route path line
- [ ] ETA label on vehicle marker
- [ ] Occupancy indicator
- [ ] "Tracking unavailable" banner
- [ ] Switch to text-based view (accessibility)

**Mobile (Flutter)**
- [ ] Flutter Map integration
- [ ] Live bus markers
- [ ] ETA display
- [ ] Offline indicator

**Tests**
- [ ] GPS bounds rejection test
- [ ] Stale GPS detection test
- [ ] WebSocket connection and message delivery tests
- [ ] Tracking unavailable fallback test

### Week 13–14: Service Alerts and Notifications

**API**
- [ ] `POST /operator/trips/{tripId}/alerts`
- [ ] `POST /crew/trips/{tripId}/events`
- [ ] Alert broadcast via WebSocket to affected-route subscribers
- [ ] `notifications.push` queue → FCM/APNs dispatch
- [ ] `GET /admin/data-quality/gps` — GPS health report
- [ ] Automated admin alert: operator GPS stale > 10 min

**Web and Mobile**
- [ ] Service alert banner on journey results and trip detail
- [ ] In-app notification centre
- [ ] Notification preferences screen
- [ ] Push notification permission request (mobile)
- [ ] Push notification receipt and deep link (open relevant trip)

**Tests**
- [ ] Alert broadcast test
- [ ] Notification preference enforcement test
- [ ] Push delivery mock test

### Week 15–16: Conductor / Driver App

**API**
- [ ] `POST /crew/trips/{tripId}/start`
- [ ] `POST /crew/trips/{tripId}/end`
- [ ] `POST /crew/trips/{tripId}/occupancy`
- [ ] `POST /crew/tickets/validate`
- [ ] Offline QR validation (public key embedded in app)
- [ ] Sync queue for offline-recorded validations

**Mobile (Crew App — Flutter entry point)**
- [ ] Crew login (operator PIN)
- [ ] Trip selection screen
- [ ] Start / end trip flow
- [ ] QR scanner screen
- [ ] Validation result screen (VALID / INVALID + reason)
- [ ] Offline mode: validate locally, queue for sync
- [ ] Delay/event reporting screen
- [ ] Occupancy update controls
- [ ] Sync indicator (queued items, last sync time)

**Tests**
- [ ] Online QR validation test
- [ ] Offline QR signature verification test
- [ ] Replay attack rejection test (ticket already validated)
- [ ] Sync queue delivery test

### Phase 2 Exit Criteria
- Operators can stream GPS; passengers see live bus positions within 30s
- Service alerts broadcast to affected passengers within 5s
- Conductor app validates QR tickets online and offline
- GPS health monitoring visible in admin portal

---

## Phase 3 — Ticketing (Weeks 17–22)

### Goals
End-to-end ticket purchase, seat reservation, and refund for operators that support it.

### Week 17–18: Seat Inventory and Booking Flow

**API**
- [ ] `seats` CRUD for vehicles
- [ ] `POST /bookings` — create booking, lock seat (10-min hold)
- [ ] Idempotency check (gateway_intent_id unique constraint)
- [ ] Seat lock expiry via BullMQ delayed job
- [ ] `GET /bookings` list
- [ ] `GET /bookings/{id}` detail

**Web and Mobile**
- [ ] Seat selection map
- [ ] Booking summary screen
- [ ] Booking confirmation screen
- [ ] Booking history list
- [ ] Booking detail screen

### Week 19–20: Payment Integration

**API**
- [ ] `PaymentGateway` interface
- [ ] First gateway adapter (PSP TBD; sandbox mode first)
- [ ] `POST /bookings/{id}/pay`
- [ ] Payment webhook receiver + HMAC verification
- [ ] Booking status update on payment success/failure
- [ ] QR ticket generation (RS256-signed JWT)
- [ ] `GET /bookings/{id}/ticket`

**Web and Mobile**
- [ ] Payment screen (card entry via gateway-hosted fields / SDK)
- [ ] Payment processing screen
- [ ] Payment success screen with QR code
- [ ] Payment failure screen with retry
- [ ] Ticket screen (QR code + details)
- [ ] Download / share ticket

### Week 21–22: Cancellations and Refunds

**API**
- [ ] Cancellation rules per operator (configured in operator portal)
- [ ] `POST /bookings/{id}/cancel`
- [ ] Refund initiation via gateway adapter
- [ ] `refunds` lifecycle: REQUESTED → PROCESSING → COMPLETED
- [ ] Refund webhook handling
- [ ] Booking history status updates

**Operator Portal**
- [ ] Seat layout configuration
- [ ] Enable/disable ticket booking per route
- [ ] Cancellation policy configuration
- [ ] Booking management view
- [ ] Refund processing (where operator-initiated)

**Tests**
- [ ] Duplicate booking prevention test
- [ ] Seat contention test (two users selecting same seat simultaneously)
- [ ] Payment duplicate prevention (idempotency key test)
- [ ] Refund amount calculation test
- [ ] QR payload signing and verification test
- [ ] Expired ticket rejection test
- [ ] Already-validated ticket rejection test
- [ ] Sandbox payment flow: success, failure, partial refund

### Phase 3 Exit Criteria
- Passenger can search, book, pay, and receive a QR ticket end-to-end
- Conductor can scan and validate QR ticket
- Cancellation and refund flow works per operator policy
- No raw card data ever persists in BusLanka database

---

## Phase 4 — Analytics and Scale (Weeks 23–26)

### Goals
Operational dashboards, data export, performance hardening.

### Week 23–24: Analytics Service

**API**
- [ ] `analytics.events` queue — ingest search, booking, payment events
- [ ] Aggregation jobs (hourly, daily)
- [ ] `GET /admin/analytics/overview`
- [ ] `GET /operator/analytics/overview`
- [ ] Popular routes by search count and booking count
- [ ] Operator API uptime chart
- [ ] GPS freshness report
- [ ] Delay and cancellation report
- [ ] Payment success/failure rate

**Admin and Operator Portals**
- [ ] Analytics dashboards with charts
- [ ] Date range pickers
- [ ] CSV export (bookings, routes, fares, audit logs)
- [ ] PDF export for reports

### Week 25–26: Performance and Reliability

- [ ] Database index review; `EXPLAIN ANALYZE` on slowest queries
- [ ] Journey search query optimisation
- [ ] Fare engine query optimisation
- [ ] PgBouncer connection pooling configuration
- [ ] Redis cluster setup for production
- [ ] Load testing: simulate 5,000 concurrent users
- [ ] Horizontal scaling test (add second API instance, verify WebSocket pub/sub)
- [ ] Response compression (gzip, Brotli)
- [ ] Image optimisation for mobile
- [ ] API response time monitoring in Grafana

### Phase 4 Exit Criteria
- Journey search P95 < 1.5s under 5,000 concurrent users
- Operator dashboard loads in < 2s
- CSV export of 10,000 bookings completes in < 30s
- All load-test scenarios pass without errors

---

## Phase 5 — Polish and Launch (Weeks 27–30)

### Goals
UAT, accessibility audit, app store review, go-live.

### Week 27: UAT and Bug Fixes

- [ ] Passenger UAT with representative users (commuters, tourists, Sinhala-primary users)
- [ ] Operator UAT with 3 pilot operators
- [ ] Conductor UAT with 5 conductors on live routes
- [ ] Bug triage and resolution
- [ ] Fare accuracy validation (compare app fares vs. actual conductor fares on 50 routes)

### Week 28: Accessibility and Security Review

- [ ] WCAG 2.2 AA audit across all web surfaces
- [ ] Screen reader testing (NVDA + Chrome, VoiceOver + Safari, TalkBack + Chrome Android)
- [ ] High contrast mode validation
- [ ] OWASP Top 10 penetration testing
- [ ] Dependency vulnerability scan
- [ ] SSL/TLS configuration review
- [ ] JWT token security review

### Week 29: App Store Submission

- [ ] Android APK / AAB build and testing on low-end devices (4G, 2GB RAM)
- [ ] iOS build and TestFlight distribution
- [ ] Google Play Store listing (screenshots, description in EN/SI/TA)
- [ ] Apple App Store listing
- [ ] Privacy policy and terms of service pages
- [ ] App review submission (allow 2 weeks for Apple review)

### Week 30: Go-Live

- [ ] DNS cutover to production
- [ ] Monitoring dashboards live (Grafana, Sentry, uptime)
- [ ] On-call rotation established
- [ ] Rollback plan documented and tested
- [ ] Announcement to pilot operators
- [ ] Public launch

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| NTC machine-readable data unavailable | High | High | Manually enter initial route/fare data; request NTC partnership |
| Payment PSP integration delays | Medium | High | Start PSP evaluation in Phase 1; sandbox in Phase 2 |
| Apple App Store rejection | Medium | Medium | Submit early; follow App Store guidelines; have web fallback ready |
| GPS data quality from operators | High | Medium | Show "tracking unavailable" gracefully; GPS health monitoring |
| Low-end Android performance | Medium | Medium | Performance test on Android Go devices from Phase 2 onwards |
| Multilingual rendering bugs (Sinhala/Tamil) | Medium | Medium | Test on physical Sri Lankan devices from Phase 1 |
| Operator adoption | Medium | High | Pilot with SLTB or large private operator first; streamlined onboarding |

---

## Dependencies and Decisions Needed Before Each Phase

| Before Phase | Decision Needed |
|-------------|----------------|
| Phase 0 | Cloud provider selection; domain name registered |
| Phase 1 | Map provider API key; SMS provider for OTP; NTC data access |
| Phase 2 | FCM project setup; APNs certificate |
| Phase 3 | Payment service provider contracted; legal review of ticketing terms |
| Phase 4 | Analytics data retention policy; GDPR/privacy law review |
| Phase 5 | App store developer accounts; legal entity for app distribution |

---

## Module Build Order (Within Each Phase)

Always build in this order per feature:
1. Database migration
2. TypeScript entity and DTO types (`shared-types`)
3. Service layer with unit tests
4. API controller with validation
5. API contract / integration tests
6. Web UI component
7. Mobile UI screen
8. End-to-end test

This ensures each layer is testable independently before the UI is built.
