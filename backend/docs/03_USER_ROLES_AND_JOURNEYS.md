# BusLanka — User Roles and User Journeys

**Version:** 1.0  
**Date:** 2026-07-30

---

## 1. User Roles Reference

### Role Matrix

| Role | Platform | Authentication | Primary Goal |
|------|----------|---------------|-------------|
| Guest Passenger | Web, Mobile | None required | Browse routes and fares |
| Registered Passenger | Web, Mobile | Phone/Email + OTP | Buy tickets, save routes, get alerts |
| Tourist Passenger | Web, Mobile | None / optional | Find routes in English with landmarks |
| Private Bus Operator Admin | Operator Portal | Email + Password + 2FA | Manage routes, fares, and fleet |
| Operator Route Manager | Operator Portal | Email + Password | Manage routes and stops only |
| Operator Fare Manager | Operator Portal | Email + Password | Submit and update fare tables |
| Operator Fleet Manager | Operator Portal | Email + Password | Manage vehicles and tracking |
| Conductor | Crew Mobile App | Operator credential + PIN | Validate tickets, report trip events |
| Driver | Crew Mobile App | Operator credential + PIN | Submit GPS, report trip events |
| Platform Admin | Admin Portal | Email + Password + TOTP | Approve operators, manage data |
| Platform Superadmin | Admin Portal | Email + Password + TOTP | Full platform control and audit |
| API Integration Client | Operator API | OAuth 2.0 / API key | Submit real-time data programmatically |

---

## 2. Persona Profiles

### Passenger — Nirosha (Daily Commuter)

- Age: 28, lives in Nugegoda, works in Fort, Colombo
- Device: Android mid-range phone, Sinhala preferred language
- Connectivity: 4G in city, sometimes weak underground
- Journey: Daily commute 177, Nugegoda–Fort, same route every weekday
- Pain points: Bus often late; sometimes she boards the wrong variant (Dehiwala vs. direct); fare went up last month and she wants to know the correct amount

### Passenger — Thomas (Tourist)

- Age: 35, visiting from Germany, renting a guesthouse in Galle
- Device: iPhone, English only
- Connectivity: Local SIM with 4G
- Journey: One-time trip Galle to Kandy, unsure which buses go there or whether a transfer is needed
- Pain points: Conductors quote varying fares to foreigners; no map of the route; not sure which stop to get off at

### Operator Admin — Jayantha (Bus Company Owner)

- Age: 52, owns 18 buses, Colombo–Kandy route
- Device: Windows laptop, Sinhala preferred
- Connectivity: Broadband office
- Situation: Has GPS units on 12 of 18 buses; has existing route-management software but no public API
- Pain points: Fare revision issued by NTC takes weeks to reach public; wants to advertise AC buses on a digital platform

### Conductor — Lalith

- Age: 34, operates on route 138, Kaduwela–Colombo
- Device: Basic Android phone provided by operator
- Connectivity: 4G in city, unreliable in outer areas
- Shift: 5:30 am to 8:00 pm
- Pain points: Paper ticketing is slow; counting passengers for occupancy is manual

### Platform Admin — Priya

- Age: 41, works for the BusLanka operations team
- Device: MacBook
- Situation: Reviews new operator registrations, investigates fare complaints, monitors API health
- Pain points: No single view of which operators are submitting stale GPS; fare disputes are handled by email

---

## 3. User Journeys

---

### Journey 1: Guest Passenger Searches for a Route

**Trigger:** Nirosha opens the app for the first time and wants to find a bus from Nugegoda to Fort.

**Pre-conditions:** App is installed; no account required.

