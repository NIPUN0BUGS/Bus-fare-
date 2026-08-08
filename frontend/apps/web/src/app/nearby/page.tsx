'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/v1';

interface Stop {
  id: string;
  name: string;
  nameSi?: string | null;
  name_si?: string | null;
  nameTa?: string | null;
  name_ta?: string | null;
  lat: number;
  lng: number;
  stopCode?: string | null;
  stop_code?: string | null;
  distanceMeters?: number;
  distance_meters?: number;
}

type State =
  | { phase: 'requesting' }
  | { phase: 'loading'; lat: number; lng: number }
  | { phase: 'done'; stops: Stop[]; lat: number; lng: number }
  | { phase: 'error'; message: string };

function distanceLabel(stop: Stop) {
  const m = stop.distanceMeters ?? stop.distance_meters;
  if (!m) return '';
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

function stopName(stop: Stop) { return stop.name; }
function stopNameSi(stop: Stop) { return stop.nameSi ?? stop.name_si; }
function stopCode(stop: Stop) { return stop.stopCode ?? stop.stop_code; }

export default function NearbyPage() {
  const [state, setState] = useState<State>({ phase: 'requesting' });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({ phase: 'error', message: 'Your browser does not support geolocation.' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setState({ phase: 'loading', lat, lng });
        try {
          const res = await fetch(
            `${API}/search/stops/nearby?lat=${lat}&lng=${lng}&radiusMeters=1000&perPage=20`,
          );
          const data = (await res.json()) as Stop[] | { stops: Stop[] };
          const stops = Array.isArray(data) ? data : (data as { stops: Stop[] }).stops ?? [];
          setState({ phase: 'done', stops, lat, lng });
        } catch {
          setState({ phase: 'error', message: 'Could not load nearby stops. Is the backend running?' });
        }
      },
      (err) => {
        const messages: Record<number, string> = {
          1: 'Location access denied. Please allow location in your browser.',
          2: 'Location unavailable. Try again.',
          3: 'Location request timed out.',
        };
        setState({ phase: 'error', message: messages[err.code] ?? 'Location error.' });
      },
      { timeout: 10000 },
    );
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary-700 px-4 pt-10 pb-6 text-white">
        <Link href="/" className="text-primary-200 text-sm flex items-center gap-1 mb-3">
          ← Back
        </Link>
        <h1 className="text-xl font-bold">Nearby Stops</h1>
        <p className="text-primary-200 text-sm mt-1">Bus stops within 1 km of you</p>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto">
        {/* Requesting location */}
        {state.phase === 'requesting' && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📍</p>
            <p className="text-gray-600 font-medium">Requesting your location…</p>
            <p className="text-sm text-gray-400 mt-1">Allow location access when prompted</p>
          </div>
        )}

        {/* Loading stops */}
        {state.phase === 'loading' && (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-card p-4 animate-pulse flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {state.phase === 'error' && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">⚠️</p>
            <p className="text-gray-600 font-medium">{state.message}</p>
            <button
              onClick={() => setState({ phase: 'requesting' })}
              className="mt-4 btn-primary text-sm px-6"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Results */}
        {state.phase === 'done' && (
          <>
            {state.stops.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🚌</p>
                <p className="text-gray-600 font-medium">No stops found nearby</p>
                <p className="text-sm text-gray-400 mt-1">Try expanding the search area</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 mb-3">{state.stops.length} stops found</p>
                {state.stops.map((stop) => (
                  <div
                    key={stop.id}
                    className="bg-white rounded-2xl shadow-card p-4 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                      <span className="text-xl">🚏</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{stopName(stop)}</p>
                      {stopNameSi(stop) && (
                        <p className="text-xs text-gray-400 font-sinhala truncate">{stopNameSi(stop)}</p>
                      )}
                      {stopCode(stop) && (
                        <p className="text-xs text-gray-300 mt-0.5">{stopCode(stop)}</p>
                      )}
                    </div>
                    {distanceLabel(stop) && (
                      <span className="text-xs font-medium text-primary-600 flex-shrink-0">
                        {distanceLabel(stop)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
