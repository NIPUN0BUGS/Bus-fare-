# BusLanka — Design System

**Version:** 1.0  
**Date:** 2026-07-30

All values in this file are stored in design tokens. The product name, logo, and brand colours are defined here and referenced throughout the codebase — change them here to rebrand.

---

## 1. Brand Tokens

```ts
// packages/ui/tokens/brand.ts
export const brand = {
  productName: 'BusLanka',
  productNameSi: 'බස්ලංකා',
  productNameTa: 'பஸ்லங்கா',
  tagline: 'Your journey, your way.',
  taglineSi: 'ඔබේ ගමන, ඔබේ ආකාරයෙන්.',
  taglineTa: 'உங்கள் பயணம், உங்கள் வழியில்.',
} as const;
```

---

## 2. Colour Tokens

Inspired by Sri Lankan identity: deep ocean blue (trust, transport), warm amber (energy, action), clean white space.

```ts
export const colors = {
  // Brand
  primary: {
    50:  '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#2563EB',  // Primary brand blue
    600: '#1D4ED8',
    700: '#1E40AF',
    800: '#1E3A8A',
    900: '#1E3270',
  },
  accent: {
    50:  '#FFFBEB',
    100: '#FEF3C7',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',  // Amber accent — CTAs, fare amounts
    600: '#D97706',
    700: '#B45309',
  },

  // Semantic
  success:  '#16A34A',  // Confirmed fare, valid ticket, on-time
  warning:  '#D97706',  // Estimated fare, minor delay
  danger:   '#DC2626',  // Unavailable fare, cancelled, invalid
  info:     '#0284C7',  // Live tracking active, informational

  // Status — bus service
  liveActive:      '#16A34A',  // Green dot — live GPS
  liveUnavailable: '#6B7280',  // Grey dot — no GPS
  onTime:          '#16A34A',
  delayed:         '#D97706',
  cancelled:       '#DC2626',
  breakdown:       '#7C3AED',  // Purple — breakdown alert

  // Occupancy
  occupancyEmpty:  '#D1FAE5',
  occupancyLow:    '#BBF7D0',
  occupancyMedium: '#FEF3C7',
  occupancyHigh:   '#FED7AA',
  occupancyFull:   '#FECACA',

  // Neutral
  gray: {
    50:  '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  white: '#FFFFFF',
  black: '#000000',
} as const;
```

---

## 3. Typography

```ts
export const typography = {
  fontFamily: {
    // System stack — renders Sinhala and Tamil correctly on all devices
    sans: [
      'Noto Sans',          // Covers EN, SI, TA with good coverage
      'system-ui',
      '-apple-system',
      'sans-serif',
    ],
    // Sinhala override
    sinhala: ['Noto Sans Sinhala', 'Noto Sans', 'sans-serif'],
    // Tamil override
    tamil:   ['Noto Sans Tamil', 'Noto Sans', 'sans-serif'],
    mono:    ['JetBrains Mono', 'monospace'],
  },
  fontSize: {
    xs:   ['12px', { lineHeight: '16px' }],
    sm:   ['14px', { lineHeight: '20px' }],
    base: ['16px', { lineHeight: '24px' }],
    lg:   ['18px', { lineHeight: '28px' }],
    xl:   ['20px', { lineHeight: '28px' }],
    '2xl':['24px', { lineHeight: '32px' }],
    '3xl':['30px', { lineHeight: '36px' }],
    '4xl':['36px', { lineHeight: '40px' }],
  },
  fontWeight: {
    normal:   '400',
    medium:   '500',
    semibold: '600',
    bold:     '700',
  },
} as const;
```

---

## 4. Spacing and Layout

```ts
export const spacing = {
  // 4px base grid
  0.5: '2px',
  1:   '4px',
  2:   '8px',
  3:   '12px',
  4:   '16px',
  5:   '20px',
  6:   '24px',
  8:   '32px',
  10:  '40px',
  12:  '48px',
  16:  '64px',
  20:  '80px',
} as const;

export const layout = {
  maxWidthContent: '640px',   // Mobile-first content max width
  maxWidthWide:    '1200px',  // Admin/operator wide layout
  borderRadius: {
    sm:   '4px',
    md:   '8px',
    lg:   '12px',
    xl:   '16px',
    full: '9999px',
  },
  shadow: {
    sm:  '0 1px 2px rgba(0,0,0,0.05)',
    md:  '0 4px 6px rgba(0,0,0,0.07)',
    lg:  '0 10px 15px rgba(0,0,0,0.10)',
    card:'0 2px 8px rgba(0,0,0,0.08)',
  },
} as const;
```

---

## 5. Core Components

### FareDisplay

Displays a fare with source label, currency, and status badge. Never shows a number without its status.

```
┌──────────────────────────────────────────┐
│  LKR 42.00               ● NTC Approved  │
│  Adult · Ordinary · Stage 1 → 4          │
│  Last updated 2026-07-01                 │
└──────────────────────────────────────────┘
```

**Props:**
- `amount: number | null`
- `currency: 'LKR'`
- `status: 'CONFIRMED' | 'ESTIMATED' | 'UNAVAILABLE'`
- `source: { type, name, effectiveFrom }`
- `passengerType`
- `busCategory`

**States:**
- Confirmed: Blue badge "NTC Approved" or "Operator Fare"
- Estimated: Amber badge "Estimated" + disclaimer text
- Unavailable: Red badge "Unavailable" — amount not rendered

