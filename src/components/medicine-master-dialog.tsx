'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { toast } from 'sonner';
import {
  type MedicineTemplate,
  addMedicineTemplate,
  updateMedicineTemplate,
  deleteMedicineTemplate,
  searchMedicineTemplates,
  getMedicineTemplates,
  getMedicineCategories,
} from '@/lib/medicine-master';

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
};

/* ---- Auto-translate helper ---- */
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

export function MedicineMasterDialog() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [version, setVersion] = useState(0);

  // Auto-translate state
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [translating, setTranslating] = useState<Record<string, boolean>>({});

  // Debounce timers
  const translateTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const templates = useMemo(() => {
    void version;
    if (!searchQuery.trim()) return getMedicineTemplates();
    return searchMedicineTemplates(searchQuery);
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
    Object.values(translateTimers.current).forEach(clearTimeout);
    translateTimers.current = {};
  }, []);

  /* ---- Auto-translate effect ---- */
  useEffect(() => {
    if (!autoTranslate || !showAddForm || !open) return;

    const fieldsToTranslate: Array<{ enKey: string; hiKey: string; value: string }> = [
      { enKey: 'name', hiKey: 'nameHi', value: form.name },
      { enKey: 'dosage', hiKey: 'dosageHi', value: form.dosage },
      { enKey: 'duration', hiKey: 'durationHi', value: form.duration },
      { enKey: 'instructions', hiKey: 'instructionsHi', value: form.instructions },
    ];

    for (const field of fieldsToTranslate) {
      if (translateTimers.current[field.enKey]) {
        clearTimeout(translateTimers.current[field.enKey]);
      }

      if (field.value.trim() && form[field.hiKey as keyof typeof form] !== field.value) {
        translateTimers.current[field.enKey] = setTimeout(async () => {
          setTranslating((prev) => ({ ...prev, [field.hiKey]: true }));
          const translation = await translateText(field.value);
          if (translation) {
            setForm((prev) => ({ ...prev, [field.hiKey]: translation }));
          }
          setTranslating((prev) => ({ ...prev, [field.hiKey]: false }));
        }, 800);
      }
    }

    return () => {
      Object.values(translateTimers.current).forEach(clearTimeout);
    };
  }, [autoTranslate, form.name, form.dosage, form.duration, form.instructions, showAddForm, open]);

  const handleSave = useCallback(() => {
    if (!form.name.trim()) {
      toast.error('Medicine name is required');
      return;
    }
    if (editingId) {
      updateMedicineTemplate(editingId, form);
      toast.success('Medicine updated in master');
    } else {
      addMedicineTemplate(form);
      toast.success('Medicine added to master');
    }
    setForm(emptyForm);
    setEditingId(null);
    setShowAddForm(false);
    refresh();
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
    });
    setShowAddForm(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    deleteMedicineTemplate(id);
    toast.success('Medicine removed from master');
    refresh();
  }, [refresh]);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { resetForm(); setSearchQuery(''); } }}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-emerald-100 hover:bg-emerald-600 hover:text-white text-xs sm:text-sm"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          Medicine Master
        </Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            Medicine Master / दवा मास्टर
          </DialogTitle>
          <DialogDescription>
            Pre-fill medicine templates. These will auto-suggest when writing prescriptions.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <Input
              placeholder="Search medicines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 border-emerald-200 text-sm"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-36 h-9 border-emerald-200 text-sm">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            onClick={() => { setShowAddForm(true); if (!editingId) setForm(emptyForm); }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-3"
          >
            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add
          </Button>
        </div>

        {showAddForm && (
          <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-emerald-800">
                {editingId ? 'Edit Medicine Template' : 'New Medicine Template'}
              </h4>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-100/60 border border-emerald-200">
                  <Switch
                    checked={autoTranslate}
                    onCheckedChange={setAutoTranslate}
                    className="data-[state=checked]:bg-emerald-600 scale-90"
                  />
                  <span className="text-[10px] font-medium text-emerald-700">Auto</span>
                </div>
                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={resetForm}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Category</Label>
                <Input placeholder="e.g., Analgesic" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="h-9 text-sm border-emerald-200" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Medicine Name (English) *</Label>
                <Input placeholder="e.g., Paracetamol 500mg" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-9 text-sm border-emerald-200" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium flex items-center gap-1">
                  दवा का नाम (हिंदी)
                  <Badge variant="secondary" className="text-[9px] bg-orange-100 text-orange-700">Hindi</Badge>
                  {translating.nameHi && (<span className="inline-flex items-center justify-center w-3 h-3 ml-1"><svg className="w-3 h-3 animate-spin text-emerald-500" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></span>)}
                </Label>
                <div className="relative">
                  <Input placeholder="उदा., पैरासिटामोल 500mg" value={form.nameHi} onChange={(e) => setForm({ ...form, nameHi: e.target.value })} className="h-9 text-sm border-emerald-200 pr-7" />
                  {autoTranslate && (
                    <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Dosage</Label>
                <Input placeholder="e.g., 1 tab" value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} className="h-9 text-sm border-emerald-200" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium flex items-center gap-1">
                  खुराक (हिंदी)
                  <Badge variant="secondary" className="text-[9px] bg-orange-100 text-orange-700">Hindi</Badge>
                  {translating.dosageHi && (<span className="inline-flex items-center justify-center w-3 h-3 ml-1"><svg className="w-3 h-3 animate-spin text-emerald-500" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></span>)}
                </Label>
                <div className="relative">
                  <Input placeholder="उदा., 1 टैबलेट" value={form.dosageHi} onChange={(e) => setForm({ ...form, dosageHi: e.target.value })} className="h-9 text-sm border-emerald-200 pr-7" />
                  {autoTranslate && (
                    <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Duration</Label>
                <Input placeholder="e.g., 5 days" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="h-9 text-sm border-emerald-200" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium flex items-center gap-1">
                  अवधि (हिंदी)
                  <Badge variant="secondary" className="text-[9px] bg-orange-100 text-orange-700">Hindi</Badge>
                  {translating.durationHi && (<span className="inline-flex items-center justify-center w-3 h-3 ml-1"><svg className="w-3 h-3 animate-spin text-emerald-500" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></span>)}
                </Label>
                <div className="relative">
                  <Input placeholder="उदा., 5 दिन" value={form.durationHi} onChange={(e) => setForm({ ...form, durationHi: e.target.value })} className="h-9 text-sm border-emerald-200 pr-7" />
                  {autoTranslate && (
                    <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                  )}
                </div>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-medium">Instructions (English)</Label>
                <Input placeholder="e.g., Take after food" value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} className="h-9 text-sm border-emerald-200" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-medium flex items-center gap-1">
                  विशेष निर्देश (हिंदी)
                  <Badge variant="secondary" className="text-[9px] bg-orange-100 text-orange-700">Hindi</Badge>
                  {translating.instructionsHi && (<span className="inline-flex items-center justify-center w-3 h-3 ml-1"><svg className="w-3 h-3 animate-spin text-emerald-500" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></span>)}
                </Label>
                <div className="relative">
                  <Input placeholder="उदा., खाने के बाद लें" value={form.instructionsHi} onChange={(e) => setForm({ ...form, instructionsHi: e.target.value })} className="h-9 text-sm border-emerald-200 pr-7" />
                  {autoTranslate && (
                    <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" className="text-xs h-8" onClick={resetForm}>Cancel</Button>
              <Button type="button" size="sm" className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSave}>
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                {editingId ? 'Update' : 'Add to Master'}
              </Button>
            </div>
          </div>
        )}

        <Separator />

        <div className="flex-1 min-h-0">
          {displayedTemplates.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <svg className="w-10 h-10 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              <p className="text-sm font-medium">No medicines in master yet</p>
              <p className="text-xs mt-1">Click &quot;Add&quot; to create your first medicine template</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[350px]">
              <div className="space-y-2 pr-3">
                {displayedTemplates.map((t) => (
                  <div key={t.id} className="p-3 rounded-lg border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm text-gray-800 truncate">{t.name}</h4>
                          {t.category && (
                            <Badge variant="secondary" className="text-[9px] bg-teal-100 text-teal-700 flex-shrink-0">{t.category}</Badge>
                          )}
                        </div>
                        {t.nameHi && t.nameHi !== t.name && (
                          <p className="text-xs text-gray-400 truncate">{t.nameHi}</p>
                        )}
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[11px] text-gray-500">
                          {t.dosage && <span>Dosage: <strong className="text-gray-700">{t.dosage}</strong></span>}
                          {t.frequency && <span>Freq: <strong className="text-gray-700">{t.frequency.split('(')[0].trim()}</strong></span>}
                          {t.duration && <span>Duration: <strong className="text-gray-700">{t.duration}</strong></span>}
                          {t.instructions && <span>Inst: <strong className="text-gray-700">{t.instructions}</strong></span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-emerald-600" onClick={() => handleEdit(t)}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-red-600">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Medicine?</AlertDialogTitle>
                              <AlertDialogDescription>Remove &quot;{t.name}&quot; from the medicine master?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(t.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-gray-400">{displayedTemplates.length} medicine{displayedTemplates.length !== 1 ? 's' : ''} in master</p>
            <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-600 border-emerald-200">Auto-translate: {autoTranslate ? 'ON' : 'OFF'}</Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}