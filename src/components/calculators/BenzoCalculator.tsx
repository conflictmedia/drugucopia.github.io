'use client';

import { useState, useMemo } from 'react';
import { BENZODIAZEPINES, convertDose, getBenzoInfo } from '@/lib/calculators/benzo-equivalence';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRightLeft, Info, AlertTriangle, Plus, Repeat } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { useUIStore } from '@/store/ui-store';

export function BenzoCalculator() {
  const [fromBenzo, setFromBenzo] = useState('alprazolam');
  const [toBenzo, setToBenzo] = useState('diazepam');
  const [fromDose, setFromDose] = useState(1);
  const openDoseLogger = useUIStore((state) => state.openDoseLogger);

  const fromInfo = getBenzoInfo(fromBenzo);
  const toInfo = getBenzoInfo(toBenzo);

  const result = useMemo(() => {
    if (!fromBenzo || !toBenzo || fromDose <= 0) return null;
    return convertDose(fromBenzo, fromDose, toBenzo);
  }, [fromBenzo, toBenzo, fromDose]);

  const handleSwap = () => {
    setFromBenzo(toBenzo);
    setToBenzo(fromBenzo);
  };

  const handleLogDose = () => {
    if (!toInfo || !result) return;
    openDoseLogger({
      substanceId: toInfo.genericName,
      substanceName: toInfo.name,
      category: 'benzodiazepines',
      route: 'oral',
    });
  };

  const COMMON_DOSE_PRESETS = [0.25, 0.5, 1, 2, 5, 10, 20];

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Benzodiazepine Equivalence Calculator</h1>
        <p className="text-base-content/70 max-w-xl mx-auto">
          Convert doses between benzodiazepines using clinical equivalence ratios (diazepam 10mg = 1x reference potency).
        </p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-end">
          <div className="form-control space-y-1.5">
            <Label className="font-semibold text-sm">From Benzodiazepine</Label>
            <Select value={fromBenzo} onChange={e => setFromBenzo(e.target.value)}>
              {BENZODIAZEPINES.map(b => (
                <option key={b.genericName} value={b.genericName}>
                  {b.name} ({b.equivalenceMg}mg = 10mg diazepam)
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center justify-center pb-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleSwap}
              title="Swap substances"
              aria-label="Swap substances"
              className="rounded-full hover:bg-base-200"
            >
              <Repeat className="h-4 w-4" />
            </Button>
          </div>

          <div className="form-control space-y-1.5">
            <Label className="font-semibold text-sm">To Benzodiazepine</Label>
            <Select value={toBenzo} onChange={e => setToBenzo(e.target.value)}>
              {BENZODIAZEPINES.map(b => (
                <option key={b.genericName} value={b.genericName}>
                  {b.name} ({b.equivalenceMg}mg = 10mg diazepam)
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Dose Input & Quick Presets */}
        <div className="space-y-2">
          <Label className="font-semibold text-sm">Dose to Convert (mg)</Label>
          <div className="flex gap-2 items-center">
            <Input
              type="number"
              step="0.125"
              min="0.01"
              value={fromDose}
              onChange={e => setFromDose(parseFloat(e.target.value) || 0)}
              placeholder="Enter dose in mg"
              className="text-base"
            />
            <span className="text-sm font-semibold text-base-content/70 whitespace-nowrap">mg</span>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-1.5 pt-2">
            <span className="text-xs text-base-content/60 self-center mr-1">Presets:</span>
            {COMMON_DOSE_PRESETS.map((dose) => (
              <button
                key={dose}
                type="button"
                onClick={() => setFromDose(dose)}
                className={`btn btn-xs ${fromDose === dose ? 'btn-primary' : 'btn-ghost border-base-300'}`}
              >
                {dose} mg
              </button>
            ))}
          </div>
        </div>

        {/* Result Card */}
        {result && fromInfo && toInfo && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
                <span className="text-xl font-medium">
                  {fromDose} mg <strong className="text-base-content">{fromInfo.name.split(' ')[0]}</strong>
                </span>
                <ArrowRightLeft className="h-5 w-5 text-primary shrink-0" />
                <span className="text-2xl font-bold text-primary">
                  {result.equivalentDose} mg <strong className="text-primary">{toInfo.name.split(' ')[0]}</strong>
                </span>
              </div>

              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleLogDose}
                className="gap-1.5 shrink-0"
              >
                <Plus className="h-4 w-4" />
                Log Converted Dose
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-2 border-t border-primary/10">
              <div className="bg-base-100/80 p-2.5 rounded-lg border border-base-300">
                <span className="text-xs text-base-content/60 block font-medium">Diazepam Equivalent</span>
                <span className="text-base font-semibold text-base-content">
                  {(fromDose / (fromInfo.equivalenceMg || 1) * 10).toFixed(1)} mg
                </span>
              </div>
              <div className="bg-base-100/80 p-2.5 rounded-lg border border-base-300">
                <span className="text-xs text-base-content/60 block font-medium">Potency Ratio</span>
                <span className="text-base font-semibold text-base-content">
                  1 mg {fromInfo.name.split(' ')[0]} ≈ {(result.equivalentDose / fromDose).toFixed(2)} mg {toInfo.name.split(' ')[0]}
                </span>
              </div>
            </div>

            <Alert variant="info" soft className="mt-2">
              <Info className="h-4 w-4 shrink-0" />
              <div className="text-xs leading-relaxed">
                Equivalence ratios are approximate clinical guidelines based on Ashton Manual and Maudsley guidelines. Cross-tolerance between benzodiazepines is incomplete. Always consult a medical professional before tapering or adjusting medication doses.
              </div>
            </Alert>
          </div>
        )}
      </Card>

      {/* Reference Table */}
      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Equivalence Reference Table</h2>
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full text-sm">
            <thead>
              <tr>
                <th>Benzodiazepine</th>
                <th className="text-right">Equiv. Dose (mg)</th>
                <th className="text-right">Potency vs Diazepam</th>
                <th>Half-Life (hrs)</th>
                <th>Onset</th>
              </tr>
            </thead>
            <tbody>
              {BENZODIAZEPINES.map(b => (
                <tr key={b.genericName} className={b.genericName === fromBenzo || b.genericName === toBenzo ? 'bg-primary/10 font-semibold' : ''}>
                  <td className="font-medium">{b.name}</td>
                  <td className="text-right">{b.equivalenceMg} mg</td>
                  <td className="text-right">{b.potencyRatio}x</td>
                  <td className="text-right">{b.halfLifeHours.min}–{b.halfLifeHours.max}h</td>
                  <td>
                    <Badge variant="outline" className="gap-1">
                      {b.onset === 'rapid' && <span className="text-xs">⚡</span>}
                      {b.onset === 'intermediate' && <span className="text-xs">⏱</span>}
                      {b.onset === 'slow' && <span className="text-xs">🐌</span>}
                      {b.onset.charAt(0).toUpperCase() + b.onset.slice(1)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Alert variant="warning" soft>
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div className="text-xs leading-relaxed">
            <strong>Clinical Disclaimer:</strong> These are approximate equivalence ratios for reference only.
            Benzodiazepines have distinct pharmacokinetic profiles (half-life, active metabolites, lipophilicity). Conversion should be performed under medical supervision with gradual tapering. High-potency benzos (alprazolam, clonazepam, triazolam) carry heightened dependence and withdrawal risks.
          </div>
        </Alert>
      </Card>
    </div>
  );
}
