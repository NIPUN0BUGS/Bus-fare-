'use client';

import { useEffect, useRef, useState, use, useCallback } from 'react';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';

const API     = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/v1';
const WS_BASE = API.replace('/v1', '');

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Project bus lat/lng onto the from→to line segment, returns 0–1
function segmentProgress(
  busLat: number, busLng: number,
  fromLat: number, fromLng: number,
  toLat: number, toLng: number,
) {
  const vLat = toLat - fromLat, vLng = toLng - fromLng;
  const uLat = busLat - fromLat, uLng = busLng - fromLng;
  const dot = uLat * vLat + uLng * vLng;
  const len2 = vLat ** 2 + vLng ** 2;
  if (len2 === 0) return 0;
  return Math.min(1, Math.max(0, dot / len2));
}

interface RouteStop {
  id: string;
  name: string;
  nameSi?: string | null;
  sequence: number;
  lat: number;
  lng: number;
}

interface BusState {
  vehicleId: string;
  lat: number;
  lng: number;
  heading?: number | null;
  speedKmh?: number | null;
  occupancy?: string | null;
  updatedAt: string;
}

const OCC_LABEL: Record<string, string> = {
  EMPTY: 'Empty', LOW: 'Few seats', MEDIUM: 'Filling up',
  HIGH: 'Almost full', FULL: 'Full',
};
const OCC_COLOR: Record<string, { bg: string; text: string }> = {
  EMPTY:  { bg: 'bg-green-100',  text: 'text-green-700' },
  LOW:    { bg: 'bg-green-100',  text: 'text-green-700' },
  MEDIUM: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  HIGH:   { bg: 'bg-orange-100', text: 'text-orange-700' },
  FULL:   { bg: 'bg-red-100',    text: 'text-red-700' },
};

function distLabel(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}
function etaLabel(km: number, speedKmh?: number | null) {
  const spd = Math.max(speedKmh ?? 30, 5);
  const min = Math.round((km / spd) * 60);
  if (min <= 1) return 'Arriving';
  return `~${min} min`;
}

