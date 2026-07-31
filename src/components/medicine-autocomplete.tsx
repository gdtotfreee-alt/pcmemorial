'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  searchMedicineTemplates,
  getMedicineTemplates,
  getMedicineCount,
  refreshMedicineTemplatesInBackground,
  type MedicineTemplate,
} from '@/lib/medicine-master';import type { Medicine } from '@/app/page';

interface MedicineAutocompleteProps {
  onSelect: (medicine: Medicine) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function MedicineAutocomplete({
  onSelect,
  placeholder = '🔍 Search from Medicine Master or type manually...',
  disabled = false,
  className = '',
}: MedicineAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch medicine templates from server on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await getMedicineTemplates();
        if (!cancelled) setVersion((v) => v + 1);
      } catch (err) {
        console.error('Failed to load medicine master:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Periodically refresh the cache (every 15s) to pick up changes from other devices.
  // This never blanks the cache first — old data keeps serving search results
  // until the new data has actually arrived.
  useEffect(() => {
    const interval = setInterval(async () => {
      await refreshMedicineTemplatesInBackground();
      setVersion((v) => v + 1);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const results = useMemo(() => {
    void version;
    if (!query.trim()) return [];
    return searchMedicineTemplates(query);
  }, [query, version]);

  const masterCount = getMedicineCount();

  const handleSelect = useCallback((template: MedicineTemplate) => {
    const med: Medicine = {
      name: template.name,
      nameHi: template.nameHi || '',
      dosage: template.dosage || '',
      frequency: template.frequency || '',
      duration: template.duration || '',
      instructions: template.instructions || '',
      instructionsHi: template.instructionsHi || '',
      maen: template.maen || undefined,
    };
    onSelect(med);
    setQuery('');
    setShowDropdown(false);
  }, [onSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowDropdown(false);
      return;
    }
    if (e.key === 'Enter') {
      if (results.length === 1) {
        handleSelect(results[0]);
      }
    }
  }, [results, handleSelect]);

  const handleOutsideClick = useCallback(() => {
    setShowDropdown(false);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleOutsideClick();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [handleOutsideClick]);

  const highlightMatch = (text: string, search: string) => {
    if (!search.trim()) return text;
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="text-emerald-700 font-semibold bg-emerald-100 rounded px-0.5">{part}</span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
          onFocus={() => { if (query.trim()) setShowDropdown(true); }}
          onKeyDown={handleKeyDown}
          placeholder={loading ? 'Loading medicines...' : placeholder}
          disabled={disabled}
          className="w-full h-9 pl-3 pr-10 rounded-lg border border-emerald-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {query ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
            onClick={() => { setQuery(''); setShowDropdown(false); inputRef.current?.focus(); }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : (
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && query.trim() && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-emerald-200 rounded-xl shadow-lg">
          <div className="max-h-64 overflow-y-auto overscroll-contain rounded-xl">
            <div className="p-1">
              {results.length > 0 && (
                <div className="px-2 py-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Medicine Master ({results.length})
                  </span>
                </div>
              )}
              {results.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-emerald-50 transition-colors flex items-center gap-3"
                  onClick={() => handleSelect(t)}
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 font-medium text-[13px] truncate">
                      {highlightMatch(t.name, query)}
                    </p>
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-gray-400">
                      {t.category && (
                        <Badge variant="secondary" className="text-[9px] bg-teal-100 text-teal-700 px-1 py-0 h-4">
                          {t.category}
                        </Badge>
                      )}
                      {t.dosage && <span>{t.dosage}</span>}
                      {t.duration && <span>• {t.duration}</span>}
                      {t.frequency && <span>• {t.frequency.split('(')[0].trim()}</span>}
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0 opacity-0 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              ))}

              {results.length === 0 && (
                <div className="px-3 py-4 text-center">
                  <p className="text-gray-400 text-xs">No match in Medicine Master</p>
                  <p className="text-gray-300 text-[11px] mt-1">Fill the fields below manually, or add it to Medicine Master</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hint when empty */}
      {!query && masterCount > 0 && (
        <p className="text-[10px] text-emerald-500 mt-0.5">
          {masterCount} medicines available in master — type to search
        </p>
      )}
      {!query && masterCount === 0 && !loading && (
        <p className="text-[10px] text-gray-400 mt-0.5">
          Medicine Master is empty — add medicines from the header &quot;Medicine Master&quot; button
        </p>
      )}
    </div>
  );
}