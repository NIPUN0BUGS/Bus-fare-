# BusLanka — API Specification

**Version:** v1  
**Base URL:** `https://api.buslanka.lk/v1`  
**Date:** 2026-07-30  
**Format:** JSON (UTF-8). Dates in ISO 8601. Currency in LKR with code "LKR".

---

## 1. Conventions

### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Varies | `Bearer {access_token}` for authenticated endpoints |
| `X-Api-Key` | Varies | Operator API key for operator ingest endpoints |
| `Accept-Language` | Optional | `en` \| `si` \| `ta` — controls translated fields in response |
| `Content-Type` | POST/PUT | `application/json` |
| `Idempotency-Key` | POST (payments, bookings) | UUID to prevent duplicate operations |

### Response Envelope

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "perPage": 20,
    "total": 143,
    "requestId": "req_01HZ..."
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "FARE_UNAVAILABLE",
    "message": "No fare data is available for this route and passenger type.",
    "details": [
      { "field": "passengerType", "issue": "No concession fares configured for route 177" }
    ],
    "requestId": "req_01HZ..."
  }
}
```

### Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No content (delete, revoke) |
| 400 | Validation error |
| 401 | Unauthenticated |
| 403 | Forbidden (role/permission) |
| 404 | Resource not found |
| 409 | Conflict (duplicate, stale version) |
| 422 | Business rule violation |
| 429 | Rate limited |
| 500 | Internal server error |

### Pagination

All list endpoints accept:
- `page` (default: 1)
- `perPage` (default: 20, max: 100)

### Rate Limits

| Context | Limit |
|---------|-------|
| Unauthenticated | 60 requests / min per IP |
| Authenticated passenger | 300 requests / min per user |
| Operator GPS ingest | 600 requests / min per API key |
| Operator data API | 120 requests / min per API key |

Rate limit headers on every response:
```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 147
X-RateLimit-Reset: 1722297600
```

---

## 2. Authentication Endpoints

### POST /auth/register

Register a new passenger account.

**Request:**
```json
{
  "phone": "+94771234567",
  "email": "user@example.com",
  "password": "SecurePass123!",
  "locale": "si"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "otpSent": true,
    "channel": "SMS",
    "expiresIn": 300
  }
}
```

---

### POST /auth/verify-otp

Verify OTP after registration or login.

**Request:**
```json
{
  "userId": "uuid",
  "otp": "482910",
  "purpose": "REGISTER"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "user": {
      "id": "uuid",
      "role": "PASSENGER",
      "locale": "si"
    }
  }
}
```

---

### POST /auth/login

Initiate login; triggers OTP if 2FA is required.

**Request:**
```json
{
  "identifier": "+94771234567",
  "password": "SecurePass123!"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "requiresOtp": true,
    "userId": "uuid",
    "channel": "SMS",
    "expiresIn": 300
  }
}
```

---

### POST /auth/refresh

Exchange refresh token for new access token. Refresh token read from `httpOnly` cookie.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "expiresIn": 900
  }
}
```

---

### POST /auth/logout

Revoke current session.

**Auth:** Bearer token required.

**Response 204**

---

## 3. Passenger — Journey Search

### GET /search/journey

