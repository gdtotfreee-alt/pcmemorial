import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50000');

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { nameHi: { contains: search } },
        { category: { contains: search } },
        { dosage: { contains: search } },
        { instructions: { contains: search } },
      ];
    }

    if (category) {
      where.category = category;
    }

    const [medicines, total] = await Promise.all([
      db.medicineMaster.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.medicineMaster.count({ where }),
    ]);

    // Transform DB records to MedicineTemplate format
    const templates = medicines.map((m) => ({
      id: m.id,
      name: m.name,
      nameHi: m.nameHi,
      dosage: m.dosage,
      dosageHi: m.dosageHi,
      frequency: m.frequency,
      duration: m.duration,
      durationHi: m.durationHi,
      instructions: m.instructions,
      instructionsHi: m.instructionsHi,
      category: m.category,
      maen: {
        m: m.maenM,
        a: m.maenA,
        e: m.maenE,
        n: m.maenN,
      },
    }));

    return NextResponse.json({ medicines: templates, total, page, limit });
  } catch (error) {
    console.error('Error fetching medicines:', error);
    return NextResponse.json({ error: 'Failed to fetch medicines' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, nameHi, dosage, dosageHi, frequency, duration, durationHi, instructions, instructionsHi, category, maen } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Medicine name is required' }, { status: 400 });
    }

    const medicine = await db.medicineMaster.create({
      data: {
        name: name.trim(),
        nameHi: nameHi?.trim() || '',
        dosage: dosage?.trim() || '',
        dosageHi: dosageHi?.trim() || '',
        frequency: frequency?.trim() || '',
        duration: duration?.trim() || '',
        durationHi: durationHi?.trim() || '',
        instructions: instructions?.trim() || '',
        instructionsHi: instructionsHi?.trim() || '',
        category: category?.trim() || '',
        maenM: maen?.m || false,
        maenA: maen?.a || false,
        maenE: maen?.e || false,
        maenN: maen?.n || false,
      },
    });

    const template = {
      id: medicine.id,
      name: medicine.name,
      nameHi: medicine.nameHi,
      dosage: medicine.dosage,
      dosageHi: medicine.dosageHi,
      frequency: medicine.frequency,
      duration: medicine.duration,
      durationHi: medicine.durationHi,
      instructions: medicine.instructions,
      instructionsHi: medicine.instructionsHi,
      category: medicine.category,
      maen: {
        m: medicine.maenM,
        a: medicine.maenA,
        e: medicine.maenE,
        n: medicine.maenN,
      },
    };

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Error creating medicine:', error);
    return NextResponse.json({ error: 'Failed to create medicine' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, nameHi, dosage, dosageHi, frequency, duration, durationHi, instructions, instructionsHi, category, maen } = body;

    if (!id) {
      return NextResponse.json({ error: 'Medicine ID is required' }, { status: 400 });
    }

    const medicine = await db.medicineMaster.update({
      where: { id },
      data: {
        name: name?.trim() || undefined,
        nameHi: nameHi?.trim() || '',
        dosage: dosage?.trim() || '',
        dosageHi: dosageHi?.trim() || '',
        frequency: frequency?.trim() || '',
        duration: duration?.trim() || '',
        durationHi: durationHi?.trim() || '',
        instructions: instructions?.trim() || '',
        instructionsHi: instructionsHi?.trim() || '',
        category: category?.trim() || '',
        maenM: maen?.m ?? false,
        maenA: maen?.a ?? false,
        maenE: maen?.e ?? false,
        maenN: maen?.n ?? false,
      },
    });

    const template = {
      id: medicine.id,
      name: medicine.name,
      nameHi: medicine.nameHi,
      dosage: medicine.dosage,
      dosageHi: medicine.dosageHi,
      frequency: medicine.frequency,
      duration: medicine.duration,
      durationHi: medicine.durationHi,
      instructions: medicine.instructions,
      instructionsHi: medicine.instructionsHi,
      category: medicine.category,
      maen: {
        m: medicine.maenM,
        a: medicine.maenA,
        e: medicine.maenE,
        n: medicine.maenN,
      },
    };

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error updating medicine:', error);
    return NextResponse.json({ error: 'Failed to update medicine' }, { status: 500 });
  }
}