'use client';

import { useState, useEffect, Fragment } from 'react';
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
  watermarkImage: string;
  hospitalName: string;
  hospitalTagline: string;
  hospitalAddress: string;
  hospitalPhone: string;
  hospitalRegNo: string;
  logoData: string;
  // Hospital info visibility toggles (tick-based)
  showHospitalName: boolean;
  showHospitalTagline: boolean;
  showHospitalAddress: boolean;
  showHospitalPhone: boolean;
  showHospitalLogo: boolean;
  showHospitalRegNo: boolean;
  fontSize: 'normal' | 'large' | 'compact';
  layout: 'standard' | 'compact';
  // Page setup (new)
  paperSize: 'A4' | 'A5' | 'Letter' | 'Legal' | 'HalfA4';
  margin: 'none' | 'narrow' | 'normal' | 'wide';
  orientation: 'portrait' | 'landscape';
  // Copy stamp (new)
  copyStamp: 'none' | 'original' | 'patient' | 'pharmacy' | 'duplicate';
  // Theme accent color (new)
  themeColor: 'teal' | 'slate' | 'maroon' | 'black' | 'rose' | 'violet' | 'orange' | 'cyan';
  // Number of copies (new)
  copies: number;
  // Watermark size
  watermarkSize: 'small' | 'medium' | 'large' | 'xlarge';
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

// ---- New print-setting option maps ----

/** Accent color themes for the printed prescription. */
const PRINT_THEMES: Record<
  string,
  { name: string; primary: string; primaryDark: string; light: string; lighter: string; border: string; swatch: string }
> = {
  teal:    { name: 'Teal',    primary: '#0d9488', primaryDark: '#0f766e', light: '#f0fdfa', lighter: '#f5fffe', border: '#99f6e4', swatch: '#0d9488' },
  slate:   { name: 'Slate',   primary: '#475569', primaryDark: '#334155', light: '#f1f5f9', lighter: '#f8fafc', border: '#cbd5e1', swatch: '#475569' },
  maroon:  { name: 'Maroon',  primary: '#be123c', primaryDark: '#9f1239', light: '#fff1f2', lighter: '#fff5f6', border: '#fecdd3', swatch: '#be123c' },
  black:   { name: 'Black',   primary: '#1f2937', primaryDark: '#111827', light: '#f3f4f6', lighter: '#f9fafb', border: '#d1d5db', swatch: '#111827' },
  rose:    { name: 'Rose',    primary: '#e11d48', primaryDark: '#9f1239', light: '#fff1f2', lighter: '#fff5f6', border: '#fecdd3', swatch: '#e11d48' },
  violet:  { name: 'Violet',  primary: '#7c3aed', primaryDark: '#5b21b6', light: '#f5f3ff', lighter: '#faf5ff', border: '#ddd6fe', swatch: '#7c3aed' },
  orange:  { name: 'Orange',  primary: '#ea580c', primaryDark: '#c2410c', light: '#fff7ed', lighter: '#fffbf5', border: '#fed7aa', swatch: '#ea580c' },
  cyan:    { name: 'Cyan',    primary: '#0891b2', primaryDark: '#155e75', light: '#ecfeff', lighter: '#f0fdff', border: '#a5f3fc', swatch: '#0891b2' },
};

/** Copy-stamp banner labels. */
const COPY_STAMP_LABELS: Record<string, { text: string; color: string }> = {
  original:  { text: 'ORIGINAL',      color: '#059669' },
  patient:   { text: 'PATIENT COPY',  color: '#2563eb' },
  pharmacy:  { text: 'PHARMACY COPY', color: '#9333ea' },
  duplicate: { text: 'DUPLICATE',     color: '#dc2626' },
};

/** CSS size keyword for @page. HalfA4 maps to A5 (closest standard). */
const PAPER_SIZE_CSS: Record<string, string> = {
  A4: 'A4',
  A5: 'A5',
  Letter: 'Letter',
  Legal: 'Legal',
  HalfA4: 'A5',
};

/** Human-readable paper-size labels. */
const PAPER_SIZE_LABELS: Record<string, string> = {
  A4: 'A4 (210 × 297 mm)',
  A5: 'A5 (148 × 210 mm)',
  Letter: 'Letter (8.5 × 11 in)',
  Legal: 'Legal (8.5 × 14 in)',
  HalfA4: 'Half A4 (~A5)',
};

/** Page margin presets in mm (applied via @page margin). */
const MARGIN_CSS: Record<string, string> = {
  none: '0mm',
  narrow: '8mm',
  normal: '15mm',
  wide: '25mm',
};

