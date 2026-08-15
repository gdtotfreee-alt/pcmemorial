import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { specialization: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const [doctors, total] = await Promise.all([
      db.doctor.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.doctor.count({ where }),
    ]);

    return NextResponse.json({ doctors, total, page, limit });
  } catch (error: any) {
    console.error('Error fetching doctors:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, specialization, phone, email, address, consultationFee } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Doctor name is required' }, { status: 400 });
    }

    const doctor = await db.doctor.create({
      data: {
        name: name.trim(),
        specialization: specialization?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        consultationFee: consultationFee && consultationFee !== '' && Number(consultationFee) > 0 ? Number(consultationFee) : null,
      },
    });

    return NextResponse.json(doctor, { status: 201 });
  } catch (error: any) {
    console.error('Error creating doctor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}