Find bus journeys between two points.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `fromLat` | float | *or fromText | Origin latitude |
| `fromLng` | float | *or fromText | Origin longitude |
| `fromText` | string | *or fromLat/Lng | Origin place name or stop code |
| `toLat` | float | *or toText | Destination latitude |
| `toLng` | float | *or toText | Destination longitude |
| `toText` | string | *or toLat/Lng | Destination place name or stop code |
| `departureDate` | date | No | ISO date, defaults to today |
| `departureTime` | time | No | HH:MM, defaults to now |
| `passengerType` | enum | No | ADULT \| CHILD \| STUDENT \| SENIOR \| CONCESSION |
| `maxTransfers` | int | No | 0–2, default 2 |
| `sortBy` | enum | No | DEPARTURE \| FARE \| DURATION \| TRANSFERS |
| `busCategory` | enum | No | Filter by bus category |
| `accessible` | bool | No | Filter for wheelchair-accessible services |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "journeys": [
      {
        "id": "journey_01",
        "totalFare": {
          "amount": 42.00,
          "currency": "LKR",
          "status": "CONFIRMED",
          "source": "NTC_OFFICIAL",
          "effectiveFrom": "2026-03-01T00:00:00Z",
          "updatedAt": "2026-07-01T08:30:00Z"
        },
        "totalDurationMinutes": 35,
        "transfers": 0,
        "legs": [
          {
            "legIndex": 1,
            "routeNumber": "177",
            "routeName": "Nugegoda – Fort",
            "operator": {
              "id": "uuid",
              "name": "SLTB – Western Province"
            },
            "busCategory": "ORDINARY",
            "fromStop": {
              "id": "uuid",
              "code": "COL-NUG-01",
              "name": "Nugegoda",
              "nameSi": "නුගේගොඩ",
              "nameTa": "நுகேகோடா",
              "lat": 6.8730,
              "lng": 79.8975
            },
            "toStop": {
              "id": "uuid",
              "code": "CMB-FORT-01",
              "name": "Fort",
              "lat": 6.9344,
              "lng": 79.8428
            },
            "scheduledDeparture": "2026-07-30T07:14:00+05:30",
            "scheduledArrival": "2026-07-30T07:49:00+05:30",
            "durationMinutes": 35,
            "fare": {
              "amount": 42.00,
              "currency": "LKR",
              "status": "CONFIRMED",
              "source": "NTC_OFFICIAL",
              "passengerType": "ADULT",
              "stageFrom": 1,
              "stageTo": 4
            },
            "liveTracking": {
              "available": true,
              "vehicleId": "uuid",
              "vehicleReg": "WP-KP-3847",
              "lastUpdateAt": "2026-07-30T07:08:45+05:30",
              "nextStop": "Kirulapona",
              "etaMinutes": 4,
              "occupancy": "MEDIUM"
            },
            "ticketBooking": {
              "available": false,
              "reason": "ORDINARY_STANDING_ONLY"
            },
            "accessibility": {
              "wheelchairAccessible": false
            }
          }
        ]
      }
    ],
    "resolvedFrom": {
      "text": "Nugegoda",
      "lat": 6.8730,
      "lng": 79.8975,
      "type": "BUS_STOP"
    },
    "resolvedTo": {
      "text": "Fort",
      "lat": 6.9344,
      "lng": 79.8428,
      "type": "BUS_STOP"
    }
  },
  "meta": {
    "searchId": "srch_abc123",
    "executionMs": 287
  }
}
```

**Error responses:**
- `404 ORIGIN_NOT_FOUND` — origin could not be resolved to any known stop
- `404 DESTINATION_NOT_FOUND` — destination not resolved
- `200` with empty `journeys` array — no routes found (not an error)

---

### GET /search/stops/nearby

Find bus stops near a coordinate.

**Query Parameters:** `lat`, `lng`, `radiusMeters` (default 500, max 2000), `page`, `perPage`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "stops": [
      {
        "id": "uuid",
        "code": "COL-NUG-01",
        "name": "Nugegoda Bus Stand",
        "nameSi": "නුගේගොඩ බස් නැවතුම",
        "nameTa": "நுகேகோடா பேருந்து நிறுத்தம்",
        "lat": 6.8730,
        "lng": 79.8975,
        "distanceMeters": 87,
        "routes": [
          { "number": "177", "destination": "Fort" },
          { "number": "138", "destination": "Colombo" }
        ],
        "hasLiveTracking": true,
        "wheelchairAccessible": false
      }
    ]
  }
}
```

---

### GET /search/autocomplete

Autocomplete for place names, stop names, and landmarks.

