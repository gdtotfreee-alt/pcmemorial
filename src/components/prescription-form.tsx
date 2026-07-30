'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ChiefComplaintSelector } from '@/components/chief-complaint-selector';
import { PatientAutocomplete } from '@/components/patient-autocomplete';
import { DoctorAutocomplete } from '@/components/doctor-autocomplete';
import { MedicineAutocomplete } from '@/components/medicine-autocomplete';
import type { Patient, Prescription, Medicine, MedicineMAEN } from '@/app/page';
import { printPrescription, savePrescriptionPdf } from '@/components/prescription-view';
import { getAllDiagnoses, type DiagnosisOption } from '@/lib/diagnosis-data';

interface PrescriptionFormProps {
  patients: Patient[];
  selectedPatient: Patient | null;
  editingPrescription: Prescription | null;
  onSaved: (savedRx?: Prescription) => void;
  onCancel: () => void;
}

const emptyMedicine: Medicine = {
  name: '', nameHi: '', dosage: '', frequency: '', duration: '', instructions: '', instructionsHi: '', maen: { m: false, a: false, e: false, n: false },
};

const FREQUENCY_OPTIONS = [
  { value: 'Once daily', hi: 'रोज़ एक बार' },
  { value: 'Twice daily', hi: 'रोज़ दो बार' },
  { value: 'Three times daily', hi: 'रोज़ तीन बार' },
  { value: 'Four times daily', hi: 'रोज़ चार बार' },
  { value: 'Every 4 hours', hi: 'हर 4 घंटे' },
  { value: 'Every 6 hours', hi: 'हर 6 घंटे' },
  { value: 'Every 8 hours', hi: 'हर 8 घंटे' },
  { value: 'Every 12 hours', hi: 'हर 12 घंटे' },
  { value: 'SOS', hi: 'ज़रूरत पर' },
  { value: 'At bedtime', hi: 'सोने से पहले' },
  { value: 'Before meals', hi: 'खाने से पहले' },
  { value: 'After meals', hi: 'खाने के बाद' },
  { value: 'Weekly', hi: 'साप्ताहिक' },
];

