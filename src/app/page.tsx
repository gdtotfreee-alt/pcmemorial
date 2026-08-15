'use client';

import { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'sonner';
import { PatientForm } from '@/components/patient-form';
import { PatientList } from '@/components/patient-list';
import { PrescriptionForm } from '@/components/prescription-form';
import { PrescriptionList } from '@/components/prescription-list';
import { MedicineMasterPage } from '@/components/medicine-master-page';
import { DoctorMasterPage } from '@/components/doctor-master-page';
import { BackupPage } from '@/components/backup-page';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { migrateLocalStorageToServer, invalidateMedicineCache, getMedicineTemplates } from '@/lib/medicine-master';

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone?: string;
  address?: string;
  createdAt: string;
}

interface Prescription {
  id: string;
  patientId: string;
  doctorName?: string;
  date: string;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  temperature?: number;
  bpUnit: string;
  tempUnit: string;
  chiefComplaint?: string;
  medicines?: Medicine[];
  advice?: string;
  followUpDate?: string;
  followUpNotes?: string;
  notes?: string;
  patient?: Patient;
  createdAt: string;
}

interface MedicineMAEN {
  m: boolean;
  a: boolean;
  e: boolean;
  n: boolean;
}

interface Medicine {
  name: string;
  nameHi?: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  instructionsHi?: string;
  maen?: MedicineMAEN;
}

export type { Patient, Prescription, Medicine };