```
Step 1  Nirosha opens BusLanka
        System shows Home screen in Sinhala (auto-detected from device locale)
        Prominent search bar: "From" and "To" fields

Step 2  Nirosha taps "From" field
        System offers: Use my location | Type a place | Choose from map
        Nirosha taps "Use my location"
        System requests GPS permission (first time)
        System resolves GPS to "Nugegoda" and populates the From field

Step 3  Nirosha taps "To" field and types "ෆෝට්" (Sinhala for Fort)
        System shows autocomplete suggestions: Fort, Colombo Fort Railway Station
        Nirosha selects "Fort, Colombo"

Step 4  Nirosha taps "Search"
        System runs search (< 1.5 s)
        
Step 5  Journey results screen appears
        Shows: Route 177 (Nugegoda–Fort), Route 133 (Nugegoda–Fort via Borella), Route 154 (with transfer at Borella)
        Each result shows: departure time, estimated arrival, fare (LKR 42.00), bus type (Ordinary), operator, transfers
        Sorted by next departure time by default

Step 6  Nirosha taps Route 177 result
        Journey detail screen shows:
        - Full route stops list
        - Fare breakdown: Adult, Ordinary, Stage 4, LKR 42.00 (NTC Approved, effective 2026-03-01)
        - Next departures: 07:14, 07:22, 07:35
        - Live tracking: "Tracking available — next bus is 3 stops away"
        - Option: "See on map"

Step 7  Nirosha taps "See on map"
        Map shows bus marker moving toward Nugegoda stop
        ETA label: "Arrives Nugegoda in ~4 min"
```

**Outcome:** Nirosha knows which bus to board, its fare, and when it will arrive without creating an account.

**Error cases:**
- GPS denied → System falls back to text search; prompts to enable location for better experience
- No routes found → "We couldn't find a direct route. You may need to transfer at [Borella]. Tap to see suggestions."
- Fare unavailable for operator → "Fare for this service is not yet available. Contact the conductor for the current fare."

---

### Journey 2: Registered Passenger Buys a Ticket

**Trigger:** Thomas wants to reserve a seat on the Colombo–Kandy Expressway AC bus the next morning.

**Pre-conditions:** Thomas has registered using his phone number; payment method saved.

```
Step 1  Thomas searches: From "Colombo Fort" To "Kandy"
        Results include Expressway AC service: departs 07:00, arrives ~10:30, fare LKR 420.00 (Adult)
        Seat reservation icon shown

Step 2  Thomas taps "Book Seat"
        Seat map shown for the bus: 40 seats, 12 available
        Thomas selects seat 14A (window, right side)

Step 3  Thomas reviews booking summary:
        Route: Colombo Fort → Kandy, Expressway AC
        Seat: 14A
        Passenger: Adult
        Fare: LKR 420.00 + Booking fee LKR 10.00 = LKR 430.00
        Departure: 2026-07-31 07:00

Step 4  Thomas taps "Proceed to Payment"
        Payment screen shows saved card (Visa ending 4242) and option to add new method
        Thomas taps "Pay LKR 430.00"

Step 5  System creates payment intent; sends to payment gateway
        Gateway returns success
        System creates booking record, marks seat reserved

Step 6  Booking confirmation screen:
        Booking reference: BL-20260731-0041
        QR code displayed
        "Download ticket" / "Share" buttons

Step 7  Thomas is on the bus; conductor opens crew app and scans QR
        Crew app shows: VALID — Thomas, seat 14A, Colombo Fort → Kandy
        Conductor taps "Validate"; system records validation timestamp
```

**Error cases:**
- Seat taken between selection and payment → "Seat 14A was just taken. Please select another seat." Returns to seat map.
- Payment declined → "Payment was unsuccessful. Please try a different payment method." Booking not created.
- Booking expired (user waited 10 min on payment screen without paying) → "Your reserved seat has been released. Please restart your booking."

---

### Journey 3: Operator Onboards and Submits Routes and Fares

**Trigger:** Jayantha's company wants to list their Colombo–Kandy service on BusLanka.

