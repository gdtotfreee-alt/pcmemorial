import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { saveAutoBackupIfDue } from '@/lib/backup';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const patientId = searchParams.get('patientId') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam) : 50000;
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';

    const where: Record<string, unknown> = {};

    if (patientId) {
      where.patientId = patientId;
    }

    if (search) {
      where.OR = [
        { patient: { name: { contains: search } } },
        { doctorName: { contains: search } },
        { chiefComplaint: { contains: search } },
        { advice: { contains: search } },
      ];
    }

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) (where.date as Record<string, unknown>).gte = new Date(dateFrom);
      if (dateTo) (where.date as Record<string, unknown>).lte = new Date(dateTo);
    }

    const [prescriptions, total] = await Promise.all([
      db.prescription.findMany({
        where,
        include: { patient: true },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.prescription.count({ where }),
    ]);

    return NextResponse.json({ prescriptions, total, page, limit });
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    return NextResponse.json({ error: 'Failed to fetch prescriptions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    const prescription = await db.prescription.create({
      data: {
        patientId,
        doctorName: doctorName || '',
        date: date ? new Date(date) : new Date(),
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

    // Fire-and-forget: ensure a daily auto-backup exists in the app's
    // backups/ folder. Throttled to once per day; never blocks the response.
    saveAutoBackupIfDue().catch((err) => {
      console.error('Auto-backup failed:', err);
    });

    return NextResponse.json(prescription, { status: 201 });
  } catch (error) {
    console.error('Error creating prescription:', error);
    return NextResponse.json({ error: 'Failed to create prescription' }, { status: 500 });
  }
}
