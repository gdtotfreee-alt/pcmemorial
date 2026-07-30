import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const prescription = await db.prescription.findUnique({
      where: { id },
      include: { patient: true },
    });

    if (!prescription) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 });
    }

    const parsedPrescription = {
      ...prescription,
      medicines: prescription.medicines ? JSON.parse(prescription.medicines) : [],
    };

    return NextResponse.json(parsedPrescription);
  } catch (error) {
    console.error('Error fetching prescription:', error);
    return NextResponse.json({ error: 'Failed to fetch prescription' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      patientId, doctorName, date,
      bloodPressureSystolic, bloodPressureDiastolic,
      temperature, bpUnit, tempUnit,
      weight, pulse, sugarLevel,
      chiefComplaint,
      medicines, advice,
      followUpDate, followUpNotes, notes,
    } = body;

    const prescription = await db.prescription.update({
      where: { id },
      data: {
        patientId,
        doctorName: doctorName || '',
        date: date ? new Date(date) : undefined,
        bloodPressureSystolic: bloodPressureSystolic ? parseInt(bloodPressureSystolic) : null,
        bloodPressureDiastolic: bloodPressureDiastolic ? parseInt(bloodPressureDiastolic) : null,
        temperature: temperature ? parseFloat(temperature) : null,
        bpUnit: bpUnit || 'mmHg',
        tempUnit: tempUnit || '°C',
        weight: weight ? parseFloat(weight) : null,
        pulse: pulse ? parseInt(pulse) : null,
        sugarLevel: sugarLevel ? parseInt(sugarLevel) : null,
        chiefComplaint: chiefComplaint || null,
        medicines: medicines ? JSON.stringify(medicines) : null,
        advice: advice || null,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        followUpNotes: followUpNotes || null,
        notes: notes || null,
      },
      include: { patient: true },
    });

    const parsedPrescription = {
      ...prescription,
      medicines: prescription.medicines ? JSON.parse(prescription.medicines) : [],
    };

    return NextResponse.json(parsedPrescription);
  } catch (error) {
    console.error('Error updating prescription:', error);
    return NextResponse.json({ error: 'Failed to update prescription' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.prescription.delete({ where: { id } });
    return NextResponse.json({ message: 'Prescription deleted successfully' });
  } catch (error) {
    console.error('Error deleting prescription:', error);
    return NextResponse.json({ error: 'Failed to delete prescription' }, { status: 500 });
  }
}
