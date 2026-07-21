'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Plus, Pencil, Trash2, Search } from 'lucide-react';

interface Doctor {
  id: string;
  name: string;
  specialization?: string;
  phone?: string;
  email?: string;
  address?: string;
  consultationFee?: number;
  createdAt: string;
  updatedAt: string;
}

interface DoctorForm {
  name: string;
  specialization: string;
  phone: string;
  email: string;
  address: string;
  consultationFee: string;
}

const emptyForm: DoctorForm = {
  name: '', specialization: '', phone: '', email: '', address: '', consultationFee: '',
};

export function DoctorMasterPage({ onDoctorsChanged }: { onDoctorsChanged?: () => void }) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [deletingDoctor, setDeletingDoctor] = useState<Doctor | null>(null);
  const [form, setForm] = useState<DoctorForm>(emptyForm);
  const [loading, setLoading] = useState(false);

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await fetch(`/api/doctors?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.doctors) setDoctors(data.doctors);
    } catch {
      toast.error('Failed to fetch doctors');
    }
  }, [search]);

  useEffect(() => { fetchDoctors(); }, [fetchDoctors]);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Doctor name is required'); return; }
    setLoading(true);
    try {
      const url = editingDoctor ? `/api/doctors/${editingDoctor.id}` : '/api/doctors';
      const method = editingDoctor ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to save'); }
      toast.success(editingDoctor ? 'Doctor updated' : 'Doctor added');
      setDialogOpen(false); setEditingDoctor(null); setForm(emptyForm);
      fetchDoctors(); onDoctorsChanged?.();
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  const handleEdit = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setForm({ name: doctor.name, specialization: doctor.specialization || '', phone: doctor.phone || '', email: doctor.email || '', address: doctor.address || '', consultationFee: doctor.consultationFee?.toString() || '' });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingDoctor) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/doctors/${deletingDoctor.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Doctor deleted');
      setDeleteDialogOpen(false); setDeletingDoctor(null);
      fetchDoctors(); onDoctorsChanged?.();
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-800">Doctor Master</h2>
          <span className="text-sm text-slate-500">({doctors.length} doctors)</span>
        </div>
        <Button onClick={() => { setEditingDoctor(null); setForm(emptyForm); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Doctor
        </Button>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input placeholder="Search doctors..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20" />
      </div>
      <div className="grid gap-3">
        {doctors.map((doctor) => (
          <Card key={doctor.id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="py-3 px-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{doctor.name}</p>
                  {doctor.specialization && <p className="text-sm text-slate-500">{doctor.specialization}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                    {doctor.phone && <span>Phone: {doctor.phone}</span>}
                    {doctor.email && <span>Email: {doctor.email}</span>}
                    {doctor.consultationFee != null && doctor.consultationFee > 0 && <span>Fee: Rs. {doctor.consultationFee}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700" onClick={() => handleEdit(doctor)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => { setDeletingDoctor(doctor); setDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {doctors.length === 0 && <p className="text-center text-slate-400 py-8">No doctors found</p>}
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingDoctor ? 'Edit Doctor' : 'Add Doctor'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-sm font-medium text-slate-700">Name *</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dr. John Smith" className="border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20" /></div>
            <div><label className="text-sm font-medium text-slate-700">Specialization</label><Input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} placeholder="General Medicine, Orthopedics..." className="border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium text-slate-700">Phone</label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20" /></div>
              <div><label className="text-sm font-medium text-slate-700">Email</label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20" /></div>
            </div>
            <div><label className="text-sm font-medium text-slate-700">Address</label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20" /></div>
            <div><label className="text-sm font-medium text-slate-700">Consultation Fee (Rs.)</label><Input type="number" value={form.consultationFee} onChange={(e) => setForm({ ...form, consultationFee: e.target.value })} className="border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : editingDoctor ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Doctor</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete <strong>{deletingDoctor?.name}</strong>? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}