```
Step 1  Jayantha visits operator.buslanka.lk
        Clicks "Register as Operator"
        Fills in: Company name, NTC licence number, contact details, bank account for settlement

Step 2  System sends email with verification link
        Jayantha clicks link; account activated as "Pending Review"

Step 3  Jayantha uploads: Business registration certificate, NTC licence PDF
        System saves to object storage; notifies admin team

Step 4  Platform admin Priya receives notification
        Priya reviews documents in admin portal
        NTC licence number queried against NTC database (or manual check)
        Priya clicks "Approve Operator"
        Jayantha receives approval email with API documentation link

Step 5  Jayantha logs in to operator portal
        Dashboard shows: 0 routes, 0 vehicles, API credentials section
        
Step 6  Jayantha clicks "Add Route"
        Form: Route number, route name, from district, to district
        System loads map; Jayantha draws the route path and places stops
        Alternative: Upload route as GeoJSON or CSV of stop coordinates

Step 7  Jayantha sets fare table for the route:
        Bus category: Expressway AC
        Fare stages: Colombo Fort (Stage 1), Ambepussa (Stage 2), Kegalle (Stage 3), Kandy (Stage 4)
        Adult fares: Stage 1→2 LKR 120, 1→3 LKR 250, 1→4 LKR 420
        Child fares: 50% of adult
        Effective date: 2026-08-01

Step 8  System validates submission:
        - Checks stages are monotonically increasing with route direction
        - Checks adult fares do not exceed NTC maximum for Expressway AC
        - Checks all stops have valid coordinates
        Success: route and fares saved; visible to passengers from effective date

Step 9  Jayantha copies API key from portal
        Configures their GPS tracking software to POST to:
        POST /v1/operator/vehicles/{id}/location (every 10 s per vehicle)
        System begins receiving and displaying live locations
```

**Error cases:**
- Fare exceeds NTC maximum → "The fare LKR 550 for Stage 1→4 exceeds the NTC-approved maximum of LKR 450 for Expressway AC. Please correct and resubmit."
- Route overlaps with unlicensed corridor → Route flagged for admin review; not published until cleared.
- GPS coordinates fall outside service area → Update rejected with error code `GPS_OUT_OF_BOUNDS`.

---

### Journey 4: Conductor Manages a Trip

**Trigger:** Lalith starts his morning shift on route 138.

```
Step 1  Lalith opens crew app on his phone
        Enters his PIN
        App shows: Assigned vehicle KP-3847, Route 138 Kaduwela→Colombo

Step 2  Lalith taps "Start Trip"
        App asks: Confirm vehicle KP-3847, departure time 05:30?
        Lalith confirms
        System records trip start; GPS stream begins

Step 3  Mid-route: traffic jam at Malabe
        Lalith taps "Report Delay"
        Selects reason: "Traffic congestion"
        Estimated delay: 15 minutes
        System broadcasts alert to all passengers subscribed to route 138

Step 4  Passenger boards with QR ticket
        Lalith opens "Validate Ticket" in app
        Scans QR with phone camera
        App shows: VALID — Adult, Colombo Fort → Malabe, Seat — (standing)
        Green checkmark; Lalith taps confirm

Step 5  App loses connectivity at tunnel
        Validation fails to reach server
        App uses cached offline-validation: checks QR signature locally
        Shows: VALID (offline check)
        Validation queued for server sync when connectivity returns

Step 6  Lalith reaches Colombo terminus
        Taps "End Trip"
        App syncs: 3 queued validations, 1 occupancy update, 1 delay report
        Trip record closed
```

---

### Journey 5: Admin Reviews Data Quality

**Trigger:** Priya gets an automated alert: "Operator Jayantha Express — GPS data stale for 18 minutes on vehicle KP-3847."

```
Step 1  Priya opens admin portal, sees alert on dashboard
        Taps through to operator's fleet view
        KP-3847 last update: 18 min ago, last known location: Kegalle

Step 2  Priya checks API health panel for Jayantha Express
        Success rate last 1 hour: 34% (normal is >95%)
        Error breakdown: 61% timeout, 5% 401 Unauthorized

Step 3  Priya emails operator contact on file
        System sends templated message via in-portal action (logs the action)

Step 4  Priya adds a note to the operator record:
        "GPS outage reported 2026-07-30 09:42. Contacted operator. Awaiting response."
        Note logged in audit trail

Step 5  While waiting, Priya updates the service status for route Colombo–Kandy to:
        "Live tracking temporarily unavailable. Schedule-based times are shown."
        Passengers on active tracking subscriptions receive in-app notification

Step 6  2 hours later, GPS stream resumes (operator restarted their server)
        System auto-updates status back to "Live tracking available"
        Priya receives resolution notification
```

