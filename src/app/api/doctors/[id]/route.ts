import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doctor = await db.doctor.findUnique({ where: { id } });
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }
    return NextResponse.json(doctor);
  } catch (error: any) {
    console.error('Error fetching doctor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, specialization, phone, email, address, consultationFee } = body;

    const doctor = await db.doctor.update({
      where: { id },
      data: {
        name: name?.trim() || undefined,
        specialization: specialization?.trim() || undefined,
        phone: phone?.trim() || undefined,
        email: email?.trim() || undefined,
        address: address?.trim() || undefined,
        consultationFee: consultationFee && consultationFee !== '' && Number(consultationFee) > 0 ? Number(consultationFee) : null,
      },
    });

    return NextResponse.json(doctor);
  } catch (error: any) {
    console.error('Error updating doctor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.doctor.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting doctor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}