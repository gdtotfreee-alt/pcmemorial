'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PrescriptionView, printPrescription, savePrescriptionPdf } from '@/components/prescription-view';
import type { Patient, Prescription } from '@/app/page';

interface PrescriptionListProps {
  prescriptions: Prescription[];
  totalCount?: number;
  onEdit: (prescription: Prescription) => void;
  onRepeat: (prescription: Prescription) => void;
  onDeleted: () => void;
  patients: Patient[];
}

export function PrescriptionList({ prescriptions, totalCount, onEdit, onRepeat, onDeleted }: PrescriptionListProps) {
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Prescription | null>(null);

  // Latest first: sort by prescription date descending, createdAt as tiebreaker
  const filtered = prescriptions
    .filter((p) =>
      (p.patient?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.doctorName || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.chiefComplaint || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.advice || '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/prescriptions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onDeleted();
      }
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Build a human-friendly date label for a date separator
  const getDateLabel = (dateStr: string): { label: string; sub: string } => {
    const d = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dNorm = new Date(d);
    dNorm.setHours(0, 0, 0, 0);

    const diffDays = Math.round((today.getTime() - dNorm.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return { label: 'Today', sub: formatDate(dateStr) };
    if (diffDays === 1) return { label: 'Yesterday', sub: formatDate(dateStr) };
    if (diffDays > 0 && diffDays < 7) return { label: `${diffDays} days ago`, sub: formatDate(dateStr) };
    return { label: formatDate(dateStr), sub: '' };
  };

  // Group filtered prescriptions by date (YYYY-MM-DD) preserving latest-first order
  const grouped = (() => {
    const groups: { dateKey: string; label: string; sub: string; items: Prescription[] }[] = [];
    for (const rx of filtered) {
      const d = new Date(rx.date);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      let group = groups.find((g) => g.dateKey === dateKey);
      if (!group) {
        const { label, sub } = getDateLabel(rx.date);
        group = { dateKey, label, sub, items: [] };
        groups.push(group);
      }
      group.items.push(rx);
    }
    return groups;
  })();

  return (
    <>
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="bg-slate-50 rounded-t-xl border-b border-slate-200">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Prescription Records ({totalCount ?? prescriptions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="mb-4">
            <Input
              placeholder="Search by patient name, doctor, chief complaint..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-medium">No prescriptions found</p>
              <p className="text-xs mt-1">Create a new prescription from the patient list</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <div className="space-y-3">
                {grouped.map((group) => (
                  <div key={group.dateKey} className="pt-1">
                    {/* Date Separator */}
                    <div className="sticky top-0 z-10 flex items-center gap-2 bg-white py-2 px-3 mb-2 border-l-2 border-emerald-500 shadow-sm">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{group.label}</span>
                        {group.sub && <span className="text-[10px] text-slate-400 font-medium">{group.sub}</span>}
                      </div>
                      <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold">
                        {group.items.length} Rx
                      </Badge>
                    </div>
                    {/* Prescription cards for this date */}
                    <div className="space-y-2">
                    {group.items.map((rx) => (
                  <div
                    key={rx.id}
                    className="p-4 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-semibold text-gray-800 text-sm">{rx.patient?.name || 'Unknown'}</h4>
                          <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700">
                            {rx.patient?.age}y, {rx.patient?.gender}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                          {rx.doctorName && <span>👨‍⚕️ {rx.doctorName}</span>}
                          {rx.patient?.phone && <span>📞 {rx.patient.phone}</span>}
                        </div>
                        {rx.patient?.address && (
                          <p className="text-xs text-gray-500 mt-0.5 flex items-start gap-1" title={rx.patient.address}>
                            <span className="shrink-0">📍</span>
                            <span className="truncate">{rx.patient.address}</span>
                          </p>
                        )}

                        {/* Chief Complaint */}
                        {rx.chiefComplaint && (
                          <p className="text-xs text-slate-700 mt-1.5 line-clamp-2 font-medium bg-slate-50 px-2 py-1 rounded">
                            <span className="text-slate-500">Chief Complaint:</span> {rx.chiefComplaint}
                          </p>
                        )}

                        {rx.medicines && rx.medicines.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {rx.medicines.slice(0, 3).map((med, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] bg-slate-100 text-slate-600 border-slate-200">
                                {med.name || 'Medicine'}
                              </Badge>
                            ))}
                            {rx.medicines.length > 3 && (
                              <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-500">
                                +{rx.medicines.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                        {rx.followUpDate && (
                          <p className="text-xs text-orange-600 mt-1">
                            📅 Follow-up: {formatDate(rx.followUpDate)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center flex-wrap gap-1.5 mt-3 pt-2 border-t border-slate-100">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 px-3 border-slate-200 text-slate-600 hover:bg-slate-50"
                        onClick={() => setViewing(rx)}
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7 px-3 text-gray-500 hover:text-gray-700"
                        onClick={() => printPrescription(rx)}
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        Print
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7 px-3 text-gray-500 hover:text-gray-700"
                        onClick={() => savePrescriptionPdf(rx)}
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7 px-3 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => onRepeat(rx)}
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        Repeat
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7 px-3 text-gray-500 hover:text-gray-700"
                        onClick={() => onEdit(rx)}
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-7 px-3 text-red-400 hover:text-red-600 hover:bg-red-50"
                            disabled={deleting === rx.id}
                          >
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            {deleting === rx.id ? '...' : 'Delete'}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Prescription?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this prescription. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(rx.id)} className="bg-red-600 hover:bg-red-700">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                    ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Prescription View Dialog */}
      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-800">Prescription Details</DialogTitle>
          </DialogHeader>
          {viewing && <PrescriptionView prescription={viewing} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
