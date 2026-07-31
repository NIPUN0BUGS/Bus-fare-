'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function SearchForm() {
  const router = useRouter();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!from.trim() || !to.trim()) return;
    setLoading(true);
    const params = new URLSearchParams({ fromText: from, toText: to });
    void router.push(`/results?${params.toString()}`);
  };

  const handleSwap = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Journey search">
      <div className="space-y-3">
        {/* From field */}
        <div>
          <label htmlFor="from-input" className="block text-sm font-medium text-gray-700 mb-1">
            From
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500" aria-hidden="true">
              ○
            </span>
            <input
              id="from-input"
              type="text"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="Origin — place, stop or landmark"
              className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg text-gray-900
                         placeholder:text-gray-400 focus:border-primary-500 focus:ring-1
                         focus:ring-primary-500 outline-none text-base"
              required
              autoComplete="off"
            />
          </div>
        </div>

        {/* Swap button */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleSwap}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            aria-label="Swap origin and destination"
          >
            ⇅
          </button>
        </div>

        {/* To field */}
        <div>
          <label htmlFor="to-input" className="block text-sm font-medium text-gray-700 mb-1">
            To
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-danger" aria-hidden="true">
              ●
            </span>
            <input
              id="to-input"
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Destination — place, stop or landmark"
              className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg text-gray-900
                         placeholder:text-gray-400 focus:border-primary-500 focus:ring-1
                         focus:ring-primary-500 outline-none text-base"
              required
              autoComplete="off"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !from.trim() || !to.trim()}
          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Searching...' : 'Search Buses'}
        </button>
      </div>
    </form>
  );
}
