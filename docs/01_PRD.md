# BusLanka — Product Requirements Document

**Version:** 1.0  
**Status:** Draft  
**Date:** 2026-07-30  
**Product Name:** BusLanka *(branding is configurable — see `BRANDING.md`)*

---

## 1. Purpose

BusLanka is a transport information and ticketing platform that helps Sri Lankan bus passengers find routes, calculate fares, track buses in real time, and purchase tickets. The platform connects passengers with private bus operators and Sri Lanka Transport Board (SLTB) services through secure, operator-supplied APIs.

The system must never invent data. Every fare, schedule, location, and service status must originate from a verified source. When data is unavailable, the platform says so clearly and explains what it can still offer.

---

## 2. Problem Statement

Sri Lankan bus passengers currently face several problems:

1. No single trusted source exists for accurate bus fares across all operators and route categories.
2. Real-time bus locations are not publicly accessible despite many operators having GPS-equipped fleets.
3. Schedules are printed or passed by word of mouth, making advance journey planning unreliable.
4. Ticket purchases require physical cash at boarding, creating friction for tourists and frequent travellers.
5. Fare revisions issued by the National Transport Commission (NTC) take weeks to reach passengers.
6. Multilingual access is absent from most existing tools, excluding Sinhala- and Tamil-speaking rural users.

---

## 3. Product Goals

| Goal | Measurable Target |
|------|-------------------|
| Accurate fares | 100 % of displayed fares link to a timestamped, named source |
| Live bus tracking | Operator GPS shown on map within 30 seconds of update |
| Multilingual parity | All passenger-facing strings available in Sinhala, Tamil, and English |
| Offline resilience | Saved tickets and last-known schedules accessible without data |
| Operator onboarding | Operator can go live with routes and fares in under 2 hours |
| Accessibility | WCAG 2.2 AA across all web surfaces |

---

## 4. Scope

### In Scope

- Passenger web application (PWA, works on all modern browsers)
- Passenger mobile application (Android and iOS)
- Operator web portal
- Conductor and driver mobile interface
- Platform administration portal
- Operator integration API with documentation
- Payment gateway integration (abstracted)
- Push notification service
- Analytics dashboard

### Out of Scope (Phase 1)

- Seat-level reservation for ordinary buses (standing capacity only)
- Intercity express train integration
- Three-wheeler or taxi booking
- Cargo or parcel booking
- Advertising platform

---

## 5. Users

### 5.1 Passenger

Daily commuters, students, tourists, and occasional travellers who board buses in Sri Lanka. They may use 2G or 3G connections on low-end Android devices. They may read Sinhala, Tamil, or English.

**Key needs:**
- Know which bus to board and where to wait
- Know the fare before boarding
- See how far away the bus currently is
- Buy a ticket in advance where possible
- Receive a refund if the service is cancelled

### 5.2 Tourist

Visitors unfamiliar with Sri Lankan bus networks. They need English-language guidance, landmark-based search, and reliable fare information to avoid overcharging.

### 5.3 Private Bus Operator

Companies or individuals operating private inter-city, suburban, or school-contract routes under an NTC licence. They supply routes, schedules, fare tables, and GPS data through the operator portal or integration API.

### 5.4 SLTB Administrator

Staff at Sri Lanka Transport Board who manage the national route network, approve official fares, and publish service alerts.

### 5.5 Conductor / Driver

Bus crew who start and end trips, validate passenger QR-code tickets, report service events, and update occupancy counts. They work with the mobile crew application on a device that may lose connectivity mid-route.

### 5.6 Platform Administrator

BusLanka operations staff who onboard operators, monitor system health, review data quality, and manage user complaints.

---

## 6. Features by Priority

### Priority 1 — Core (Phase 1)

| ID | Feature |
|----|---------|
| F-01 | Route search (origin → destination) |
| F-02 | Stop-level search |
| F-03 | Fare display with source attribution |
| F-04 | Bus category and passenger type fares |
| F-05 | Operator portal: route, stop, and fare management |
| F-06 | Multilingual passenger interface (EN / SI / TA) |
| F-07 | GPS-based nearest stop search |
| F-08 | Journey results with sorting and filtering |
| F-09 | Operator integration API (routes, stops, fares) |
| F-10 | Static map with stop and route display |

### Priority 2 — Enhanced (Phase 2)

| ID | Feature |
|----|---------|
| F-11 | Live bus tracking via operator GPS stream |
| F-12 | Real-time service alerts (delays, cancellations) |
| F-13 | Push notifications (approaching bus, delay) |
| F-14 | Conductor / driver mobile app |
| F-15 | Offline ticket storage |
| F-16 | Journey-sharing via link or message |
| F-17 | Saved routes and favourite stops |
| F-18 | Recently searched routes |

### Priority 3 — Ticketing (Phase 3)

| ID | Feature |
|----|---------|
| F-19 | Ticket purchase with QR-code delivery |
| F-20 | Seat selection for reservable services |
| F-21 | Payment gateway integration |
| F-22 | Booking history and cancellations |
| F-23 | Refund processing |
| F-24 | QR-code validation by conductor app |

### Priority 4 — Analytics and Operations (Phase 4)

| ID | Feature |
|----|---------|
| F-25 | Operator analytics dashboard |
| F-26 | Admin analytics and data-quality reports |
| F-27 | Route demand heatmaps |
| F-28 | Automated stale-data alerts |
| F-29 | API health monitoring |
| F-30 | Export to CSV and PDF |

---

## 7. Functional Requirements

### 7.1 Route Search

