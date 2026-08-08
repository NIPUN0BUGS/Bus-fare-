'use client';

import Link from 'next/link';
import { useState } from 'react';

type Tab = 'upcoming' | 'past';

const MOCK_UPCOMING = [
  {
    id: 'BL-001234',
    routeNumber: '594',
    routeName: 'Gampola → Kandy',
    fromStop: 'Gampola',
    toStop: 'Kandy City Centre Bus Stand',
    date: 'Today',
    time: '2:30 PM',
    fare: 'LKR 45.00',
    status: 'CONFIRMED',
    busCategory: 'Normal',
  },
];

const MOCK_PAST: typeof MOCK_UPCOMING = [];

const STATUS_STYLE: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-800',
  PENDING:   'bg-amber-100 text-amber-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function BookingsPage() {
  const [tab, setTab] = useState<Tab>('upcoming');

  const bookings = tab === 'upcoming' ? MOCK_UPCOMING : MOCK_PAST;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary-700 px-4 pt-10 pb-4 text-white">
        <Link href="/" className="text-primary-200 text-sm flex items-center gap-1 mb-3">
          ← Back
        </Link>
        <h1 className="text-xl font-bold">My Bookings</h1>
        <p className="text-primary-200 text-sm mt-1">Your bus ticket history</p>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 flex">
        {(['upcoming', 'past'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`py-3 px-4 text-sm font-medium border-b-2 capitalize transition-colors ${
              tab === t
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 py-4 max-w-lg mx-auto">
        {bookings.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">🎟️</p>
            <p className="text-gray-600 font-medium">No {tab} bookings</p>
            <p className="text-sm text-gray-400 mt-1">
              {tab === 'upcoming'
                ? 'Search for a bus and book your seat.'
                : 'Your completed trips will appear here.'}
            </p>
            {tab === 'upcoming' && (
              <Link href="/" className="mt-5 inline-block btn-primary text-sm px-8">
                Search Buses
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div key={b.id} className="bg-white rounded-2xl shadow-card p-4 space-y-3">
                {/* Route + status */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                      {b.routeNumber}
                    </span>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{b.routeName}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${STATUS_STYLE[b.status] ?? ''}`}>
                    {b.status}
                  </span>
                </div>

                {/* Stops */}
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center mt-1 gap-1">
                    <span className="w-2 h-2 rounded-full border-2 border-primary-500 bg-white" />
                    <span className="w-0.5 h-6 bg-gray-200" />
                    <span className="w-2 h-2 rounded-full bg-danger" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <p className="text-sm text-gray-700">{b.fromStop}</p>
                    <p className="text-sm text-gray-700">{b.toStop}</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    {b.date} · {b.time} · {b.busCategory}
                  </div>
                  <div className="text-sm font-bold text-gray-900">{b.fare}</div>
                </div>

                {/* Ref */}
                <p className="text-xs text-gray-300">Ref: {b.id}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
