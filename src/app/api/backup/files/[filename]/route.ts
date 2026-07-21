import { NextRequest, NextResponse } from 'next/server';
import { readServerBackup, deleteServerBackup, listServerBackups } from '@/lib/backup';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ filename: string }>;
}

/**
 * GET /api/backup/files/[filename]
 * Returns the raw backup JSON content (for download or restore preview).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { filename } = await params;
    const data = await readServerBackup(filename);
    if (!data) {
      return NextResponse.json({ error: 'Backup file not found' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading backup file:', error);
    return NextResponse.json({ error: 'Failed to read backup' }, { status: 500 });
  }
}

/**
 * POST /api/backup/files/[filename]
 * Restores the database from the named server-side backup file.
 * Uses upsert-by-id semantics (same as POST /api/backup) so restore is
 * non-destructive — existing records update, missing ones are recreated.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { filename } = await params;
    const payload = await readServerBackup(filename);
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ error: 'Backup file not found or invalid' }, { status: 404 });
    }
    const body = payload as { data?: unknown[] };
    if (!body.data || !Array.isArray(body.data)) {
      return NextResponse.json({ error: 'Invalid backup format' }, { status: 400 });
    }

    let importedPatients = 0;
    let importedPrescriptions = 0;

    for (const patientData of body.data as Record<string, unknown>[]) {
      const existingPatient = await db.patient.findUnique({
        where: { id: patientData.id as string },
      });

      if (existingPatient) {
        await db.patient.update({
          where: { id: patientData.id as string },
          data: {
            name: patientData.name as string,
            age: patientData.age as number,
            gender: patientData.gender as string,
            phone: (patientData.phone as string) || null,
            address: (patientData.address as string) || null,
          },
        });
        importedPatients++;
      } else {
        await db.patient.create({
          data: {
            id: patientData.id as string,
            name: patientData.name as string,
            age: patientData.age as number,
            gender: patientData.gender as string,
            phone: (patientData.phone as string) || null,
            address: (patientData.address as string) || null,
            ...(patientData.createdAt ? { createdAt: new Date(patientData.createdAt as string) } : {}),
            ...(patientData.updatedAt ? { updatedAt: new Date(patientData.updatedAt as string) } : {}),
          },
        });
        importedPatients++;
      }

      const prescriptions = patientData.prescriptions;
      if (Array.isArray(prescriptions)) {
        for (const prescriptionData of prescriptions as Record<string, unknown>[]) {
          const existingPrescription = await db.prescription.findUnique({
            where: { id: prescriptionData.id as string },
          });

          const medicinesRaw = prescriptionData.medicines;
          const medicinesStr = Array.isArray(medicinesRaw)
            ? JSON.stringify(medicinesRaw)
            : (medicinesRaw as string) || null;

          const rxData = {
            patientId: patientData.id as string,
            doctorName: (prescriptionData.doctorName as string) || '',
            date: new Date(prescriptionData.date as string),
            bloodPressureSystolic: (prescriptionData.bloodPressureSystolic as number) || null,
            bloodPressureDiastolic: (prescriptionData.bloodPressureDiastolic as number) || null,
            temperature: (prescriptionData.temperature as number) || null,
            bpUnit: (prescriptionData.bpUnit as string) || 'mmHg',
            tempUnit: (prescriptionData.tempUnit as string) || '°C',
            chiefComplaint: (prescriptionData.chiefComplaint as string) || (prescriptionData.chiefComplaintEn as string) || null,
            medicines: medicinesStr,
            advice: (prescriptionData.advice as string) || (prescriptionData.adviceEn as string) || null,
            followUpDate: prescriptionData.followUpDate ? new Date(prescriptionData.followUpDate as string) : null,
            followUpNotes: (prescriptionData.followUpNotes as string) || null,
            notes: (prescriptionData.notes as string) || null,
          };

          if (existingPrescription) {
            await db.prescription.update({
              where: { id: prescriptionData.id as string },
              data: rxData,
            });
          } else {
            await db.prescription.create({
              data: {
                id: prescriptionData.id as string,
                ...rxData,
                ...(prescriptionData.createdAt ? { createdAt: new Date(prescriptionData.createdAt as string) } : {}),
                ...(prescriptionData.updatedAt ? { updatedAt: new Date(prescriptionData.updatedAt as string) } : {}),
              },
            });
          }
          importedPrescriptions++;
        }
      }
    }

    return NextResponse.json({
      message: 'Backup restored successfully',
      filename,
      importedPatients,
      importedPrescriptions,
    });
  } catch (error) {
    console.error('Error restoring backup:', error);
    return NextResponse.json({ error: 'Failed to restore backup' }, { status: 500 });
  }
}

/**
 * DELETE /api/backup/files/[filename]
 * Deletes a server-side backup file.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { filename } = await params;
    const deleted = await deleteServerBackup(filename);
    if (!deleted) {
      return NextResponse.json({ error: 'Backup file not found' }, { status: 404 });
    }
    const backups = await listServerBackups();
    return NextResponse.json({ message: 'Backup deleted', remaining: backups.length });
  } catch (error) {
    console.error('Error deleting backup:', error);
    return NextResponse.json({ error: 'Failed to delete backup' }, { status: 500 });
  }
}
