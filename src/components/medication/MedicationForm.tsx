'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { X } from 'lucide-react';
import type { UserMedication, MedicationType } from '@/store/medication-store';
import { MEDICATION_TYPES } from '@/store/medication-store';

interface MedicationFormProps {
  initialData?: UserMedication;
  onClose: () => void;
  onSubmit: (data: Omit<UserMedication, 'id' | 'updatedAt'>) => void;
}

const FREQUENCIES = ['daily', 'twice daily', 'three times daily', 'four times daily', 'weekly', 'as needed'];
const ROUTES = ['oral', 'sublingual', 'intranasal', 'inhalation', 'transdermal', 'injection', 'rectal'];

export function MedicationForm({ initialData, onClose, onSubmit }: MedicationFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [genericName, setGenericName] = useState(initialData?.genericName || '');
  const [dosage, setDosage] = useState(initialData?.dosage || '');
  const [frequency, setFrequency] = useState(initialData?.frequency || 'daily');
  const [route, setRoute] = useState(initialData?.route || 'oral');
  const [prescribedFor, setPrescribedFor] = useState(initialData?.prescribedFor || '');
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [medicationType, setMedicationType] = useState<MedicationType | ''>(initialData?.medicationType || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dosage.trim()) return;
    
    const now = new Date().toISOString();
    onSubmit({
      name: name.trim(),
      genericName: genericName.trim() || undefined,
      dosage: dosage.trim(),
      frequency,
      route,
      prescribedFor: prescribedFor.trim() || undefined,
      isActive,
      notes: notes.trim() || undefined,
      startDate: initialData?.startDate || now,
      endDate: initialData?.endDate,
      createdAt: now,
      medicationType: medicationType || undefined,
    });
  };

  return (
    <Card className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-base-100/95 backdrop-blur-sm" role="dialog">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">{initialData ? 'Edit Medication' : 'Add Medication'}</h2>
          <Button intent="ghost" size="sm" iconOnly onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="form-control">
            <Label htmlFor="name">Medication Name *</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g., Prozac" />
          </div>
          <div className="form-control">
            <Label htmlFor="genericName">Generic Name</Label>
            <Input id="genericName" value={genericName} onChange={e => setGenericName(e.target.value)} placeholder="e.g., Fluoxetine" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <Label htmlFor="dosage">Dosage *</Label>
              <Input id="dosage" value={dosage} onChange={e => setDosage(e.target.value)} required placeholder="e.g., 20mg" />
            </div>
            <div className="form-control">
              <Label htmlFor="route">Route</Label>
              <Select id="route" value={route} onChange={e => setRoute(e.target.value)}>
                {ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
              </Select>
            </div>
          </div>
          <div className="form-control">
            <Label htmlFor="frequency">Frequency</Label>
            <Select id="frequency" value={frequency} onChange={e => setFrequency(e.target.value)}>
              {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
            </Select>
          </div>
          <div className="form-control">
            <Label htmlFor="medicationType">Medication Type</Label>
            <Select id="medicationType" value={medicationType} onChange={e => setMedicationType(e.target.value as MedicationType)}>
              <option value="">Select type...</option>
              {MEDICATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>
          <div className="form-control">
            <Label htmlFor="prescribedFor">Prescribed For</Label>
            <Input id="prescribedFor" value={prescribedFor} onChange={e => setPrescribedFor(e.target.value)} placeholder="e.g., Depression, Anxiety" />
          </div>
          <div className="form-control">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Additional notes..." />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="checkbox checkbox-primary" />
            <Label htmlFor="isActive" className="cursor-pointer">Active medication</Label>
          </div>
          <div className="flex gap-3 pt-2">
            <Button intent="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button intent="primary" type="submit" className="flex-1">{initialData ? 'Save Changes' : 'Add Medication'}</Button>
          </div>
        </form>
      </div>
    </Card>
  );
}