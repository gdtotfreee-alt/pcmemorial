'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { Prescription } from '@/app/page';

interface PrintSettings {
  showVitals: boolean;
  showChiefComplaint: boolean;
  showAdvice: boolean;
  showFollowUp: boolean;
  showNotes: boolean;
  showHindi: boolean;
  showHindiNames: boolean;
  showHindiFreq: boolean;
  showHindiSchedule: boolean;
  showHindiInstructions: boolean;
  showSignature: boolean;
  showRxId: boolean;
  showMedDosage: boolean;
  showMedFrequency: boolean;
  showMedDuration: boolean;
  showMedSchedule: boolean;
  showMedInstructions: boolean;
  showWatermark: boolean;
  hospitalName: string;
  hospitalTagline: string;
  hospitalAddress: string;
  hospitalPhone: string;
  logoData: string;
  fontSize: 'normal' | 'large' | 'compact';
  layout: 'standard' | 'compact';
}

interface PrescriptionViewProps {
  prescription: Prescription;
}

const FREQUENCY_HINDI_MAP: Record<string, string> = {
  'Once daily': 'रोज़ एक बार',
  'Twice daily': 'रोज़ दो बार',
  'Three times daily': 'रोज़ तीन बार',
  'Four times daily': 'रोज़ चार बार',
  'Every 4 hours': 'हर 4 घंटे',
  'Every 6 hours': 'हर 6 घंटे',
  'Every 8 hours': 'हर 8 घंटे',
  'Every 12 hours': 'हर 12 घंटे',
  'SOS': 'ज़रूरत पर',
  'At bedtime': 'सोने से पहले',
  'Before meals': 'खाने से पहले',
  'After meals': 'खाने के बाद',
  'Weekly': 'साप्ताहिक',
};

const MAEN_HINDI_LABELS: Record<string, string> = {
  M: 'सुबह',
  A: 'दोपहर',
  E: 'शाम',
  N: 'रात',
};

const defaultSettings: PrintSettings = {
  showVitals: true,
  showChiefComplaint: true,
  showAdvice: true,
  showFollowUp: true,
  showNotes: true,
  showHindi: true,
  showHindiNames: true,
  showHindiFreq: true,
  showHindiSchedule: true,
  showHindiInstructions: true,
  showSignature: false,
  showRxId: false,
  showMedDosage: true,
  showMedFrequency: true,
  showMedDuration: true,
  showMedSchedule: true,
  showMedInstructions: true,
  showWatermark: false,
  hospitalName: '',
  hospitalTagline: '',
  hospitalAddress: '',
  hospitalPhone: '',
  logoData: '',
  fontSize: 'normal',
  layout: 'standard',
};

export function loadPrintSettings(): PrintSettings {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('pcm-print-settings');
      if (stored) return { ...defaultSettings, ...JSON.parse(stored) };
    } catch {}
  }
  return defaultSettings;
}

export function printPrescription(prescription: Prescription) {
  generateAndPrint(prescription, loadPrintSettings(), false);
}

export function savePrescriptionPdf(prescription: Prescription) {
  generateAndPrint(prescription, loadPrintSettings(), true);
}