const NAV_ITEMS = [
  {
    id: 'patients',
    label: 'Patients',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    id: 'new-prescription',
    label: 'New Rx',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: 'prescriptions',
    label: 'Prescriptions',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    id: 'doctors',
    label: 'Doctors',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'medicine-master',
    label: 'Medicine Master',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  {
    id: 'backup',
    label: 'Backup',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
  },
];

const BOTTOM_TABS = ['patients', 'new-prescription', 'prescriptions', 'medicine-master'] as const;

function SidebarNavItem({ item, activeTab, setActiveTab, onClose }: { item: (typeof NAV_ITEMS)[number]; activeTab: string; setActiveTab: (v: string) => void; onClose: () => void; }) {
  const active = activeTab === item.id;
  return (
    <button
      onClick={() => { setActiveTab(item.id); onClose(); }}
      className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 relative ${
        active ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium border border-transparent'
      }`}
    >
      <span className={`transition-colors ${active ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'}`}>{item.icon}</span>
      <span>{item.label}</span>
      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />}
    </button>
  );
}

function getSectionTitle(tab: string): { title: string } {
  const item = NAV_ITEMS.find((n) => n.id === tab);
  return item ? { title: item.label } : { title: '' };
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('patients');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientTotal, setPatientTotal] = useState(0);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [prescriptionTotal, setPrescriptionTotal] = useState(0);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadPatients = useCallback(() => {
    fetch('/api/patients')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => { setPatients(data.patients); setPatientTotal(data.total || data.patients.length); })
      .catch((err) => console.error('Failed to fetch patients:', err));
  }, []);

  const loadPrescriptions = useCallback(() => {
    fetch('/api/prescriptions')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setPrescriptions(data.prescriptions.map((p: Prescription) => ({ ...p, medicines: typeof p.medicines === 'string' ? JSON.parse(p.medicines) : p.medicines || [], })));
        setPrescriptionTotal(data.total || data.prescriptions.length);
      })
      .catch((err) => console.error('Failed to fetch prescriptions:', err));
  }, []);

  useEffect(() => {
    loadPatients();
    loadPrescriptions();
    (async () => {
      try { const migrated = await migrateLocalStorageToServer(); if (migrated > 0) { toast.success(`Migrated ${migrated} medicine(s) from local storage to server`); } } catch { /* silent */ }
      await getMedicineTemplates();
    })();
  }, [loadPatients, loadPrescriptions]);

  useEffect(() => {
    const handleImported = () => { loadPatients(); loadPrescriptions(); invalidateMedicineCache(); getMedicineTemplates(); };
    window.addEventListener('data-imported', handleImported);
    return () => window.removeEventListener('data-imported', handleImported);
  }, [loadPatients, loadPrescriptions]);

  useEffect(() => {
    const interval = setInterval(() => { loadPatients(); loadPrescriptions(); invalidateMedicineCache(); getMedicineTemplates(); }, 300000);
    return () => clearInterval(interval);
  }, [loadPatients, loadPrescriptions]);

  const handlePatientCreated = () => { loadPatients(); toast.success('Patient created successfully!'); };
  const handlePatientUpdated = () => { loadPatients(); loadPrescriptions(); toast.success('Patient updated successfully!'); };
  const handlePatientDeleted = () => { loadPatients(); loadPrescriptions(); toast.success('Patient deleted successfully!'); };
  const handleNewPrescription = (patient: Patient) => { setSelectedPatient(patient); setEditingPrescription(null); setActiveTab('new-prescription'); };
  const handleEditPrescription = (prescription: Prescription) => { setEditingPrescription(prescription); setActiveTab('new-prescription'); };
  const handleRepeatPrescription = (prescription: Prescription) => {
    const repeatRx: Prescription = { ...prescription, id: '', date: new Date().toISOString(), followUpDate: '', followUpNotes: '', notes: '', };
    setSelectedPatient(prescription.patient || null); setEditingPrescription(repeatRx); setActiveTab('new-prescription'); toast.success('Repeating prescription - verify and save as new');
  };
  const handlePrescriptionSaved = (savedRx?: Prescription) => {
    loadPrescriptions(); loadPatients();
    if (savedRx) { setEditingPrescription({ ...savedRx, medicines: typeof savedRx.medicines === 'string' ? JSON.parse(savedRx.medicines) : savedRx.medicines || [], }); }
    toast.success(editingPrescription ? 'Prescription updated successfully!' : 'Prescription created successfully!');
  };
  const handlePrescriptionDeleted = () => { loadPrescriptions(); toast.success('Prescription deleted successfully!'); };

  const sectionInfo = getSectionTitle(activeTab);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white">
      <div className="px-4 py-5 border-b border-slate-100">
        <div className="flex flex-col items-center text-center gap-2">
          <img src="/hospital-logo.jpeg" alt="PC MEMORIAL KALAWATI HOSPITAL Logo" className="w-16 h-16 rounded-full object-cover" />
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 leading-tight tracking-tight uppercase">PC Memorial</h1>
            <h2 className="text-lg font-extrabold text-emerald-600 leading-tight tracking-tight uppercase">Kalawati Hospital</h2>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Menu</p>
        {NAV_ITEMS.map((item) => (<SidebarNavItem key={item.id} item={item} activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setSidebarOpen(false)} />))}
      </nav>
      <div className="px-5 py-4 border-t border-slate-100">
        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /><p className="text-[11px] text-slate-500">System Active</p></div>
        <p className="text-[10px] text-slate-400 mt-1">Prescription Management v2.2</p>
      </div>
    </div>
  );

  return (
    <div className="h-screen h-dvh flex overflow-hidden bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 flex-col z-40 shadow-xl border-r border-slate-200">
        {sidebarContent}
      </aside>

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white shadow-lg border-b border-slate-200">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => setSidebarOpen(true)} className="bg-slate-100 rounded-lg p-2 hover:bg-slate-200 transition-colors text-slate-600" aria-label="Open menu">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <img src="/hospital-logo.jpeg" alt="Logo" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-[13px] font-extrabold leading-tight text-slate-900 uppercase truncate">PC Memorial Kalawati Hospital</h1>
              <p className="text-[10px] text-emerald-600 font-medium truncate">{activeTab === 'new-prescription' && editingPrescription ? 'Edit Rx' : sectionInfo.title}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 border-slate-200 p-0 overflow-y-auto">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          {sidebarContent}
        </SheetContent>
      </Sheet>

      {/* Main Content — NO footer inside here, footer is fixed outside */}
      <div className="md:ml-64 flex-1 flex flex-col overflow-hidden">
        <header className="hidden md:flex items-center justify-between bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">{NAV_ITEMS.find((n) => n.id === activeTab)?.icon}</div>
            <div>
              <h2 className="text-base font-bold text-slate-800 leading-tight">{activeTab === 'new-prescription' && editingPrescription ? 'Edit Prescription' : activeTab === 'new-prescription' ? 'New Prescription' : sectionInfo.title}</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {activeTab === 'patients' && 'Register and manage patient records'}{activeTab === 'new-prescription' && 'Create a new prescription'}{activeTab === 'prescriptions' && 'View and manage all prescriptions'}{activeTab === 'doctors' && 'Manage doctor master records'}{activeTab === 'medicine-master' && 'Manage medicine master records'}{activeTab === 'backup' && 'Export, import, and restore data'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <span className="text-xs text-slate-600 font-medium" suppressHydrationWarning>{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pt-16 pb-32 md:p-6 md:pt-6 md:pb-14">
          {activeTab === 'patients' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div className="lg:sticky lg:top-6"><PatientForm onCreated={handlePatientCreated} onUpdated={handlePatientUpdated} /></div>
              <PatientList patients={patients} totalCount={patientTotal} onNewPrescription={handleNewPrescription} onDeleted={handlePatientDeleted} />
            </div>
          )}
          {activeTab === 'new-prescription' && (
            <PrescriptionForm patients={patients} selectedPatient={selectedPatient} editingPrescription={editingPrescription} onSaved={handlePrescriptionSaved} onCancel={() => { setEditingPrescription(null); setSelectedPatient(null); setActiveTab('prescriptions'); }} />
          )}
          {activeTab === 'prescriptions' && (
            <PrescriptionList prescriptions={prescriptions} totalCount={prescriptionTotal} onEdit={handleEditPrescription} onRepeat={handleRepeatPrescription} onDeleted={handlePrescriptionDeleted} patients={patients} />
          )}
          {activeTab === 'doctors' && <DoctorMasterPage onDoctorsChanged={() => {}} />}
          {activeTab === 'medicine-master' && <MedicineMasterPage />}
          {activeTab === 'backup' && <BackupPage />}
        </main>
      </div>

      {/* ====== MOBILE: FIXED bottom tab bar + copyright (position:fixed) ====== */}
      <div className="md:hidden" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100 }}>
        <div className="bg-white border-t border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-around px-1 pt-1.5 pb-1">
            {BOTTOM_TABS.map((tabId) => {
              const item = NAV_ITEMS.find((n) => n.id === tabId)!;
              const isActive = activeTab === tabId;
              const isRx = tabId === 'new-prescription';
              return (
                <button key={tabId} onClick={() => { if (isActive) return; setActiveTab(tabId); }}
                  className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-lg min-w-[3.5rem] transition-all duration-200 relative ${isActive ? 'text-emerald-600' : 'text-slate-400 active:text-slate-600'}`}
                  aria-label={item.label}>
                  {isRx ? (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all ${isActive ? 'bg-emerald-600 text-white shadow-emerald-300' : 'bg-emerald-500 text-white shadow-emerald-200'}`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                    </div>
                  ) : (
                    <span className={`transition-all ${isActive ? 'scale-110' : ''}`}>
                      <span className={`block ${isActive ? '[&>svg]:w-[22px] [&>svg]:h-[22px]' : ''}`}>{item.icon}</span>
                    </span>
                  )}
                  <span className={`text-[10px] leading-tight font-medium ${isActive ? 'text-emerald-700 font-semibold' : ''}`}>
                    {tabId === 'new-prescription' ? 'New Rx' : tabId === 'medicine-master' ? 'Medicines' : item.label}
                  </span>
                </button>
              );
            })}
            <button onClick={() => setSidebarOpen(true)} className="flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-lg min-w-[3.5rem] transition-all duration-200 text-slate-400 active:text-slate-600" aria-label="More options">
              <span className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
              </span>
              <span className="text-[10px] leading-tight font-medium">More</span>
            </button>
          </div>
        </div>
        <div className="bg-white border-t border-slate-100 px-4 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 flex items-center justify-center">
          <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">&copy; 2026 PC Memorial Kalawati Hospital</p>
        </div>
      </div>

      {/* ====== DESKTOP: FIXED copyright taskbar (position:fixed, bottom:0, left:256px) ====== */}
      <div className="hidden md:block" style={{ position: 'fixed', bottom: 0, left: '16rem', right: 0, zIndex: 50 }}>
        <div className="bg-white border-t border-slate-200 px-6 py-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-semibold uppercase">&copy; 2026 PC Memorial Kalawati Hospital</p>
            <p className="text-[11px] text-slate-400">Prescription Management System v2.2</p>
          </div>
        </div>
      </div>

      <Toaster position="top-right" richColors />
    </div>
  );
}