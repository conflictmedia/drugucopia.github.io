'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import {
  Wine,
  ArrowRightLeft,
  Info,
  AlertTriangle,
  RotateCcw,
  Scale,
  Beaker,
  GlassWater,
  Plus,
  Beer,
} from 'lucide-react';
import {
  SHOT_SIZES,
  BEVERAGE_PRESETS,
  STANDARD_DRINKS,
  shotsToGrams,
  gramsToShots,
  getShotSize,
  getBeveragePreset,
  roundTo,
  ETHANOL_DENSITY_G_PER_ML,
} from '@/lib/calculators/alcohol';
import { useUIStore } from '@/store/ui-store';

type Mode = 'shots-to-grams' | 'grams-to-shots';

export default function AlcoholCalculatorPage() {
  const openDoseLogger = useUIStore((state) => state.openDoseLogger);

  // ─── Shared inputs ────────────────────────────────────────────────────────
  const [shotSizeId, setShotSizeId] = useState('us-single');
  const [shotVolumeMl, setShotVolumeMl] = useState(
    () => getShotSize('us-single')!.volumeMl
  );
  const [beverageId, setBeverageId] = useState('spirits');
  const [abv, setAbv] = useState(() => getBeveragePreset('spirits')!.abv);

  // ─── Directional inputs ───────────────────────────────────────────────────
  const [shots, setShots] = useState(2);
  const [targetGrams, setTargetGrams] = useState(14);
  const [mode, setMode] = useState<Mode>('shots-to-grams');

  // ─── Preset change handlers ───────────────────────────────────────────────
  const handleShotSizeChange = (id: string) => {
    setShotSizeId(id);
    const preset = getShotSize(id);
    if (preset) setShotVolumeMl(roundTo(preset.volumeMl, 2));
  };

  const handleBeverageChange = (id: string) => {
    setBeverageId(id);
    const preset = getBeveragePreset(id);
    if (preset) setAbv(preset.abv);
  };

  const handleReset = () => {
    setShotSizeId('us-single');
    setShotVolumeMl(roundTo(getShotSize('us-single')!.volumeMl, 2));
    setBeverageId('spirits');
    setAbv(getBeveragePreset('spirits')!.abv);
    setShots(2);
    setTargetGrams(14);
    setMode('shots-to-grams');
  };

  // Quick drink presets (Beer, Wine, Spirits, Strong Ale/Cocktail)
  const QUICK_BEVERAGE_PRESETS = [
    { id: 'beer-light', label: 'Beer (5%)', icon: Beer, beverage: 'beer-5', abv: 5.0, shotSize: 'us-single' },
    { id: 'wine-std', label: 'Wine (12%)', icon: Wine, beverage: 'wine-table', abv: 12.0, shotSize: 'us-single' },
    { id: 'spirits-std', label: 'Spirits (40%)', icon: GlassWater, beverage: 'spirits', abv: 40.0, shotSize: 'us-single' },
    { id: 'cocktail-std', label: 'Cocktail (25%)', icon: Beaker, beverage: 'custom', abv: 25.0, shotSize: 'us-single' },
  ];

  const selectQuickPreset = (preset: typeof QUICK_BEVERAGE_PRESETS[0]) => {
    setBeverageId(preset.beverage);
    setAbv(preset.abv);
  };

  // ─── Computed results ─────────────────────────────────────────────────────
  const result = useMemo(() => {
    return shotsToGrams({ shots, shotVolumeMl, abv });
  }, [shots, shotVolumeMl, abv]);

  const reverseResult = useMemo(() => {
    return gramsToShots(targetGrams, shotVolumeMl, abv);
  }, [targetGrams, shotVolumeMl, abv]);

  const isCustomShot = shotSizeId === 'custom';
  const isCustomBeverage = beverageId === 'custom';

  const handleLogEthanol = (grams: number) => {
    if (grams <= 0) return;
    openDoseLogger({
      substanceId: 'alcohol',
      substanceName: 'Alcohol',
      category: 'depressants',
      route: 'oral',
    });
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center gap-2">
          <Wine className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Alcohol Calculator</h1>
        </div>
        <p className="text-base-content/70 max-w-2xl mx-auto">
          Convert shots or servings of an alcoholic beverage into grams of pure ethanol — the standard
          unit used for tracking alcohol consumption and harm reduction.
        </p>
      </div>

      {/* Quick Visual Beverage Preset Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
        {QUICK_BEVERAGE_PRESETS.map((preset) => {
          const Icon = preset.icon;
          const isActive = beverageId === preset.beverage && abv === preset.abv;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => selectQuickPreset(preset)}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${isActive
                  ? 'border-primary bg-primary/10 text-primary font-semibold shadow-sm'
                  : 'border-base-300 bg-base-100 hover:border-primary/40 text-base-content/80'
                }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{preset.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mode toggle */}
      <div className="flex justify-center">
        <div role="tablist" className="tabs tabs-boxed">
          <a
            role="tab"
            className={`tab ${mode === 'shots-to-grams' ? 'tab-active' : ''}`}
            onClick={() => setMode('shots-to-grams')}
          >
            Shots / Servings → Grams
          </a>
          <a
            role="tab"
            className={`tab ${mode === 'grams-to-shots' ? 'tab-active' : ''}`}
            onClick={() => setMode('grams-to-shots')}
          >
            Grams → Shots / Servings
          </a>
        </div>
      </div>

      {/* Main calculator card */}
      <Card className="p-6 space-y-6">
        {/* Beverage & shot size selectors — shared */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-control space-y-1.5">
            <Label className="flex items-center gap-1.5 font-semibold">
              <GlassWater className="h-4 w-4" /> Beverage Type
            </Label>
            <Select value={beverageId} onChange={(e) => handleBeverageChange(e.target.value)}>
              {BEVERAGE_PRESETS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label} ({b.abv}% ABV)
                </option>
              ))}
            </Select>
            {isCustomBeverage ? (
              <div className="flex items-center gap-2 pt-1">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={abv}
                  onChange={(e) => setAbv(parseFloat(e.target.value) || 0)}
                  placeholder="ABV %"
                />
                <span className="text-sm text-base-content/60 whitespace-nowrap">% ABV</span>
              </div>
            ) : (
              <p className="text-xs text-base-content/60">
                {getBeveragePreset(beverageId)?.notes}
              </p>
            )}
          </div>

          <div className="form-control space-y-1.5">
            <Label className="flex items-center gap-1.5 font-semibold">
              <Beaker className="h-4 w-4" /> Shot / Serving Size
            </Label>
            <Select value={shotSizeId} onChange={(e) => handleShotSizeChange(e.target.value)}>
              {SHOT_SIZES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} ({roundTo(s.volumeMl, 1)} mL)
                </option>
              ))}
            </Select>
            {isCustomShot ? (
              <div className="flex items-center gap-2 pt-1">
                <Input
                  type="number"
                  min="1"
                  step="0.1"
                  value={shotVolumeMl}
                  onChange={(e) => setShotVolumeMl(parseFloat(e.target.value) || 0)}
                  placeholder="Shot volume"
                />
                <span className="text-sm text-base-content/60 whitespace-nowrap">mL</span>
              </div>
            ) : (
              <p className="text-xs text-base-content/60">
                {getShotSize(shotSizeId)?.notes}
              </p>
            )}
          </div>
        </div>

        <div className="divider my-0" />

        {/* Directional input + result */}
        {mode === 'shots-to-grams' ? (
          <ShotsToGramsPanel
            shots={shots}
            setShots={setShots}
            result={result}
            onLog={handleLogEthanol}
          />
        ) : (
          <GramsToShotsPanel
            targetGrams={targetGrams}
            setTargetGrams={setTargetGrams}
            reverseResult={reverseResult}
            shotVolumeMl={shotVolumeMl}
            abv={abv}
            onLog={handleLogEthanol}
          />
        )}

        {/* Reset */}
        <Button variant="ghost" size="sm" className="w-full" onClick={handleReset}>
          <RotateCcw className="h-4 w-4" /> Reset to defaults
        </Button>
      </Card>

      {/* Formula / how it works */}
      <Card className="p-6 space-y-3">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" /> How the conversion works
        </h2>
        <p className="text-sm text-base-content/80 leading-relaxed">
          A &ldquo;shot&rdquo; or &ldquo;serving&rdquo; is a measure of <strong>volume</strong>, while grams measure the
          <strong> mass of pure ethanol</strong>. To bridge the two we use the beverage&rsquo;s
          alcohol-by-volume (ABV) and the density of ethanol
          ({ETHANOL_DENSITY_G_PER_ML} g/mL at 20°C).
        </p>
        <div className="bg-base-200/60 rounded-lg p-4 font-mono text-sm space-y-1">
          <div>ethanol_volume_ml = shots × shot_volume_ml × (abv ÷ 100)</div>
          <div>ethanol_grams    = ethanol_volume_ml × {ETHANOL_DENSITY_G_PER_ML}</div>
        </div>
        <p className="text-sm text-base-content/80 leading-relaxed">
          For example, a single US shot (44.4 mL) of 40% ABV vodka contains
          44.4 × 0.40 × {ETHANOL_DENSITY_G_PER_ML} ≈ <strong>14.0 g</strong> of ethanol —
          exactly one US standard drink.
        </p>
      </Card>

      {/* Standard drink reference */}
      <Card className="p-6 space-y-3">
        <h2 className="text-xl font-semibold">Standard Drink References</h2>
        <p className="text-sm text-base-content/70">
          Different countries define a &ldquo;standard drink&rdquo; by a different mass of pure
          ethanol. Use these to contextualize your gram result against health guidelines.
        </p>
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full text-sm">
            <thead>
              <tr>
                <th>Region</th>
                <th className="text-right">Grams per drink</th>
                <th>Example</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-medium">United States</td>
                <td className="text-right">14 g</td>
                <td>1.5 fl oz spirits, 5 fl oz wine, 12 fl oz beer</td>
              </tr>
              <tr>
                <td className="font-medium">United Kingdom</td>
                <td className="text-right">8 g (1 unit)</td>
                <td>25 mL single of 40% spirits</td>
              </tr>
              <tr>
                <td className="font-medium">Australia / WHO</td>
                <td className="text-right">10 g</td>
                <td>30 mL spirits, 100 mL wine, 285 mL beer</td>
              </tr>
            </tbody>
          </table>
        </div>

        <Alert variant="info" soft>
          <Info className="h-5 w-5 shrink-0" />
          <div className="text-xs leading-relaxed">
            <strong>Guidelines:</strong> Health authorities recommend limiting alcohol intake and having alcohol-free days. Alcohol acts synergistically with depressants, significantly compounding respiratory risk.
          </div>
        </Alert>
      </Card>

      <Alert variant="warning" soft>
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <div className="text-xs leading-relaxed">
          <strong>Harm reduction:</strong> This tool is for educational and tracking purposes
          only. It does not account for body weight, sex, metabolism, food intake, or
          tolerance. Never use this calculator to determine whether it is safe to drive. Mixing alcohol with
          benzodiazepines, opioids, or other CNS depressants dramatically increases overdose risk.
        </div>
      </Alert>
    </div>
  );
}

