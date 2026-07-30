'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { Patient } from '@/app/page';

interface PatientFormProps {
  onCreated: () => void;
  onUpdated: () => void;
}

export function PatientForm({ onCreated, onUpdated }: PatientFormProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: '',
    phone: '',
    address: '',
  });

  const resetForm = () => {
    setForm({
      name: '',
      age: '',
      gender: '',
      phone: '',
      address: '',
    });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.age || !form.gender) {
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/patients/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (res.ok) {
          onUpdated();
          resetForm();
        }
      } else {
        const res = await fetch('/api/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (res.ok) {
          onCreated();
          resetForm();
        }
      }
    } catch (err) {
      console.error('Failed to save patient:', err);
    } finally {
      setLoading(false);
    }
  };

  // Listen for edit events from patient list
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const patient = e.detail as Patient;
      setEditingId(patient.id);
      setForm({
        name: patient.name,
        age: String(patient.age),
        gender: patient.gender,
        phone: patient.phone || '',
        address: patient.address || '',
      });
    };
    window.addEventListener('edit-patient' as any, handler as EventListener);
    return () => window.removeEventListener('edit-patient' as any, handler as EventListener);
  }, []);

  return (
    <Card className="border-slate-200 shadow-sm bg-white">
      <CardHeader className="bg-slate-50 rounded-t-xl border-b border-slate-200">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            {editingId ? 'Edit Patient' : 'New Patient Registration'}
          </CardTitle>
          {editingId && (
            <Button variant="ghost" size="sm" onClick={resetForm} className="text-slate-500">
              Cancel Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Personal Information */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">Personal Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Patient full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age" className="text-sm font-medium text-slate-700">
                  Age <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="age"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Age in years (e.g., 6.5)"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  required
                  className="border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender" className="text-sm font-medium text-slate-700">
                  Gender <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.gender}
                  onValueChange={(val) => setForm({ ...form, gender: val })}
                >
                  <SelectTrigger className="border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male (पुरुष)</SelectItem>
                    <SelectItem value="Female">Female (महिला)</SelectItem>
                    <SelectItem value="Other">Other (अन्य)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-slate-700 flex items-center gap-1">
                  Phone Number
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-500">Optional</Badge>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Phone number (optional)"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="text-sm font-medium text-slate-700">Address</Label>
            <Textarea
              id="address"
              placeholder="Patient address (optional)"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              rows={2}
              className="border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={loading || !form.name.trim() || !form.age || !form.gender}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-md hover:shadow-lg transition-all"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </span>
              ) : editingId ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Update Patient
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Register Patient
                </span>
              )}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm} className="border-slate-200 text-slate-600 hover:bg-slate-50">
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