export function PrescriptionForm({
  patients,
  selectedPatient,
  editingPrescription,
  onSaved,
  onCancel,
}: PrescriptionFormProps) {
  const [loading, setLoading] = useState(false);
  const [showHindi] = useState(true);
  const [translatingIdx, setTranslatingIdx] = useState<number | null>(null);
  const translateTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const [autocompleteKey, setAutocompleteKey] = useState(0);
  const [selectedComplaints, setSelectedComplaints] = useState<DiagnosisOption[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([{ ...emptyMedicine }]);
  const [form, setForm] = useState({
    patientId: '',
    doctorName: '',
    date: new Date().toISOString().split('T')[0],
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    temperature: '',
    bpUnit: 'mmHg',
    tempUnit: '°C',
    weight: '',
    pulse: '',
    sugarLevel: '',
    chiefComplaint: '',
    advice: '',
    followUpDate: '',
    followUpNotes: '',
    notes: '',
  });

  // Load editing prescription data
  useEffect(() => {
    if (editingPrescription) {
      setForm({
        patientId: editingPrescription.patientId,
        doctorName: editingPrescription.doctorName,
        date: new Date(editingPrescription.date).toISOString().split('T')[0],
        bloodPressureSystolic: editingPrescription.bloodPressureSystolic ? String(editingPrescription.bloodPressureSystolic) : '',
        bloodPressureDiastolic: editingPrescription.bloodPressureDiastolic ? String(editingPrescription.bloodPressureDiastolic) : '',
        temperature: editingPrescription.temperature ? String(editingPrescription.temperature) : '',
        bpUnit: editingPrescription.bpUnit || 'mmHg',
        tempUnit: editingPrescription.tempUnit || '°C',
        weight: editingPrescription.weight ? String(editingPrescription.weight) : '',
        pulse: editingPrescription.pulse ? String(editingPrescription.pulse) : '',
        sugarLevel: editingPrescription.sugarLevel ? String(editingPrescription.sugarLevel) : '',
        chiefComplaint: editingPrescription.chiefComplaint || '',
        advice: editingPrescription.advice || '',
        followUpDate: editingPrescription.followUpDate ? new Date(editingPrescription.followUpDate).toISOString().split('T')[0] : '',
        followUpNotes: editingPrescription.followUpNotes || '',
        notes: editingPrescription.notes || '',
      });
      setMedicines(
        editingPrescription.medicines && editingPrescription.medicines.length > 0
          ? editingPrescription.medicines
          : [{ ...emptyMedicine }]
      );

      // Restore selectedComplaints tags from the comma-separated chiefComplaint string
      const cc = editingPrescription.chiefComplaint;
      if (cc) {
        try {
          const stored = localStorage.getItem('pcm-custom-chief-complaints');
          const customEntries: DiagnosisOption[] = stored ? JSON.parse(stored) : [];
          const allDiagnoses = [...getAllDiagnoses(), ...customEntries];
          const labels = cc.split(', ').map((s) => s.trim()).filter(Boolean);
          const restored = labels.map((label) => {
            const match = allDiagnoses.find((d) => d.labelEn === label);
            if (match) return match;
            // Create a custom entry for unmatched labels so tags still appear
            return { id: `restored-${label}`, labelEn: label, labelHi: label, category: 'other' };
          });
          setSelectedComplaints(restored);
        } catch {
          setSelectedComplaints([]);
        }
      } else {
        setSelectedComplaints([]);
      }
    }
  }, [editingPrescription]);

  // Load selected patient
  useEffect(() => {
    if (selectedPatient && !editingPrescription) {
      setForm((prev) => ({ ...prev, patientId: selectedPatient.id }));
    }
  }, [selectedPatient, editingPrescription]);

  // When complaints change, auto-fill chief complaint text
  const handleComplaintAdd = (complaint: DiagnosisOption) => {
    setSelectedComplaints((prev) => {
      if (prev.find((c) => c.id === complaint.id)) return prev;
      const updated = [...prev, complaint];
      setForm((prevForm) => ({
        ...prevForm,
        chiefComplaint: prevForm.chiefComplaint
          ? prevForm.chiefComplaint + ', ' + complaint.labelEn
          : complaint.labelEn,
      }));
      return updated;
    });
  };

  const handleComplaintRemove = (id: string) => {
    setSelectedComplaints((prev) => prev.filter((c) => c.id !== id));
    setSelectedComplaints((current) => {
      const remaining = current.filter((c) => c.id !== id);
      setForm((prevForm) => ({
        ...prevForm,
        chiefComplaint: remaining.map((c) => c.labelEn).join(', '),
      }));
      return remaining;
    });
  };

  const addMedicine = () => {
    setMedicines([...medicines, { ...emptyMedicine }]);
  };

  const removeMedicine = (index: number) => {
    if (medicines.length > 1) {
      setMedicines(medicines.filter((_, i) => i !== index));
    }
  };

  // Auto-fill medicine from master
  const handleMedicineAutoSelect = (index: number, medData: Medicine) => {
    setMedicines(medicines.map((m, i) => (i === index ? { ...medData } : m)));
  };

  const updateMedicine = (index: number, field: keyof Medicine, value: string) => {
    setMedicines(
      medicines.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  };

  const updateMedicineMAEN = (index: number, slot: keyof MedicineMAEN, value: boolean) => {
    setMedicines(
      medicines.map((m, i) => {
        if (i !== index) return m;
        const maen = { ...(m.maen || { m: false, a: false, e: false, n: false }), [slot]: value };
        return { ...m, maen };
      })
    );
  };

  // Auto-translate English instructions to Hindi (debounced)
  const handleInstructionChange = useCallback((index: number, value: string) => {
    // Update English field immediately
    setMedicines((prev) =>
      prev.map((m, i) => (i === index ? { ...m, instructions: value } : m))
    );

    // Debounce translation
    if (translateTimers.current[index]) clearTimeout(translateTimers.current[index]);

    if (!value.trim()) {
      setMedicines((prev) =>
        prev.map((m, i) => (i === index ? { ...m, instructionsHi: '' } : m))
      );
      setTranslatingIdx(null);
      return;
    }

    translateTimers.current[index] = setTimeout(async () => {
      setTranslatingIdx(index);
      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: value }),
        });
        if (res.ok) {
          const data = await res.json();
          setMedicines((prev) =>
            prev.map((m, i) => (i === index ? { ...m, instructionsHi: data.translation } : m))
          );
        }
      } catch {
        // Silently fail — user can still type Hindi manually
      } finally {
        setTranslatingIdx(null);
      }
    }, 800);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId) return;

    setLoading(true);
    try {
      const validMedicines = medicines.filter((m) => m.name.trim());
      const payload = {
        ...form,
        medicines: validMedicines,
      };

      if (editingPrescription) {
        const res = await fetch(`/api/prescriptions/${editingPrescription.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          onSaved(data);
        }
      } else {
        const res = await fetch('/api/prescriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          onSaved(data);
        }
      }
    } catch (err) {
      console.error('Failed to save prescription:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({
      patientId: '',
      doctorName: '',
      date: new Date().toISOString().split('T')[0],
      bloodPressureSystolic: '',
      bloodPressureDiastolic: '',
      temperature: '',
     bpUnit: 'mmHg',
      tempUnit: '°C',
      weight: '',
      pulse: '',
      sugarLevel: '',
      chiefComplaint: '',
      advice: '',
      followUpDate: '',
      followUpNotes: '',
      notes: '',
    });
    setSelectedComplaints([]);
    setMedicines([{ ...emptyMedicine }]);
    setAutocompleteKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {editingPrescription ? 'Edit Prescription' : 'New Prescription'}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="border-slate-200 text-slate-600 hover:bg-slate-50">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Reset
          </Button>
          {editingPrescription && (
            <Button variant="ghost" size="sm" onClick={onCancel} className="text-gray-500">
              Cancel
            </Button>
          )}
          {editingPrescription && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 px-3 text-gray-500 hover:text-gray-700"
              onClick={() => printPrescription(editingPrescription)}
            >
              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Print
            </Button>
          )}
          {editingPrescription && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 px-3 text-gray-500 hover:text-gray-700"
              onClick={() => savePrescriptionPdf(editingPrescription)}
            >
              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Save PDF
            </Button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Prescription Info + Vitals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Prescription Info */}
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="bg-slate-50 rounded-t-xl border-b border-slate-200 pb-3">
              <CardTitle className="text-base font-semibold text-slate-800">Prescription Info</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <PatientAutocomplete
                key={autocompleteKey}
                patients={patients}
                value={form.patientId}
                onChange={(val) => setForm({ ...form, patientId: val })}
              />

              <DoctorAutocomplete
                value={form.doctorName}
                onChange={(val) => setForm({ ...form, doctorName: val })}
              />

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>
            </CardContent>
          </Card>

          {/* Vital Signs */}
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="bg-slate-50 rounded-t-xl border-b border-slate-200 pb-3">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Vital Signs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Blood Pressure</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Systolic"
                    value={form.bloodPressureSystolic}
                    onChange={(e) => setForm({ ...form, bloodPressureSystolic: e.target.value })}
                    className="border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                  />
                  <span className="text-gray-400 font-medium">/</span>
                  <Input
                    type="number"
                    placeholder="Diastolic"
                    value={form.bloodPressureDiastolic}
                    onChange={(e) => setForm({ ...form, bloodPressureDiastolic: e.target.value })}
                    className="border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                  />
                  <Badge variant="outline" className="text-xs whitespace-nowrap bg-slate-50 text-slate-600 border-slate-200">
                    mmHg
                  </Badge>
                </div>
                <p className="text-xs text-gray-400">Example: 120/80 mmHg</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Temperature</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Temperature"
                    value={form.temperature}
                    onChange={(e) => setForm({ ...form, temperature: e.target.value })}
                    className="border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                  />
                  <Select
                    value={form.tempUnit}
                    onValueChange={(val) => setForm({ ...form, tempUnit: val })}
                  >
                    <SelectTrigger className="w-20 border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="°C">°C</SelectItem>
                      <SelectItem value="°F">°F</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-gray-400">Normal: 36.1°C – 37.2°C (97°F – 99°F)</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Weight (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Weight in kg"
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: e.target.value })}
                  className="border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Pulse (bpm)</Label>
                <Input
                  type="number"
                  placeholder="Pulse rate"
                  value={form.pulse}
                  onChange={(e) => setForm({ ...form, pulse: e.target.value })}
                  className="border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Sugar Level (mg/dL)</Label>
                <Input
                  type="number"
                  placeholder="Blood sugar"
                  value={form.sugarLevel}
                  onChange={(e) => setForm({ ...form, sugarLevel: e.target.value })}
                  className="border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chief Complaint - Type-ahead Search */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="bg-slate-50 rounded-t-xl border-b border-slate-200 pb-3">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Chief Complaint
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <ChiefComplaintSelector
              selectedItems={selectedComplaints}
              onAdd={handleComplaintAdd}
              onRemove={handleComplaintRemove}
              placeholder="Type injury, fracture, or condition name..."
            />
          </CardContent>
        </Card>

        {/* Medicines */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="bg-slate-50 rounded-t-xl border-b border-slate-200 pb-3">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Medicines{showHindi ? ' / दवाइयां' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {medicines.map((med, idx) => (
              <div key={idx} className="p-4 rounded-lg border border-slate-100 bg-slate-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-xs">
                    Medicine #{idx + 1}
                  </Badge>
                  <div className="flex items-center gap-1">
                    {med.name && (
                      <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700">
                        <svg className="w-3 h-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Prefilled
                      </Badge>
                    )}
                    {medicines.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-600 h-7 w-7 p-0"
                        onClick={() => removeMedicine(idx)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Medicine Autocomplete Search */}
                <MedicineAutocomplete
                  onSelect={(medData) => handleMedicineAutoSelect(idx, medData)}
                  disabled={!!med.name}
                  placeholder={med.name ? '' : '🔍 Search from Medicine Master...'}
                />

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">Medicine Name <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="e.g., Paracetamol 500mg"
                    value={med.name}
                    onChange={(e) => updateMedicine(idx, 'name', e.target.value)}
                    className="border-slate-200 h-9 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                  />
                </div>

                {/* M-A-E-N Dosing Schedule */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    Dose Schedule (M-A-E-N)
                    <Badge variant="secondary" className="text-[9px] bg-purple-100 text-purple-700">Morning-Afternoon-Evening-Night</Badge>
                  </Label>
                  <div className="flex items-center gap-2">
                    {(['m', 'a', 'e', 'n'] as const).map((slot) => {
                      const labels: Record<string, { en: string; hi: string }> = {
                        m: { en: 'Morning', hi: 'सुबह' },
                        a: { en: 'Afternoon', hi: 'दोपहर' },
                        e: { en: 'Evening', hi: 'शाम' },
                        n: { en: 'Night', hi: 'रात' },
                      };
                      const isActive = med.maen?.[slot] || false;
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => updateMedicineMAEN(idx, slot, !isActive)}
                          className={`flex flex-col items-center justify-center w-16 h-14 rounded-lg border-2 text-xs font-semibold transition-all ${
                            isActive
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                              : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
                          }`}
                        >
                          <span className="text-sm font-bold">{slot.toUpperCase()}</span>
                          <span className="text-[9px]">{showHindi ? labels[slot].hi : labels[slot].en}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-700">Dosage</Label>
                    <Input
                      placeholder="e.g., 1 tab"
                      value={med.dosage}
                      onChange={(e) => updateMedicine(idx, 'dosage', e.target.value)}
                      className="border-slate-200 h-9 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-700">Frequency</Label>
                    <Select
                      value={med.frequency}
                      onValueChange={(val) => updateMedicine(idx, 'frequency', val)}
                    >
                      <SelectTrigger className="h-9 text-sm border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {showHindi ? `${opt.hi} (${opt.value})` : opt.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-700">Duration</Label>
                    <Input
                      placeholder="e.g., 5 days"
                      value={med.duration}
                      onChange={(e) => updateMedicine(idx, 'duration', e.target.value)}
                      className="border-slate-200 h-9 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-700">Special Instructions</Label>
                    <Input
                      placeholder="e.g., Take after food"
                      value={med.instructions}
                      onChange={(e) => handleInstructionChange(idx, e.target.value)}
                      className="border-slate-200 h-9 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      विशेष निर्देश (हिंदी)
                      <Badge variant="secondary" className="text-[9px] bg-orange-100 text-orange-700">Auto</Badge>
                      {translatingIdx === idx && (
                        <span className="inline-flex items-center gap-1 text-[9px] text-blue-500">
                          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Translating...
                        </span>
                      )}
                    </Label>
                    <Input
                      placeholder="उदा., खाने के बाद लें"
                      value={med.instructionsHi}
                      onChange={(e) => updateMedicine(idx, 'instructionsHi', e.target.value)}
                      className="border-slate-200 h-9 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
                {/* Quick actions at bottom of each medicine */}
                <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMedicine}
                    className="border-slate-200 text-slate-600 hover:bg-slate-50 text-xs"
                  >
                    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Medicine
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Advice & Follow-up */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="bg-slate-50 rounded-t-xl border-b border-slate-200 pb-3">
            <CardTitle className="text-base font-semibold text-slate-800">Advice & Follow-up</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Advice / Instructions</Label>
              <Textarea
                placeholder="Patient advised to..."
                value={form.advice}
                onChange={(e) => setForm({ ...form, advice: e.target.value })}
                rows={3}
                className="border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
              />
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Follow-up Date</Label>
                <Input
                  type="date"
                  value={form.followUpDate}
                  onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
                  className="border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium text-slate-700">Follow-up Notes</Label>
                <Input
                  placeholder="e.g., Review after 7 days"
                  value={form.followUpNotes}
                  onChange={(e) => setForm({ ...form, followUpNotes: e.target.value })}
                  className="border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <Label className="text-sm font-medium text-slate-700">Additional Notes</Label>
              <Textarea
                placeholder="Any additional notes..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit + Print / Save */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="submit"
            disabled={loading || !form.patientId}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-md hover:shadow-lg transition-all h-12"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving Prescription...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {editingPrescription ? 'Update Prescription' : 'Save Prescription'}
              </span>
            )}
          </Button>

          {editingPrescription && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => printPrescription(editingPrescription)}
                className="h-12 px-5 border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                Print
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => savePrescriptionPdf(editingPrescription)}
                className="h-12 px-5 border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Save PDF
              </Button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