**Query Parameters:** `q` (min 2 chars), `locale` (en|si|ta), `lat`, `lng` (optional, boosts nearby results)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "id": "uuid",
        "type": "BUS_STOP",
        "label": "Fort Bus Stand, Colombo",
        "labelSi": "කොළඹ ෆෝට් බස් නැවතුම",
        "lat": 6.9344,
        "lng": 79.8428
      },
      {
        "id": "uuid",
        "type": "PLACE",
        "label": "Fort, Colombo",
        "lat": 6.9333,
        "lng": 79.8427
      }
    ]
  }
}
```

---

## 4. Passenger — Fares

### GET /fares

Calculate fare for a specific journey leg.

**Query Parameters:**

| Parameter | Type | Required |
|-----------|------|----------|
| `routeId` | uuid | Yes |
| `fromStopId` | uuid | Yes |
| `toStopId` | uuid | Yes |
| `passengerType` | enum | Yes |
| `busCategory` | enum | Yes |
| `travelDate` | date | No |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "fare": {
      "amount": 42.00,
      "currency": "LKR",
      "passengerType": "ADULT",
      "busCategory": "ORDINARY",
      "stageFrom": 1,
      "stageTo": 4,
      "status": "CONFIRMED",
      "statusLabel": "NTC Approved Fare",
      "statusLabelSi": "NTC අනුමත ගාස්තු",
      "source": {
        "type": "NTC_OFFICIAL",
        "name": "National Transport Commission",
        "revisionCode": "NTC-2026-003",
        "effectiveFrom": "2026-03-01T00:00:00Z"
      },
      "updatedAt": "2026-07-01T08:30:00Z"
    },
    "disclaimer": null
  }
}
```

**Fare status values:**

| Status | Meaning | UI Treatment |
|--------|---------|-------------|
| `CONFIRMED` | Operator or NTC-supplied current fare | Green badge — "Official fare" |
| `ESTIMATED` | Approximated from distance/stage | Yellow badge — "Estimated — not confirmed by operator" |
| `UNAVAILABLE` | No fare data for this route/type | Red badge — "Fare unavailable" |

---

## 5. Passenger — Live Tracking

### GET /tracking/routes/{routeId}/vehicles

Get current positions of all vehicles on a route.

**Auth:** Optional

**Response 200:**
```json
{
  "success": true,
  "data": {
    "routeId": "uuid",
    "dataAvailable": true,
    "lastUpdatedAt": "2026-07-30T07:09:05+05:30",
    "vehicles": [
      {
        "vehicleId": "uuid",
        "vehicleReg": "WP-KP-3847",
        "fleetId": "JE-018",
        "lat": 6.8912,
        "lng": 79.8843,
        "heading": 347,
        "speedKmh": 28.5,
        "occupancy": "MEDIUM",
        "nextStopId": "uuid",
        "nextStopName": "Kirulapona",
        "etaNextStopMinutes": 2,
        "direction": 0,
        "tripId": "uuid",
        "updatedAt": "2026-07-30T07:09:02+05:30"
      }
    ],
    "alerts": []
  }
}
```

When tracking unavailable:
```json
{
  "success": true,
  "data": {
    "dataAvailable": false,
    "reason": "OPERATOR_GPS_OFFLINE",
    "message": "Live tracking is currently unavailable. Schedule-based estimates are being shown.",
    "estimatedResumption": null,
    "scheduleBasedEta": "2026-07-30T07:14:00+05:30"
  }
}
```

---

### WebSocket: /ws/tracking

**Connection:** `wss://api.buslanka.lk/v1/ws/tracking`

**Client subscribe message:**
```json
{ "type": "SUBSCRIBE", "routeId": "uuid", "tripId": "uuid" }
```

**Server position update (every 10 s max):**
```json
{
  "type": "VEHICLE_POSITION",
  "vehicleId": "uuid",
  "lat": 6.8912,
  "lng": 79.8843,
  "heading": 347,
  "speedKmh": 28.5,
  "occupancy": "MEDIUM",
  "nextStop": "Kirulapona",
  "etaMinutes": 2,
  "updatedAt": "2026-07-30T07:09:02+05:30"
}
```

**Server alert:**
```json
{
  "type": "SERVICE_ALERT",
  "alertId": "uuid",
  "severity": "WARNING",
  "message": "Route 177 is delayed by approximately 15 minutes due to traffic.",
  "messageSi": "...",
  "messageTa": "..."
}
```

**Server tracking unavailable:**
```json
{
  "type": "TRACKING_UNAVAILABLE",
  "reason": "OPERATOR_GPS_OFFLINE",
  "message": "Live tracking is currently unavailable."
}
```