/** Watermark size presets. textPx = font-size for text watermark; imgPct = max-width/height % for image watermark. */
const WATERMARK_SIZE_MAP: Record<string, { textPx: number; imgPct: number }> = {
  small:  { textPx: 40,  imgPct: 30 },
  medium: { textPx: 60,  imgPct: 50 },
  large:  { textPx: 80,  imgPct: 70 },
  xlarge: { textPx: 100, imgPct: 90 },
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
  watermarkImage: '',
  hospitalName: '',
  hospitalTagline: '',
  hospitalAddress: '',
  hospitalPhone: '',
  hospitalRegNo: '',
  logoData: '',
  showHospitalName: true,
  showHospitalTagline: true,
  showHospitalAddress: true,
  showHospitalPhone: true,
  showHospitalLogo: true,
  showHospitalRegNo: false,
  fontSize: 'normal',
  layout: 'standard',
  paperSize: 'A4',
  margin: 'narrow',
  orientation: 'portrait',
  copyStamp: 'none',
  themeColor: 'teal',
  copies: 1,
  watermarkSize: 'medium',
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
  // Medicines section heading — bolder & slightly larger than other section labels
  const medHeadingSize = s.fontSize === 'compact' ? '12px' : s.fontSize === 'large' ? '16px' : '14px';
  const medNameSize = s.fontSize === 'compact' ? '11px' : s.fontSize === 'large' ? '14px' : '12px';
  // Patient detail sizes (larger than body text for emphasis on name, age, gender)
  const patientNameSize = s.fontSize === 'compact' ? '15px' : s.fontSize === 'large' ? '18px' : '16px';
  const patientDetailSize = s.fontSize === 'compact' ? '12px' : s.fontSize === 'large' ? '14px' : '13px';
  const padding = s.layout === 'compact' ? '12px 16px' : '16px 20px';
  const medRowPadding = s.layout === 'compact' ? '8px 10px' : '10px 12px';
  const medRowGap = s.layout === 'compact' ? '4px' : '6px';
  const sectionGap = s.layout === 'compact' ? '10px' : '14px';

  const medicinesCells = (rx.medicines || []).map((med, idx) => {
    const maenParts: string[] = [];
    if (med.maen?.m) maenParts.push('1'); else maenParts.push('0');
    if (med.maen?.a) maenParts.push('1'); else maenParts.push('0');
    if (med.maen?.e) maenParts.push('1'); else maenParts.push('0');
    if (med.maen?.n) maenParts.push('1'); else maenParts.push('0');
    const cells: string[] = [];
    // Name cell spans ALL columns (grid-column: 1 / -1) with S.No. badge.
    // Instruction is placed INSIDE the name cell (right after the name) on the SAME LINE
    // with adequate gap, per user request.
    let instructionHtml = '';
    if (s.showMedInstructions && med.instructions) {
      let instHi = '';
      if (s.showHindi && s.showHindiInstructions && med.instructionsHi && med.instructionsHi !== med.instructions) {
        instHi = ` <span class="inst-hi">(${med.instructionsHi})</span>`;
      }
      instructionHtml = `<span class="det det-inst med-inst-inline"><b>Instruction:</b> ${med.instructions}${instHi}</span>`;
    }
    cells.push(`<div class="med-name-cell"><span class="med-num">${idx + 1}</span><span class="med-name">${med.name}</span>${instructionHtml}</div>`);
    if (s.showMedDosage && med.dosage) cells.push(`<span class="det det-dose"><b>Dose:</b> ${med.dosage}</span>`);
    if (s.showMedFrequency && med.frequency) {
      const freqHi = s.showHindi && s.showHindiFreq && FREQUENCY_HINDI_MAP[med.frequency]
        ? ` <span class="freq-hi">(${FREQUENCY_HINDI_MAP[med.frequency]})</span>` : '';
      cells.push(`<span class="det det-freq"><b>Freq:</b> ${med.frequency}${freqHi}</span>`);
    }
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
      cells.push(`<span class="det det-schedule"><b>Schedule:</b> ${scheduleStr}</span>`);
      const maenInline = ['M', 'A', 'E', 'N'].map((l, i) =>
        `<span class="maen-box ${maenParts[i] === '1' ? 'active' : ''}">${l}</span>`
      ).join('');
      cells.push(`<span class="det det-maen maen-inline">${maenInline}</span>`);
    }
    // Duration placed LAST (after MAEN), per user request
    if (s.showMedDuration && med.duration) cells.push(`<span class="det det-duration"><b>Duration:</b> ${med.duration}</span>`);
    // Divider line between medicines (full-width row)
    cells.push(`<div class="med-divider"></div>`);
    return cells.join('');
  }).join('');

  const medicinesHtml = `<div class="med-grid">${medicinesCells}</div>`;

  let vitalsSection = '';
  if (s.showVitals) {
    const vitalsHtml: string[] = [];
    if (rx.bloodPressureSystolic && rx.bloodPressureDiastolic) {
      vitalsHtml.push(`<div class="vital-item"><span class="pg-label">BP:</span> <span class="pg-value">${rx.bloodPressureSystolic}/${rx.bloodPressureDiastolic} ${rx.bpUnit || 'mmHg'}</span></div>`);
    }
    if (rx.temperature) {
      const tUnit = rx.tempUnit || '°C';
      const tempDisplay = tUnit.includes('°') ? `${rx.temperature}${tUnit}` : `${rx.temperature}°${tUnit}`;
      vitalsHtml.push(`<div class="vital-item"><span class="pg-label">Temp:</span> <span class="pg-value">${tempDisplay}</span></div>`);
    }
    if (rx.weight) {
      vitalsHtml.push(`<div class="vital-item"><span class="pg-label">Weight:</span> <span class="pg-value">${rx.weight} kg</span></div>`);
    }
    if (rx.pulse) {
      vitalsHtml.push(`<div class="vital-item"><span class="pg-label">Pulse:</span> <span class="pg-value">${rx.pulse} bpm</span></div>`);
    }
    if (rx.sugarLevel) {
      vitalsHtml.push(`<div class="vital-item"><span class="pg-label">Sugar:</span> <span class="pg-value">${rx.sugarLevel} mg/dL</span></div>`);
    }
    if (vitalsHtml.length > 0) {
      vitalsSection = `<hr class="section-divider"><div class="vitals-row">${vitalsHtml.join('')}</div>`;
    }
  }

  let complaintSection = '';
  if (s.showChiefComplaint && rx.chiefComplaint) {
    complaintSection = `<div class="inline-section complaint-section"><span class="section-label-inline">Chief Complaint${s.showHindi ? ' / मुख्य शिकायत' : ''}</span><span class="section-dash">—</span><span class="complaint-text">${rx.chiefComplaint}</span></div>`;
  }

  let adviceSection = '';
  if (s.showAdvice && rx.advice) {
    adviceSection = `<div class="inline-section advice-section"><span class="section-label-inline">Advice${s.showHindi ? ' / सलाह' : ''}</span><span class="section-dash">—</span><span class="advice-text">${rx.advice}</span></div>`;
  }

  let followUpSection = '';
  if (s.showFollowUp && (rx.followUpDate || rx.followUpNotes)) {
    const datePart = rx.followUpDate ? `📅 ${rxFormatDate(rx.followUpDate)}` : '';
    const fuNotes = rx.followUpNotes ? `${datePart ? ' — ' : ''}${rx.followUpNotes}` : '';
    followUpSection = `<div class="inline-section followup-section"><span class="section-label-inline">Follow-up${s.showHindi ? ' / जाँच' : ''}</span><span class="section-dash">—</span><span class="followup-text">${datePart}${fuNotes}</span></div>`;
  }

  let notesSection = '';
  if (s.showNotes && rx.notes) {
    notesSection = `<div class="inline-section notes-section"><span class="section-label-inline">Notes</span><span class="section-dash">—</span><span class="notes-text">${rx.notes}</span></div>`;
  }

  let watermarkHtml = '';
  if (s.showWatermark) {
    watermarkHtml = s.watermarkImage
      ? `<img class="watermark watermark-img" src="${s.watermarkImage}" alt="">`
      : `<div class="watermark">PC Memorial Kalawati Hospital</div>`;
  }

  // Address and Phone are rendered on separate lines (phone below address), both bold & larger
  const hospitalAddressHtml = (s.hospitalAddress && s.showHospitalAddress)
    ? `<div class="hospital-extra hospital-address">${s.hospitalAddress}</div>`
    : '';
  const hospitalPhoneHtml = (s.hospitalPhone && s.showHospitalPhone)
    ? `<div class="hospital-extra hospital-phone">\uD83D\uDCDE ${s.hospitalPhone}</div>`
    : '';

  // ---- New print-option resolution ----
  const theme = PRINT_THEMES[s.themeColor] || PRINT_THEMES.teal;
  const stampLabel = COPY_STAMP_LABELS[s.copyStamp];
  const paperCss = PAPER_SIZE_CSS[s.paperSize] || 'A4';
  const marginCss = MARGIN_CSS[s.margin] ?? '15mm';
  const orient = s.orientation === 'landscape' ? 'landscape' : 'portrait';
  const copies = Math.max(1, Math.min(5, Math.round(Number(s.copies) || 1)));
  const wmSize = WATERMARK_SIZE_MAP[s.watermarkSize] || WATERMARK_SIZE_MAP.medium;

  const stampHtml = stampLabel
    ? `<div class="copy-stamp" style="border-color:${stampLabel.color};color:${stampLabel.color}">${stampLabel.text}</div>`
    : '';

  // Hospital Registration No. — shown at the top-left corner of the page
  const regNoHtml = (s.hospitalRegNo && s.showHospitalRegNo)
    ? `<div class="reg-no"><span class="reg-no-label">Reg. No.</span><span class="reg-no-value">${s.hospitalRegNo}</span></div>`
    : '';

  // Inner content of a single prescription page (no outer .rx-page wrapper)
  const pageInner = `${watermarkHtml}
    ${stampHtml}
    ${regNoHtml}
    ${s.hospitalName && s.showHospitalName ? `<div class="rx-header">${s.logoData && s.showHospitalLogo ? `<div class="rx-header-logo"><img src="${s.logoData}" alt="logo"></div>` : ''}<div class="rx-header-text"><div class="hospital-name">${s.hospitalName}</div>${s.hospitalTagline && s.showHospitalTagline ? `<div class="hospital-sub">${s.hospitalTagline}</div>` : ''}${hospitalAddressHtml}${hospitalPhoneHtml}</div></div>` : ''}
    <div class="patient-grid">
      <div class="patient-info-row"><span class="pg-value patient-name">${patient?.name || '\u2014'}</span>${patient?.age ? `<span class="pg-separator">|</span><span class="pg-value"><span class="pg-label">Age:</span> ${patient.age} yrs</span>` : ''}${patient?.gender ? `<span class="pg-separator">|</span><span class="pg-value"><span class="pg-label">Sex:</span> ${patient.gender}</span>` : ''}${patient?.address ? `<span class="pg-separator">|</span><span class="pg-value patient-address-inline"><span class="pg-label">Addr:</span> ${patient.address}</span>` : ''}${patient?.phone ? `<span class="pg-separator">|</span><span class="pg-value"><span class="pg-label">Ph:</span> ${patient.phone}</span>` : ''}</div>
      <div class="date-row-top">Date: ${rxFormatDate(rx.date)}</div>
      <div class="date-doctor-row">
        ${rx.doctorName ? `<div class="doctor-info"><span class="pg-label">Doctor:</span> <span class="doctor-name-big">${rx.doctorName}</span></div>` : ''}
      </div>
    </div>
    ${vitalsSection ? vitalsSection : ''}
    ${complaintSection ? `<hr class="section-divider">${complaintSection}` : ''}
    ${(rx.medicines || []).length > 0 ? `<hr class="section-divider"><div class="med-table-header"><div class="section-label med-section-title">Medicines</div><div class="med-count">${(rx.medicines || []).length} MEDICINE${(rx.medicines || []).length > 1 ? 'S' : ''}</div></div>${medicinesHtml}` : ''}
    ${(() => {
      const hasFooterSections = adviceSection || followUpSection || notesSection;
      if (!hasFooterSections) return '';
      return `<hr class="section-divider"><div class="footer-sections-stack">${adviceSection ? adviceSection : ''}${followUpSection ? followUpSection : ''}${notesSection ? notesSection : ''}</div>`;
    })()}
    <div class="rx-footer">
      <div class="footer-left">${s.showRxId ? `Generated: ${new Date().toLocaleString('en-IN')}<br><span class="rx-id">Rx ID: ${rx.id}</span>` : ''}</div>
      ${s.showSignature ? `<div class="signature-area">${rx.doctorName ? `<div class="sig-name">${rx.doctorName}</div>` : ''}<div class="sig-line"></div><div class="sig-label">Doctor's Signature</div></div>` : ''}
    </div>`;

  // Build N copies; each .rx-page prints on its own sheet via break-after.
  const pagesHtml = Array.from({ length: copies }, (_, i) => {
    const copyBanner = copies > 1
      ? `<div class="copy-banner">Copy ${i + 1} of ${copies}</div>`
      : '';
    return `<div class="rx-page">${copyBanner}${pageInner}</div>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Prescription - ${patient?.name || ''}</title>
  <style>
    @page { size: ${paperCss} ${orient}; margin: ${marginCss}; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: ${baseFontSize}; color: #1f2937; line-height: 1.4; }
    .rx-page { position: relative; max-width: 760px; margin: 0 auto; padding: ${padding}; break-after: page; --t-primary:${theme.primary}; --t-primary-dark:${theme.primaryDark}; --t-light:${theme.light}; --t-lighter:${theme.lighter}; --t-border:${theme.border}; --t-accent:${theme.accent}; }
    .rx-page:last-child { break-after: auto; }
    .copy-banner { text-align:center; font-size:10px; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:8px; }
    .copy-stamp { position:absolute; top:14px; left:14px; padding:4px 12px; border:2px solid; border-radius:4px; font-size:11px; font-weight:800; letter-spacing:1px; background:#fff; z-index:10; text-transform:uppercase; }
    .reg-no { position:absolute; top:14px; right:14px; padding:6px 12px; border:1px solid var(--t-border); border-radius:4px; background:#fff; z-index:10; text-align:right; white-space:nowrap; }
    .reg-no .reg-no-label { color:#9ca3af; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; font-size:9px; margin-right:6px; }
    .reg-no .reg-no-value { color: var(--t-primary-dark); font-weight:700; font-size:12px; }
    .watermark { display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-45deg); font-size: ${wmSize.textPx}px; color: rgba(0,0,0,0.04); font-weight: bold; pointer-events: none; z-index: 0; white-space: nowrap; }
    .watermark-img { display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); max-width: ${wmSize.imgPct}%; max-height: ${wmSize.imgPct}%; opacity: 0.10; pointer-events: none; z-index: 0; object-fit: contain; }
    .rx-header { display: flex; align-items: center; gap: 16px; margin-bottom: ${sectionGap}; padding-bottom: 10px; border-bottom: 2px solid var(--t-primary-dark); }
    .rx-header-logo { flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
    .rx-header-logo img { max-height: 72px; max-width: 110px; object-fit: contain; }
    .rx-header-text { flex: 1; min-width: 0; }
    .rx-header .hospital-name { font-size: 20px; font-weight: 700; color: var(--t-primary-dark); line-height: 1.2; }
    .rx-header .hospital-sub { font-size: 12px; color: #374151; margin-top: 2px; font-weight: 700; }
    .rx-header .hospital-extra { font-size: 11px; color: #4b5563; margin-top: 2px; font-weight: 700; line-height: 1.35; }
    .rx-header .hospital-phone { margin-top: 1px; }
    .rx-date { text-align: center; font-size: 10px; color: #9ca3af; }
    .patient-grid { display: flex; flex-direction: column; gap: 3px; font-size: ${baseFontSize}; padding: 6px 12px; background: var(--t-lighter); border-radius: 6px; margin: 0; }
    .patient-top-row { display: flex; justify-content: flex-start; align-items: flex-start; gap: 10px; width: 100%; flex-wrap: wrap; }
    .date-doctor-row { display: flex; justify-content: flex-start; align-items: center; gap: 6px; width: 100%; flex-wrap: wrap; margin-top: 1px; padding-top: 3px; border-top: 1px dashed var(--t-border); }
    .doctor-info { white-space: nowrap; }
    .doctor-name-big { font-size: 14px; font-weight: 800; color: var(--t-primary-dark); }
    .vitals-row { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 14px; font-size: ${baseFontSize}; padding: 6px 12px; background: var(--t-lighter); border-radius: 6px; margin: 0; }
    .vital-item { display: inline-flex; align-items: center; gap: 3px; white-space: nowrap; }
    .patient-date { font-size: 11px; color: #6b7280; white-space: nowrap; font-weight: 500; }
    .pg-label { color: #6b7280; font-weight: 500; }
    .pg-value { color: #1f2937; }
    .pg-separator { color: #d1d5db; margin: 0 6px; }
    .patient-name { font-weight: 700; font-size: ${patientNameSize}; }
    .patient-name-row { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
    .patient-info-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: ${patientDetailSize}; }
    .patient-address-inline { position: relative; top: -1px; }
    .date-row-top { font-size: 12px; color: var(--t-primary-dark); font-weight: 800; white-space: nowrap; }
    .section-divider { border: none; border-top: 1px dashed var(--t-border); margin: 6px 0; }
    .section-label { font-size: ${headingSize}; font-weight: 600; color: var(--t-primary-dark); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0; }
    .med-section-title { font-size: ${medHeadingSize}; font-weight: 800; letter-spacing: 0.8px; }
    .complaint-section, .advice-section, .notes-section { margin: 0; }
    .complaint-text, .advice-text, .notes-text { font-size: ${baseFontSize}; color: #374151; }
    .followup-section { margin: 0; }
    .followup-text { font-size: ${baseFontSize}; color: #ea580c; font-weight: 500; }
    .footer-sections-stack { display: flex; flex-direction: column; gap: 4px; margin: 0; }
    .inline-section { display: flex; align-items: baseline; gap: 6px; flex-wrap: nowrap; line-height: 1.4; }
    .section-label-inline { font-size: ${headingSize}; font-weight: 700; color: var(--t-primary-dark); text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; min-width: 140px; flex-shrink: 0; }
    .section-dash { color: #9ca3af; font-weight: 600; flex-shrink: 0; }
    .inline-section .complaint-text, .inline-section .advice-text, .inline-section .notes-text, .inline-section .followup-text { flex: 1; min-width: 0; }
    .med-table-header { display: flex; justify-content: space-between; align-items: baseline; margin: 0 0 8px 0; }
    .med-count { font-size: 10px; color: #9ca3af; }
    .med-grid { display: flex; flex-wrap: wrap; align-items: center; gap: ${medRowGap} 6px; font-size: 10px; color: #1f2937; text-transform: uppercase; font-weight: 700; width: 100%; }
    .med-name-cell { width: 100%; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .med-num { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; background: var(--t-primary-dark); color: #fff; font-size: 9px; font-weight: 700; flex-shrink: 0; text-transform: none; }
    .med-name { font-size: 14px; font-weight: 700; color: #1f2937; text-transform: none; }
    .med-name-hi { font-size: 11px; color: #b45309; margin-left: 6px; font-weight: 500; }
    .det { background: #f3f4f6; padding: 1px 5px; border-radius: 3px; white-space: nowrap; }
    .det b { font-weight: 800; }
    .det-dose { }
    .det-freq { }
    .det-duration { }
    .det-schedule { }
    .det-maen { }
    .det-inst { }
    .freq-hi, .schedule-hi { color: #b45309; font-size: 9px; font-weight: 700; }
    .inst-hi { color: #7c2d12; font-size: 9px; font-weight: 700; }
    .maen-inline { display: inline-flex; gap: 2px; background: transparent; padding: 1px 2px; }
    .maen-box { display: inline-flex; align-items: center; justify-content: center; width: 15px; height: 15px; border-radius: 3px; border: 1px solid #d1d5db; font-size: 8px; font-weight: 800; color: #d1d5db; background: #f9fafb; }
    .maen-box.active { background: var(--t-primary-dark); color: #fff; border-color: var(--t-primary-dark); }
    .med-inst-inline { font-style: italic; background: #fef3c7; color: #92400e; }
    .med-divider { width: 100%; border-top: 1px dashed #9ca3af; margin-top: 4px; padding-bottom: 1px; height: 0; }
    .rx-footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: ${sectionGap}; padding-top: 12px; border-top: 1px solid #e5e7eb; }
    .rx-footer .footer-left { font-size: 9px; color: #9ca3af; }
    .rx-footer .footer-left .rx-id { font-family: monospace; font-size: 10px; color: #b0b0b0; }
    .rx-footer .signature-area { text-align: center; }
    .rx-footer .sig-line { width: 180px; border-top: 1.5px solid #4b5563; margin-bottom: 4px; }
    .rx-footer .sig-label { font-size: 11px; color: #4b5563; font-weight: 500; }
    .rx-footer .sig-name { font-size: 13px; color: #1f2937; font-weight: 600; margin-top: 2px; }
    @media print { body { padding: 0; } .rx-page { padding: ${padding}; } .watermark, .watermark-img { display: block; } }
  </style>
</head><body>
  ${pagesHtml}
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

  // Persist settings so they also apply when printing from the Prescriptions list
  // (which calls loadPrintSettings()) and survive page reloads.
  useEffect(() => {
    try {
      localStorage.setItem('pcm-print-settings', JSON.stringify(settings));
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  }, [settings]);

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
      <div className="mb-4">
        <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen} className="w-full">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
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
          </div>
          <CollapsibleContent>
            <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-5">
              {/* Section Toggles */}
              <div>
                <h4 className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-2.5">Show/Hide Sections</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-2.5">
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
                {settings.showWatermark && (
                  <div className="mt-2.5 ml-6 p-3 rounded-lg border border-blue-200 bg-blue-50/40">
                    <Label className="text-[10px] text-gray-500">Watermark Image (optional)</Label>
                    <p className="text-[10px] text-gray-400 mb-2">Upload an image to use as the printed watermark. If empty, the hospital name text is used as a diagonal watermark.</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      {settings.watermarkImage ? (
                        <img src={settings.watermarkImage} alt="Watermark" className="w-14 h-14 object-contain rounded border border-gray-200 bg-white p-1" />
                      ) : (
                        <div className="w-14 h-14 rounded border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                          <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                      )}
                      <label className="inline-flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        Select Image
                        <Input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = () => {
                                updateSetting('watermarkImage', reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {settings.watermarkImage && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-[10px] h-6 px-2 text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => updateSetting('watermarkImage', '')}
                        >
                          Remove Image
                        </Button>
                      )}
                    </div>
                    {/* Watermark Size */}
                    <div className="mt-3 flex items-center gap-2">
                      <Label className="text-[10px] text-gray-500 whitespace-nowrap">Watermark Size:</Label>
                      <Select value={settings.watermarkSize} onValueChange={(val) => updateSetting('watermarkSize', val)}>
                        <SelectTrigger className="w-32 h-8 text-xs border-blue-200 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Small</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="large">Large</SelectItem>
                          <SelectItem value="xlarge">Extra Large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* Hindi Language Options */}
              <div>
                <h4 className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-2.5">
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
                    <div className="ml-6 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 p-3 rounded-lg border border-orange-200 bg-orange-50/50">
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
                <h4 className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-2.5">
                  Medicine Details
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-4 gap-y-2.5">
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

              {/* Theme Color (new) */}
              <div>
                <h4 className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-2.5">Theme Color</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(PRINT_THEMES).map(([key, t]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => updateSetting('themeColor', key)}
                      title={t.name}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${settings.themeColor === key ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                    >
                      <span className="w-4 h-4 rounded-full border border-black/10 flex-shrink-0" style={{ background: t.swatch }} />
                      <span className="truncate">{t.name}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">Applies to headings, dividers, medicine number badges &amp; the patient grid on the printed prescription.</p>
              </div>

              {/* Hospital Info */}
              <div>
                <h4 className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-2.5">Hospital Info</h4>
                <p className="text-[10px] text-gray-400 mb-3">Tick each item to show it on the printed prescription. Untick to hide it.</p>

                {/* Logo toggle + upload */}
                <div className={`mb-3 rounded-lg border p-3 transition-colors ${settings.showHospitalLogo ? 'border-emerald-200 bg-emerald-50/40' : 'border-gray-200 bg-gray-50/50 opacity-70'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      checked={settings.showHospitalLogo}
                      onCheckedChange={() => toggleSetting('showHospitalLogo')}
                      className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                    />
                    <Label className="text-xs font-semibold cursor-pointer">Logo</Label>
                    {settings.logoData && settings.showHospitalLogo && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="ml-auto text-[10px] h-6 px-2 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => updateSetting('logoData', '')}
                      >
                        Remove Image
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {settings.logoData ? (
                      <img src={settings.logoData} alt="Logo" className="w-[50px] h-[50px] object-contain rounded border border-gray-200 bg-white p-1" />
                    ) : (
                      <div className="w-[50px] h-[50px] rounded border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                        <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                    )}
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
                </div>

                {/* Text fields with tick toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                  {([
                    { toggle: 'showHospitalRegNo', value: 'hospitalRegNo', label: 'Registration No.', placeholder: 'Hospital registration no... (shown top-left)' },
                    { toggle: 'showHospitalName', value: 'hospitalName', label: 'Hospital Name', placeholder: 'Hospital name...' },
                    { toggle: 'showHospitalTagline', value: 'hospitalTagline', label: 'Tagline', placeholder: 'Tagline...' },
                    { toggle: 'showHospitalAddress', value: 'hospitalAddress', label: 'Address', placeholder: 'Hospital address...' },
                    { toggle: 'showHospitalPhone', value: 'hospitalPhone', label: 'Phone', placeholder: 'Phone number...' },
                  ] as const).map(({ toggle, value, label, placeholder }) => (
                    <div
                      key={value}
                      className={`space-y-1 rounded-lg border p-2.5 transition-colors ${settings[toggle] ? 'border-emerald-200 bg-emerald-50/40' : 'border-gray-200 bg-gray-50/50 opacity-70'}`}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={settings[toggle]}
                          onCheckedChange={() => toggleSetting(toggle)}
                          className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                        />
                        <Label className="text-[10px] text-gray-500 cursor-pointer">{label}</Label>
                      </div>
                      <Input
                        value={settings[value]}
                        onChange={(e) => updateSetting(value, e.target.value)}
                        placeholder={placeholder}
                        className="h-8 text-xs border-emerald-200"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Reset to defaults */}
              <div className="flex items-center justify-between pt-2 border-t border-emerald-100">
                <p className="text-[10px] text-gray-400">Settings are saved automatically to this browser</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-[11px] h-7 px-2 text-gray-600 border-gray-200 hover:bg-gray-50"
                  onClick={() => setSettings(defaultSettings)}
                >
                  Reset to defaults
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Prescription Content (Preview) */}
      <div className="bg-white border-2 border-emerald-200 rounded-xl p-6 sm:p-8 font-serif relative overflow-hidden" id="prescription-print">
        {/* Watermark (text or image) */}
        {settings.showWatermark && (() => {
          const wmPreviewSize = WATERMARK_SIZE_MAP[settings.watermarkSize] || WATERMARK_SIZE_MAP.medium;
          return settings.watermarkImage ? (
            <img src={settings.watermarkImage} alt="" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0" style={{ maxWidth: `${wmPreviewSize.imgPct}%`, maxHeight: `${wmPreviewSize.imgPct}%`, objectFit: 'contain', opacity: 0.10 }} />
          ) : (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45 pointer-events-none z-0 whitespace-nowrap" style={{ fontSize: wmPreviewSize.textPx, color: 'rgba(0,0,0,0.04)', fontWeight: 700 }}>PC Memorial Kalawati Hospital</div>
          );
        })()}
        {/* Hospital Registration No. — top-right corner */}
        {settings.hospitalRegNo && settings.showHospitalRegNo && (
          <div className="absolute top-3 right-3 px-3 py-1.5 rounded border border-emerald-200 bg-white z-10 text-right whitespace-nowrap">
            <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide mr-1.5">Reg. No.</span>
            <span className="text-[12px] text-emerald-800 font-bold">{settings.hospitalRegNo}</span>
          </div>
        )}
        {/* Conditional Hospital Header — logo + name PARALLEL (side-by-side) */}
        {settings.hospitalName && settings.showHospitalName && (
          <div className="flex items-center gap-4 mb-4 pb-3 border-b-2 border-emerald-600 relative z-10">
            {settings.logoData && settings.showHospitalLogo && (
              <img src={settings.logoData} alt="Logo" className="flex-shrink-0" style={{ maxHeight: 72, maxWidth: 110, objectFit: 'contain' }} />
            )}
            <div className="flex-1 min-w-0 text-left">
              <h1 className="text-xl font-bold text-emerald-800 leading-tight">{settings.hospitalName}</h1>
              {settings.hospitalTagline && settings.showHospitalTagline && <p className="text-[13px] font-bold text-gray-700 mt-0.5">{settings.hospitalTagline}</p>}
              {settings.hospitalAddress && settings.showHospitalAddress && (
                <p className="text-xs font-bold text-gray-600 mt-0.5">{settings.hospitalAddress}</p>
              )}
              {settings.hospitalPhone && settings.showHospitalPhone && (
                <p className="text-xs font-bold text-gray-600 mt-0.5">📞 {settings.hospitalPhone}</p>
              )}
            </div>
          </div>
        )}

        {/* Patient Info - Name, Age, Gender, Date in single row */}
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-2.5 mb-2">
          <div className="space-y-1 text-sm">
            {/* Single row: Name | Age | Sex | Address | Phone */}
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
            </div>
            <div className="text-[12px] text-emerald-800 font-extrabold whitespace-nowrap">Date: {formatDate(rx.date)}</div>
            <div className="flex items-center gap-2 pt-1.5 mt-1 border-t border-dashed border-emerald-200">
              {rx.doctorName && (
                <span className="text-sm text-emerald-800 font-bold whitespace-nowrap">Doctor: {rx.doctorName}</span>
              )}
            </div>
          </div>
        </div>

        {/* Vitals */}
        {settings.showVitals && (rx.bloodPressureSystolic || rx.temperature || rx.weight || rx.pulse || rx.sugarLevel) && (
          <div className="flex flex-wrap gap-2 text-xs mb-2">
            {rx.bloodPressureSystolic && rx.bloodPressureDiastolic && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 whitespace-nowrap">
                BP: {rx.bloodPressureSystolic}/{rx.bloodPressureDiastolic} {rx.bpUnit}
              </Badge>
            )}
            {rx.temperature && (
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 whitespace-nowrap">
                Temp: {rx.temperature} {rx.tempUnit}
              </Badge>
            )}
            {rx.weight && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 whitespace-nowrap">
                Weight: {rx.weight} kg
              </Badge>
            )}
            {rx.pulse && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 whitespace-nowrap">
                Pulse: {rx.pulse} bpm
              </Badge>
            )}
            {rx.sugarLevel && (
              <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200 whitespace-nowrap">
                Sugar: {rx.sugarLevel} mg/dL
              </Badge>
            )}
          </div>
        )}

        <Separator className="my-2" />

        {/* Chief Complaint — single line */}
        {settings.showChiefComplaint && rx.chiefComplaint && (
          <div className="flex items-baseline gap-1.5 flex-nowrap mb-2">
            <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 140 }}>Chief Complaint{settings.showHindi ? ' / मुख्य शिकायत' : ''}</h3>
            <span className="text-gray-400 font-semibold flex-shrink-0">—</span>
            <p className="text-sm flex-1 min-w-0">{rx.chiefComplaint}</p>
          </div>
        )}

        <Separator className="my-2" />

        {/* Medicines */}
        {rx.medicines && rx.medicines.length > 0 && (
          <div className="mb-2">
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-sm font-extrabold text-emerald-800 uppercase tracking-wider">
                Medicines
              </h3>
              <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                {rx.medicines.length} MEDICINE{rx.medicines.length > 1 ? 'S' : ''}
              </Badge>
            </div>
            <div
              className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] text-gray-800 uppercase font-bold w-full"
            >
              {rx.medicines.map((med, idx) => {
                const maenStr = getMAENString(med);
                return (
                  <Fragment key={idx}>
                    <div className="w-full flex items-center gap-3 flex-wrap">
                      <span className="bg-emerald-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-sm normal-case">{med.name}</span>
                      {settings.showMedInstructions && med.instructions && (
                        <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded italic whitespace-nowrap"><strong>Instruction:</strong> {med.instructions}{settings.showHindi && settings.showHindiInstructions && med.instructionsHi && med.instructionsHi !== med.instructions && <span className="ml-1 text-[9px]">({med.instructionsHi})</span>}</span>
                      )}
                    </div>
                    {settings.showMedDosage && med.dosage && <span className="bg-gray-100 px-1.5 py-0.5 rounded whitespace-nowrap"><strong>Dose:</strong> {med.dosage}</span>}
                    {settings.showMedFrequency && med.frequency && <span className="bg-gray-100 px-1.5 py-0.5 rounded whitespace-nowrap"><strong>Freq:</strong> {med.frequency}{settings.showHindi && settings.showHindiFreq && FREQUENCY_HINDI_MAP[med.frequency] && <span className="text-amber-700 ml-1 text-[9px]">({FREQUENCY_HINDI_MAP[med.frequency]})</span>}</span>}
                    {settings.showMedSchedule && maenStr && <span className="bg-gray-100 px-1.5 py-0.5 rounded whitespace-nowrap"><strong>Schedule:</strong> {maenStr}{settings.showHindi && settings.showHindiSchedule && (() => {
                      const parts: string[] = [];
                      if (med.maen?.m) parts.push('सुबह');
                      if (med.maen?.a) parts.push('दोपहर');
                      if (med.maen?.e) parts.push('शाम');
                      if (med.maen?.n) parts.push('रात');
                      return parts.length > 0 ? <span className="text-amber-700 ml-1 text-[9px]">({parts.join('-')})</span> : null;
                    })()}</span>}
                    {settings.showMedSchedule && med.maen && (
                      <span className="inline-flex items-center gap-0.5 bg-transparent px-0.5 py-0.5">
                        {(['m', 'a', 'e', 'n'] as const).map((slot) => {
                          const slotLabel: Record<string, string> = { m: 'M', a: 'A', e: 'E', n: 'N' };
                          const isActive = med.maen?.[slot] || false;
                          return (
                            <span
                              key={slot}
                              className={`inline-flex items-center justify-center w-[15px] h-[15px] rounded text-[8px] font-extrabold border ${
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
                    {/* Duration placed LAST (after MAEN), per user request */}
                    {settings.showMedDuration && med.duration && <span className="bg-gray-100 px-1.5 py-0.5 rounded whitespace-nowrap"><strong>Duration:</strong> {med.duration}</span>}
                    <div className="w-full border-t border-dashed border-gray-400 mt-1.5" />
                  </Fragment>
                );
              })}
            </div>
          </div>
        )}

        <Separator className="my-4" />

        {/* Advice / Follow-up / Notes — each on its own single line */}
        {(settings.showAdvice && rx.advice) || (settings.showFollowUp && (rx.followUpDate || rx.followUpNotes)) || (settings.showNotes && rx.notes) ? (
          <div className="flex flex-col gap-1.5 mb-4">
            {settings.showAdvice && rx.advice && (
              <div className="flex items-baseline gap-1.5 flex-nowrap">
                <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 140 }}>Advice{settings.showHindi ? ' / सलाह' : ''}</h3>
                <span className="text-gray-400 font-semibold flex-shrink-0">—</span>
                <p className="text-sm flex-1 min-w-0">{rx.advice}</p>
              </div>
            )}

            {settings.showFollowUp && (rx.followUpDate || rx.followUpNotes) && (
              <div className="flex items-baseline gap-1.5 flex-nowrap">
                <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 140 }}>Follow-up{settings.showHindi ? ' / जाँच' : ''}</h3>
                <span className="text-gray-400 font-semibold flex-shrink-0">—</span>
                <p className="text-sm text-amber-700 flex-1 min-w-0">
                  {rx.followUpDate && `📅 ${formatDate(rx.followUpDate)}`}
                  {rx.followUpDate && rx.followUpNotes ? ' — ' : ''}
                  {rx.followUpNotes}
                </p>
              </div>
            )}

            {settings.showNotes && rx.notes && (
              <div className="flex items-baseline gap-1.5 flex-nowrap">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap" style={{ minWidth: 140 }}>Notes</h3>
                <span className="text-gray-400 font-semibold flex-shrink-0">—</span>
                <p className="text-xs text-gray-600 flex-1 min-w-0">{rx.notes}</p>
              </div>
            )}
          </div>
        ) : null}

        {/* Footer */}
        {settings.showRxId && (
          <>
            <Separator className="my-4" />
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