function generateAndPrint(prescription: Prescription, s: PrintSettings, asPdf: boolean) {
  const rx = prescription;
  const patient = rx.patient;

  const rxFormatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const rxGetMAENString = (med: { maen?: { m: boolean; a: boolean; e: boolean; n: boolean } }) => {
    if (!med.maen) return null;
    const parts: string[] = [];
    if (med.maen.m) parts.push('M');
    if (med.maen.a) parts.push('A');
    if (med.maen.e) parts.push('E');
    if (med.maen.n) parts.push('N');
    return parts.length > 0 ? parts.join('-') : null;
  };

  const fontSizeMap = { compact: '10px', normal: '11px', large: '13px' };
  const baseFontSize = fontSizeMap[s.fontSize];
  const headingSize = s.fontSize === 'compact' ? '9px' : s.fontSize === 'large' ? '12px' : '10px';
  const medNameSize = s.fontSize === 'compact' ? '11px' : s.fontSize === 'large' ? '14px' : '12px';
  // Patient detail sizes (larger than body text for emphasis on name, age, gender)
  const patientNameSize = s.fontSize === 'compact' ? '15px' : s.fontSize === 'large' ? '18px' : '16px';
  const patientDetailSize = s.fontSize === 'compact' ? '12px' : s.fontSize === 'large' ? '14px' : '13px';
  const padding = s.layout === 'compact' ? '20px 24px' : '28px 32px';
  const medRowPadding = s.layout === 'compact' ? '8px 10px' : '10px 12px';
  const medRowGap = s.layout === 'compact' ? '4px' : '6px';
  const sectionGap = s.layout === 'compact' ? '10px' : '14px';

  const medicinesHtml = (rx.medicines || []).map((med, idx) => {
    const maenParts: string[] = [];
    if (med.maen?.m) maenParts.push('1'); else maenParts.push('0');
    if (med.maen?.a) maenParts.push('1'); else maenParts.push('0');
    if (med.maen?.e) maenParts.push('1'); else maenParts.push('0');
    if (med.maen?.n) maenParts.push('1'); else maenParts.push('0');
    const nameHi = s.showHindi && s.showHindiNames && med.nameHi && med.nameHi !== med.name
      ? `<span class="med-name-hi">${med.nameHi}</span>` : '';
    const details: string[] = [];
    if (s.showMedDosage && med.dosage) details.push(`<span class="det"><b>Dose:</b> ${med.dosage}</span>`);
    if (s.showMedFrequency && med.frequency) {
      const freqHi = s.showHindi && s.showHindiFreq && FREQUENCY_HINDI_MAP[med.frequency]
        ? ` <span class="freq-hi">(${FREQUENCY_HINDI_MAP[med.frequency]})</span>` : '';
      details.push(`<span class="det"><b>Freq:</b> ${med.frequency}${freqHi}</span>`);
    }
    if (s.showMedDuration && med.duration) details.push(`<span class="det"><b>Duration:</b> ${med.duration}</span>`);
    if (s.showMedSchedule && rxGetMAENString(med)) {
      let scheduleStr = rxGetMAENString(med)!;
      if (s.showHindi && s.showHindiSchedule) {
        const scheduleHindiParts: string[] = [];
        if (med.maen?.m) scheduleHindiParts.push('सुबह');
        if (med.maen?.a) scheduleHindiParts.push('दोपहर');
        if (med.maen?.e) scheduleHindiParts.push('शाम');
        if (med.maen?.n) scheduleHindiParts.push('रात');
        if (scheduleHindiParts.length > 0) scheduleStr += ` <span class="schedule-hi">(${scheduleHindiParts.join('-')})</span>`;
      }
      details.push(`<span class="det"><b>Schedule:</b> ${scheduleStr}</span>`);
      const maenInline = ['M', 'A', 'E', 'N'].map((l, i) =>
        `<span class="maen-box ${maenParts[i] === '1' ? 'active' : ''}">${l}</span>`
      ).join('');
      details.push(`<span class="det maen-inline">${maenInline}</span>`);
    }
    const instructions: string[] = [];
    if (s.showMedInstructions && med.instructions) instructions.push(med.instructions);
    if (s.showMedInstructions && s.showHindi && s.showHindiInstructions && med.instructionsHi && med.instructionsHi !== med.instructions) instructions.push(`(${med.instructionsHi})`);
    const instHtml = instructions.length > 0 ? `<div class="med-inst">${instructions.join(' ')}</div>` : '';
    return `
      <div class="medicine-row">
        <div class="med-left"><span class="med-num">${idx + 1}</span></div>
        <div class="med-body">
          <div class="med-name-line"><span class="med-name">${med.name}</span>${nameHi}</div>
          <div class="med-details-row">${details.join('')}</div>${instHtml}
        </div>
      </div>`;
  }).join('');

  let vitalsSection = '';
  if (s.showVitals) {
    const vitalsHtml: string[] = [];
    if (rx.bloodPressureSystolic && rx.bloodPressureDiastolic) {
      vitalsHtml.push(`<span class="pg-label">BP:</span> <span class="pg-value">${rx.bloodPressureSystolic}/${rx.bloodPressureDiastolic} ${rx.bpUnit || 'mmHg'}</span>`);
    }
    if (rx.temperature) {
      vitalsHtml.push(`<span class="pg-label">Temp:</span> <span class="pg-value">${rx.temperature}°${rx.tempUnit || 'C'}</span>`);
    }
    if (vitalsHtml.length > 0) {
      vitalsSection = `<hr class="section-divider"><div class="patient-grid" style="gap:${sectionGap}">${vitalsHtml.map(v => `<div>${v}</div>`).join('')}</div>`;
    }
  }

  let complaintSection = '';
  if (s.showChiefComplaint && rx.chiefComplaint) {
    complaintSection = `<div class="complaint-section"><div class="section-label">Chief Complaint${s.showHindi ? ' / मुख्य शिकायत' : ''}</div><div class="complaint-text">${rx.chiefComplaint}</div></div>`;
  }

  let adviceSection = '';
  if (s.showAdvice && rx.advice) {
    adviceSection = `<div class="advice-section"><div class="section-label">Advice${s.showHindi ? ' / सलाह' : ''}</div><div class="advice-text">${rx.advice}</div></div>`;
  }

  let followUpSection = '';
  if (s.showFollowUp && rx.followUpDate) {
    const fuNotes = rx.followUpNotes ? ` — ${rx.followUpNotes}` : '';
    followUpSection = `<div class="followup-section"><div class="section-label">Follow-up${s.showHindi ? ' / जाँच' : ''}</div><div class="followup-text">📅 ${rxFormatDate(rx.followUpDate)}${fuNotes}</div></div>`;
  }

  let notesSection = '';
  if (s.showNotes && rx.notes) {
    notesSection = `<div class="notes-section"><div class="section-label">Notes</div><div class="notes-text">${rx.notes}</div></div>`;
  }

  let watermarkHtml = '';
  if (s.showWatermark) {
    watermarkHtml = `<div class="watermark">PC Memorial Kalawati Hospital</div>`;
  }

  const hospitalExtraLine: string[] = [];
  if (s.hospitalAddress) hospitalExtraLine.push(s.hospitalAddress);
  if (s.hospitalPhone) hospitalExtraLine.push(`📞 ${s.hospitalPhone}`);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Prescription - ${patient?.name || ''}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: ${baseFontSize}; color: #1f2937; line-height: 1.4; }
    .rx-page { max-width: 700px; margin: 0 auto; padding: ${padding}; }
    .watermark { display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-45deg); font-size: 60px; color: rgba(0,0,0,0.04); font-weight: bold; pointer-events: none; z-index: 0; white-space: nowrap; }
    .rx-header { text-align: center; margin-bottom: 16px; }
    .rx-header .hospital-name { font-size: 18px; font-weight: 700; color: #065f46; }
    .rx-header .hospital-sub { font-size: 11px; color: #6b7280; margin-top: 2px; }
    .rx-header .hospital-extra { font-size: 10px; color: #9ca3af; margin-top: 2px; }
    .rx-date { text-align: center; font-size: 10px; color: #9ca3af; }
    .patient-grid { display: flex; flex-direction: column; gap: 2px; font-size: ${baseFontSize}; padding: 10px 12px; background: #f0fdf4; border-radius: 6px; margin: 12px 0; }
    .patient-top-row { display: flex; justify-content: flex-start; align-items: flex-start; gap: 10px; width: 100%; flex-wrap: wrap; }
    .patient-date { font-size: 11px; color: #6b7280; white-space: nowrap; padding-top: 3px; font-weight: 500; }
    .pg-label { color: #6b7280; font-weight: 500; }
    .pg-value { color: #1f2937; }
    .pg-separator { color: #d1d5db; margin: 0 6px; }
    .patient-name { font-weight: 700; font-size: ${patientNameSize}; }
    .patient-name-row { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
    .patient-info-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: ${patientDetailSize}; }
    .patient-address-inline { position: relative; top: -1px; }
    .section-divider { border: none; border-top: 1px dashed #bbf7d0; margin: ${sectionGap} 0; }
    .section-label { font-size: ${headingSize}; font-weight: 600; color: #065f46; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .complaint-section, .advice-section, .notes-section { margin: ${sectionGap} 0; }
    .complaint-text, .advice-text, .notes-text { font-size: ${baseFontSize}; color: #374151; }
    .followup-section { margin: ${sectionGap} 0; }
    .followup-text { font-size: ${baseFontSize}; color: #ea580c; font-weight: 500; }
    .med-table-header { display: flex; justify-content: space-between; align-items: center; }
    .med-count { font-size: 10px; color: #9ca3af; }
    .medicine-row { display: flex; gap: 10px; padding: ${medRowPadding}; margin-bottom: ${medRowGap}; border: 1px solid #e5e7eb; border-radius: 6px; background: #fff; }
    .med-left { display: flex; align-items: flex-start; padding-top: 2px; }
    .med-num { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: #065f46; color: #fff; font-size: 10px; font-weight: 700; flex-shrink: 0; }
    .med-body { flex: 1; min-width: 0; }
    .med-name-line { margin-bottom: 4px; }
    .med-name { font-size: ${medNameSize}; font-weight: 600; color: #1f2937; }
    .med-name-hi { font-size: 11px; color: #b45309; margin-left: 6px; font-weight: 500; }
    .med-details-row { display: flex; flex-wrap: wrap; gap: 6px; font-size: 10px; color: #6b7280; align-items: center; }
    .det { background: #f3f4f6; padding: 2px 6px; border-radius: 3px; }
    .freq-hi, .schedule-hi { color: #b45309; font-size: 9px; }
    .maen-inline { display: flex; gap: 2px; }
    .maen-box { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 3px; border: 1px solid #d1d5db; font-size: 8px; font-weight: 700; color: #d1d5db; background: #f9fafb; }
    .maen-box.active { background: #065f46; color: #fff; border-color: #065f46; }
    .med-inst { font-size: 10px; color: #4b5563; margin-top: 4px; font-style: italic; }
    .rx-footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 30px; padding-top: 12px; border-top: 1px solid #e5e7eb; }
    .rx-footer .footer-left { font-size: 9px; color: #9ca3af; }
    .rx-footer .footer-left .rx-id { font-family: monospace; font-size: 10px; color: #b0b0b0; }
    .rx-footer .signature-area { text-align: center; }
    .rx-footer .sig-line { width: 180px; border-top: 1.5px solid #4b5563; margin-bottom: 4px; }
    .rx-footer .sig-label { font-size: 11px; color: #4b5563; font-weight: 500; }
    .rx-footer .sig-name { font-size: 13px; color: #1f2937; font-weight: 600; margin-top: 2px; }
    @media print { body { padding: 15px 20px; } .rx-page { padding: 20px 24px; } .watermark { display: block; } }
  </style>
</head><body>
  <div class="rx-page">
    ${watermarkHtml}
    ${s.hospitalName ? `<div class="rx-header">${s.logoData ? `<div style="margin-bottom:8px"><img src="${s.logoData}" style="max-height:60px;max-width:200px;object-fit:contain;"></div>` : ''}<div class="hospital-name">${s.hospitalName}</div>${s.hospitalTagline ? `<div class="hospital-sub">${s.hospitalTagline}</div>` : ''}${hospitalExtraLine.length > 0 ? `<div class="hospital-extra">${hospitalExtraLine.join(' &bull; ')}</div>` : ''}</div>` : ''}
    <div class="patient-grid">
      <div class="patient-top-row">
        <div class="patient-info-row"><span class="pg-value patient-name">${patient?.name || '\u2014'}</span>${patient?.age ? `<span class="pg-separator">|</span><span class="pg-value"><span class="pg-label">Age:</span> ${patient.age} yrs</span>` : ''}${patient?.gender ? `<span class="pg-separator">|</span><span class="pg-value"><span class="pg-label">Sex:</span> ${patient.gender}</span>` : ''}${patient?.address ? `<span class="pg-separator">|</span><span class="pg-value patient-address-inline"><span class="pg-label">Addr:</span> ${patient.address}</span>` : ''}${patient?.phone ? `<span class="pg-separator">|</span><span class="pg-value"><span class="pg-label">Ph:</span> ${patient.phone}</span>` : ''}</div>
        <div class="patient-date"><span class="pg-label">Date:</span> ${rxFormatDate(rx.date)}</div>
      </div>
      ${rx.doctorName ? `<div style="margin-top:2px;padding-top:2px;border-top:1px dashed #bbf7d0;"><span class="pg-label">Doctor:</span><span class="pg-value" style="font-weight:600">${rx.doctorName}</span></div>` : ''}
    </div>
    ${vitalsSection ? vitalsSection : ''}
    ${complaintSection ? `<hr class="section-divider">${complaintSection}` : ''}
    ${(rx.medicines || []).length > 0 ? `<hr class="section-divider"><div class="med-table-header"><div class="section-label">Medicines${s.showHindi && s.showHindiNames ? ' / दवाइयां' : ''}</div><div class="med-count">${(rx.medicines || []).length} item${(rx.medicines || []).length > 1 ? 's' : ''}</div></div>${medicinesHtml}` : ''}
    ${adviceSection ? `<hr class="section-divider">${adviceSection}` : ''}
    ${followUpSection}
    ${notesSection}
    <div class="rx-footer">
      <div class="footer-left">${s.showRxId ? `Generated: ${new Date().toLocaleString('en-IN')}<br><span class="rx-id">Rx ID: ${rx.id}</span>` : ''}</div>
      ${s.showSignature ? `<div class="signature-area">${rx.doctorName ? `<div class="sig-name">${rx.doctorName}</div>` : ''}<div class="sig-line"></div><div class="sig-label">Doctor's Signature</div></div>` : ''}
    </div>
  </div>
</body></html>`;

  if (asPdf) {
    // Download as PDF file via print-to-PDF
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
        }, 5000);
      }, 500);
    };
    iframe.src = url;
  } else {
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); }, 300);
  }
}

export function PrescriptionView({ prescription }: PrescriptionViewProps) {
  const rx = prescription;
  const patient = rx.patient;
  const [settings, setSettings] = useState<PrintSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('pcm-print-settings');
        if (stored) return { ...defaultSettings, ...JSON.parse(stored) };
      } catch {}
    }
    return defaultSettings;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  const toggleSetting = (key: keyof PrintSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateSetting = (key: keyof PrintSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const getMAENString = (med: { maen?: { m: boolean; a: boolean; e: boolean; n: boolean } }) => {
    if (!med.maen) return null;
    const parts: string[] = [];
    if (med.maen.m) parts.push('M');
    if (med.maen.a) parts.push('A');
    if (med.maen.e) parts.push('E');
    if (med.maen.n) parts.push('N');
    return parts.length > 0 ? parts.join('-') : null;
  };

  const handlePrint = () => {
    generateAndPrint(rx, settings, false);
  };

  const handleSavePdf = () => {
    generateAndPrint(rx, settings, true);
  };

  return (
    <>
      {/* Print Settings + Button Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrint}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
            size="sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </Button>
          <Button
            onClick={handleSavePdf}
            variant="outline"
            size="sm"
            className="border-emerald-300 text-emerald-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Save PDF
          </Button>
        </div>

        <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="border-emerald-300 text-emerald-700 text-xs gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Print Settings
              <svg className={`w-3 h-3 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-4">
              {/* Section Toggles */}
              <div>
                <h4 className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-2">Show/Hide Sections</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {([
                    { key: 'showVitals', label: 'Vitals' },
                    { key: 'showChiefComplaint', label: 'Chief Complaint' },
                    { key: 'showAdvice', label: 'Advice' },
                    { key: 'showFollowUp', label: 'Follow-up' },
                    { key: 'showNotes', label: 'Notes' },
                    { key: 'showSignature', label: 'Signature Area' },
                    { key: 'showRxId', label: 'Rx ID & Date' },
                  ] as const).map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox
                        checked={settings[key]}
                        onCheckedChange={() => toggleSetting(key)}
                        className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                      />
                      <Label className="text-xs cursor-pointer">{label}</Label>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={settings.showWatermark}
                      onCheckedChange={() => toggleSetting('showWatermark')}
                      className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                    />
                    <Label className="text-xs cursor-pointer">Watermark</Label>
                  </div>
                </div>
              </div>

              {/* Hindi Language Options */}
              <div>
                <h4 className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-2">
                  Hindi / हिंदी Options
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={settings.showHindi}
                      onCheckedChange={() => toggleSetting('showHindi')}
                      className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                    />
                    <Label className="text-xs font-semibold cursor-pointer">Show Hindi (Master)</Label>
                  </div>
                  {settings.showHindi && (
                    <div className="ml-6 grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-lg border border-orange-200 bg-orange-50/50">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={settings.showHindiNames}
                          onCheckedChange={() => toggleSetting('showHindiNames')}
                          className="data-[state=checked]:bg-orange-400 data-[state=checked]:border-orange-400"
                        />
                        <Label className="text-xs cursor-pointer">Medicine Names</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={settings.showHindiFreq}
                          onCheckedChange={() => toggleSetting('showHindiFreq')}
                          className="data-[state=checked]:bg-orange-400 data-[state=checked]:border-orange-400"
                        />
                        <Label className="text-xs cursor-pointer">Frequency</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={settings.showHindiSchedule}
                          onCheckedChange={() => toggleSetting('showHindiSchedule')}
                          className="data-[state=checked]:bg-orange-400 data-[state=checked]:border-orange-400"
                        />
                        <Label className="text-xs cursor-pointer">Schedule (M-A-E-N)</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={settings.showHindiInstructions}
                          onCheckedChange={() => toggleSetting('showHindiInstructions')}
                          className="data-[state=checked]:bg-orange-400 data-[state=checked]:border-orange-400"
                        />
                        <Label className="text-xs cursor-pointer">Instructions</Label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Medicine Detail Toggles */}
              <div>
                <h4 className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-2">
                  Medicine Details
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {([
                    { key: 'showMedDosage', label: 'Dosage' },
                    { key: 'showMedFrequency', label: 'Frequency' },
                    { key: 'showMedDuration', label: 'Duration' },
                    { key: 'showMedSchedule', label: 'Schedule (MAEN)' },
                    { key: 'showMedInstructions', label: 'Instructions' },
                  ] as const).map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox
                        checked={settings[key] as boolean}
                        onCheckedChange={() => toggleSetting(key)}
                        className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                      />
                      <Label className="text-xs cursor-pointer">{label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Layout & Font Size */}
              <div>
                <h4 className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-2">Layout & Size</h4>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Layout:</Label>
                    <Select value={settings.layout} onValueChange={(val) => updateSetting('layout', val)}>
                      <SelectTrigger className="w-28 h-8 text-xs border-emerald-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="compact">Compact</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Font:</Label>
                    <Select value={settings.fontSize} onValueChange={(val) => updateSetting('fontSize', val)}>
                      <SelectTrigger className="w-28 h-8 text-xs border-emerald-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compact">Small</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Hospital Info */}
              <div>
                <h4 className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-2">Hospital Info</h4>
                {/* Logo Upload */}
                <div className="mb-3">
                  <div className="flex items-center gap-3 mb-2">
                    {settings.logoData ? (
                      <img src={settings.logoData} alt="Logo" className="w-[50px] h-[50px] object-contain rounded border border-gray-200 bg-white p-1" />
                    ) : (
                      <div className="w-[50px] h-[50px] rounded border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                        <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-semibold">Logo</Label>
                        {settings.logoData && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-[10px] h-6 px-2 text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => updateSetting('logoData', '')}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">{settings.logoData ? 'Logo active on print' : 'No logo selected'}</p>
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Select Logo Image
                    <Input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            updateSetting('logoData', reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-gray-500">Hospital Name</Label>
                    <Input
                      value={settings.hospitalName}
                      onChange={(e) => updateSetting('hospitalName', e.target.value)}
                      className="h-8 text-xs border-emerald-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-gray-500">Tagline</Label>
                    <Input
                      value={settings.hospitalTagline}
                      onChange={(e) => updateSetting('hospitalTagline', e.target.value)}
                      className="h-8 text-xs border-emerald-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-gray-500">Address</Label>
                    <Input
                      value={settings.hospitalAddress}
                      onChange={(e) => updateSetting('hospitalAddress', e.target.value)}
                      placeholder="Hospital address..."
                      className="h-8 text-xs border-emerald-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-gray-500">Phone</Label>
                    <Input
                      value={settings.hospitalPhone}
                      onChange={(e) => updateSetting('hospitalPhone', e.target.value)}
                      placeholder="Phone number..."
                      className="h-8 text-xs border-emerald-200"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Prescription Content (Preview) */}
      <div className="bg-white border-2 border-emerald-200 rounded-xl p-6 sm:p-8 font-serif" id="prescription-print">
        {/* Conditional Hospital Header */}
        {settings.hospitalName && (
          <div className="text-center mb-6 border-b-2 border-emerald-600 pb-4">
            {settings.logoData && <img src={settings.logoData} alt="Logo" className="mx-auto mb-2" style={{maxHeight:60,maxWidth:200,objectFit:'contain'}} />}
            <h1 className="text-2xl font-bold text-emerald-800">{settings.hospitalName}</h1>
            {settings.hospitalTagline && <p className="text-xs text-gray-400 mt-0.5">{settings.hospitalTagline}</p>}
            {settings.hospitalAddress && settings.hospitalPhone && (
              <p className="text-[10px] text-gray-400 mt-0.5">{settings.hospitalAddress} | {settings.hospitalPhone}</p>
            )}
          </div>
        )}

        {/* Patient Info - Name, Age, Gender, Date in single row */}
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-4 mb-4">
          <div className="space-y-1 text-sm">
            {/* Single row: Name | Age | Sex | Address | Phone ... Date (right-aligned) */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-wrap text-sm">
                <span className="text-base font-bold text-emerald-900">{patient?.name || '—'}</span>
                {patient?.age && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-700"><span className="font-semibold">Age:</span> {patient.age} yrs</span>
                  </>
                )}
                {patient?.gender && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-700"><span className="font-semibold">Sex:</span> {patient.gender}</span>
                  </>
                )}
                {patient?.address && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-700" style={{position:'relative',top:'-1px'}}><span className="font-semibold">Addr:</span> {patient.address}</span>
                  </>
                )}
                {patient?.phone && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-700"><span className="font-semibold">Ph:</span> {patient.phone}</span>
                  </>
                )}
              </div>
              <span className="text-[10px] text-gray-400 whitespace-nowrap">{formatDate(rx.date)}</span>
            </div>
            {rx.doctorName && (
              <div className="pt-2 mt-2 border-t border-dashed border-emerald-200">
                <span className="text-sm text-emerald-800 font-semibold">Doctor: {rx.doctorName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Vitals */}
        {settings.showVitals && (rx.bloodPressureSystolic || rx.temperature) && (
          <div className="flex gap-3 text-xs mb-4">
            {rx.bloodPressureSystolic && rx.bloodPressureDiastolic && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                BP: {rx.bloodPressureSystolic}/{rx.bloodPressureDiastolic} {rx.bpUnit}
              </Badge>
            )}
            {rx.temperature && (
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                Temp: {rx.temperature} {rx.tempUnit}
              </Badge>
            )}
          </div>
        )}

        <Separator className="my-4" />

        {/* Chief Complaint */}
        {settings.showChiefComplaint && rx.chiefComplaint && (
          <div className="mb-4">
            <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">Chief Complaint</h3>
            <p className="text-sm">{rx.chiefComplaint}</p>
          </div>
        )}

        <Separator className="my-4" />

        {/* Medicines */}
        {rx.medicines && rx.medicines.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Medicines{settings.showHindi && settings.showHindiNames ? ' / दवाइयां' : ''}
              </h3>
              <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                {rx.medicines.length} item{rx.medicines.length > 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="space-y-2">
              {rx.medicines.map((med, idx) => {
                const maenStr = getMAENString(med);
                return (
                  <div
                    key={idx}
                    className={`p-3 ${idx % 2 === 0 ? '' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="bg-emerald-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">
                          {med.name}
                          {settings.showHindi && settings.showHindiNames && med.nameHi && med.nameHi !== med.name && (
                            <span className="text-gray-500 font-normal ml-2">({med.nameHi})</span>
                          )}
                        </div>
                        <div className="flex flex-nowrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-600 mt-1 overflow-hidden">
                          {settings.showMedDosage && med.dosage && <span><strong>Dose:</strong> {med.dosage}</span>}
                          {settings.showMedFrequency && med.frequency && <span><strong>Freq:</strong> {med.frequency}{settings.showHindi && settings.showHindiFreq && FREQUENCY_HINDI_MAP[med.frequency] && <span className="text-gray-400 ml-1">({FREQUENCY_HINDI_MAP[med.frequency]})</span>}</span>}
                          {settings.showMedDuration && med.duration && <span><strong>Duration:</strong> {med.duration}</span>}
                          {settings.showMedSchedule && maenStr && <span><strong>Schedule:</strong> {maenStr}{settings.showHindi && settings.showHindiSchedule && (() => {
                            const parts: string[] = [];
                            if (med.maen?.m) parts.push('सुबह');
                            if (med.maen?.a) parts.push('दोपहर');
                            if (med.maen?.e) parts.push('शाम');
                            if (med.maen?.n) parts.push('रात');
                            return parts.length > 0 ? <span className="text-gray-400 ml-1">({parts.join('-')})</span> : null;
                          })()}</span>}
                          {settings.showMedSchedule && med.maen && (
                            <span className="inline-flex items-center gap-0.5">
                              {(['m', 'a', 'e', 'n'] as const).map((slot) => {
                                const slotLabel: Record<string, string> = { m: 'M', a: 'A', e: 'E', n: 'N' };
                                const isActive = med.maen?.[slot] || false;
                                return (
                                  <span
                                    key={slot}
                                    className={`inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold border ${
                                      isActive
                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                        : 'bg-gray-100 text-gray-300 border-gray-200'
                                    }`}
                                  >
                                    {slotLabel[slot]}
                                  </span>
                                );
                              })}
                            </span>
                          )}
                        </div>

                        {settings.showMedInstructions && (med.instructions || (settings.showHindi && settings.showHindiInstructions && med.instructionsHi)) && (
                          <p className="text-xs text-gray-500 mt-1 italic">
                            {med.instructions}
                            {settings.showHindi && settings.showHindiInstructions && med.instructionsHi && med.instructionsHi !== med.instructions && (
                              <span className="ml-2">({med.instructionsHi})</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Separator className="my-4" />

        {/* Advice */}
        {settings.showAdvice && rx.advice && (
          <div className="mb-4">
            <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
              Advice
            </h3>
            <p className="text-sm">{rx.advice}</p>
          </div>
        )}

        {/* Follow-up */}
        {settings.showFollowUp && (rx.followUpDate || rx.followUpNotes) && (
          <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Follow-up</h3>
            {rx.followUpDate && (
              <p className="text-sm text-amber-700">📅 {formatDate(rx.followUpDate)}</p>
            )}
            {rx.followUpNotes && (
              <p className="text-sm text-amber-600">{rx.followUpNotes}</p>
            )}
          </div>
        )}

        {/* Notes */}
        {settings.showNotes && rx.notes && (
          <div className="mb-4">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Notes</h3>
            <p className="text-xs text-gray-500">{rx.notes}</p>
          </div>
        )}

        {/* Footer */}
        {settings.showRxId && (
          <>
            <Separator className="my-6" />
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs text-gray-400">
                  Generated: {new Date().toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] text-gray-300 font-mono mt-0.5">Rx ID: {rx.id}</p>
              </div>
              {settings.showSignature && (
                <div className="text-center">
                  {rx.doctorName && (
                    <p className="text-sm font-semibold text-gray-800 mb-1">{rx.doctorName}</p>
                  )}
                  <div className="w-48 border-t border-gray-400 pt-1">
                    <p className="text-xs text-gray-600">Doctor&apos;s Signature</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