---

### Journey 6: Passenger Receives an Approaching Bus Alert

**Trigger:** Nirosha saved Route 177 as a favourite and enabled "approaching bus" alerts.

```
Step 1  At 07:10 am, Nirosha is walking to Nugegoda bus stop
        BusLanka push notification: "Your Route 177 bus is 2 stops away (~5 min)"

Step 2  Nirosha taps notification
        App opens to live tracking map
        Bus marker shows current location; route line highlighted

Step 3  Bus approaches; ETA updates to 2 min
        Second notification (configurable): "Route 177 arriving in 2 min at Nugegoda"

Step 4  Nirosha boards; receives no further alerts until she enables next-journey tracking
```

---

### Journey 7: Passenger Files a Complaint

**Trigger:** Thomas was charged LKR 600 on the Kandy bus but BusLanka showed LKR 420.

```
Step 1  Thomas opens app → Profile → Help & Complaints
        Selects: "Incorrect fare charged by conductor"

Step 2  Complaint form:
        Route: Colombo Fort → Kandy
        Travel date: 2026-07-31
        Fare charged: LKR 600
        Fare shown by app: LKR 420
        Booking reference: BL-20260731-0041
        Optional: Photo of receipt or ticket
        Thomas submits

Step 3  System creates complaint ticket; sends confirmation to Thomas's email

Step 4  Admin Priya receives complaint
        System auto-links complaint to operator Jayantha Express
        Priya reviews booking record: confirmed fare was LKR 420 (NTC approved)
        Priya reviews whether operator submitted a higher fare in portal (none found)
        Priya marks complaint as: "Operator overcharged — referring to NTC"

Step 5  Thomas receives update email: "Your complaint has been reviewed and referred to the relevant authority."
        Complaint status visible in app under "My Complaints"
```

---

## 4. User Journey Map — Passenger Funnel

```
Awareness → Discovery → First Search → First Value → Registration → Ticket Purchase → Retention
    │              │            │              │              │               │              │
 Word of      App Store /    Enter         See fare       Phone/       Buy ticket,    Save routes,
 mouth,       Google,        From+To,      + bus         email +      get QR code,   alerts,
 social       Web search     tap Search    timing        OTP          board bus      share trips
```

Conversion gates:
- **First Search:** Zero friction (no account). Must deliver results in < 2 seconds.
- **Registration prompt:** Triggered naturally when user tries to save a route, set an alert, or buy a ticket.
- **First purchase:** Requires saved payment method; seamless checkout under 3 taps after payment method added.

---

## 5. Accessibility Journeys

### Screen Reader Journey (WCAG 2.2 AA)

```
1. Launch app → Focus lands on "Search" heading (announced: "BusLanka, Search, heading level 1")
2. Tap "From" field → Announced: "From, text field, double-tap to edit"
3. Type → Autocomplete list announced: "Nugegoda Bus Stand, 1 of 4 suggestions"
4. Select suggestion → Announced: "Nugegoda Bus Stand selected"
5. Journey results → Each result announced: "Route 177, Nugegoda to Fort, Departs 07:14, 
   42 rupees, Ordinary bus, 0 transfers, 35 minutes"
6. Fare unavailable → Announced: "Fare unavailable. Operator has not submitted current fare data."
```

### Low-Vision Journey

- Text size follows system setting up to 200% without layout breaks
- High-contrast mode inverts bus stop marker colours to yellow/black
- Fare amounts displayed in large font, not relying on colour alone to indicate status

### Offline Journey

```
1. No connectivity → Banner: "You're offline. Showing saved routes and last known schedules."
2. Saved route tapped → Shows last-synced schedule with: "Schedule last updated: 2026-07-29 18:30"
3. Active ticket tapped → QR code available (generated offline from stored signed payload)
4. Tap Search → "Search requires a connection. Your saved routes are available below."
```