**Client unsubscribe:**
```json
{ "type": "UNSUBSCRIBE", "routeId": "uuid" }
```

---

## 6. Passenger — Bookings

### POST /bookings

Create a booking and lock the seat.

**Auth:** Required (PASSENGER)

**Headers:** `Idempotency-Key: {uuid}`

**Request:**
```json
{
  "tripId": "uuid",
  "fromStopId": "uuid",
  "toStopId": "uuid",
  "passengerType": "ADULT",
  "seatId": "uuid"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "bookingId": "uuid",
    "reference": "BL-20260731-0041",
    "status": "PENDING",
    "expiresAt": "2026-07-31T06:55:00+05:30",
    "fare": {
      "amount": 420.00,
      "currency": "LKR",
      "bookingFee": 10.00,
      "total": 430.00
    },
    "seat": {
      "seatId": "uuid",
      "seatNumber": "14A"
    }
  }
}
```

---

### POST /bookings/{bookingId}/pay

Initiate payment for a pending booking.

**Auth:** Required (PASSENGER, owner)

**Headers:** `Idempotency-Key: {uuid}`

**Request:**
```json
{
  "paymentMethod": "CARD",
  "paymentToken": "tok_visa_gateway_token"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "paymentId": "uuid",
    "status": "PROCESSING",
    "gatewayRedirectUrl": null,
    "pollingUrl": "/v1/bookings/{bookingId}/payment-status"
  }
}
```

---

### GET /bookings/{bookingId}/ticket

Get QR-code ticket for a confirmed booking.

