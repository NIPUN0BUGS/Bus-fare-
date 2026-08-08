'use client';

import { useState, useRef, useEffect, FormEvent, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Suggestion {
  id: string;
  label: string;
  labelSi?: string | null;
  lat: number;
  lng: number;
}

interface FieldState {
  text: string;
  selected: Suggestion | null;
  suggestions: Suggestion[];
  open: boolean;
}

const EMPTY: FieldState = { text: '', selected: null, suggestions: [], open: false };

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/v1';

function useAutocomplete(
  field: FieldState,
  setField: React.Dispatch<React.SetStateAction<FieldState>>,
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onChange = useCallback((text: string) => {
    setField((f) => ({ ...f, text, selected: null }));

    if (timer.current) clearTimeout(timer.current);
    if (text.length < 2) {
      setField((f) => ({ ...f, suggestions: [], open: false }));
      return;
    }

    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/search/autocomplete?q=${encodeURIComponent(text)}`);
        const data = (await res.json()) as { suggestions: Suggestion[] };
        setField((f) => ({ ...f, suggestions: data.suggestions ?? [], open: true }));
      } catch {
        // network error — keep existing suggestions
      }
    }, 250);
  }, [setField]);

  const onSelect = useCallback((s: Suggestion) => {
    setField({ text: s.label, selected: s, suggestions: [], open: false });
  }, [setField]);

  const onBlur = useCallback(() => {
    // small delay so click on suggestion registers first
    setTimeout(() => setField((f) => ({ ...f, open: false })), 150);
  }, [setField]);

  return { onChange, onSelect, onBlur };
}

interface InputWithSuggestionsProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  field: FieldState;
  setField: React.Dispatch<React.SetStateAction<FieldState>>;
  placeholder: string;
}

function InputWithSuggestions({ id, label, icon, field, setField, placeholder }: InputWithSuggestionsProps) {
  const { onChange, onSelect, onBlur } = useAutocomplete(field, setField);
  const listId = `${id}-list`;

  return (
    <div className="relative">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true">
          {icon}
        </span>
        <input
          id={id}
          type="text"
          value={field.text}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onFocus={() => field.suggestions.length > 0 && setField((f) => ({ ...f, open: true }))}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={field.open}
          aria-controls={listId}
          aria-autocomplete="list"
          required
          className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg text-gray-900
                     placeholder:text-gray-400 focus:border-primary-500 focus:ring-1
                     focus:ring-primary-500 outline-none text-base"
        />
      </div>

      {field.open && field.suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg
                     shadow-lg max-h-56 overflow-y-auto"
        >
          {field.suggestions.map((s) => (
            <li
              key={s.id}
              role="option"
              aria-selected={field.selected?.id === s.id}
              onMouseDown={() => onSelect(s)}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-primary-50
                         text-gray-900 border-b border-gray-100 last:border-0"
            >
              <span className="text-primary-500 text-lg flex-shrink-0">🚏</span>
              <span className="text-sm font-medium truncate">{s.label}</span>
              {s.labelSi && (
                <span className="text-xs text-gray-400 ml-auto flex-shrink-0 font-sinhala">
                  {s.labelSi}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SearchForm() {
  const router = useRouter();
  const [from, setFrom] = useState<FieldState>(EMPTY);
  const [to, setTo] = useState<FieldState>(EMPTY);
  const [loading, setLoading] = useState(false);

  const handleSwap = () => {
    setFrom(to);
    setTo(from);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!from.text.trim() || !to.text.trim()) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (from.selected) {
      params.set('fromLat', String(from.selected.lat));
      params.set('fromLng', String(from.selected.lng));
    } else {
      params.set('fromText', from.text);
    }
    if (to.selected) {
      params.set('toLat', String(to.selected.lat));
      params.set('toLng', String(to.selected.lng));
    } else {
      params.set('toText', to.text);
    }
    void router.push(`/results?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Journey search">
      <div className="space-y-3">
        <InputWithSuggestions
          id="from-input"
          label="From"
          icon={<span className="text-primary-500">○</span>}
          field={from}
          setField={setFrom}
          placeholder="Origin — place, stop or landmark"
        />

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

        <InputWithSuggestions
          id="to-input"
          label="To"
          icon={<span className="text-danger">●</span>}
          field={to}
          setField={setTo}
          placeholder="Destination — place, stop or landmark"
        />

        <button
          type="submit"
          disabled={loading || !from.text.trim() || !to.text.trim()}
          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Searching...' : 'Search Buses'}
        </button>
      </div>
    </form>
  );
}
