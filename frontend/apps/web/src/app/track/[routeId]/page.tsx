'use client';

import { useEffect, useRef, useState, use } from 'react';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';

const API    = process.env.NEXT_PUBLIC_API_URL  ?? 'http://localhost:3001/v1';
const WS_BASE = API.replace('/v1', '');

// ── Haversine distance in km ────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Project bus onto the from→to segment, return t ∈ [0,1] ─────────────────
function routeProgress(
  busLat: number, busLng: number,
  fromLat: number, fromLng: number,
  toLat: number, toLng: number,
) {
  const vLat = toLat - fromLat, vLng = toLng - fromLng;
  const uLat = busLat - fromLat, uLng = busLng - fromLng;
  const dot = uLat * vLat + uLng * vLng;
  const len2 = vLat * vLat + vLng * vLng;
  if (len2 === 0) return 0;
  return Math.min(1, Math.max(0, dot / len2));
}

// ── Types ───────────────────────────────────────────────────────────────────
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

type LiveStatus = 'waiting' | 'live' | 'no-data';

const OCCUPANCY_LABEL: Record<string, string> = {
  EMPTY: 'Empty', LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', FULL: 'Full',
};
const OCCUPANCY_COLOR: Record<string, string> = {
  EMPTY: 'text-green-600', LOW: 'text-green-600', MEDIUM: 'text-yellow-600',
  HIGH: 'text-orange-600', FULL: 'text-red-600',
};