// ── Bus card ─────────────────────────────────────────────────────────────────
function BusCard({
  bus, distKm, isNearest, fromLat, fromLng, toLat, toLng, routeStops,
}: {
  bus: BusState;
  distKm: number;
  isNearest: boolean;
  fromLat: number; fromLng: number;
  toLat: number; toLng: number;
  routeStops: RouteStop[];
}) {
  const progress = segmentProgress(bus.lat, bus.lng, fromLat, fromLng, toLat, toLng);
  const pct = Math.round(progress * 100);

  // Find nearest route stop to bus
  const nearestStop = routeStops.length > 1
    ? routeStops.reduce((best, s) => {
        return haversineKm(bus.lat, bus.lng, s.lat, s.lng) <
               haversineKm(bus.lat, bus.lng, best.lat, best.lng) ? s : best;
      })
    : null;

  const occ = bus.occupancy ? OCC_COLOR[bus.occupancy] : null;

  return (
    <div className={`bg-white rounded-2xl shadow-card overflow-hidden transition-all ${
      isNearest ? 'ring-2 ring-primary-400' : ''
    }`}>
      {/* Plate + status row */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        {/* Number plate */}
        <div className="flex-shrink-0">
          <div className="bg-gray-900 text-white font-mono font-bold text-sm px-3 py-1.5 rounded-lg tracking-wider border-2 border-yellow-400">
            {bus.vehicleId}
          </div>
          {isNearest && (
            <p className="text-[10px] text-primary-500 font-semibold text-center mt-1">NEAREST</p>
          )}
        </div>

        {/* Right side */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-lg font-bold text-gray-900">{etaLabel(distKm, bus.speedKmh)}</p>
            {occ && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${occ.bg} ${occ.text}`}>
                {OCC_LABEL[bus.occupancy!] ?? bus.occupancy}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {distLabel(distKm)} away
            {bus.speedKmh ? ` · ${Math.round(bus.speedKmh)} km/h` : ''}
          </p>
          {nearestStop && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              Near: {nearestStop.name}
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-4">
        <div className="relative h-2 bg-gray-100 rounded-full">
          <div
            className="absolute inset-y-0 left-0 bg-primary-400 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
          <div
            className="absolute -top-[3px] w-[18px] h-[18px] rounded-full bg-primary-600 border-2 border-white shadow flex items-center justify-center text-[9px] transition-all duration-700"
            style={{ left: `calc(${pct}% - 9px)` }}
          >
            🚌
          </div>
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-1.5">
          <span>Your stop</span>
          <span>Destination</span>
        </div>
      </div>

      <p className="text-[10px] text-gray-300 text-right px-4 pb-2">
        {new Date(bus.updatedAt).toLocaleTimeString()}
      </p>
    </div>
  );
}

// ── Stop timeline ─────────────────────────────────────────────────────────────
function StopTimeline({
  stops, fromName, toName, buses,
}: {
  stops: RouteStop[];
  fromName: string;
  toName: string;
  buses: BusState[];
}) {
  if (stops.length === 0) return null;

  // Which stop index is each bus closest to?
  const busStopIndexes = buses.map((bus) =>
    stops.reduce((best, stop, i) => {
      const d = haversineKm(bus.lat, bus.lng, stop.lat, stop.lng);
      const bd = haversineKm(bus.lat, bus.lng, stops[best].lat, stops[best].lng);
      return d < bd ? i : best;
    }, 0),
  );

  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-50">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Route Stops</p>
      </div>
      <div className="px-4 py-2">
        {stops.map((stop, i) => {
          const isFirst   = i === 0;
          const isLast    = i === stops.length - 1;
          const isFrom    = stop.name === fromName;
          const isTo      = stop.name === toName;
          const busesHere = buses.filter((_, bi) => busStopIndexes[bi] === i);

          return (
            <div key={stop.id} className="flex gap-3 relative min-h-[44px]">
              {/* Spine */}
              <div className="flex flex-col items-center flex-shrink-0 w-5">
                <div className={`w-3 h-3 rounded-full border-2 mt-3 z-10 flex-shrink-0 ${
                  isFrom || isTo ? 'border-primary-500 bg-primary-500 scale-110' : 'border-gray-300 bg-white'
                }`} />
                {!isLast && <div className="flex-1 w-0.5 bg-gray-200 min-h-[28px]" />}
              </div>

              {/* Bus dots next to the stop */}
              {busesHere.length > 0 && (
                <div className="absolute left-4 top-2.5 flex gap-1 z-20">
                  {busesHere.map((b) => (
                    <div
                      key={b.vehicleId}
                      title={b.vehicleId}
                      className="w-5 h-5 bg-primary-600 rounded-full border-2 border-white shadow-md flex items-center justify-center text-[9px] animate-bounce"
                    >
                      🚌
                    </div>
                  ))}
                </div>
              )}

              {/* Stop label */}
              <div className={`flex-1 py-2.5 flex items-center justify-between ${!isLast ? 'border-b border-gray-50' : ''}`}>
                <div>
                  <p className={`text-sm ${isFrom || isTo ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                    {stop.name}
                  </p>
                  {stop.nameSi && (
                    <p className="text-xs text-gray-400 font-sinhala">{stop.nameSi}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                  {isFrom && <span className="text-[10px] font-semibold text-primary-500 bg-primary-50 px-1.5 py-0.5 rounded-full">Your stop</span>}
                  {isTo   && <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">Destination</span>}
                  {busesHere.length > 0 && (
                    <span className="text-[10px] font-semibold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded-full">
                      🚌 {busesHere.map(b => b.vehicleId).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TrackPage({
  params,
  searchParams,
}: {
  params: Promise<{ routeId: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { routeId } = use(params);
  const sp          = use(searchParams);

  const routeNumber = sp.routeNumber ?? '';
  const routeName   = sp.routeName   ?? '';
  const fromName    = sp.fromName    ?? 'Your stop';
  const toName      = sp.toName      ?? 'Destination';
  const fromLat     = parseFloat(sp.fromLat ?? '0');
  const fromLng     = parseFloat(sp.fromLng ?? '0');
  const toLat       = parseFloat(sp.toLat   ?? '0');
  const toLng       = parseFloat(sp.toLng   ?? '0');

  const socketRef = useRef<Socket | null>(null);

  const [wsStatus, setWsStatus]     = useState<'waiting' | 'live' | 'no-data'>('waiting');
  const [buses, setBuses]           = useState<Map<string, BusState>>(new Map());
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);

  // Fetch ordered route stops
  useEffect(() => {
    fetch(`${API}/routes/${routeId}/stops`)
      .then((r) => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) setRouteStops(data as RouteStop[]);
      })
      .catch(() => {});
  }, [routeId]);

  // WebSocket
  const handlePosition = useCallback((data: BusState) => {
    setWsStatus('live');
    setBuses((prev) => new Map(prev).set(data.vehicleId, data));
  }, []);

  useEffect(() => {
    const socket = io(`${WS_BASE}/v1/ws/tracking`, { transports: ['websocket'] });
    socketRef.current = socket;

    const noDataTimer = setTimeout(
      () => setWsStatus((s) => s === 'waiting' ? 'no-data' : s),
      6000,
    );

    socket.on('connect',    () => socket.emit('SUBSCRIBE', { routeId }));
    socket.on('disconnect', () => setWsStatus((s) => s === 'live' ? 'no-data' : s));
    socket.on('VEHICLE_POSITION', handlePosition);

    return () => {
      clearTimeout(noDataTimer);
      socket.disconnect();
    };
  }, [routeId, handlePosition]);

  const busArray = [...buses.values()];

  // Sort by distance to fromStop (nearest first)
  const sorted = [...busArray].sort(
    (a, b) =>
      haversineKm(a.lat, a.lng, fromLat, fromLng) -
      haversineKm(b.lat, b.lng, fromLat, fromLng),
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary-700 px-4 pt-10 pb-5 text-white">
        <button
          onClick={() => history.back()}
          className="text-primary-200 text-sm flex items-center gap-1 mb-3"
        >
          ← Back
        </button>
        <div className="flex items-start justify-between">
          <div>
            {routeNumber && (
              <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">
                Route {routeNumber}
              </span>
            )}
            <h1 className="text-lg font-bold mt-1 leading-tight">
              {routeName || 'Live Tracking'}
            </h1>
            <p className="text-primary-200 text-xs mt-0.5">
              {fromName} → {toName}
            </p>
          </div>

          {/* Live badge */}
          <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
            wsStatus === 'live'    ? 'bg-green-500/20 text-green-300' :
            wsStatus === 'no-data' ? 'bg-gray-500/20 text-gray-300'  :
                                     'bg-yellow-500/20 text-yellow-300'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              wsStatus === 'live'    ? 'bg-green-400 animate-pulse' :
              wsStatus === 'no-data' ? 'bg-gray-400'                :
                                       'bg-yellow-400 animate-pulse'
            }`} />
            {wsStatus === 'live'
              ? `${sorted.length} bus${sorted.length !== 1 ? 'es' : ''} live`
              : wsStatus === 'no-data' ? 'No signal' : 'Connecting…'}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">

        {/* ── No signal ──────────────────────────────────────────────────── */}
        {wsStatus === 'no-data' && (
          <div className="bg-white rounded-2xl shadow-card p-5 text-center">
            <p className="text-3xl mb-2">📡</p>
            <p className="text-gray-700 font-semibold">No live buses on this route</p>
            <p className="text-sm text-gray-400 mt-1">
              GPS tracking is not yet active. Check back closer to departure time.
            </p>
          </div>
        )}

        {/* ── Connecting spinner ─────────────────────────────────────────── */}
        {wsStatus === 'waiting' && (
          <div className="bg-white rounded-2xl shadow-card p-5 text-center">
            <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Connecting to live tracking…</p>
          </div>
        )}

        {/* ── Bus cards (one per live bus, sorted by distance) ───────────── */}
        {sorted.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide px-1">
              Buses approaching your stop
            </p>
            {sorted.map((bus, i) => (
              <BusCard
                key={bus.vehicleId}
                bus={bus}
                distKm={haversineKm(bus.lat, bus.lng, fromLat, fromLng)}
                isNearest={i === 0}
                fromLat={fromLat} fromLng={fromLng}
                toLat={toLat}     toLng={toLng}
                routeStops={routeStops}
              />
            ))}
          </div>
        )}

        {/* ── Stop timeline ─────────────────────────────────────────────── */}
        <StopTimeline
          stops={routeStops}
          fromName={fromName}
          toName={toName}
          buses={busArray}
        />

        {/* Fallback if no route stops in DB */}
        {routeStops.length === 0 && (
          <div className="bg-white rounded-2xl shadow-card p-4 flex items-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-primary-500" />
              <div className="w-0.5 h-10 bg-gray-200" />
              <div className="w-3 h-3 rounded-full border-2 border-gray-400" />
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-900">
                {fromName}
                <span className="ml-1.5 text-[10px] font-normal text-primary-500 bg-primary-50 px-1.5 py-0.5 rounded-full">Your stop</span>
              </p>
              <p className="text-sm text-gray-600">{toName}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
