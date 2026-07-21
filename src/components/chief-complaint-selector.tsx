'use client';

import { useState, useMemo, useRef, useEffect, useSyncExternalStore } from 'react';
import { Badge } from '@/components/ui/badge';
import { getAllDiagnoses, getCategoryColor, type DiagnosisOption } from '@/lib/diagnosis-data';

const CUSTOM_ENTRIES_KEY = 'pcm-custom-chief-complaints';

function loadCustomEntries(): DiagnosisOption[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(CUSTOM_ENTRIES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveCustomEntries(entries: DiagnosisOption[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CUSTOM_ENTRIES_KEY, JSON.stringify(entries));
}

interface ChiefComplaintSelectorProps {
  selectedItems: DiagnosisOption[];
  onAdd: (item: DiagnosisOption) => void;
  onRemove: (id: string) => void;
  label?: string;
  placeholder?: string;
}

export function ChiefComplaintSelector({
  selectedItems,
  onAdd,
  onRemove,
  label = 'Chief Complaint',
  placeholder = 'Type to search complaints, injuries, fractures...',
}: ChiefComplaintSelectorProps) {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [customVersion, setCustomVersion] = useState(0);
  const noop = () => () => {};
  const isClient = useSyncExternalStore(noop, () => true, () => false);

  const customEntries = useMemo(() => {
    void customVersion;
    if (!isClient) return [];
    return loadCustomEntries();
  }, [customVersion, isClient]);

  const allOptions = useMemo(() => {
    return [...getAllDiagnoses(), ...customEntries];
  }, [customEntries]);

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return [];
    const s = query.toLowerCase();
    return allOptions.filter(
      (opt) =>
        !selectedItems.find((sel) => sel.id === opt.id) &&
        (opt.labelEn.toLowerCase().includes(s) || opt.labelHi.toLowerCase().includes(s))
    ).slice(0, 25);
  }, [query, allOptions, selectedItems]);

  const hasExactMatch = useMemo(() => {
    if (!query.trim()) return false;
    const s = query.trim().toLowerCase();
    return allOptions.some(
      (opt) => opt.labelEn.toLowerCase() === s || opt.labelHi.toLowerCase() === s
    );
  }, [query, allOptions]);

  const handleSelect = (option: DiagnosisOption) => {
    onAdd(option);
    setQuery('');
    setShowDropdown(false);
    setJustAdded(option.id);
    setTimeout(() => setJustAdded(null), 600);
    inputRef.current?.focus();
  };

  // Single-click add: save to localStorage and add to selection in one action
  const handleQuickAdd = () => {
    if (!query.trim() || hasExactMatch) return;
    const newEntry: DiagnosisOption = {
      id: `custom-${Date.now()}`,
      labelEn: query.trim(),
      labelHi: query.trim(),
      category: 'other',
    };
    const updated = [...customEntries, newEntry];
    saveCustomEntries(updated);
    setCustomVersion((v) => v + 1);
    onAdd(newEntry);
    setQuery('');
    setShowDropdown(false);
    setJustAdded(newEntry.id);
    setTimeout(() => setJustAdded(null), 600);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowDropdown(false);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      // If there's exactly one match, select it; otherwise quick-add
      if (filteredOptions.length === 1) {
        handleSelect(filteredOptions[0]);
      } else if (!hasExactMatch && query.trim()) {
        handleQuickAdd();
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="space-y-2">
      <style>{`
        @keyframes tagPopIn {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.08); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes tagPulse {
          0% { box-shadow: 0 0 0 0 rgba(5,150,105,0.4); }
          70% { box-shadow: 0 0 0 6px rgba(5,150,105,0); }
          100% { box-shadow: 0 0 0 0 rgba(5,150,105,0); }
        }
        @keyframes shimmerSlide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes dropdownFadeIn {
          0% { opacity: 0; transform: translateY(-6px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes inputGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(5,150,105,0); }
          50% { box-shadow: 0 0 0 3px rgba(5,150,105,0.15); }
        }
        .cc-tag-enter { animation: tagPopIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards, tagPulse 0.8s ease-out 0.3s; }
        .cc-tag-shimmer { position: relative; overflow: hidden; }
        .cc-tag-shimmer::after {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
          animation: shimmerSlide 0.6s ease-out forwards;
          pointer-events: none;
        }
        .cc-dropdown-enter { animation: dropdownFadeIn 0.2s ease-out forwards; }
        .cc-input-active { animation: inputGlow 2s ease-in-out infinite; }
        .cc-quick-add-btn {
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
          transition: all 0.2s ease;
        }
        .cc-quick-add-btn:hover {
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          transform: translateX(2px);
        }
      `}</style>

      {/* Label */}
      <label className="text-sm font-medium flex items-center gap-2">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {label}
        </span>
        <span className="text-[10px] text-gray-400 font-normal">(type & click to add instantly)</span>
      </label>

      {/* Selected tags */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedItems.map((item) => (
            <Badge
              key={item.id}
              variant="outline"
              className={`${getCategoryColor(item.category)} text-xs cursor-pointer hover:opacity-70 transition-all flex items-center gap-1 pr-1 ${justAdded === item.id ? 'cc-tag-enter cc-tag-shimmer' : ''}`}
              onClick={() => onRemove(item.id)}
            >
              <span>{item.labelEn}</span>
              <svg className="w-3 h-3 ml-0.5 text-gray-400 hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Badge>
          ))}
          <span className="text-[10px] text-gray-400 self-center ml-1">{selectedItems.length} selected</span>
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <div className="relative">
          <svg
            className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors ${query ? 'text-emerald-500' : 'text-gray-400'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => {
              if (query.trim()) setShowDropdown(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`w-full h-10 pl-9 pr-10 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-gray-400 transition-all duration-200 ${showDropdown ? 'cc-input-active border-emerald-400 shadow-sm' : 'border-emerald-200'}`}
          />
          {query && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              onClick={() => {
                setQuery('');
                setShowDropdown(false);
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
        {showDropdown && query.trim() && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-emerald-200 rounded-xl shadow-lg cc-dropdown-enter">
            <div className="max-h-72 overflow-y-auto overscroll-contain rounded-xl">
              <div className="p-1">
                {filteredOptions.length > 0 && (
                  <div className="px-2 py-1.5 flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      {filteredOptions.length} match{filteredOptions.length > 1 ? 'es' : ''}
                    </span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                )}
                {filteredOptions.map((option, idx) => (
                  <button
                    key={option.id}
                    type="button"
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm hover:bg-emerald-50 transition-all duration-150 flex items-center gap-3 group"
                    onClick={() => handleSelect(option)}
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all duration-200 group-hover:scale-125 ${option.category === 'injury' ? 'bg-red-400' : option.category === 'fracture' ? 'bg-blue-400' : option.category === 'neurology' ? 'bg-purple-400' : option.category === 'dental' ? 'bg-yellow-400' : option.category === 'soft_tissue' ? 'bg-orange-400' : 'bg-emerald-400'} opacity-70`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-800 font-medium text-[13px] truncate group-hover:text-emerald-800 transition-colors">
                        {option.labelEn}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1.5 py-0 flex-shrink-0 ${getCategoryColor(option.category)}`}
                    >
                      {option.category}
                    </Badge>
                  </button>
                ))}

                {/* Single-click Quick Add button */}
                {!hasExactMatch && query.trim() && (
                  <>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      type="button"
                      className="cc-quick-add-btn w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-3"
                      onClick={handleQuickAdd}
                    >
                      <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-emerald-700 font-semibold text-[13px] block truncate">
                          Add &ldquo;{query}&rdquo;
                        </span>
                        <span className="text-emerald-500 text-[10px]">Single click to save & select</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-medium flex-shrink-0">ENTER</span>
                    </button>
                  </>
                )}

                {filteredOptions.length === 0 && hasExactMatch && (
                  <div className="px-3 py-4 text-center text-gray-400 text-xs">
                    Already added to selection
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hint */}
      {selectedItems.length === 0 && !query && (
        <p className="text-[11px] text-gray-400">
          Search from 4000+ injuries, fractures & conditions — type and click to add instantly.
        </p>
      )}
    </div>
  );
}