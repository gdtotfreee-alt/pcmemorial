'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';

interface Doctor {
  id: string;
  name: string;
  specialization?: string;
  phone?: string;
  email?: string;
  address?: string;
  consultationFee?: number;
}

interface DoctorAutocompleteProps {
  /** Currently selected doctor name (prescriptions store doctorName as a string) */
  value: string;
  /** Called with the doctor's name when a doctor is selected */
  onChange: (doctorName: string) => void;
  label?: string;
  placeholder?: string;
}

/**
 * Autocomplete input for selecting a doctor from the Doctor Master.
 * Fetches all doctors from /api/doctors on mount, lets the user type to
 * filter, and auto-fills the doctor's name on selection. Free-text entry
 * is still allowed (so a doctor not in the master can still be typed).
 */
export function DoctorAutocomplete({
  value,
  onChange,
  label = 'Doctor Name',
  placeholder = 'Dr. ...',
}: DoctorAutocompleteProps) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch doctors from the Doctor Master once on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/doctors?limit=100');
        const data = await res.json();
        if (!cancelled && Array.isArray(data.doctors)) {
          setDoctors(data.doctors);
        }
      } catch (err) {
        console.error('Failed to fetch doctors for autocomplete:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // The currently selected doctor (matched by name, since value is a name string)
  const selectedDoctor = useMemo(() => {
    if (!value) return null;
    return doctors.find((d) => d.name === value) || null;
  }, [doctors, value]);

  // Filter doctors based on the typed query
  const filteredDoctors = useMemo(() => {
    if (!query.trim()) return doctors.slice(0, 20);
    const s = query.toLowerCase();
    return doctors
      .filter(
        (d) =>
          d.name.toLowerCase().includes(s) ||
          (d.specialization && d.specialization.toLowerCase().includes(s)) ||
          (d.phone && d.phone.includes(s))
      )
      .slice(0, 20);
  }, [query, doctors]);

  // Display text: while editing show the query; otherwise show the stored value
  const displayValue = editing ? query : value;

  const handleSelect = useCallback(
    (doctor: Doctor) => {
      onChange(doctor.name);
      setQuery('');
      setEditing(false);
      setShowDropdown(false);
    },
    [onChange]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setQuery(val);
      setEditing(true);
      setShowDropdown(true);
      // Live-update the form value so free-text entry works too
      onChange(val);
    },
    [onChange]
  );

  const handleFocus = useCallback(() => {
    setShowDropdown(true);
    if (value) {
      // Start editing from the current value so the user can refine
      setQuery(value);
      setEditing(true);
    }
  }, [value]);

  const handleBlur = useCallback(() => {
    // Small delay so a click on a dropdown item registers first
    setTimeout(() => {
      setShowDropdown(false);
      setEditing(false);
      setQuery('');
    }, 150);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowDropdown(false);
        setEditing(false);
        setQuery('');
      } else if (e.key === 'Enter') {
        if (filteredDoctors.length === 1) {
          e.preventDefault();
          handleSelect(filteredDoctors[0]);
        } else if (filteredDoctors.length > 0) {
          // Select the first match on Enter for quick entry
          e.preventDefault();
          handleSelect(filteredDoctors[0]);
        }
      }
    },
    [filteredDoctors, handleSelect]
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setEditing(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
        <span className="text-[10px] text-gray-400 font-normal">(type to search doctor master)</span>
      </label>

      <div className="relative">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={displayValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`w-full h-10 pl-9 pr-10 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-400 ${
              selectedDoctor
                ? 'border-emerald-400 bg-emerald-50/50'
                : 'border-emerald-200 bg-white focus:border-emerald-500'
            }`}
          />
          {displayValue && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => {
                onChange('');
                setQuery('');
                setEditing(false);
                inputRef.current?.focus();
              }}
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
                {filteredDoctors.length > 0 && (
                  <div className="px-2 py-1.5">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      {query.trim()
                        ? `Found ${filteredDoctors.length} doctor${filteredDoctors.length !== 1 ? 's' : ''}`
                        : `Doctor Master (${doctors.length})`}
                    </span>
                  </div>
                )}
                {filteredDoctors.map((doctor) => (
                  <button
                    key={doctor.id}
                    type="button"
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-3 group ${
                      value === doctor.name ? 'bg-emerald-100' : 'hover:bg-emerald-50'
                    }`}
                    onMouseDown={(e) => {
                      // Prevent input blur before click registers
                      e.preventDefault();
                      handleSelect(doctor);
                    }}
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-800 font-medium text-[13px] truncate">
                        {highlightMatch(doctor.name, query)}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400">
                        {doctor.specialization && (
                          <span className="text-blue-600">{highlightMatch(doctor.specialization, query)}</span>
                        )}
                        {doctor.phone && (
                          <>
                            <span>•</span>
                            <span>{highlightMatch(doctor.phone, query)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {value === doctor.name && (
                      <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}

                {filteredDoctors.length === 0 && (
                  <div className="px-3 py-6 text-center">
                    <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-gray-400 text-xs">No doctors match &ldquo;{query}&rdquo;</p>
                    <p className="text-gray-300 text-[11px] mt-1">
                      You can keep typing as free-text, or add doctors from the Doctors tab
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selected doctor info card */}
      {selectedDoctor && !editing && (
        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100 text-xs space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-emerald-800">{selectedDoctor.name}</span>
            {selectedDoctor.specialization && (
              <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700">
                {selectedDoctor.specialization}
              </Badge>
            )}
          </div>
          <div className="text-gray-600">
            {selectedDoctor.phone && `📞 ${selectedDoctor.phone}`}
            {selectedDoctor.email && ` | ✉️ ${selectedDoctor.email}`}
            {!selectedDoctor.phone && !selectedDoctor.email && 'Doctor Master record'}
          </div>
        </div>
      )}

      {/* Hint when nothing selected and no doctors in master */}
      {!value && doctors.length === 0 && !editing && (
        <p className="text-[11px] text-gray-400">
          No doctors in Doctor Master yet — add some from the Doctors tab, or type a name manually.
        </p>
      )}
      {!value && doctors.length > 0 && !editing && (
        <p className="text-[11px] text-gray-400">
          Start typing to search doctors by name, specialization, or phone
        </p>
      )}
    </div>
  );
}