**Auth:** Required (PASSENGER, owner)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "ticketId": "uuid",
    "bookingReference": "BL-20260731-0041",
    "qrPayload": "eyJ...",
    "qrImageUrl": "https://cdn.buslanka.lk/tickets/BL-20260731-0041.png",
    "passengerName": "Thomas M.",
    "route": "Colombo Fort → Kandy",
    "fromStop": "Colombo Fort",
    "toStop": "Kandy",
    "seatNumber": "14A",
    "departure": "2026-07-31T07:00:00+05:30",
    "busCategory": "EXPRESSWAY",
    "operator": "Jayantha Express (Pvt) Ltd",
    "farePaid": 430.00,
    "currency": "LKR",
    "validFrom": "2026-07-31T06:00:00+05:30",
    "validTo": "2026-07-31T14:00:00+05:30",
    "status": "ISSUED",
    "issuedAt": "2026-07-30T19:22:00+05:30"
  }
}
```

---

### GET /bookings

List passenger bookings.

**Auth:** Required (PASSENGER)

**Query params:** `status`, `from`, `to` (dates), `page`, `perPage`

---

### POST /bookings/{bookingId}/cancel

Cancel a booking and initiate refund if eligible.

**Auth:** Required (PASSENGER, owner or PLATFORM_ADMIN)

**Request:**
```json
{
  "reason": "Change of plans"
}
```

---

## 7. Operator API — Data Ingest

All operator endpoints require `X-Api-Key` header.

---

### POST /operator/vehicles/{vehicleId}/location

Submit real-time GPS location for a vehicle.

**Rate limit:** 600/min per API key.

**Request:**
```json
{
  "tripId": "uuid",
  "lat": 6.8912,
  "lng": 79.8843,
  "heading": 347,
  "speedKmh": 28.5,
  "occupancy": "MEDIUM",
  "timestamp": "2026-07-30T07:09:02+05:30"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "received": true,
    "receivedAt": "2026-07-30T07:09:03Z",
    "validationWarnings": []
  }
}
```

**Rejection responses:**
```json
{
  "success": false,
  "error": {
    "code": "GPS_OUT_OF_BOUNDS",
    "message": "Coordinates (6.89, 79.88) are outside the declared service area for this vehicle.",
    "requestId": "req_01HZ..."
  }
}
```

---

### POST /operator/trips

Create or update a trip assignment.

**Request:**
```json
{
  "externalTripId": "OPR-TRIP-20260730-001",
  "scheduleId": "uuid",
  "vehicleId": "uuid",
  "driverId": "uuid",
  "conductorId": "uuid",
  "departureTime": "2026-07-30T07:00:00+05:30"
}
```

---

### POST /operator/trips/{tripId}/alerts

Submit a service alert for a trip.

**Request:**
```json
{
  "alertType": "DELAY",
  "severity": "WARNING",
  "title": "Route 177 delayed due to traffic",
  "titleSi": "ගමනාගමන තදබදය හේතුවෙන් 177 මාර්ගය ප‍්‍රමාද",
  "titleTa": "போக்குவரத்து நெரிசல் காரணமாக 177 வழி தாமதமாகிறது",
  "description": "Approximately 15 minutes late at Kirulapona due to accident on Baseline Road.",
  "affectedStopIds": ["uuid", "uuid"],
  "estimatedDelayMinutes": 15,
  "startsAt": "2026-07-30T07:05:00+05:30",
  "endsAt": null
}
```

---

### POST /operator/fares

Submit fare table for a route.

**Request:**
```json
{
  "routeId": "uuid",
  "busCategory": "EXPRESSWAY",
  "effectiveFrom": "2026-08-01T00:00:00+05:30",
  "ntcRevisionCode": "NTC-2026-003",
  "fareRules": [
    {
      "stageFrom": 1,
      "stageTo": 2,
      "passengerType": "ADULT",
      "amount": 120.00
    },
    {
      "stageFrom": 1,
      "stageTo": 2,
      "passengerType": "CHILD",
      "amount": 60.00
    },
    {
      "stageFrom": 1,
      "stageTo": 4,
      "passengerType": "ADULT",
      "amount": 420.00
    }
  ],
  "operatorDeclaration": "I confirm these fares comply with the NTC-approved schedule."
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "submissionId": "uuid",
    "status": "ACCEPTED",
    "warnings": [
      "Student fare not provided for Stage 1→3. Passengers selecting student type will see fare as unavailable."
    ],
    "effectiveFrom": "2026-08-01T00:00:00+05:30"
  }
}
```

---

## 8. Operator Portal API

These endpoints are used by the operator web portal (authenticated as OPERATOR_ADMIN).

---

### GET /operator/portal/dashboard

Operator summary dashboard data.

**Response:** Active routes count, fleet online count, bookings today, active alerts, API health score, last GPS update.

---

### POST /operator/routes

Create a new route.

**Request:**
```json
{
  "routeNumber": "177",
  "name": "Nugegoda – Fort",
  "nameSi": "නුගේගොඩ – ෆෝට්",
  "nameTa": "நுகேகோடா – போர்ட்",
  "busCategory": "ORDINARY",
  "originStopId": "uuid",
  "destStopId": "uuid",
  "path": {
    "type": "LineString",
    "coordinates": [[79.8975, 6.8730], [79.8428, 6.9344]]
  },
  "stops": [
    { "stopId": "uuid", "sequence": 1, "direction": 0, "fareStageNumber": 1 },
    { "stopId": "uuid", "sequence": 2, "direction": 0, "fareStageNumber": 2 }
  ]
}
```

---

### PUT /operator/routes/{routeId}

Update route (triggers re-validation and re-approval if significant change).

---

### GET /operator/routes/{routeId}/bookings

View bookings on operator routes.

**Query params:** `tripId`, `date`, `status`, `page`, `perPage`

---

## 9. Administration API

All endpoints require `PLATFORM_ADMIN` or `PLATFORM_SUPERADMIN` role.

---

### GET /admin/operators

List all operators with status filter.

**Query params:** `status` (PENDING|ACTIVE|SUSPENDED), `page`, `perPage`

---

### POST /admin/operators/{operatorId}/approve

Approve operator registration.

**Request:**
```json
{
  "notes": "NTC licence verified. Company registration confirmed."
}
```

---

### POST /admin/operators/{operatorId}/suspend

Suspend operator.

**Request:**
```json
{
  "reason": "Multiple fare overcharge complaints verified.",
  "durationDays": 30
}
```

---

### GET /admin/audit-logs

Retrieve audit log entries.

**Query params:** `actorId`, `resource`, `resourceId`, `action`, `from`, `to`, `page`, `perPage`

**Response:** Array of audit log entries (see schema).

---

### GET /admin/data-quality/gps

GPS data quality report per operator.

**Response:**
```json
{
  "success": true,
  "data": {
    "operators": [
      {
        "operatorId": "uuid",
        "operatorName": "Jayantha Express",
        "activeVehicles": 18,
        "vehiclesReporting": 12,
        "avgUpdateIntervalSeconds": 12.4,
        "staleVehicles": [
          { "vehicleId": "uuid", "lastSeenMinutesAgo": 18 }
        ],
        "uptimePercent1h": 34.2
      }
    ]
  }
}
```

---

### POST /admin/fare-revisions

Publish an official NTC fare revision.

**Request:**
```json
{
  "revisionCode": "NTC-2026-003",
  "title": "Bus Fare Revision March 2026",
  "effectiveDate": "2026-03-01T00:00:00+05:30",
  "gazetteUrl": "https://gazette.lk/...",
  "notes": "Ordinary bus fares increased by 8%."
}
```

---

## 10. Conductor / Driver API

Authentication uses operator-issued session token (PIN-based login).

---

### POST /crew/trips/{tripId}/start

Start a trip.

**Auth:** DRIVER or CONDUCTOR (assigned to trip)

**Request:**
```json
{
  "vehicleId": "uuid",
  "actualDepartureTime": "2026-07-30T05:32:00+05:30"
}
```

---

### POST /crew/trips/{tripId}/end

End a trip.

**Request:**
```json
{
  "actualArrivalTime": "2026-07-30T08:15:00+05:30"
}
```

---

### POST /crew/tickets/validate

Validate a passenger QR-code ticket.

**Request:**
```json
{
  "qrPayload": "eyJ...",
  "tripId": "uuid",
  "validationMode": "ONLINE"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "bookingReference": "BL-20260731-0041",
    "passengerType": "ADULT",
    "fromStop": "Colombo Fort",
    "toStop": "Kandy",
    "seatNumber": "14A",
    "validUntil": "2026-07-31T14:00:00+05:30",
    "alreadyValidated": false
  }
}
```

**Invalid ticket response:**
```json
{
  "success": true,
  "data": {
    "valid": false,
    "reason": "TICKET_EXPIRED",
    "message": "This ticket expired on 2026-07-30."
  }
}
```

---

### POST /crew/trips/{tripId}/events

Report a trip event (delay, breakdown, diversion).

**Request:**
```json
{
  "eventType": "DELAY",
  "reason": "TRAFFIC",
  "estimatedDelayMinutes": 15,
  "currentStopId": "uuid",
  "notes": "Accident on Baseline Road"
}
```

---

### POST /crew/trips/{tripId}/occupancy

Update vehicle occupancy level.

**Request:**
```json
{
  "occupancy": "HIGH",
  "estimatedPassengerCount": 42
}
```

---

## 11. Webhook Payloads (Payment Gateway → BusLanka)

### Payment Succeeded

```json
{
  "event": "payment.succeeded",
  "data": {
    "gatewayChargeId": "ch_1abc123",
    "gatewayIntentId": "pi_1abc123",
    "amount": 43000,
    "currency": "LKR",
    "metadata": {
      "bookingId": "uuid",
      "buslanka_idempotency_key": "uuid"
    }
  },
  "timestamp": "2026-07-30T19:22:00Z"
}
```

All incoming webhooks verified using HMAC-SHA256 signature in `X-Webhook-Signature` header before processing.

---

## 12. QR Ticket Payload (Offline-Verifiable JWT)

QR codes contain a compact, signed JWT:

**Header:** `{ "alg": "RS256", "kid": "qr-signing-key-v1" }`

**Payload:**
```json
{
  "iss": "buslanka.lk",
  "sub": "BL-20260731-0041",
  "iat": 1753804920,
  "exp": 1753836000,
  "t": {
    "bid": "booking-uuid",
    "tid": "trip-uuid",
    "fsi": "from-stop-id",
    "tsi": "to-stop-id",
    "pt": "ADULT",
    "sn": "14A",
    "f": 43000,
    "cur": "LKR"
  }
}
```

The conductor app contains the public key and verifies the signature without a network call. The server also validates and records validations when online.
