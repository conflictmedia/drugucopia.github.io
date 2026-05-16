'use client'

import React, { useState, useMemo } from 'react'
import {
  Scale,
  Pill,
  Droplets,
  AlertTriangle,
  Info,
  Calculator,
  Shield,
  Syringe,
  Clock,
  Heart,
  Skull,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { motion, AnimatePresence } from 'framer-motion'

// ─── DXM Plateau Definitions (mg/kg) ────────────────────────────────────────

interface Plateau {
  name: string
  subtitle: string
  emoji: string
  rangeMin: number
  rangeMax: number
  color: string
  bgColor: string
  borderColor: string
  glowClass: string
  spectrumColor: string
  description: string
  effects: string[]
  duration: string
}

const plateaus: Plateau[] = [
  {
    name: 'First Plateau',
    subtitle: 'Mild Stimulation',
    emoji: '☀️',
    rangeMin: 1.5,
    rangeMax: 2.5,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    glowClass: 'glow-green',
    spectrumColor: 'bg-green-500',
    description:
      'Mild stimulant-like effects emerge at this level. Users typically report slight mood elevation, a gentle increase in sociability, and a subtle sense of restlessness or energy. Music may sound slightly more engaging, and colors can appear marginally more vivid. The experience is often compared to a mild dose of a stimulant, and many users find this level functional for social settings without significant impairment.',
    effects: ['Mood elevation', 'Slight restlessness', 'Increased sociability', 'Mild stimulation', 'Music appreciation', 'Slight cognitive enhancement'],
    duration: '2 – 4 hours',
  },
  {
    name: 'Second Plateau',
    subtitle: 'Intoxication / Euphoria',
    emoji: '🌊',
    rangeMin: 2.5,
    rangeMax: 7.5,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    glowClass: 'glow-cyan',
    spectrumColor: 'bg-cyan-500',
    description:
      'Euphoric intoxication with moderate dissociation begins to take hold. Noticeable changes in perception, thought patterns, and motor coordination become apparent. The experience is frequently described as dreamlike — reality feels slightly detached, and thought processes take on a wandering, associative quality. Music becomes profoundly enhanced, and many users report closed-eye visuals at the higher end of this range. Walking and fine motor skills become noticeably impaired.',
    effects: ['Euphoria', 'Moderate dissociation', 'Altered perception', 'Dreamlike state', 'Music enhancement', 'Closed-eye visuals', 'Impaired coordination'],
    duration: '3 – 6 hours',
  },
  {
    name: 'Third Plateau',
    subtitle: 'Strong Dissociation',
    emoji: '🌀',
    rangeMin: 7.5,
    rangeMax: 15,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    glowClass: 'glow-purple',
    spectrumColor: 'bg-purple-500',
    description:
      'Intense dissociation and hallucination characterize this plateau. Users experience profound detachment from physical reality, vivid open-eye and closed-eye visual hallucinations, and difficulty forming coherent thoughts. Out-of-body sensations are commonly reported. Motor control becomes significantly impaired — walking or speaking clearly may be extremely difficult. Memory formation is often disrupted, leading to fragmented recollection of the experience. This level is not recommended for beginners and requires a safe environment with a trip sitter.',
    effects: ['Intense dissociation', 'Open-eye visuals', 'Out-of-body sensations', 'Severe motor impairment', 'Confusion', 'Memory disruption', 'Ego dissolution'],
    duration: '4 – 8 hours',
  },
  {
    name: 'Fourth Plateau',
    subtitle: 'Extreme Dissociation',
    emoji: '⚠️',
    rangeMin: 15,
    rangeMax: 20,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    glowClass: 'glow-red',
    spectrumColor: 'bg-red-500',
    description:
      'Complete dissociation from mind and body. Users may enter near-anesthetic states with intense, overwhelming hallucinations. The boundary between self and environment dissolves entirely, often described as a "hole" experience similar to high-dose ketamine. Physical mobility is essentially nonexistent — users may be unable to move, speak, or respond to external stimuli. There is a significant risk of dangerous behavior, psychotic episodes, and severe psychological distress. Amnesia is common. This plateau is strongly discouraged due to the high probability of adverse outcomes.',
    effects: ['Complete dissociation', 'Overwhelming hallucinations', 'Near-anesthetic state', 'Total immobility', 'Amnesia', 'High risk of psychosis', 'Ego death'],
    duration: '5 – 10 hours',
  },
]

// ─── OTC Product Conversions ─────────────────────────────────────────────────

interface OTCProduct {
  name: string
  dxmPerUnit: number
  unitLabel: string
  warning?: string
}

const otcProducts: OTCProduct[] = [
  {
    name: 'Robitussin DX (Syrup)',
    dxmPerUnit: 3,
    unitLabel: 'ml',
  },
  {
    name: 'Delsym (Extended Release)',
    dxmPerUnit: 3,
    unitLabel: 'ml',
    warning:
      'Delsym contains DXM polistirex (extended-release). Effects last 8–12 hours but feel weaker per mg. Do NOT double-dose to compensate — wait the full duration before redosing.',
  },
  {
    name: 'Cough Gels (15mg)',
    dxmPerUnit: 15,
    unitLabel: 'capsules',
  },
  {
    name: 'Cough Gels (30mg)',
    dxmPerUnit: 30,
    unitLabel: 'capsules',
  },
]

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function DXMCalculatorPage() {
  const [weight, setWeight] = useState<string>('')
  const [unit, setUnit] = useState<'kg' | 'lbs'>('lbs')

  const weightKg = useMemo(() => {
    const w = parseFloat(weight)
    if (isNaN(w) || w <= 0) return 0
    return unit === 'lbs' ? w / 2.20462 : w
  }, [weight, unit])

  const calculatedDoses = useMemo(() => {
    if (weightKg <= 0) return null
    return plateaus.map((p) => ({
      ...p,
      minDose: Math.round(p.rangeMin * weightKg),
      maxDose: Math.round(p.rangeMax * weightKg),
    }))
  }, [weightKg])

  const otcConversions = useMemo(() => {
    if (!calculatedDoses) return null
    return calculatedDoses.map((dose) =>
      otcProducts.map((product) => ({
        ...product,
        minUnits: Math.ceil(dose.minDose / product.dxmPerUnit),
        maxUnits: Math.ceil(dose.maxDose / product.dxmPerUnit),
      }))
    )
  }, [calculatedDoses])

  const spectrumPercentages = useMemo(() => {
    if (weightKg <= 0) return null
    const maxMg = plateaus[3].rangeMax * weightKg
    return plateaus.map((p) => ({
      percentage: ((p.rangeMax - p.rangeMin) * weightKg / maxMg) * 100,
      label: p.name.replace(' Plateau', ''),
    }))
  }, [weightKg])

  return (
    <div className="min-h-screen px-4 py-8 lg:px-8 max-w-5xl mx-auto">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 glow-cyan">
            <Calculator className="h-6 w-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">DXM Dose Calculator</h1>
            <p className="text-sm text-neutral-content">
              Dextromethorphan recreational dose calculator based on body weight (mg/kg)
            </p>
          </div>
        </div>
        <div className="alert alert-warning text-xs mt-4">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            This calculator is for <strong>harm reduction purposes only</strong>. DXM carries serious risks
            at high doses and has dangerous drug interactions — especially with MAOIs, SSRIs, SNRIs, and
            alcohol. Always research thoroughly, start low, and use a trip sitter.
          </span>
        </div>
      </div>

      {/* ─── Weight Input ────────────────────────────────────────────────── */}
      <div className="card card-transparent mb-8">
        <div className="card-body">
          <h2 className="card-title text-base flex items-center gap-2 mb-4">
            <Scale className="h-5 w-5" />
            Enter Your Body Weight
          </h2>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Input
                type="number"
                min="1"
                step="0.1"
                placeholder={unit === 'lbs' ? 'e.g. 150' : 'e.g. 68'}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="bg-base-200 border-base-300/50 text-lg h-12 font-mono"
              />
            </div>
            <div className="flex rounded-lg border border-base-300 overflow-hidden">
              <button
                onClick={() => setUnit('lbs')}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  unit === 'lbs'
                    ? 'bg-primary text-primary-content'
                    : 'bg-base-200 text-neutral-content hover:bg-base-300'
                }`}
              >
                lbs
              </button>
              <button
                onClick={() => setUnit('kg')}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  unit === 'kg'
                    ? 'bg-primary text-primary-content'
                    : 'bg-base-200 text-neutral-content hover:bg-base-300'
                }`}
              >
                kg
              </button>
            </div>
          </div>
          <AnimatePresence>
            {weightKg > 0 && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="text-xs text-neutral-content mt-2 font-mono"
              >
                {unit === 'lbs' ? `${weight} lbs ≈ ${weightKg.toFixed(1)} kg` : `${weight} kg`}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ─── Dose Spectrum Bar ────────────────────────────────────────────── */}
      <AnimatePresence>
        {spectrumPercentages && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mb-8"
          >
            <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
              <Droplets className="h-4 w-4" />
              Dose Spectrum
            </h2>
            <div className="flex rounded-xl overflow-hidden h-8 border border-base-300">
              {spectrumPercentages.map((seg, i) => (
                <div
                  key={i}
                  className={`${plateaus[i].spectrumColor} flex items-center justify-center text-[10px] font-medium text-white/90 transition-all duration-300`}
                  style={{ width: `${seg.percentage}%` }}
                >
                  <span className="hidden sm:inline truncate px-1">{seg.label}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-neutral-content mt-1 px-1">
              <span>1.5 mg/kg</span>
              <span>20 mg/kg</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Plateau Cards ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {calculatedDoses ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4 mb-8"
          >
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Pill className="h-4 w-4" />
              Plateau Doses
            </h2>
            {calculatedDoses.map((plateau, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className={`card card-transparent card-lift ${plateau.glowClass} border ${plateau.borderColor}`}
              >
                <div className="card-body">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-lg">{plateau.emoji}</span>
                        <span className={`text-lg font-bold ${plateau.color}`}>{plateau.name}</span>
                        <Badge
                          variant="outline"
                          className={`${plateau.color} ${plateau.bgColor} border-current/30 text-xs`}
                        >
                          {plateau.subtitle}
                        </Badge>
                      </div>
                      <p className="text-sm text-neutral-content mb-2 leading-relaxed">{plateau.description}</p>
                    </div>
                    <div className="text-right shrink-0 bg-base-200/40 rounded-xl p-3 border border-base-300/30">
                      <div className={`text-2xl font-bold font-mono ${plateau.color}`}>
                        {plateau.minDose}
                      </div>
                      <div className="text-xs text-neutral-content">to</div>
                      <div className={`text-2xl font-bold font-mono ${plateau.color}`}>
                        {plateau.maxDose}
                      </div>
                      <div className="text-[10px] text-neutral-content uppercase tracking-wider mt-0.5">
                        mg DXM
                      </div>
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="flex items-center gap-2 text-xs text-neutral-content">
                    <Clock className="h-3 w-3" />
                    <span>Duration: <span className="font-medium text-base-content">{plateau.duration}</span></span>
                    <span className="text-neutral-content/50">|</span>
                    <span>
                      Range: <span className="font-mono">{plateau.rangeMin}–{plateau.rangeMax} mg/kg</span>
                    </span>
                  </div>

                  <Separator className="my-2" />

                  {/* Effects */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {plateau.effects.map((effect, i) => (
                      <span
                        key={i}
                        className={`badge badge-outline text-xs ${plateau.color} ${plateau.bgColor}`}
                      >
                        {effect}
                      </span>
                    ))}
                  </div>

                  {/* OTC Product Conversion */}
                  {otcConversions && otcConversions[idx] && (
                    <div className="mt-1">
                      <p className="text-xs font-medium text-neutral-content mb-2 flex items-center gap-1.5">
                        <Syringe className="h-3 w-3" />
                        OTC Product Equivalent
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {otcConversions[idx].map((product, pi) => (
                          <div
                            key={pi}
                            className="flex items-center justify-between px-3 py-2 rounded-lg bg-base-200/50 border border-base-300/50"
                          >
                            <span className="text-xs text-neutral-content truncate mr-2">{product.name}</span>
                            <span className={`text-xs font-mono font-medium ${plateau.color} whitespace-nowrap`}>
                              {product.minUnits}–{product.maxUnits} {product.unitLabel}
                            </span>
                          </div>
                        ))}
                      </div>
                      {otcConversions[idx].some((p) => p.warning) && (
                        <div className="mt-2 flex items-start gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                          <AlertTriangle className="h-3 w-3 text-yellow-500 mt-0.5 shrink-0" />
                          <span className="text-[10px] text-yellow-400 leading-relaxed">
                            {otcConversions[idx].find((p) => p.warning)?.warning}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {/* Overdose Warning */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="alert pulse-danger border border-red-500/30 bg-red-500/5"
            >
              <Skull className="h-5 w-5 shrink-0 text-red-400" />
              <div>
                <p className="font-semibold text-sm text-red-400">
                  Above Fourth Plateau (&gt;{Math.round(20 * weightKg)} mg / &gt;20 mg/kg)
                </p>
                <p className="text-xs text-red-300/80 mt-1 leading-relaxed">
                  Doses exceeding 20 mg/kg carry severe risk of psychosis, seizures, serotonin syndrome,
                  respiratory depression, and potentially fatal outcomes. The experience becomes
                  unpredictable and uncontrollable. This territory is extremely dangerous and
                  provides no redeeming recreational value. Seek emergency medical attention if an
                  overdose is suspected.
                </p>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          /* ─── Empty State ─────────────────────────────────────────────── */
          <div className="card card-transparent mb-8">
            <div className="card-body flex flex-col items-center py-16 text-center">
              <Scale className="h-12 w-12 text-neutral-content/30 mb-4" />
              <h3 className="text-lg font-semibold text-neutral-content mb-1">Enter your weight to begin</h3>
              <p className="text-sm text-neutral-content/70 max-w-sm">
                The calculator will display personalized dose ranges for each of the four DXM plateaus
                based on your body weight, along with OTC product conversions.
              </p>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Pharmacological Notes ───────────────────────────────────────── */}
      <div className="card card-transparent mb-6">
        <div className="card-body">
          <h2 className="card-title text-base flex items-center gap-2">
            <Info className="h-4 w-4" />
            Important Pharmacological Notes
          </h2>
          <div className="space-y-3 text-sm text-neutral-content leading-relaxed">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-amber-400 mb-1">CYP2D6 Poor Metabolizers</p>
                <p className="text-xs leading-relaxed">
                  Approximately 5–10% of the population carry genetic variants that make them CYP2D6
                  poor metabolizers, meaning DXM is broken down far more slowly by the liver. For these
                  individuals, effects can be dramatically stronger and last significantly longer at any
                  given dose. Without confirmatory pharmacogenetic testing, you should assume you may be
                  sensitive and always start at the lower end of a plateau range.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-red-400 mb-1">Serotonin Syndrome Risk</p>
                <p className="text-xs leading-relaxed">
                  DXM acts as a serotonin reuptake inhibitor (SRI). Combining it with SSRIs, SNRIs,
                  MAOIs, tramadol, lithium, or other serotonergic substances can precipitate serotonin
                  syndrome — a potentially life-threatening condition characterized by agitation, confusion,
                  rapid heart rate, high blood pressure, muscle rigidity, tremors, hyperthermia, and in
                  severe cases, seizures and coma. If you are taking any psychiatric medication, consult
                  a medical professional before considering DXM.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
              <Info className="h-4 w-4 text-cyan-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-cyan-400 mb-1">HBr vs. Polistirex</p>
                <p className="text-xs leading-relaxed">
                  DXM hydrobromide (HBr) is the standard immediate-release form found in Robitussin and
                  most cough gels — onset occurs in 20–60 minutes, with peak effects at 2–3 hours. DXM
                  polistirex (found in Delsym) is an extended-release formulation with onset of 1–2 hours,
                  peak at 6–8 hours, and total duration of 8–12 hours — roughly double the HBr duration
                  but roughly half the peak intensity per milligram. Do not treat them as equivalent.
                  Polistirex doses require different expectations and more patience with onset.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
              <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-orange-400 mb-1">Avoid Multi-Ingredient Products</p>
                <p className="text-xs leading-relaxed">
                  Many OTC cold medications contain additional active ingredients alongside DXM — such as
                  acetaminophen (paracetamol), chlorpheniramine, guaifenesin, or phenylephrine. At
                  recreational DXM doses, these co-ingredients can cause severe and potentially fatal
                  harm: acetaminophen causes acute liver failure, chlorpheniramine causes dangerous
                  anticholinergic delirium, and phenylephrine causes dangerous cardiovascular effects.
                  <strong> Only use products where DXM is the sole active ingredient.</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Harm Reduction ──────────────────────────────────────────────── */}
      <div className="card card-transparent mb-6">
        <div className="card-body">
          <h2 className="card-title text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Harm Reduction Guidelines
          </h2>
          <ul className="space-y-3 mt-2">
            {[
              'Always verify the active ingredients list — use only products containing DXM as the sole active ingredient. Check every time, even with familiar brands, as formulations can change.',
              'Start with a low dose to assess your individual sensitivity, especially if you are unsure of your CYP2D6 metabolism status. A first-time user should never exceed the first plateau.',
              'Never mix DXM with alcohol, MAOIs, SSRIs, SNRIs, tramadol, lithium, or other serotonergic drugs. The risk of serotonin syndrome is real and can be fatal.',
              'Have a trusted, sober trip sitter present, especially for second plateau and above. They should know what substance you took, how much, and when.',
              'Stay hydrated with water or electrolyte drinks, but do not over-hydrate. DXM can cause SIADH (fluid retention), and excessive water intake can lead to hyponatremia.',
              'Avoid operating vehicles, machinery, or making important decisions for at least 24 hours after dosing. Residual cognitive impairment can persist well after subjective effects fade.',
              'Wait at least 3–4 weeks between DXM experiences to allow tolerance to fully reset. Frequent use leads to rapidly escalating tolerance, diminished effects, and increased risk of neurotoxicity.',
              'If you or someone else experiences signs of serotonin syndrome (agitation, fever above 101°F/38°C, muscle rigidity, rapid heartbeat, confusion, sweating), seek emergency medical care immediately.',
              'Do not use DXM if you have a history of psychosis, schizophrenia, or bipolar disorder. Dissociatives can trigger manic episodes, psychotic breaks, and prolonged depersonalization.',
              'Set and setting matter enormously. Use in a safe, comfortable environment with no obligations. Remove access to vehicles and dangerous objects before dosing.',
            ].map((tip, i) => (
              <li
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/20"
              >
                <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                <span className="text-sm leading-relaxed">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ─── Quick Reference Table ───────────────────────────────────────── */}
      <div className="card card-transparent mb-6">
        <div className="card-body">
          <h2 className="card-title text-base flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Quick Reference (mg/kg)
          </h2>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Plateau</th>
                  <th>Range (mg/kg)</th>
                  <th>Character</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {plateaus.map((p, i) => (
                  <tr key={i}>
                    <td>
                      <span className={`font-semibold ${p.color}`}>
                        {p.emoji} {p.name}
                      </span>
                    </td>
                    <td className="font-mono">
                      {p.rangeMin} – {p.rangeMax}
                    </td>
                    <td className="text-xs text-neutral-content">{p.subtitle}</td>
                    <td className="text-xs text-neutral-content">{p.duration}</td>
                  </tr>
                ))}
                <tr className="text-red-400">
                  <td className="font-semibold">
                    <Skull className="h-3 w-3 inline mr-1" />
                    Overdose
                  </td>
                  <td className="font-mono">&gt; 20</td>
                  <td className="text-xs">Dangerous / Potentially Fatal</td>
                  <td className="text-xs">Unpredictable</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── Coricidin Warning ───────────────────────────────────────────── */}
      <div className="alert pulse-danger border border-red-500/30 bg-red-500/5 mb-6">
        <Skull className="h-5 w-5 shrink-0 text-red-400" />
        <div>
          <p className="font-semibold text-sm text-red-400">
            Coricidin HBP (&quot;Triple C&quot;) — DO NOT USE
          </p>
          <p className="text-xs text-red-300/80 mt-1 leading-relaxed">
            Coricidin HBP Cough &amp; Cold tablets contain <strong>chlorpheniramine maleate</strong> — an
            anticholinergic antihistamine — in addition to DXM. At recreational DXM doses, the
            chlorpheniramine reaches toxic levels and can cause dangerous anticholinergic delirium,
            hyperthermia, tachycardia, seizures, rhabdomyolysis, and potentially fatal respiratory
            depression. Coricidin has been directly linked to numerous hospitalizations and deaths.
            <strong> Never use Coricidin or any multi-ingredient product recreationally.</strong>
          </p>
        </div>
      </div>

      {/* ─── Emergency Resources ─────────────────────────────────────────── */}
      <div className="card card-transparent mb-6">
        <div className="card-body">
          <h2 className="card-title text-base flex items-center gap-2">
            <Heart className="h-4 w-4 text-red-400" />
            Emergency Resources
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
              <p className="text-xs font-medium text-red-400 mb-1">Poison Control (US)</p>
              <p className="text-lg font-bold font-mono text-base-content">1-800-222-1222</p>
              <p className="text-[10px] text-neutral-content mt-1">Available 24/7, free, confidential</p>
            </div>
            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
              <p className="text-xs font-medium text-red-400 mb-1">Emergency Services</p>
              <p className="text-lg font-bold font-mono text-base-content">911</p>
              <p className="text-[10px] text-neutral-content mt-1">Call immediately if someone is unresponsive or in distress</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Footer Disclaimer ───────────────────────────────────────────── */}
      <div className="text-center py-6 text-xs text-neutral-content/50 space-y-1">
        <p>
          Information sourced from{' '}
          <a href="https://psychonautwiki.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-neutral-content">
            PsychonautWiki
          </a>{' '}
          and{' '}
          <a href="https://erowid.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-neutral-content">
            Erowid
          </a>.
        </p>
        <p>This tool is intended for harm reduction and educational purposes only. It is not medical advice.</p>
      </div>
    </div>
  )
}