- FR-01: System accepts origin and destination as free-text (place name, bus-stop code, landmark), GPS coordinates, or map pin.
- FR-02: System returns all known bus routes connecting origin to destination, including one-transfer and two-transfer journeys.
- FR-03: System normalises Sri Lankan place name variants and common transliterations across all three languages.
- FR-04: System returns results sorted by departure time by default; user can re-sort without reloading.
- FR-05: System shows a "No routes found" state with suggestions when no match exists.

### 7.2 Fare Calculation

- FR-10: All fares are calculated server-side using current operator fare tables.
- FR-11: System identifies the fare stage for each boarding-stop and destination-stop pair.
- FR-12: System applies the correct passenger type multiplier (adult, child, student, senior, concession).
- FR-13: System applies bus category pricing (ordinary, semi-luxury, luxury, expressway, AC, school, special).
- FR-14: System applies active promotional discounts where the passenger meets eligibility conditions.
- FR-15: System returns: base fare, multiplier applied, discount applied, final fare, currency (LKR), fare source name, fare source type (official / operator / estimated / unavailable), fare effective date, and last updated timestamp.
- FR-16: Estimated fares must be labelled "Estimated — not confirmed by operator" in the UI.
- FR-17: When no fare is available, system displays "Fare unavailable" and does not display zero or a guess.
- FR-18: Multi-leg journeys show a fare breakdown per leg and a total.

### 7.3 Live Tracking

- FR-20: Map shows vehicle position markers updated at most every 10 seconds when operator provides live GPS.
- FR-21: Marker includes: route number, direction, vehicle ID, last update time, occupancy level where available.
- FR-22: System shows "Live tracking unavailable" banner when operator GPS stream is offline for more than 60 seconds.
- FR-23: System rejects GPS coordinates that fall outside a 50-km radius of the operator's declared route area.

### 7.4 Ticketing

- FR-30: Ticket includes: booking reference, QR code, passenger name, route, from stop, to stop, departure time, fare paid, passenger type, bus category, operator name, and issue timestamp.
- FR-31: QR code encodes a signed payload verifiable without an internet connection.
- FR-32: Ticket remains accessible on device when offline.
- FR-33: Refund eligibility and timelines are configured per operator; system enforces them without manual staff action.
- FR-34: Duplicate booking attempts with the same payment reference are rejected.

### 7.5 Operator Portal

- FR-40: Operator submits routes in a defined schema; system validates geometry and stop references before accepting.
- FR-41: Fare changes take effect at the operator's specified effective date and time (may be future-dated).
- FR-42: Every operator-data change is logged with: actor, timestamp, previous value, new value, IP address.
- FR-43: Operator must confirm compliance with NTC-approved fare schedule on submission.
- FR-44: Operators can submit real-time updates via REST API or WebSocket stream using credentials provisioned through the portal.

### 7.6 Administration

- FR-50: Administrators can override any operator-submitted fare with an NTC-authorised value.
- FR-51: Administrators receive automated alerts when operator GPS data is stale for more than 10 minutes.
- FR-52: Route submissions from operators not licensed for that route are flagged for review.
- FR-53: Audit log entries are immutable; no user role can delete them.

---

## 8. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | Journey search returns results within 1.5 seconds on a 4G connection |
| Performance | Live tracking map updates within 30 seconds of operator GPS submission |
| Availability | 99.5 % uptime for passenger-facing services |
| Scalability | Handles 50,000 concurrent passengers during peak holiday travel |
| Security | OWASP Top 10 mitigations in place at launch |
| Privacy | Collects only data required for the stated purpose; users can export and delete their data |
| Localisation | Sinhala and Tamil strings render correctly on all target devices |
| Offline | Core offline features usable without network for at least 24 hours after last sync |
| Accessibility | WCAG 2.2 AA on all web surfaces |
| Data integrity | No passenger can see another passenger's booking or profile |
| API reliability | Operator API returns 429 with Retry-After header on rate-limit breach |
| Compliance | Payment flows comply with Payment Card Industry requirements; no raw card data stored |

---

## 9. Constraints

- Fares must reflect NTC-approved schedules. The system cannot display fares higher than the approved maximum for a route and bus category.
- GPS tracking requires explicit passenger consent on first use.
- Payment processing must use a licensed payment service provider operating in Sri Lanka.
- The platform operator must maintain a registered business in Sri Lanka to contract with bus operators.
- All official communications to operators must be available in Sinhala and English.

---

## 10. Assumptions

- Bus operators have or can obtain GPS-capable devices for their fleet.
- SLTB can provide machine-readable route and fare data in agreed formats.
- A payment service provider operating in Sri Lanka is selected before Phase 3.
- Bus stop locations are either available from an authoritative source or can be surveyed and entered via the operator portal.
- Mobile phone numbers are the primary identity for Sri Lankan passengers; email is secondary.

---

## 11. Success Metrics

| Metric | 6-Month Target |
|--------|----------------|
| Operators onboarded | 50 |
| Routes with live fare data | 500 |
| Daily active passengers | 10,000 |
| Journey search accuracy (correct bus identified) | > 95 % |
| Fare accuracy (matches conductor price) | > 98 % |
| Passenger app store rating | ≥ 4.2 |
| Operator portal task success rate | > 90 % |
| API uptime | ≥ 99.5 % |

---

## 12. Open Questions

| # | Question | Owner | Due |
|---|----------|-------|-----|
| OQ-1 | Which NTC datasets are available in machine-readable format, and under what licence? | Product | Phase 1 |
| OQ-2 | Which payment service providers are licensed and suitable for Sri Lanka? | Product | Phase 2 |
| OQ-3 | What is the legal requirement for storing passenger travel records? | Legal | Phase 1 |
| OQ-4 | Does SLTB have a real-time GPS API or will SLTB buses use the operator API? | Tech | Phase 1 |
| OQ-5 | Are school-bus fares subsidised and managed separately from standard fares? | Product | Phase 1 |