---

### JourneyCard

Compact card for journey results list.

```
┌─────────────────────────────────────────────┐
│ 177  Nugegoda → Fort                        │
│ 07:14 → 07:49  35 min  0 transfers          │
│                                             │
│ SLTB Western Province  ● Ordinary           │
│                  LKR 42 ● Live tracking     │
│                  [Book] (greyed — not avail)│
└─────────────────────────────────────────────┘
```

---

### LiveBusMarker (Map)

- Colour: Bus category colour (ordinary=blue, AC=green, expressway=purple)
- Shape: Bus icon with heading arrow
- Badge: Occupancy dot (green/amber/red)
- Tap: Popover showing route, ETA, occupancy, last update time

---

### AlertBanner

```
┌──────────────────────────────────────────────────────────────────┐
│ ⚠  Route 177 is delayed ~15 min due to traffic near Kirulapona. │
│    Schedule-based times shown.                            ✕      │
└──────────────────────────────────────────────────────────────────┘
```

Severity colours: INFO=blue, WARNING=amber, CRITICAL=red

---

### OfflineBanner

```
┌──────────────────────────────────────────────────────────────────┐
│ ○  You're offline. Showing saved routes and last known data.     │
└──────────────────────────────────────────────────────────────────┘
```

---

### TicketCard (QR Code)

```
┌────────────────────────────────────────┐
│  BusLanka         BL-20260731-0041     │
│                                        │
│  Colombo Fort → Kandy                  │
│  31 Jul 2026 · 07:00 · Seat 14A       │
│                                        │
│        ████████████████████           │
│        ██  ████  ██  ██  ██           │
│        ██  ████  ██  ██  ██           │
│        ████████████████████           │
│                                        │
│  LKR 430.00   Adult   Expressway AC   │
│  Jayantha Express (Pvt) Ltd           │
│  Valid until: 31 Jul 2026 14:00       │
└────────────────────────────────────────┘
```

---

## 6. Screen Inventory

| Screen | Route | Auth | Notes |
|--------|-------|------|-------|
| Splash / Onboarding | `/` (first launch) | No | 3-slide onboarding |
| Language Selection | `/language` | No | EN / SI / TA |
| Home / Search | `/` | Optional | Primary screen |
| Journey Results | `/results` | Optional | |
| Journey Detail | `/journey/:id` | Optional | |
| Fare Breakdown | `/journey/:id/fare` | Optional | |
| Live Map | `/map/:routeId` | Optional | |
| Stop Detail | `/stops/:stopId` | Optional | |
| Nearby Stops | `/nearby` | Optional | GPS required |
| Seat Selection | `/booking/seats` | Required | |
| Checkout | `/booking/checkout` | Required | |
| Payment Result | `/booking/result` | Required | |
| QR Ticket | `/bookings/:id/ticket` | Required | Offline capable |
| Booking History | `/bookings` | Required | |
| Saved Routes | `/saved` | Required | |
| Notifications | `/notifications` | Required | |
| Profile | `/profile` | Required | |
| Settings | `/settings` | Required | |
| Help / Complaints | `/help` | Optional | |
| Login | `/auth/login` | No | |
| Register | `/auth/register` | No | |

---

## 7. Accessibility Requirements

- Minimum tap target: 44×44px (iOS HIG), 48×48dp (Material)
- Focus ring: 2px solid `primary.500`, 2px offset
- All icons have `aria-label` or are `aria-hidden` with adjacent text
- Colour contrast: minimum 4.5:1 for body text, 3:1 for large text
- Status never communicated by colour alone — always include icon + label
- Reduced motion: all transitions optional when `prefers-reduced-motion: reduce`
- Screen reader landmarks: `<header>`, `<main>`, `<nav>`, `<footer>` on every page

---

## 8. Map Style

- Base style: Light transport-optimised map (Mapbox Light or OpenMapTiles)
- Sri Lanka default bounds: `[79.4, 5.9, 81.9, 9.9]`
- Default zoom: 13 (stop detail), 10 (route view), 8 (island overview)
- Bus route line: 4px, category colour, opacity 0.8
- Bus stop marker: 10px circle, white fill, category-colour stroke, 2px
- Live bus marker: animated bus icon, heading arrow, 36×36px
- Boarding stop: 14px circle, accent.500 fill
- Destination stop: 14px pin, accent.700 fill
- Walking path (to stop): dashed line, gray.400, 2px

---

## 9. Internationalisation Notes

### String files structure

```
packages/ui/locales/
├── en/
│   ├── common.json
│   ├── search.json
│   ├── fare.json
│   ├── tracking.json
│   ├── booking.json
│   ├── errors.json
│   └── accessibility.json
├── si/
│   └── (same structure)
└── ta/
    └── (same structure)
```

### Key naming convention

```
{screen}.{component}.{element}
e.g. fare.display.estimatedDisclaimer
     search.results.noRoutesFound
     errors.gps.permissionDenied
```

### Pluralisation

Use `i18next` `count` interpolation:
```json
{
  "transferCount_one": "{{count}} transfer",
  "transferCount_other": "{{count}} transfers"
}
```

### RTL

Sinhala and Tamil are both LTR scripts. No RTL layout support required.

### Font loading

Load Noto Sans, Noto Sans Sinhala, and Noto Sans Tamil via Google Fonts (or self-hosted for performance). Use `font-display: swap` to avoid blank text.
