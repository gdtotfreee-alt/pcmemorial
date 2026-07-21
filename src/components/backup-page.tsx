'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { invalidateMedicineCache, getMedicineTemplates } from '@/lib/medicine-master';

interface ServerBackup {
  filename: string;
  kind: 'manual' | 'auto';
  createdAt: string;
  sizeBytes: number;
  patients: number;
  prescriptions: number;
}

export function BackupPage() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ importedPatients: number; importedPrescriptions: number; importedMedicines?: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Server-side backups state
  const [serverBackups, setServerBackups] = useState<ServerBackup[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [restoringFile, setRestoringFile] = useState<string | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<ServerBackup | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ServerBackup | null>(null);

  const fetchServerBackups = useCallback(async () => {
    setLoadingBackups(true);
    try {
      const res = await fetch('/api/backup/list');
      if (res.ok) {
        const data = await res.json();
        setServerBackups(data.backups || []);
      }
    } catch (err) {
      console.error('Failed to fetch server backups:', err);
    } finally {
      setLoadingBackups(false);
    }
  }, []);

  useEffect(() => {
    fetchServerBackups();
  }, [fetchServerBackups]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleRestoreServer = async () => {
    if (!confirmRestore) return;
    setRestoringFile(confirmRestore.filename);
    setConfirmRestore(null);
    try {
      const res = await fetch(`/api/backup/files/${encodeURIComponent(confirmRestore.filename)}`, { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        toast.success(`Restored ${result.importedPatients} patients & ${result.importedPrescriptions} prescriptions from ${confirmRestore.filename}`);
        window.dispatchEvent(new CustomEvent('data-imported'));
        fetchServerBackups();
      } else {
        toast.error('Failed to restore backup');
      }
    } catch (err) {
      console.error('Restore error:', err);
      toast.error('Restore failed');
    } finally {
      setRestoringFile(null);
    }
  };

  const handleDeleteServer = async () => {
    if (!confirmDelete) return;
    setDeletingFile(confirmDelete.filename);
    setConfirmDelete(null);
    try {
      const res = await fetch(`/api/backup/files/${encodeURIComponent(confirmDelete.filename)}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Backup file deleted');
        fetchServerBackups();
      } else {
        toast.error('Failed to delete backup');
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Delete failed');
    } finally {
      setDeletingFile(null);
    }
  };

  const handleDownloadServer = async (backup: ServerBackup) => {
    try {
      const res = await fetch(`/api/backup/files/${encodeURIComponent(backup.filename)}`);
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = backup.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Downloaded ${backup.filename}`);
      } else {
        toast.error('Failed to download backup');
      }
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Download failed');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/backup');
      if (res.ok) {
        const data = await res.json();
        // Medicine master is now included from the server-side export
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pc-memorial-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Backup exported successfully!');
        // Refresh server backup list since a server-side copy was also saved
        fetchServerBackups();
      } else {
        toast.error('Failed to export backup');
      }
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const result = await res.json();
        // Medicine master is now imported to the database server-side
        // Invalidate local cache so it picks up the new data
        invalidateMedicineCache();
        await getMedicineTemplates();
        setImportResult({
          importedPatients: result.importedPatients,
          importedPrescriptions: result.importedPrescriptions,
          importedMedicines: result.importedMedicines || 0,
        });
        toast.success(`Imported ${result.importedPatients} patients, ${result.importedPrescriptions} prescriptions${result.importedMedicines > 0 ? `, ${result.importedMedicines} medicines` : ''}`);
        // Notify parent to refresh data
        window.dispatchEvent(new CustomEvent('data-imported'));
      } else {
        toast.error('Failed to import backup');
      }
    } catch (err) {
      console.error('Import error:', err);
      toast.error('Invalid backup file');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Data Backup
        </h2>
        <p className="text-sm text-slate-500 mt-1">Export or import your hospital data for backup and recovery</p>
      </div>

      {/* Export Card */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="bg-slate-50 rounded-t-xl border-b border-slate-200">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="bg-slate-100 rounded-xl p-3 flex-shrink-0">
              <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-slate-800">Download All Data</h4>
              <p className="text-sm text-slate-500 mt-1">
                Export all patient records and prescriptions as a JSON file. You can use this file to restore data later.
              </p>
              <Button
                onClick={handleExport}
                disabled={exporting}
                className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
              >
                {exporting ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Exporting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Backup
                  </span>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Card */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="bg-slate-50 rounded-t-xl border-b border-slate-200">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="bg-slate-100 rounded-xl p-3 flex-shrink-0">
              <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-slate-800">Restore Data</h4>
              <p className="text-sm text-slate-500 mt-1">
                Upload a previously exported JSON backup file. Existing records will be updated and new ones added.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
                id="backup-import-page"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                variant="outline"
                className="mt-4 border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm"
              >
                {importing ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Importing...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Choose Backup File
                  </span>
                )}
              </Button>

              {importResult && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700 font-medium">Import completed successfully!</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                      {importResult.importedPatients} Patients
                    </Badge>
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                      {importResult.importedPrescriptions} Prescriptions
                    </Badge>
                    {importResult.importedMedicines ? (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                        {importResult.importedMedicines} Medicines
                      </Badge>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Server Backups Card */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="bg-slate-50 rounded-t-xl border-b border-slate-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12H3l9-9 9 9h-2M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7M9 21v-6a2 2 0 012-2h2a2 2 0 012 2v6" />
              </svg>
              Server Backups (Auto-Saved)
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchServerBackups} disabled={loadingBackups} className="text-slate-600 hover:bg-slate-100 h-8">
              {loadingBackups ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              )}
              <span className="ml-1 text-xs">Refresh</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <p className="text-sm text-slate-500 mb-3">
            Backups stored on the server in the <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">backups/</code> folder of the application. A daily auto-backup is created when prescriptions are saved, and every manual export also saves a copy here. This ensures your clinic data survives restarts for the long run.
          </p>

          {loadingBackups && serverBackups.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">Loading backups...</div>
          ) : serverBackups.length === 0 ? (
            <div className="text-center py-6 text-slate-400">
              <svg className="w-10 h-10 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12H3l9-9 9 9h-2M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>
              <p className="text-sm">No server backups yet</p>
              <p className="text-xs mt-1">Export a backup or save a prescription to create one automatically</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2">
              {serverBackups.map((backup) => (
                <div key={backup.filename} className="p-3 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="secondary" className={`text-[10px] ${backup.kind === 'auto' ? 'bg-teal-100 text-teal-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {backup.kind === 'auto' ? '⚡ Auto' : 'Manual'}
                        </Badge>
                        <span className="text-xs font-mono text-slate-600 truncate">{backup.filename}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        <span>📅 {formatDate(backup.createdAt)}</span>
                        <span>💾 {formatSize(backup.sizeBytes)}</span>
                        <span>👤 {backup.patients} pts</span>
                        <span>💊 {backup.prescriptions} rx</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 px-2.5 border-teal-200 text-teal-700 hover:bg-teal-50"
                      onClick={() => setConfirmRestore(backup)}
                      disabled={restoringFile === backup.filename}
                    >
                      {restoringFile === backup.filename ? (
                        <svg className="w-3 h-3 mr-1 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      ) : (
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      )}
                      Restore
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-7 px-2.5 text-slate-500 hover:text-slate-700"
                      onClick={() => handleDownloadServer(backup)}
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-7 px-2.5 text-red-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setConfirmDelete(backup)}
                      disabled={deletingFile === backup.filename}
                    >
                      {deletingFile === backup.filename ? (
                        <svg className="w-3 h-3 mr-1 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      ) : (
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      )}
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-slate-400 mt-3">
            Total server backups: <strong className="text-slate-600">{serverBackups.length}</strong>
            {serverBackups.some((b) => b.kind === 'auto') && ' • Auto-backups keep the last 30 days'}
          </p>
        </CardContent>
      </Card>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={!!confirmRestore} onOpenChange={(open) => !open && setConfirmRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore from server backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore data from <strong className="font-mono">{confirmRestore?.filename}</strong>. Records with matching IDs will be updated, and any missing records will be recreated. Records that exist now but not in the backup will remain. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreServer} className="bg-teal-600 hover:bg-teal-700">
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete backup file?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong className="font-mono">{confirmDelete?.filename}</strong> from the server. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteServer} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Info Card */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm text-slate-700 font-medium">Important Notes</p>
            <ul className="text-xs text-slate-500 mt-1.5 space-y-1 list-disc list-inside">
              <li>A <strong>daily auto-backup</strong> is saved to the server <code className="bg-slate-200 px-1 rounded">backups/</code> folder whenever prescriptions are created — no manual action needed.</li>
              <li>Every manual export also saves a server-side copy, so you always have an on-disk backup beyond the browser download.</li>
              <li>Auto-backups retain the last 30 days; manual backups stay until you delete them.</li>
              <li>Database file: <code className="bg-slate-200 px-1 rounded">db/custom.db</code> (SQLite, in the app folder).</li>
              <li>Importing / restoring updates existing records with matching IDs and adds new ones (non-destructive).</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}