'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
// Native scroll used instead of ScrollArea for reliable mouse wheel support
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  type MedicineTemplate,
  type MedicineMAEN,
  addMedicineTemplate,
  updateMedicineTemplate,
  deleteMedicineTemplate,
  searchMedicineTemplates,
  searchMedicineTemplatesUnlimited,
  getMedicineTemplates,
  getMedicineCategories,
  invalidateMedicineCache,
} from '@/lib/medicine-master';

interface ParsedMedicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  maen: { m: boolean; a: boolean; e: boolean; n: boolean };
}

const emptyForm: Omit<MedicineTemplate, 'id'> = {
  name: '',
  nameHi: '',
  dosage: '',
  dosageHi: '',
  frequency: '',
  duration: '',
  durationHi: '',
  instructions: '',
  instructionsHi: '',
  category: '',
  maen: { m: false, a: false, e: false, n: false },
};

/* ───── Auto-translate helper ───── */
async function translateText(text: string): Promise<string> {
  if (!text.trim()) return '';
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return '';
    const data = await res.json();
    return data.translation || '';
  } catch {
    return '';
  }
}

export function MedicineMasterPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [version, setVersion] = useState(0);

  // Auto-translate state
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [translating, setTranslating] = useState<Record<string, boolean>>({});

  // Select mode state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Import state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importedMedicines, setImportedMedicines] = useState<ParsedMedicine[]>([]);
  const [selectedImports, setSelectedImports] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounce timers for auto-translate
  const translateTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Load medicine cache from server on mount
  useEffect(() => {
    getMedicineTemplates().then(() => setVersion((v) => v + 1));
  }, []);

  const refresh = useCallback(async () => {
    invalidateMedicineCache();
    await getMedicineTemplates();
    setVersion((v) => v + 1);
  }, []);

