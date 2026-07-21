'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
// Native scroll used instead of ScrollArea for reliable mouse wheel support
import type { Patient } from '@/app/page';

interface PatientAutocompleteProps {
  patients: Patient[];
  value: string; // patient ID
  onChange: (patientId: string) => void;
  label?: string;
  placeholder?: string;
}

export function PatientAutocomplete({
  patients,
  value,
  onChange,
  label = 'Select Patient',
  placeholder = 'Type patient name, phone, or ID to search...',
}: PatientAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [clearedManually, setClearedManually] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedPatient = useMemo(() => {
    return patients.find((p) => p.id === value) || null;
  }, [patients, value]);

  // Filter patients based on query
  const filteredPatients = useMemo(() => {
    if (!query.trim()) {
      return patients.slice(0, 20);
    }
    const s = query.toLowerCase();
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        (p.phone && p.phone.includes(s)) ||
        p.id.toLowerCase().includes(s) ||
        p.age.toString().includes(s) ||
        p.gender.toLowerCase().includes(s)
    ).slice(0, 20);
  }, [query, patients]);

  // Compute display text from state - no effect needed
  const displayValue = useMemo(() => {
    if (clearedManually && query) return query;
    if (selectedPatient && !query) {
      return `${selectedPatient.name} (${selectedPatient.age}y, ${selectedPatient.gender})`;
    }
    return query;
  }, [selectedPatient, query, clearedManually]);

  const handleSelect = useCallback((patient: Patient) => {
    onChange(patient.id);
    setQuery('');
    setClearedManually(false);
    setShowDropdown(false);
  }, [onChange]);

  const handleClear = useCallback(() => {
    onChange('');
    setQuery('');
    setClearedManually(false);
    inputRef.current?.focus();
  }, [onChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setClearedManually(true);
    setShowDropdown(true);
    if (!val.trim() && selectedPatient) {
      onChange('');
    }
  }, [selectedPatient, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowDropdown(false);
      if (selectedPatient) {
        setQuery('');
        setClearedManually(false);
      }
      return;
    }
    if (e.key === 'Enter') {
      if (filteredPatients.length === 1) {
        handleSelect(filteredPatients[0]);
      }
    }
    if (e.key === 'Backspace' && !query && selectedPatient) {
      handleClear();
    }
  }, [filteredPatients, handleSelect, handleClear, query, selectedPatient]);

  const handleFocus = useCallback(() => {
    if (!selectedPatient) setShowDropdown(true);
  }, [selectedPatient]);

  const handleOutsideClick = useCallback(() => {
    setShowDropdown(false);
    if (selectedPatient) {
      setQuery('');
      setClearedManually(false);
    }
  }, [selectedPatient]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleOutsideClick();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [handleOutsideClick]);



  // Highlight matching text
  const highlightMatch = (text: string, search: string) => {
    if (!search.trim()) return text;
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="text-emerald-700 font-semibold bg-emerald-100 rounded px-0.5">
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div ref={containerRef} className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-2">
        {label}
        <span className="text-red-500">*</span>
        <span className="text-[10px] text-gray-400 font-normal">(type to search)</span>
      </label>

      {/* Search input */}
      <div className="relative">
        <div className="relative">
          {selectedPatient ? (
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ) : (
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
          <input
            ref={inputRef}
            type="text"
            value={displayValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`w-full h-10 pl-9 pr-10 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-400 ${
              selectedPatient
                ? 'border-emerald-400 bg-emerald-50/50'
                : 'border-emerald-200 bg-white focus:border-emerald-500'
            }`}
          />
          {displayValue && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={handleClear}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-emerald-200 rounded-xl shadow-lg">
            <div className="max-h-72 overflow-y-auto overscroll-contain rounded-xl">
              <div className="p-1">
                {filteredPatients.length > 0 && (
                  <div className="px-2 py-1.5">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      {query.trim()
                        ? `Found ${filteredPatients.length} patient${filteredPatients.length !== 1 ? 's' : ''}`
                        : `All Patients (${patients.length})`}
                    </span>
                  </div>
                )}
                {filteredPatients.map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-3 group ${
                      value === patient.id
                        ? 'bg-emerald-100'
                        : 'hover:bg-emerald-50'
                    }`}
                    onClick={() => handleSelect(patient)}
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-800 font-medium text-[13px] truncate">
                        {highlightMatch(patient.name, query)}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400">
                        <span>{patient.age}y</span>
                        <span>•</span>
                        <span>{patient.gender}</span>
                        {patient.phone && (
                          <>
                            <span>•</span>
                            <span>{highlightMatch(patient.phone, query)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 py-0 flex-shrink-0 ${
                        patient.gender === 'Male'
                          ? 'bg-blue-100 text-blue-700'
                          : patient.gender === 'Female'
                          ? 'bg-pink-100 text-pink-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {patient.gender.charAt(0)}
                    </Badge>
                    {value === patient.id && (
                      <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}

                {filteredPatients.length === 0 && (
                  <div className="px-3 py-6 text-center">
                    <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-gray-400 text-xs">
                      No patients found matching &ldquo;{query}&rdquo;
                    </p>
                    <p className="text-gray-300 text-[11px] mt-1">
                      Register new patients from the Patients tab
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selected patient info card */}
      {selectedPatient && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-emerald-800">{selectedPatient.name}</span>
            <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700">
              ID: {selectedPatient.id.slice(0, 8)}...
            </Badge>
          </div>
          <div className="text-gray-600">
            {selectedPatient.age}y | {selectedPatient.gender}
            {selectedPatient.phone && ` | 📞 ${selectedPatient.phone}`}
          </div>
        </div>
      )}

      {/* Hint when no patient selected */}
      {!selectedPatient && !query && (
        <p className="text-[11px] text-gray-400">
          Start typing to search patients by name, phone, age, or ID
        </p>
      )}
    </div>
  );
}
