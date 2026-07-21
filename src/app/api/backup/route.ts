import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { buildBackupPayload, saveManualBackup } from '@/lib/backup';

export async function GET() {
  try {
    const payload = await buildBackupPayload();

    // Also save a server-side copy in the app's backups/ folder so the
    // clinic always has a recent on-disk backup beyond the browser download.
    let savedAs: string | null = null;
    try {
      savedAs = await saveManualBackup(payload);
    } catch (err) {
      console.error('Failed to save server-side backup copy:', err);
    }

    return NextResponse.json({ ...payload, serverBackupFile: savedAs });
  } catch (error) {
    console.error('Error exporting backup:', error);
    return NextResponse.json({ error: 'Failed to export backup' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.data || !Array.isArray(body.data)) {
      return NextResponse.json({ error: 'Invalid backup format' }, { status: 400 });
    }

    let importedPatients = 0;
    let importedPrescriptions = 0;

    for (const patientData of body.data) {
      // Check if patient already exists
      const existingPatient = await db.patient.findUnique({
        where: { id: patientData.id },
      });

      if (existingPatient) {
        // Update existing patient
        await db.patient.update({
          where: { id: patientData.id },
          data: {
            name: patientData.name,
            age: patientData.age,
            gender: patientData.gender,
            phone: patientData.phone || null,
            address: patientData.address || null,
          },
        });
        importedPatients++;
      } else {
        // Create new patient - preserve original createdAt so latest-first order is maintained after restore
        await db.patient.create({
          data: {
            id: patientData.id,
            name: patientData.name,
            age: patientData.age,
            gender: patientData.gender,
            phone: patientData.phone || null,
            address: patientData.address || null,
            ...(patientData.createdAt ? { createdAt: new Date(patientData.createdAt) } : {}),
            ...(patientData.updatedAt ? { updatedAt: new Date(patientData.updatedAt) } : {}),
          },
        });
        importedPatients++;
      }

      // Import prescriptions
      if (patientData.prescriptions && Array.isArray(patientData.prescriptions)) {
        for (const prescriptionData of patientData.prescriptions) {
          const existingPrescription = await db.prescription.findUnique({
            where: { id: prescriptionData.id },
          });

          const medicinesStr = Array.isArray(prescriptionData.medicines)
            ? JSON.stringify(prescriptionData.medicines)
            : prescriptionData.medicines || null;

          const rxData = {
            patientId: patientData.id,
            doctorName: prescriptionData.doctorName,
            date: new Date(prescriptionData.date),
            bloodPressureSystolic: prescriptionData.bloodPressureSystolic || null,
            bloodPressureDiastolic: prescriptionData.bloodPressureDiastolic || null,
            temperature: prescriptionData.temperature || null,
            bpUnit: prescriptionData.bpUnit || 'mmHg',
            tempUnit: prescriptionData.tempUnit || '°C',
            chiefComplaint: prescriptionData.chiefComplaint || prescriptionData.chiefComplaintEn || null,
            medicines: medicinesStr,
            advice: prescriptionData.advice || prescriptionData.adviceEn || null,
            followUpDate: prescriptionData.followUpDate ? new Date(prescriptionData.followUpDate) : null,
            followUpNotes: prescriptionData.followUpNotes || null,
            notes: prescriptionData.notes || null,
          };

          if (existingPrescription) {
            await db.prescription.update({
              where: { id: prescriptionData.id },
              data: rxData,
            });
          } else {
            await db.prescription.create({
              data: {
                id: prescriptionData.id,
                ...rxData,
                ...(prescriptionData.createdAt ? { createdAt: new Date(prescriptionData.createdAt) } : {}),
                ...(prescriptionData.updatedAt ? { updatedAt: new Date(prescriptionData.updatedAt) } : {}),
              },
            });
          }
          importedPrescriptions++;
        }
      }
    }

    // Import medicine master into the database
    let importedMedicines = 0;
    if (body.medicineMaster && Array.isArray(body.medicineMaster)) {
      for (const medData of body.medicineMaster) {
        if (!medData.name?.trim()) continue;

        // Check if medicine with same name already exists
        const existingMed = await db.medicineMaster.findFirst({
          where: { name: medData.name.trim() },
        });

        if (!existingMed) {
          await db.medicineMaster.create({
            data: {
              id: medData.id || undefined,
              name: medData.name.trim(),
              nameHi: medData.nameHi || '',
              dosage: medData.dosage || '',
              frequency: medData.frequency || '',
              duration: medData.duration || '',
              instructions: medData.instructions || '',
              instructionsHi: medData.instructionsHi || '',
              category: medData.category || '',
              maenM: medData.maen?.m || false,
              maenA: medData.maen?.a || false,
              maenE: medData.maen?.e || false,
              maenN: medData.maen?.n || false,
            },
          });
          importedMedicines++;
        }
      }
    }

    return NextResponse.json({
      message: 'Backup imported successfully',
      importedPatients,
      importedPrescriptions,
      importedMedicines,
    });
  } catch (error) {
    console.error('Error importing backup:', error);
    return NextResponse.json({ error: 'Failed to import backup' }, { status: 500 });
  }
}
