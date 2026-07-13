'use client';

import { useState } from 'react';
import { useMedicationStore } from '@/store/medication-store';
import { MedicationForm } from './MedicationForm.js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash, Pill, AlertTriangle } from 'lucide-react';

export function MedicationList() {
  const { medications, addMedication, updateMedication, deleteMedication, initialize } = useMedicationStore();
  const [showForm, setShowForm] = useState(false);
  const [editingMed, setEditingMed] = useState<typeof medications[0] | null>(null);

  if (typeof window !== 'undefined' && !useMedicationStore.getState().loaded) {
    initialize();
  }

  const resetForm = () => {
    setEditingMed(null);
    setShowForm(false);
  };

  const handleSubmit = (data: Omit<typeof medications[0], 'id' | 'updatedAt'>) => {
    if (editingMed) {
      updateMedication(editingMed.id, data);
    } else {
      addMedication({ ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    resetForm();
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Your Medications</h1>
          <p className="text-base-content/70 mt-1">Manage prescription medications for interaction checking</p>
        </div>
        <Button onClick={() => { setEditingMed(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Medication
        </Button>
      </div>

      {showForm && (
        <MedicationForm
          initialData={editingMed || undefined}
          onClose={resetForm}
          onSubmit={handleSubmit}
        />
      )}

      {medications.length === 0 ? (
        <Card className="p-8 text-center">
          <Pill className="h-12 w-12 mx-auto text-base-content/30" />
          <h3 className="mt-4 text-lg font-semibold">No medications yet</h3>
          <p className="text-base-content/60 mt-1">Add your prescription medications to enable interaction warnings when logging doses or checking interactions.</p>
          <Button className="mt-4" onClick={() => { setEditingMed(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add First Medication
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {medications.map(med => (
            <Card key={med.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{med.name}</h3>
                    {med.genericName && <Badge variant="default">{med.genericName}</Badge>}
                    <Badge variant={med.isActive ? 'success' : 'outline'}>
                      {med.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-sm text-base-content/70">
                    {med.dosage} • {med.frequency} • {med.route}
                  </p>
                  {med.prescribedFor && <p className="text-xs text-base-content/50 mt-1">For: {med.prescribedFor}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="ghost" size="sm" iconOnly onClick={() => { setEditingMed(med); setShowForm(true); }}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" size="sm" iconOnly onClick={() => deleteMedication(med.id)}>
                    <Trash className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}