// ── Page ────────────────────────────────────────────────────────────────────
export default function TrackPage({
  params,
  searchParams,
}: {
  params: Promise<{ routeId: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { routeId }   = use(params);
  const sp            = use(searchParams);

  const routeNumber   = sp.routeNumber  ?? '';
  const routeName     = sp.routeName    ?? '';
  const fromName      = sp.fromName     ?? 'Your stop';
  const toName        = sp.toName       ?? 'Destination';
  const fromLat       = parseFloat(sp.fromLat ?? '0');
  const fromLng       = parseFloat(sp.fromLng ?? '0');
  const toLat         = parseFloat(sp.toLat   ?? '0');
  const toLng         = parseFloat(sp.toLng   ?? '0');

  const socketRef = useRef<Socket | null>(null);

  const [status, setStatus]     = useState<LiveStatus>('waiting');
  const [buses, setBuses]       = useState<BusState[]>([]);
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch ordered route stops (optional — graceful empty fallback)
  useEffect(() => {
    fetch(`${API}/routes/${routeId}/stops`)
      .then((r) => r.json())
      .then((data: unknown) => {
        const arr = Array.isArray(data) ? data as RouteStop[] : [];
        setRouteStops(arr);
      })
      .catch(() => { /* no route stops in DB yet — use from/to only */ });
  }, [routeId]);

  // WebSocket
  useEffect(() => {
    const socket = io(`${WS_BASE}/v1/ws/tracking`, { transports: ['websocket'] });
    socketRef.current = socket;

    const noDataTimer = setTimeout(() => {
      setStatus((s) => s === 'waiting' ? 'no-data' : s);
    }, 6000);

    socket.on('connect', () => socket.emit('SUBSCRIBE', { routeId }));

    socket.on('VEHICLE_POSITION', (data: BusState) => {
      clearTimeout(noDataTimer);
      setStatus('live');
      setLastUpdate(new Date());
      setBuses((prev) => {
        const next = prev.filter((b) => b.vehicleId !== data.vehicleId);
        return [...next, data];
      });
    });

    return () => {
      clearTimeout(noDataTimer);
      socket.disconnect();
    };
  }, [routeId]);

  // Pick the nearest bus to the user's fromStop
  const nearestBus = buses.length > 0
    ? buses.reduce<BusState | null>((closest, b) => {
        if (!closest) return b;
        return haversineKm(b.lat, b.lng, fromLat, fromLng) <
               haversineKm(closest.lat, closest.lng, fromLat, fromLng)
          ? b : closest;
      }, null)
    : null;

  const progress = nearestBus
    ? routeProgress(nearestBus.lat, nearestBus.lng, fromLat, fromLng, toLat, toLng)
    : null;

  const distToFromKm = nearestBus
    ? haversineKm(nearestBus.lat, nearestBus.lng, fromLat, fromLng)
    : null;

  const etaMin = distToFromKm !== null && nearestBus
    ? Math.round((distToFromKm / Math.max(nearestBus.speedKmh ?? 30, 5)) * 60)
    : null;

  // Build the stop list to display
  // If we have route stops from DB, use them; otherwise synthesise from→to
  const displayStops: RouteStop[] = routeStops.length > 0
    ? routeStops
    : [
        { id: 'from', name: fromName, nameSi: null, sequence: 0, lat: fromLat, lng: fromLng },
        { id: 'to',   name: toName,   nameSi: null, sequence: 99, lat: toLat,  lng: toLng  },
      ];

  // Which stop index is the bus closest to?
  const busStopIndex = nearestBus && displayStops.length > 2
    ? displayStops.reduce<number>((best, stop, i) => {
        const d = haversineKm(nearestBus.lat, nearestBus.lng, stop.lat, stop.lng);
        const bestD = haversineKm(nearestBus.lat, nearestBus.lng, displayStops[best].lat, displayStops[best].lng);
        return d < bestD ? i : best;
      }, 0)
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary-700 px-4 pt-10 pb-5 text-white">
        <Link href="#" onClick={() => history.back()} className="text-primary-200 text-sm flex items-center gap-1 mb-3">
          ← Back
        </Link>
        <div className="flex items-start justify-between">
          <div>
            {routeNumber && (
              <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">
                Route {routeNumber}
              </span>
            )}
            <h1 className="text-lg font-bold mt-1 leading-tight">{routeName || 'Bus Tracker'}</h1>
          </div>

          {/* Live status badge */}
          <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
            status === 'live'    ? 'bg-green-500/20 text-green-300' :
            status === 'no-data' ? 'bg-gray-500/20 text-gray-300'  :
                                   'bg-yellow-500/20 text-yellow-300'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              status === 'live'    ? 'bg-green-400 animate-pulse' :
              status === 'no-data' ? 'bg-gray-400'                :
                                     'bg-yellow-400 animate-pulse'
            }`} />
            {status === 'live' ? 'Live' : status === 'no-data' ? 'No signal' : 'Waiting…'}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">

        {/* ── ETA card ─────────────────────────────────────────────────── */}
        {status === 'live' && nearestBus && (
          <div className="bg-white rounded-2xl shadow-card p-4">
            <p className="text-xs text-gray-400 mb-1">Nearest bus to your stop</p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-gray-900">
                  {etaMin !== null && etaMin <= 1 ? 'Arriving' : etaMin !== null ? `~${etaMin} min` : '—'}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {distToFromKm !== null
                    ? distToFromKm < 1
                      ? `${Math.round(distToFromKm * 1000)} m away`
                      : `${distToFromKm.toFixed(1)} km away`
                    : ''}
                  {nearestBus.speedKmh ? ` · ${Math.round(nearestBus.speedKmh)} km/h` : ''}
                </p>
              </div>
              {nearestBus.occupancy && (
                <div className="text-right">
                  <p className="text-xs text-gray-400">Occupancy</p>
                  <p className={`text-sm font-semibold ${OCCUPANCY_COLOR[nearestBus.occupancy] ?? 'text-gray-600'}`}>
                    {OCCUPANCY_LABEL[nearestBus.occupancy] ?? nearestBus.occupancy}
                  </p>
                </div>
              )}
            </div>

            {/* Progress bar along route */}
            {progress !== null && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{fromName}</span>
                  <span>{toName}</span>
                </div>
                <div className="relative h-2 bg-gray-100 rounded-full overflow-visible">
                  <div
                    className="absolute inset-y-0 left-0 bg-primary-400 rounded-full transition-all duration-700"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                  {/* Bus marker on bar */}
                  <div
                    className="absolute -top-1 w-4 h-4 bg-primary-600 rounded-full border-2 border-white shadow-md flex items-center justify-center text-[8px] transition-all duration-700"
                    style={{ left: `calc(${Math.round(progress * 100)}% - 8px)` }}
                  >
                    🚌
                  </div>
                </div>
              </div>
            )}

            {lastUpdate && (
              <p className="text-[10px] text-gray-300 mt-2 text-right">
                Updated {lastUpdate.toLocaleTimeString()}
              </p>
            )}
          </div>
        )}

        {/* ── No-data state ─────────────────────────────────────────────── */}
        {status === 'no-data' && (
          <div className="bg-white rounded-2xl shadow-card p-5 text-center">
            <p className="text-3xl mb-2">📡</p>
            <p className="text-gray-700 font-medium">No live bus data</p>
            <p className="text-sm text-gray-400 mt-1">
              GPS tracking is not yet active on this route.
              Check back closer to departure time.
            </p>
          </div>
        )}

        {/* ── Waiting state ─────────────────────────────────────────────── */}
        {status === 'waiting' && (
          <div className="bg-white rounded-2xl shadow-card p-5 text-center">
            <div className="w-8 h-8 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Connecting to live tracking…</p>
          </div>
        )}

        {/* ── Stop timeline ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Route Stops</p>
          </div>

          <div className="px-4 py-2">
            {displayStops.map((stop, i) => {
              const isFirst   = i === 0;
              const isLast    = i === displayStops.length - 1;
              const isFromStop = stop.id === 'from' || stop.name === fromName;
              const isToStop  = stop.id === 'to'   || stop.name === toName;
              const isBusHere = busStopIndex === i;
              const busPassed = busStopIndex !== null && i < busStopIndex;

              return (
                <div key={stop.id} className="flex gap-3 relative">
                  {/* Timeline spine */}
                  <div className="flex flex-col items-center flex-shrink-0 w-5">
                    {/* dot */}
                    <div className={`w-3 h-3 rounded-full border-2 mt-3 z-10 flex-shrink-0 ${
                      isFromStop || isToStop
                        ? 'border-primary-500 bg-primary-500'
                        : busPassed
                        ? 'border-gray-300 bg-gray-300'
                        : 'border-gray-300 bg-white'
                    }`} />
                    {/* line below */}
                    {!isLast && (
                      <div className={`flex-1 w-0.5 min-h-[28px] ${
                        busPassed ? 'bg-gray-200' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>

                  {/* Bus marker floating between stops */}
                  {isBusHere && nearestBus && (
                    <div className="absolute left-0 -translate-x-0.5 z-20" style={{ top: '2.2rem' }}>
                      <div className="w-5 h-5 bg-primary-600 rounded-full border-2 border-white shadow-md flex items-center justify-center text-[10px]">
                        🚌
                      </div>
                    </div>
                  )}

                  {/* Stop label */}
                  <div className={`flex-1 py-2.5 ${!isLast ? 'border-b border-gray-50' : ''}`}>
                    <p className={`text-sm ${
                      isFromStop || isToStop ? 'font-semibold text-gray-900' : 'text-gray-700'
                    } ${busPassed ? 'text-gray-400' : ''}`}>
                      {stop.name}
                      {isFromStop && <span className="ml-1.5 text-[10px] font-normal text-primary-500 bg-primary-50 px-1.5 py-0.5 rounded-full">Your stop</span>}
                      {isToStop   && <span className="ml-1.5 text-[10px] font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">Destination</span>}
                    </p>
                    {stop.nameSi && (
                      <p className="text-xs text-gray-400 font-sinhala">{stop.nameSi}</p>
                    )}
                  </div>
                </div>
              );
            })}

            {/* If only from/to, show note about partial data */}
            {displayStops.length === 2 && (
              <p className="text-[10px] text-gray-300 pb-2 pl-8">
                Full stop list not yet available for this route
              </p>
            )}
          </div>
        </div>

        {/* ── Multiple buses ─────────────────────────────────────────────── */}
        {buses.length > 1 && (
          <div className="bg-white rounded-2xl shadow-card p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              {buses.length} buses on this route
            </p>
            {buses.map((b) => {
              const d = haversineKm(b.lat, b.lng, fromLat, fromLng);
              return (
                <div key={b.vehicleId} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">🚌 {b.vehicleId}</span>
                  <span className="text-gray-500">
                    {d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`} away
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
