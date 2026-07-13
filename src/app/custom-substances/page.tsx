'use client';

import { useState, useEffect } from 'react';
import { useCustomSubstanceStore, type CustomSubstance } from '@/store/custom-substance-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash, Edit } from 'lucide-react';

const CATEGORIES = ['Research Chemical', 'Personal', 'Experimental'] as const;

export default function CustomSubstancesPage() {
  const { substances, loaded, addSubstance, updateSubstance, deleteSubstance, initialize } =
    useCustomSubstanceStore();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!loaded) return <div className="flex items-center justify-center py-12"><div className="loading loading-spinner loading-lg text-primary" /></div>;

  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory(CATEGORIES[0]);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const now = new Date().toISOString();
    if (editingId) {
      updateSubstance(editingId, {
        name: name.trim(),
        description: description.trim(),
        category,
        updatedAt: now,
      });
      setEditingId(null);
    } else {
      const sub: CustomSubstance = {
        id: crypto.randomUUID(),
        name: name.trim(),
        description: description.trim(),
        category,
        customData: {},
        createdAt: now,
        updatedAt: now,
      };
      addSubstance(sub);
    }
    resetForm();
  };

  const startEdit = (sub: CustomSubstance) => {
    setName(sub.name);
    setDescription(sub.description);
    setCategory(sub.category);
    setEditingId(sub.id);
    setShowForm(true);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Custom Substances</h1>
          <p className="text-base-content/70 mt-1">
            Manage your personal substance definitions.
          </p>
        </div>
        <Button intent="primary" iconOnly={false} onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Custom Substance
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Edit Substance' : 'New Substance'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Substance name"
              />
            </div>
            <div className="form-control">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="select select-bordered"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-control">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="textarea textarea-bordered"
                placeholder="Optional notes or description"
              />
            </div>
            <div className="flex gap-3">
              <Button intent="primary" type="submit">
                {editingId ? 'Save Changes' : 'Add Substance'}
              </Button>
              <Button intent="ghost" type="button" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-4">
        {substances.length === 0 ? (
          <p className="text-center text-base-content/60 py-12">
            No custom substances yet. Add one above!
          </p>
        ) : (
          substances.map((sub) => (
            <Card key={sub.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold truncate">{sub.name}</h3>
                    <Badge variant="default">{sub.category}</Badge>
                  </div>
                  {sub.description && (
                    <p className="text-base-content/70 text-sm line-clamp-2">
                      {sub.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    intent="ghost"
                    size="sm"
                    iconOnly
                    onClick={() => startEdit(sub)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    intent="danger"
                    size="sm"
                    iconOnly
                    onClick={() => deleteSubstance(sub.id)}
                  >
                    <Trash className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