// ─── Shots → Grams result panel ─────────────────────────────────────────────

function ShotsToGramsPanel({
  shots,
  setShots,
  result,
  onLog,
}: {
  shots: number;
  setShots: (n: number) => void;
  result: ReturnType<typeof shotsToGrams>;
  onLog: (grams: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="form-control space-y-1.5">
        <Label className="flex items-center gap-1.5 font-semibold">
          <GlassWater className="h-4 w-4" /> Number of Shots / Servings
        </Label>
        <Input
          type="number"
          min="0"
          step="0.5"
          value={shots}
          onChange={(e) => setShots(parseFloat(e.target.value) || 0)}
          placeholder="How many shots/servings?"
        />
      </div>

      {result && shots > 0 ? (
        <div className="bg-base-200/50 rounded-xl p-5 space-y-4 border border-base-300">
          {/* Headline result */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
                <span className="text-lg">{shots} shot{shots === 1 ? '' : 's'}</span>
                <ArrowRightLeft className="h-5 w-5 text-primary" />
                <span className="text-3xl font-bold text-primary">
                  {roundTo(result.ethanolGrams, 2)} g
                </span>
              </div>
              <p className="text-xs text-base-content/60 mt-0.5">
                of pure ethanol
              </p>
            </div>

            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => onLog(result.ethanolGrams)}
              className="gap-1.5 shrink-0"
            >
              <Plus className="h-4 w-4" />
              Log Dose
            </Button>
          </div>

          {/* Detailed breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Stat label="Total volume" value={`${roundTo(result.totalVolumeMl, 1)} mL`} />
            <Stat label="Ethanol volume" value={`${roundTo(result.ethanolVolumeMl, 1)} mL`} />
            <Stat label="Ethanol mass" value={`${roundTo(result.ethanolOunces, 3)} oz`} />
            <Stat label="Per shot" value={`${roundTo(result.gramsPerShot, 2)} g`} />
          </div>

          {/* Standard drink equivalents */}
          <div className="space-y-2 pt-2 border-t border-base-300">
            <p className="text-xs font-medium text-base-content/60 uppercase tracking-wide">
              Equivalent to
            </p>
            <div className="flex flex-wrap gap-2">
              {STANDARD_DRINKS.map((d) => (
                <Badge key={d.id} variant="outline" className="gap-1">
                  {roundTo(result.standardDrinks[d.id], 2)}× {d.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-base-200/30 rounded-lg p-5 text-center text-base-content/50 text-sm">
          Enter a number of shots to see the ethanol equivalent.
        </div>
      )}
    </div>
  );
}

// ─── Grams → Shots result panel ─────────────────────────────────────────────

function GramsToShotsPanel({
  targetGrams,
  setTargetGrams,
  reverseResult,
  shotVolumeMl,
  abv,
  onLog,
}: {
  targetGrams: number;
  setTargetGrams: (n: number) => void;
  reverseResult: number | null;
  shotVolumeMl: number;
  abv: number;
  onLog: (grams: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="form-control space-y-1.5">
        <Label className="flex items-center gap-1.5 font-semibold">
          <Scale className="h-4 w-4" /> Target Ethanol (grams)
        </Label>
        <Input
          type="number"
          min="0"
          step="1"
          value={targetGrams}
          onChange={(e) => setTargetGrams(parseFloat(e.target.value) || 0)}
          placeholder="Target grams of ethanol"
        />
        <p className="text-xs text-base-content/60">
          e.g. 14 g = 1 US standard drink, 8 g = 1 UK unit
        </p>
      </div>

      {reverseResult !== null && targetGrams > 0 ? (
        <div className="bg-base-200/50 rounded-xl p-5 space-y-4 border border-base-300">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
                <span className="text-lg">{roundTo(targetGrams, 2)} g</span>
                <ArrowRightLeft className="h-5 w-5 text-primary" />
                <span className="text-3xl font-bold text-primary">
                  {roundTo(reverseResult, 2)} shots
                </span>
              </div>
              <p className="text-xs text-base-content/60 mt-0.5">
                at {roundTo(shotVolumeMl, 1)} mL per shot and {abv}% ABV
              </p>
            </div>

            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => onLog(targetGrams)}
              className="gap-1.5 shrink-0"
            >
              <Plus className="h-4 w-4" />
              Log Dose
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat
              label="Per shot"
              value={`${roundTo(shotVolumeMl * (abv / 100) * ETHANOL_DENSITY_G_PER_ML, 2)} g`}
            />
            <Stat
              label="Total volume"
              value={`${roundTo(reverseResult * shotVolumeMl, 1)} mL`}
            />
          </div>
        </div>
      ) : (
        <div className="bg-base-200/30 rounded-lg p-5 text-center text-base-content/50 text-sm">
          Enter a target mass of ethanol to see how many shots it equals.
        </div>
      )}
    </div>
  );
}

// ─── Small stat sub-component ───────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-base-100 rounded-lg p-3 border border-base-300">
      <div className="text-xs text-base-content/60 uppercase tracking-wide font-medium">{label}</div>
      <div className="font-semibold text-base-content mt-0.5">{value}</div>
    </div>
  );
}
