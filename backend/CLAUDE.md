# BusLanka — Project Context for Claude Code

## What This Project Is

BusLanka is a production-ready Sri Lankan bus fare and journey planning platform. It connects passengers with bus operators through secure APIs. The platform covers web, Android, iOS, an operator portal, a conductor/driver crew app, and an admin portal.

## Project Structure

```
e:\buus fare\
├── docs/               # All foundation documents (read these first)
│   ├── 01_PRD.md              # Product requirements
│   ├── 02_ARCHITECTURE.md     # System architecture
│   ├── 03_USER_ROLES_AND_JOURNEYS.md
│   ├── 04_DATABASE_SCHEMA.md  # PostgreSQL + PostGIS schema
│   ├── 05_API_SPECIFICATION.md
│   ├── 06_FARE_CALCULATION_RULES.md
│   └── 07_ROADMAP.md          # Phased implementation plan
├── design/
│   └── DESIGN_SYSTEM.md       # Tokens, components, screen inventory
├── infra/              # Docker, Kubernetes, Terraform (to be created)
└── [app code TBD]      # Created during implementation phases
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Web (PWA) | Next.js 14+, TypeScript strict, Tailwind CSS, React Query, Zustand |
| Mobile | Flutter (Dart), Riverpod, drift (SQLite), Flutter Map |
| Backend | NestJS (TypeScript), TypeORM, BullMQ |
| Database | PostgreSQL 15 + PostGIS 3 |
| Cache | Redis |
| Queue | BullMQ (Redis-backed) |
| Auth | RS256 JWT, bcrypt, OTP (SMS + email) |
| Maps | Abstracted (Mapbox default) |
| Payments | Abstracted PaymentGateway interface |
| Notifications | FCM (push), SMTP (email), SMS adapter |
| Monitoring | Prometheus, Grafana, Sentry, OpenTelemetry |

## Critical Rules (Do Not Break These)

1. **Never calculate fares on the client.** All fare logic lives in `packages/fare-engine` (backend only).
2. **Never display an estimated fare as confirmed.** Every fare result must include `status: CONFIRMED | ESTIMATED | UNAVAILABLE`.
3. **Never invent data.** If a route, fare, or bus location is unknown, say so explicitly.
4. **Never store raw card details.** Payment tokenisation only.
5. **All fares in LKR.** Display `LKR` currency code, not the ₨ symbol.
6. **Audit logs are append-only.** No UPDATE or DELETE on the `audit_logs` table, ever.
7. **GPS validation required.** Reject coordinates outside the operator's declared service area.
8. **QR tickets must work offline.** Conductor app verifies RS256 JWT signature locally.
9. **All translated strings in locale files.** No hardcoded UI text inside components.
10. **TypeScript strict mode.** `"strict": true` in all `tsconfig.json` files.

## Fare Calculation Priority (Most → Least Authoritative)

1. NTC_OFFICIAL (admin-published NTC revision)
2. OPERATOR (operator-submitted via portal or API)
3. ESTIMATED (distance-band fallback — must be labelled)
4. UNAVAILABLE (show nothing, not zero)

## Passenger Types and Default Multipliers

| Type | Multiplier |
|------|-----------|
| ADULT | 1.00 |
| CHILD | 0.50 |
| STUDENT | 0.75 |
| SENIOR | 0.75 |
| CONCESSION | 0.50 (or UNAVAILABLE if not configured) |

## Key Files to Read Before Coding

- Fare logic: `docs/06_FARE_CALCULATION_RULES.md`
- Database: `docs/04_DATABASE_SCHEMA.md`
- API contracts: `docs/05_API_SPECIFICATION.md`
- Phased plan: `docs/07_ROADMAP.md`
- UI tokens: `design/DESIGN_SYSTEM.md`

## Localisation

- Three languages: `en` (English), `si` (Sinhala), `ta` (Tamil)
- Font: Noto Sans (covers all three scripts)
- String keys format: `{screen}.{component}.{element}`
- Locale files: `packages/ui/locales/{lang}/{screen}.json`

## Current Phase

Phase 0 — Foundation (project just started). Next step: scaffold the monorepo.