const templates = useMemo(() => {
    void version;
    return searchMedicineTemplatesUnlimited(searchQuery);
  }, [searchQuery, version]);
  const categories = useMemo(() => {
    void version;
    return getMedicineCategories();
  }, [version]);

  const displayedTemplates = useMemo(() => {
    if (categoryFilter === 'all') return templates;
    return templates.filter((t) => t.category === categoryFilter);
  }, [templates, categoryFilter]);

  const resetForm = useCallback(() => {
    setForm(emptyForm);
    setEditingId(null);
    setShowAddForm(false);
    setTranslating({});
    // Clear pending debounce timers
    Object.values(translateTimers.current).forEach(clearTimeout);
    translateTimers.current = {};
  }, []);

  /* ───── Auto-translate effect ───── */
  useEffect(() => {
    if (!autoTranslate || !showAddForm) return;

    const fieldsToTranslate: Array<{ enKey: string; hiKey: string; value: string }> = [
      { enKey: 'name', hiKey: 'nameHi', value: form.name },
      { enKey: 'dosage', hiKey: 'dosageHi', value: form.dosage },
      { enKey: 'duration', hiKey: 'durationHi', value: form.duration },
      { enKey: 'instructions', hiKey: 'instructionsHi', value: form.instructions },
    ];

    for (const field of fieldsToTranslate) {
      // Clear previous timer for this field
      if (translateTimers.current[field.enKey]) {
        clearTimeout(translateTimers.current[field.enKey]);
      }

      // Only translate if English field has content and is different from current Hindi
      if (field.value.trim() && form[field.hiKey as keyof typeof form] !== field.value) {
        translateTimers.current[field.enKey] = setTimeout(async () => {
          // Don't translate if the field changed since we scheduled
          setTranslating((prev) => ({ ...prev, [field.hiKey]: true }));
          const translation = await translateText(field.value);
          if (translation) {
            setForm((prev) => ({
              ...prev,
              [field.hiKey]: translation,
            }));
          }
          setTranslating((prev) => ({ ...prev, [field.hiKey]: false }));
        }, 800); // 800ms debounce
      }
    }

    return () => {
      Object.values(translateTimers.current).forEach(clearTimeout);
    };
  }, [autoTranslate, form.name, form.dosage, form.duration, form.instructions, showAddForm]);

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      toast.error('Medicine name is required');
      return;
    }
    try {
      if (editingId) {
        await updateMedicineTemplate(editingId, form);
        toast.success('Medicine updated in master');
      } else {
        await addMedicineTemplate(form);
        toast.success('Medicine added to master');
      }
      setForm(emptyForm);
      setEditingId(null);
      setShowAddForm(false);
      await refresh();
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save medicine');
    }
  }, [form, editingId, refresh]);

  const handleEdit = useCallback((template: MedicineTemplate) => {
    setEditingId(template.id);
    setForm({
      name: template.name,
      nameHi: template.nameHi || '',
      dosage: template.dosage,
      dosageHi: template.dosageHi || '',
      frequency: template.frequency,
      duration: template.duration,
      durationHi: template.durationHi || '',
      instructions: template.instructions,
      instructionsHi: template.instructionsHi || '',
      category: template.category,
      maen: template.maen || { m: false, a: false, e: false, n: false },
    });
    setShowAddForm(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteMedicineTemplate(id);
      toast.success('Medicine removed from master');
      await refresh();
    },
    [refresh]
  );

  const handleRemoveDuplicates = useCallback(async () => {
    const allTemplates = searchMedicineTemplates('');
    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const t of allTemplates) {
      const key = t.name.toLowerCase().trim();
      if (seen.has(key)) {
        duplicates.push(t.id);
      } else {
        seen.add(key);
      }
    }

    if (duplicates.length === 0) {
      toast.info('No duplicates found');
      return;
    }

    for (const id of duplicates) {
      await deleteMedicineTemplate(id);
    }
    toast.success(`${duplicates.length} duplicate${duplicates.length > 1 ? 's' : ''} removed`);
    await refresh();
  }, [refresh]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === displayedTemplates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedTemplates.map(t => t.id)));
    }
  }, [selectedIds.size, displayedTemplates]);

  const handleDeleteSelected = useCallback(async () => {
    for (const id of selectedIds) {
      await deleteMedicineTemplate(id);
    }
    toast.success(`${selectedIds.size} medicine${selectedIds.size > 1 ? 's' : ''} deleted`);
    setSelectedIds(new Set());
    setSelectMode(false);
    await refresh();
  }, [selectedIds, refresh]);

  const toggleMAEN = (slot: keyof MedicineMAEN) => {
    const maen = { ...(form.maen || { m: false, a: false, e: false, n: false }), [slot]: !form.maen?.[slot] };
    setForm({ ...form, maen });
  };

  const getMAENString = (maen?: MedicineMAEN) => {
    if (!maen) return null;
    const parts: string[] = [];
    if (maen.m) parts.push('M');
    if (maen.a) parts.push('A');
    if (maen.e) parts.push('E');
    if (maen.n) parts.push('N');
    return parts.length > 0 ? parts.join('-') : null;
  };

  /* ───── File Import Handlers ───── */

  const handleImportClick = () => {
    setImportDialogOpen(true);
    setImportError('');
    setImportedMedicines([]);
    setSelectedImports(new Set());
    // Trigger file picker
    setTimeout(() => fileInputRef.current?.click(), 100);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    setImportError('');
    setImportedMedicines([]);
    setSelectedImports(new Set());

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/parse-medicines', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setImportError(data.error || 'Failed to parse file');
        setImportLoading(false);
        return;
      }

      if (data.medicines && data.medicines.length > 0) {
        setImportedMedicines(data.medicines);
        // Select all by default
        setSelectedImports(new Set(data.medicines.map((_: ParsedMedicine, i: number) => i)));
        toast.success(`Found ${data.medicines.length} medicine(s) in ${file.name}`);
      } else {
        setImportError('No medicines could be detected in the file. Make sure the file contains a list of medicines.');
      }
    } catch (err) {
      console.error('Import error:', err);
      setImportError('Failed to parse file. Please try again.');
    } finally {
      setImportLoading(false);
    }

    // Reset file input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleImportSelection = (index: number) => {
    setSelectedImports((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleAllImports = () => {
    if (selectedImports.size === importedMedicines.length) {
      setSelectedImports(new Set());
    } else {
      setSelectedImports(new Set(importedMedicines.map((_, i) => i)));
    }
  };

  const handleImportSelected = async () => {
    if (selectedImports.size === 0) {
      toast.error('Select at least one medicine to import');
      return;
    }

    let importedCount = 0;
    let skippedCount = 0;
    const existingTemplates = searchMedicineTemplates('');

    for (const index of selectedImports) {
      const med = importedMedicines[index];
      if (!med) continue;

      // Check for duplicates (case insensitive)

      const isDuplicate = existingTemplates.some(
        (t) => t.name.toLowerCase().trim() === med.name.toLowerCase().trim()
      );

      if (isDuplicate) {
        skippedCount++;
      } else {
        await addMedicineTemplate({
          name: med.name,
          nameHi: '',
          dosage: med.dosage,
          dosageHi: '',
          frequency: med.frequency,
          duration: med.duration,
          durationHi: '',
          instructions: med.instructions,
          instructionsHi: '',
          category: '',
          maen: med.maen,
        });
        importedCount++;
      }
    }

    if (importedCount > 0) {
      toast.success(`${importedCount} medicine${importedCount > 1 ? 's' : ''} imported successfully!`);
    }
    if (skippedCount > 0) {
      toast.info(`${skippedCount} duplicate${skippedCount > 1 ? 's' : ''} skipped`);
    }

    await refresh();
    setImportDialogOpen(false);
    setImportedMedicines([]);
    setSelectedImports(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            Medicine Master / दवा मास्टर
          </h2>
          <p className="text-sm text-slate-500 mt-1">Pre-fill medicine templates for quick prescription writing</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={handleRemoveDuplicates}
            className="border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Remove Duplicates
          </Button>
          <Button
            type="button"
            variant={selectMode ? 'default' : 'outline'}
            onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}
            className={selectMode ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm' : 'border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {selectMode ? 'Cancel Select' : 'Select'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleImportClick}
            className="border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Import from File
          </Button>
          <Button
            type="button"
            onClick={() => {
              setShowAddForm(true);
              if (!editingId) setForm(emptyForm);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Medicine
          </Button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Import Medicines from File
            </DialogTitle>
            <DialogDescription>
              Upload a PDF or Word document containing a list of medicines. The system will automatically detect and extract medicine names, dosages, and schedules.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* File Picker Area */}
            {!importLoading && importedMedicines.length === 0 && !importError && (
              <div className="flex-1 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-300 rounded-xl p-10 hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                      <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-800">
                        Click to select a file
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Supports PDF and Word (.docx) files
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">PDF</Badge>
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">DOCX</Badge>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* Loading State */}
            {importLoading && (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-3 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
                  <p className="text-sm text-slate-500">Parsing file and detecting medicines...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {importError && (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-center p-6">
                  <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                    <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-700">Could not detect medicines</p>
                    <p className="text-xs text-slate-500 mt-1">{importError}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-200 text-slate-600 hover:bg-slate-50"
                    onClick={() => {
                      setImportError('');
                      fileInputRef.current?.click();
                    }}
                  >
                    Try another file
                  </Button>
                </div>
              </div>
            )}

            {/* Results - List of detected medicines */}
            {!importLoading && importedMedicines.length > 0 && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-3 px-1">
                  <p className="text-sm font-medium text-slate-800">
                    {importedMedicines.length} medicine{importedMedicines.length > 1 ? 's' : ''} detected
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="text-xs h-7 text-slate-600" onClick={() => fileInputRef.current?.click()}>
                      Upload another file
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 border-slate-200 text-slate-600 hover:bg-slate-50"
                      onClick={toggleAllImports}
                    >
                      {selectedImports.size === importedMedicines.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
                  <div className="space-y-2 pr-2">
                    {importedMedicines.map((med, index) => {
                      const maenParts: string[] = [];
                      if (med.maen.m) maenParts.push('M');
                      if (med.maen.a) maenParts.push('A');
                      if (med.maen.e) maenParts.push('E');
                      if (med.maen.n) maenParts.push('N');
                      const maenStr = maenParts.length > 0 ? maenParts.join('-') : null;

                      return (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border transition-all cursor-pointer ${
                            selectedImports.has(index)
                              ? 'border-emerald-300 bg-emerald-50/70'
                              : 'border-slate-100 bg-white hover:border-slate-300'
                          }`}
                          onClick={() => toggleImportSelection(index)}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={selectedImports.has(index)}
                              onCheckedChange={() => toggleImportSelection(index)}
                              className="mt-0.5 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm text-slate-800">{med.name}</span>
                                {maenStr && (
                                  <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-700 border-purple-200">
                                    {maenStr}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500 mt-1">
                                {med.dosage && (
                                  <span>Dosage: <strong className="text-slate-700">{med.dosage}</strong></span>
                                )}
                                {med.frequency && (
                                  <span>Freq: <strong className="text-slate-700">{med.frequency}</strong></span>
                                )}
                                {med.duration && (
                                  <span>Duration: <strong className="text-slate-700">{med.duration}</strong></span>
                                )}
                                {med.instructions && (
                                  <span>Inst: <strong className="text-slate-700">{med.instructions}</strong></span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Import Actions */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-400">
                    {selectedImports.size} of {importedMedicines.length} selected
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-9 border-slate-200 text-slate-600 hover:bg-slate-50"
                      onClick={() => setImportDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white px-6"
                      onClick={handleImportSelected}
                      disabled={selectedImports.size === 0}
                    >
                      <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Import {selectedImports.size > 0 ? `${selectedImports.size} Medicine${selectedImports.size > 1 ? 's' : ''}` : ''}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Form */}
      {showAddForm && (
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="bg-slate-50 rounded-t-xl border-b border-slate-200 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-800">
                {editingId ? 'Edit Medicine Template' : 'New Medicine Template'}
              </CardTitle>
              <div className="flex items-center gap-3">
                {/* Auto-Translate Toggle */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                  <Switch
                    checked={autoTranslate}
                    onCheckedChange={setAutoTranslate}
                    className="data-[state=checked]:bg-emerald-600"
                  />
                  <Label className="text-xs font-medium text-emerald-800 cursor-pointer select-none" onClick={() => setAutoTranslate(!autoTranslate)}>
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                      </svg>
                      Auto Translate
                    </span>
                  </Label>
                </div>
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={resetForm}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Category */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Category</Label>
                <Input
                  placeholder="e.g., Analgesic, Antibiotic..."
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="h-9 text-sm border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>

              {/* Medicine Name (English) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Medicine Name (English) *</Label>
                <Input
                  placeholder="e.g., Paracetamol 500mg"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-9 text-sm border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>

              {/* Medicine Name (Hindi) - Auto-translated */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1">
                  दवा का नाम (हिंदी)
                  <Badge variant="secondary" className="text-[9px] bg-orange-100 text-orange-700">Hindi</Badge>
                  {autoTranslate && translating.nameHi && (<span className="inline-flex items-center justify-center w-3.5 h-3.5 ml-1.5"><svg className="w-3.5 h-3.5 animate-spin text-emerald-500" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></span>)}
                </Label>
                <div className="relative">
                  <Input
                    placeholder="उदा., पैरासिटामोल 500mg"
                    value={form.nameHi}
                    onChange={(e) => setForm({ ...form, nameHi: e.target.value })}
                    className="h-9 text-sm border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 pr-8"
                  />
                  {autoTranslate && (
                    <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Dosage (English) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Dosage</Label>
                <Input
                  placeholder="e.g., 1 tab"
                  value={form.dosage}
                  onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                  className="h-9 text-sm border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>

              {/* Dosage (Hindi) - Auto-translated */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1">
                  खुराक (हिंदी)
                  <Badge variant="secondary" className="text-[9px] bg-orange-100 text-orange-700">Hindi</Badge>
                  {autoTranslate && translating.dosageHi && (<span className="inline-flex items-center justify-center w-3.5 h-3.5 ml-1.5"><svg className="w-3.5 h-3.5 animate-spin text-emerald-500" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></span>)}
                </Label>
                <div className="relative">
                  <Input
                    placeholder="उदा., 1 टैबलेट"
                    value={form.dosageHi}
                    onChange={(e) => setForm({ ...form, dosageHi: e.target.value })}
                    className="h-9 text-sm border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 pr-8"
                  />
                  {autoTranslate && (
                    <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Frequency */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Frequency</Label>
                <Select value={form.frequency} onValueChange={(val) => setForm({ ...form, frequency: val })}>
                  <SelectTrigger className="h-9 text-sm border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Once daily">Once daily</SelectItem>
                    <SelectItem value="Twice daily">Twice daily</SelectItem>
                    <SelectItem value="Three times daily">Three times daily</SelectItem>
                    <SelectItem value="Four times daily">Four times daily</SelectItem>
                    <SelectItem value="Every 4 hours">Every 4 hrs</SelectItem>
                    <SelectItem value="Every 6 hours">Every 6 hrs</SelectItem>
                    <SelectItem value="Every 8 hours">Every 8 hrs</SelectItem>
                    <SelectItem value="Every 12 hours">Every 12 hrs</SelectItem>
                    <SelectItem value="SOS">SOS</SelectItem>
                    <SelectItem value="At bedtime">At bedtime</SelectItem>
                    <SelectItem value="Before meals">Before meals</SelectItem>
                    <SelectItem value="After meals">After meals</SelectItem>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Duration (English) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Duration</Label>
                <Input
                  placeholder="e.g., 5 days"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  className="h-9 text-sm border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>

              {/* Duration (Hindi) - Auto-translated */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1">
                  अवधि (हिंदी)
                  <Badge variant="secondary" className="text-[9px] bg-orange-100 text-orange-700">Hindi</Badge>
                  {autoTranslate && translating.durationHi && (<span className="inline-flex items-center justify-center w-3.5 h-3.5 ml-1.5"><svg className="w-3.5 h-3.5 animate-spin text-emerald-500" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></span>)}
                </Label>
                <div className="relative">
                  <Input
                    placeholder="उदा., 5 दिन"
                    value={form.durationHi}
                    onChange={(e) => setForm({ ...form, durationHi: e.target.value })}
                    className="h-9 text-sm border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 pr-8"
                  />
                  {autoTranslate && (
                    <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Instructions (English) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Instructions (English)</Label>
                <Input
                  placeholder="e.g., Take after food"
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  className="h-9 text-sm border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>

              {/* Instructions (Hindi) - Auto-translated */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1">
                  विशेष निर्देश (हिंदी)
                  <Badge variant="secondary" className="text-[9px] bg-orange-100 text-orange-700">Hindi</Badge>
                  {autoTranslate && translating.instructionsHi && (<span className="inline-flex items-center justify-center w-3.5 h-3.5 ml-1.5"><svg className="w-3.5 h-3.5 animate-spin text-emerald-500" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></span>)}
                </Label>
                <div className="relative">
                  <Input
                    placeholder="उदा., खाने के बाद लें"
                    value={form.instructionsHi}
                    onChange={(e) => setForm({ ...form, instructionsHi: e.target.value })}
                    className="h-9 text-sm border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 pr-8"
                  />
                  {autoTranslate && (
                    <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                  )}
                </div>
              </div>
            </div>

            {/* M-A-E-N Schedule */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-2">
                Dose Schedule (M-A-E-N)
                <Badge variant="secondary" className="text-[9px] bg-purple-100 text-purple-700">
                  Morning-Afternoon-Evening-Night
                </Badge>
              </Label>
              <div className="flex items-center gap-3">
                {(['m', 'a', 'e', 'n'] as const).map((slot) => {
                  const labels: Record<string, { en: string; hi: string }> = {
                    m: { en: 'Morning', hi: 'सुबह' },
                    a: { en: 'Afternoon', hi: 'दोपहर' },
                    e: { en: 'Evening', hi: 'शाम' },
                    n: { en: 'Night', hi: 'रात' },
                  };
                  const isActive = form.maen?.[slot] || false;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => toggleMAEN(slot)}
                      className={`flex flex-col items-center justify-center w-20 h-16 rounded-lg border-2 text-xs font-semibold transition-all ${
                        isActive
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-sm font-bold">{slot.toUpperCase()}</span>
                      <span className="text-[10px]">{labels[slot].hi}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" className="text-xs h-9 border-slate-200 text-slate-600 hover:bg-slate-50" onClick={resetForm}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white px-6"
                onClick={handleSave}
              >
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {editingId ? 'Update Medicine' : 'Add to Master'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Medicine List Card */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="bg-slate-50 rounded-t-xl border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base font-semibold text-slate-800">
              Medicine Templates ({displayedTemplates.length})
            </CardTitle>
            {selectMode && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="h-8 text-xs border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  {selectedIds.size === displayedTemplates.length ? 'Deselect All' : 'Select All'}
                </Button>
                <span className="text-xs text-slate-600 font-medium">{selectedIds.size} selected</span>
              </div>
            )}
            <div className="flex gap-2">
              <div className="relative flex-1 sm:flex-initial">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <Input
                  placeholder="Search medicines..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 border-slate-200 text-sm w-full sm:w-56 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-36 h-9 border-slate-200 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {displayedTemplates.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <svg className="w-14 h-14 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
              <p className="text-sm font-medium">No medicines in master yet</p>
              <p className="text-xs mt-1">Click &quot;Add Medicine&quot; or &quot;Import from File&quot; to get started</p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto overscroll-contain">
              <div className="space-y-2 pr-3">
                {displayedTemplates.map((t) => {
                  const maenStr = getMAENString(t.maen);
                  return (
                    <div
                      key={t.id}
                      className={`p-4 rounded-lg border transition-all group ${selectedIds.has(t.id) ? 'border-emerald-400 bg-emerald-50' : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'}`}
                    >
                      <div className="flex items-center gap-3">
                        {selectMode && (
                          <Checkbox
                            checked={selectedIds.has(t.id)}
                            onCheckedChange={() => toggleSelect(t.id)}
                            className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 flex-shrink-0 mt-0.5"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <h4 className="font-semibold text-sm text-slate-800">{t.name}</h4>
                            {t.category && (
                              <Badge variant="secondary" className="text-[9px] bg-teal-100 text-teal-700 flex-shrink-0">
                                {t.category}
                              </Badge>
                            )}
                            {maenStr && (
                              <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-700 border-purple-200 flex-shrink-0">
                                {maenStr}
                              </Badge>
                            )}
                          </div>
                          {t.nameHi && t.nameHi !== t.name && (
                            <p className="text-xs text-slate-400 mb-1">{t.nameHi}</p>
                          )}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                            {t.dosage && (
                              <span>
                                Dosage: <strong className="text-slate-700">{t.dosage}</strong>
                                {t.dosageHi && t.dosageHi !== t.dosage && (
                                  <span className="text-slate-400 ml-1">({t.dosageHi})</span>
                                )}
                              </span>
                            )}
                            {t.frequency && (
                              <span>
                                Freq: <strong className="text-slate-700">{t.frequency}</strong>
                              </span>
                            )}
                            {t.duration && (
                              <span>
                                Duration: <strong className="text-slate-700">{t.duration}</strong>
                                {t.durationHi && t.durationHi !== t.duration && (
                                  <span className="text-slate-400 ml-1">({t.durationHi})</span>
                                )}
                              </span>
                            )}
                            {t.instructions && (
                              <span>
                                Inst: <strong className="text-slate-700">{t.instructions}</strong>
                                {t.instructionsHi && t.instructionsHi !== t.instructions && (
                                  <span className="text-slate-400 ml-1">({t.instructionsHi})</span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                onClick={() => handleEdit(t)}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path
                                        strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                      />
                                    </svg>
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Medicine?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Remove &quot;{t.name}&quot; from the medicine master? This won&apos;t affect existing prescriptions.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(t.id)} className="bg-red-600 hover:bg-red-700">
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Footer */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-slate-400">
          {displayedTemplates.length} medicine{displayedTemplates.length !== 1 ? 's' : ''} in master
        </p>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-600 border-emerald-200">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            Auto-translate: {autoTranslate ? 'ON' : 'OFF'}
          </Badge>
          <p className="text-xs text-slate-400">Server-synced across devices</p>
        </div>
      </div>

      {/* Floating Delete Selected Bar */}
      {selectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-2">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                size="sm"
                className="bg-white text-red-600 hover:bg-red-50 h-9 px-4"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Selected
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selectedIds.size} Medicine{selectedIds.size > 1 ? 's' : ''}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove {selectedIds.size} medicine{selectedIds.size > 1 ? 's' : ''} from the master. This won&apos;t affect existing prescriptions.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSelected} className="bg-red-600 hover:bg-red-700">
                  Delete {selectedIds.size}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}