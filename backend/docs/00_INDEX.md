# BusLanka — Document Index

**Project:** BusLanka — Sri Lankan Bus Fare and Journey Planning Platform  
**Status:** Foundation documents complete. Ready to begin Phase 0.  
**Date:** 2026-07-30

---

## Foundation Documents

| # | Document | Purpose | Status |
|---|----------|---------|--------|
| 01 | [Product Requirements Document](01_PRD.md) | What the product must do and for whom | ✅ Complete |
| 02 | [System Architecture](02_ARCHITECTURE.md) | Technology choices, deployment, integrations | ✅ Complete |
| 03 | [User Roles and Journeys](03_USER_ROLES_AND_JOURNEYS.md) | Who uses the system and how | ✅ Complete |
| 04 | [Database Schema](04_DATABASE_SCHEMA.md) | PostgreSQL + PostGIS entity definitions | ✅ Complete |
| 05 | [API Specification](05_API_SPECIFICATION.md) | REST + WebSocket contracts with examples | ✅ Complete |
| 06 | [Fare Calculation Rules](06_FARE_CALCULATION_RULES.md) | Fare engine algorithm and test cases | ✅ Complete |
| 07 | [Implementation Roadmap](07_ROADMAP.md) | 5-phase, 30-week build plan | ✅ Complete |

## Design Documents

| File | Purpose | Status |
|------|---------|--------|
| [design/DESIGN_SYSTEM.md](../design/DESIGN_SYSTEM.md) | Tokens, components, screens, i18n | ✅ Complete |

## Next Steps

1. **Confirm** any open questions from the PRD (Section 12) — especially NTC data access and payment provider.
2. **Begin Phase 0:** Scaffold the Turborepo monorepo, set up Docker Compose, run first database migrations.
3. **Review** the database schema to ensure it matches any operator data formats you already have.
4. **Decide** on the map provider (Mapbox or alternative) and SMS/OTP provider before Phase 1 auth work begins.

## Key Decisions Made

| Decision | Rationale |
|----------|-----------|
| Monolith-first backend (NestJS) | Avoid premature microservice complexity; extract later if needed |
| Flutter for mobile | Better performance on low-end Android; single codebase for passenger + crew apps |
| PostGIS for all geo | Avoids a separate geo service; nearest-stop and bounds queries in one DB |
| RS256 JWT for QR tickets | Conductor app can verify offline without sharing a secret |
| Abstracted payment/map providers | Avoid vendor lock-in in a market where providers change |
| Fare calculation server-side only | Prevents manipulation; every fare is auditable with a server timestamp |
| BullMQ over raw Redis pub/sub | Persistent queues with retry and monitoring for GPS ingest reliability |
