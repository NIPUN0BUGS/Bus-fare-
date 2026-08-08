import { Suspense } from 'react';
import Link from 'next/link';
import { FareDisplay } from '@/components/fare/FareDisplay';
import { FareSourceType } from '@buslanka/shared-types';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/v1';

interface Stop { id: string; name: string; nameSi?: string | null; lat: number; lng: number; code?: string | null }
interface Leg {
  legIndex: number;
  routeId: string;
  routeNumber: string;
  routeName: string;
  busCategory: string;
  operator: { id: string; name: string };
  fromStop: Stop;
  toStop: Stop;
  fare: { amount: number | null; currency: string; status: FareSourceType; sourceName: string | null; effectiveFrom: string | null; updatedAt: string | null };
}
interface Journey { id: string; totalFare: Leg['fare']; totalDurationMinutes: number; transfers: number; legs: Leg[] }
interface SearchResult { journeys: Journey[]; resolvedFrom: { text: string } | null; resolvedTo: { text: string } | null }

async function fetchJourneys(params: URLSearchParams): Promise<SearchResult> {
  const res = await fetch(`${API}/search/journey?${params.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Search failed');
  return res.json() as Promise<SearchResult>;
}

function trackUrl(leg: Leg): string {
  const p = new URLSearchParams({
    routeNumber: leg.routeNumber,
    routeName: leg.routeName,
    fromStopId: leg.fromStop.id,
    fromName: leg.fromStop.name,
    fromLat: String(leg.fromStop.lat),
    fromLng: String(leg.fromStop.lng),
    toStopId: leg.toStop.id,
    toName: leg.toStop.name,
    toLat: String(leg.toStop.lat),
    toLng: String(leg.toStop.lng),
  });
  return `/track/${leg.routeId}?${p.toString()}`;
}

function JourneyCard({ journey }: { journey: Journey }) {
  const leg = journey.legs[0];
  return (
    <div className="bg-white rounded-2xl shadow-card p-4 space-y-3">
      {/* Route header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
            {leg?.routeNumber ?? '—'}
          </span>
          <p className="text-sm font-medium text-gray-800 mt-1">{leg?.routeName ?? 'Route'}</p>
        </div>
        <span className="text-xs text-gray-400 capitalize">{leg?.busCategory?.toLowerCase().replace('_', ' ')}</span>
      </div>

      {/* Stops */}
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center mt-1 gap-1">
          <span className="w-2.5 h-2.5 rounded-full border-2 border-primary-500 bg-white" />
          <span className="w-0.5 h-8 bg-gray-200" />
          <span className="w-2.5 h-2.5 rounded-full bg-danger" />
        </div>
        <div className="space-y-3 flex-1">
          <div>
            <p className="text-sm font-medium text-gray-900">{leg?.fromStop.name}</p>
            {leg?.fromStop.nameSi && <p className="text-xs text-gray-400 font-sinhala">{leg.fromStop.nameSi}</p>}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{leg?.toStop.name}</p>
            {leg?.toStop.nameSi && <p className="text-xs text-gray-400 font-sinhala">{leg.toStop.nameSi}</p>}
          </div>
        </div>
      </div>

      {/* Fare */}
      <FareDisplay
        amount={journey.totalFare.amount}
        currency={journey.totalFare.currency ?? 'LKR'}
        status={journey.totalFare.status}
        sourceName={journey.totalFare.sourceName}
        effectiveFrom={journey.totalFare.effectiveFrom}
        updatedAt={journey.totalFare.updatedAt}
        disclaimer={journey.totalFare.status === FareSourceType.ESTIMATED ? 'Fare is estimated and may vary.' : null}
      />

      {/* Track button */}
      {leg && (
        <Link
          href={trackUrl(leg)}
          className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-primary-50 text-primary-700 text-sm font-semibold hover:bg-primary-100 transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Track this bus
        </Link>
      )}
    </div>
  );
}

async function Results({ searchParams }: { searchParams: Record<string, string> }) {
  const params = new URLSearchParams(searchParams);
  let data: SearchResult;

  try {
    data = await fetchJourneys(params);
  } catch {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-3">⚠️</p>
        <p className="text-gray-600 font-medium">Could not reach the server.</p>
        <p className="text-sm text-gray-400 mt-1">Make sure the backend is running on port 3001.</p>
      </div>
    );
  }

  if (!data.journeys || data.journeys.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-3">🚌</p>
        <p className="text-gray-600 font-medium">No buses found</p>
        <p className="text-sm text-gray-400 mt-1">Try different stops or check the spelling.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">{data.journeys.length} route{data.journeys.length !== 1 ? 's' : ''} found</p>
      {data.journeys.map((j) => <JourneyCard key={j.id} journey={j} />)}
    </div>
  );
}

export default function ResultsPage({ searchParams }: { searchParams: Record<string, string> }) {
  const from = searchParams.fromText ?? '';
  const to = searchParams.toText ?? '';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary-700 px-4 pt-10 pb-6 text-white">
        <Link href="/" className="text-primary-200 text-sm mb-4 flex items-center gap-1">
          ← Back
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex flex-col gap-1 flex-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full border border-white" />
              <span className="text-sm font-medium capitalize">{from}</span>
            </div>
            <div className="w-0.5 h-3 bg-primary-400 ml-[3px]" />
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span className="text-sm font-medium capitalize">{to}</span>
            </div>
          </div>
          <Link
            href="/"
            className="text-primary-200 text-xs border border-primary-500 px-3 py-1.5 rounded-lg"
          >
            Change
          </Link>
        </div>
      </div>

      {/* Results */}
      <div className="px-4 py-4 max-w-lg mx-auto">
        <Suspense fallback={
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-card p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-2/3 mb-4" />
                <div className="h-16 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        }>
          <Results searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
