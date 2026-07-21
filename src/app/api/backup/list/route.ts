import { NextResponse } from 'next/server';
import { listServerBackups } from '@/lib/backup';

/** GET /api/backup/list — list all server-side backup files with metadata. */
export async function GET() {
  try {
    const backups = await listServerBackups();
    return NextResponse.json({ backups, total: backups.length });
  } catch (error) {
    console.error('Error listing server backups:', error);
    return NextResponse.json({ error: 'Failed to list backups' }, { status: 500 });
  }
}
