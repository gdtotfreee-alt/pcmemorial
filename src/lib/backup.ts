import { promises as fs } from 'fs';
import path from 'path';
import { db } from '@/lib/db';

/**
 * Server-side backup management.
 *
 * Backups are stored as timestamped JSON files inside the application's
 * `backups/` folder so they persist across restarts and survive alongside
 * the app for the long run (this is a live clinic doing ~50 patients/day).
 *
 * Two kinds of backups are written:
 *  - Manual:  `manual-YYYY-MM-DD-HHMMSS-XXXX.json`  (created on each export)
 *  - Auto:    `auto-YYYY-MM-DD.json`                (created once per day on
 *             prescription create, throttled to 1/day, last 30 retained)
 */

const APP_ROOT = path.resolve(process.cwd());
export const BACKUP_DIR = path.join(APP_ROOT, 'backups');
const MAX_AUTO_BACKUPS = 30;

export interface ServerBackupMeta {
  filename: string;
  kind: 'manual' | 'auto';
  createdAt: string; // ISO string from file mtime
  sizeBytes: number;
  patients: number;
  prescriptions: number;
}

/** Ensure the backups/ folder exists. */
async function ensureBackupDir(): Promise<void> {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch {
    // ignore — likely already exists
  }
}

/** Build the full export payload (same shape as GET /api/backup). */
export async function buildBackupPayload() {
  const patients = await db.patient.findMany({
    include: { prescriptions: { orderBy: { date: 'desc' } } },
    orderBy: { createdAt: 'desc' },
  });
  const data = patients.map((patient) => ({
    ...patient,
    prescriptions: patient.prescriptions.map((p) => ({
      ...p,
      medicines: p.medicines ? JSON.parse(p.medicines) : [],
    })),
  }));
  // Fetch medicine master from database
  const medicineMasterRecords = await db.medicineMaster.findMany({
    orderBy: { createdAt: 'desc' },
  });
  const medicineMaster = medicineMasterRecords.map((m) => ({
    id: m.id,
    name: m.name,
    nameHi: m.nameHi,
    dosage: m.dosage,
    frequency: m.frequency,
    duration: m.duration,
    instructions: m.instructions,
    instructionsHi: m.instructionsHi,
    category: m.category,
    maen: { m: m.maenM, a: m.maenA, e: m.maenE, n: m.maenN },
  }));

  return {
    exportDate: new Date().toISOString(),
    hospitalName: 'PC Memorial Kalawati Hospital',
    version: '2.2',
    data,
    medicineMaster,
  };
}

/** Save a manual backup with a timestamped filename. Returns the filename. */
export async function saveManualBackup(payload: unknown): Promise<string> {
  await ensureBackupDir();
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = Math.random().toString(36).slice(2, 6);
  const filename = `manual-${stamp}-${rand}.json`;
  await fs.writeFile(
    path.join(BACKUP_DIR, filename),
    JSON.stringify(payload, null, 2),
    'utf8'
  );
  return filename;
}

/**
 * Save a daily auto-backup, but only if one for today doesn't already exist.
 * Returns the filename if a new backup was created, or null if skipped.
 * Also prunes old auto-backups beyond MAX_AUTO_BACKUPS.
 */
export async function saveAutoBackupIfDue(): Promise<string | null> {
  await ensureBackupDir();
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const todayFilename = `auto-${dateStamp}.json`;

  // If today's auto-backup already exists, skip
  const files = await fs.readdir(BACKUP_DIR);
  if (files.includes(todayFilename)) {
    return null;
  }

  const payload = await buildBackupPayload();
  await fs.writeFile(
    path.join(BACKUP_DIR, todayFilename),
    JSON.stringify(payload, null, 2),
    'utf8'
  );

  // Prune old auto-backups (keep the most recent MAX_AUTO_BACKUPS)
  await pruneAutoBackups(files);

  return todayFilename;
}

/** Prune auto backups to keep only the most recent MAX_AUTO_BACKUPS. */
async function pruneAutoBackups(existingFiles: string[]): Promise<void> {
  const autoFiles = existingFiles
    .filter((f) => f.startsWith('auto-') && f.endsWith('.json'))
    .sort()
    .reverse(); // newest first
  const toDelete = autoFiles.slice(MAX_AUTO_BACKUPS);
  for (const f of toDelete) {
    try {
      await fs.unlink(path.join(BACKUP_DIR, f));
    } catch {
      // ignore
    }
  }
}

/** List all server-side backups, newest first, with metadata. */
export async function listServerBackups(): Promise<ServerBackupMeta[]> {
  await ensureBackupDir();
  const files = await fs.readdir(BACKUP_DIR);
  const jsonFiles = files.filter((f) => f.endsWith('.json'));

  const metas: ServerBackupMeta[] = [];
  for (const filename of jsonFiles) {
    try {
      const filePath = path.join(BACKUP_DIR, filename);
      const stat = await fs.stat(filePath);
      const kind: 'manual' | 'auto' = filename.startsWith('auto-') ? 'auto' : 'manual';

      // Read the file to count patients/prescriptions (cheap for our scale)
      let patients = 0;
      let prescriptions = 0;
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed.data)) {
          patients = parsed.data.length;
          for (const p of parsed.data) {
            if (Array.isArray(p.prescriptions)) {
              prescriptions += p.prescriptions.length;
            }
          }
        }
      } catch {
        // ignore parse errors
      }

      metas.push({
        filename,
        kind,
        createdAt: stat.mtime.toISOString(),
        sizeBytes: stat.size,
        patients,
        prescriptions,
      });
    } catch {
      // skip unreadable files
    }
  }

  // Newest first by mtime
  metas.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return metas;
}

/** Read a specific backup file's parsed content. */
export async function readServerBackup(filename: string): Promise<unknown | null> {
  // Sanitize filename to prevent path traversal
  const safe = path.basename(filename);
  if (!safe.endsWith('.json')) return null;
  const filePath = path.join(BACKUP_DIR, safe);
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/** Delete a specific backup file. Returns true if deleted. */
export async function deleteServerBackup(filename: string): Promise<boolean> {
  const safe = path.basename(filename);
  if (!safe.endsWith('.json')) return false;
  try {
    await fs.unlink(path.join(BACKUP_DIR, safe));
    return true;
  } catch {
    return false;
  }
}
