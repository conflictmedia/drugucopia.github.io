/**
 * Alcohol conversion utilities.
 *
 * Converts a number of "shots" of an alcoholic beverage into grams of pure
 * ethanol — the standard unit used worldwide for tracking alcohol consumption
 * (e.g. UK units, US standard drinks, Australian standard drinks).
 *
 * The conversion is a two-step physical calculation:
 *
 *   1. Volume of the beverage (mL) × ABV (fraction) = volume of pure ethanol (mL)
 *   2. Volume of ethanol (mL) × density of ethanol (0.789 g/mL) = grams of ethanol
 *
 * So:  grams = shots × shotVolumeMl × (abv / 100) × ETHANOL_DENSITY
 *
 * A "shot" is a volume measure that varies by jurisdiction, so we expose a set
 * of regional presets. ABV varies by beverage type, so we expose beverage
 * presets as well.
 */

/** Density of pure ethanol at 20°C, in grams per millilitre. */
export const ETHANOL_DENSITY_G_PER_ML = 0.789;

/** 1 US fluid ounce in millilitres. */
export const ML_PER_US_FL_OZ = 29.5735;
/** 1 imperial (UK) fluid ounce in millilitres. */
export const ML_PER_IMP_FL_OZ = 28.4131;

// ─── Shot size presets ──────────────────────────────────────────────────────

export interface ShotSize {
  id: string;
  label: string;
  /** Volume of a single shot in millilitres. */
  volumeMl: number;
  notes: string;
}

export const SHOT_SIZES: ShotSize[] = [
  {
    id: "us-single",
    label: "US shot (1.5 fl oz)",
    volumeMl: ML_PER_US_FL_OZ * 1.5, // 44.36 mL
    notes: "Standard US pour, ~44.4 mL. Used in most American bars.",
  },
  {
    id: "us-double",
    label: "US double (2.5 fl oz)",
    volumeMl: ML_PER_US_FL_OZ * 2.5, // 73.93 mL
    notes: 'Common "double" pour in the United States.',
  },
  {
    id: "uk-single",
    label: "UK single (25 mL)",
    volumeMl: 25,
    notes: "Legal UK single measure of spirits or liqueurs.",
  },
  {
    id: "uk-double",
    label: "UK double (50 mL)",
    volumeMl: 50,
    notes: "Legal UK double measure of spirits or liqueurs.",
  },
  {
    id: "au-single",
    label: "Australia (30 mL)",
    volumeMl: 30,
    notes: "Standard Australian/NZ shot of spirits.",
  },
  {
    id: "ca-shot",
    label: "Canada (1.5 imp fl oz)",
    volumeMl: ML_PER_IMP_FL_OZ * 1.5, // 42.62 mL
    notes: "Canadian standard shot, ~42.6 mL.",
  },
  {
    id: "jp-shot",
    label: "Japan (45 mL)",
    volumeMl: 45,
    notes: "Common Japanese shochu/whisky pour.",
  },
  {
    id: "custom",
    label: "Custom volume",
    volumeMl: 44.36,
    notes: "Enter any shot volume in millilitres.",
  },
];

// ─── Beverage ABV presets ───────────────────────────────────────────────────

export interface BeveragePreset {
  id: string;
  label: string;
  /** Alcohol by volume, as a percentage (e.g. 40 = 40% ABV). */
  abv: number;
  notes: string;
}

export const BEVERAGE_PRESETS: BeveragePreset[] = [
  { id: "beer", label: "Beer", abv: 5, notes: "Average full-strength beer." },
  {
    id: "light-beer",
    label: "Light beer",
    abv: 4.2,
    notes: "Light/lower-strength lager.",
  },
  {
    id: "craft-beer",
    label: "Craft beer / IPA",
    abv: 6.5,
    notes: "Typical craft IPA.",
  },
  { id: "wine", label: "Wine", abv: 12, notes: "Average table wine." },
  {
    id: "fortified-wine",
    label: "Fortified wine",
    abv: 18,
    notes: "Port, sherry, vermouth.",
  },
  { id: "sake", label: "Sake", abv: 15, notes: "Japanese rice wine." },
  {
    id: "liqueur",
    label: "Liqueur",
    abv: 20,
    notes: "Baileys, Kahlúa, amaretto, etc.",
  },
  {
    id: "spirits",
    label: "Spirits (40%)",
    abv: 40,
    notes: "Vodka, whisky, gin, rum, tequila.",
  },
  {
    id: "high-proof",
    label: "High-proof spirits",
    abv: 50,
    notes: "Bourbon barrel proof, absinthe, etc.",
  },
  {
    id: "custom",
    label: "Custom ABV",
    abv: 40,
    notes: "Enter any ABV percentage.",
  },
];

// ─── Standard drink references ──────────────────────────────────────────────

export interface StandardDrinkDefinition {
  id: string;
  label: string;
  /** Grams of pure ethanol that constitute one "standard drink" / unit. */
  gramsPerDrink: number;
}

/**
 * Regional definitions of a "standard drink" in grams of pure ethanol.
 * Useful for contextualising a gram result against drinking guidelines.
 */
export const STANDARD_DRINKS: StandardDrinkDefinition[] = [
  { id: "us", label: "US standard drink", gramsPerDrink: 14 },
  { id: "uk", label: "UK unit", gramsPerDrink: 8 },
  { id: "au", label: "AU standard drink", gramsPerDrink: 10 },
  { id: "who", label: "WHO standard drink", gramsPerDrink: 10 },
];

// ─── Core conversion ────────────────────────────────────────────────────────

export interface AlcoholConversionInput {
  /** Number of shots consumed. */
  shots: number;
  /** Volume of a single shot in millilitres. */
  shotVolumeMl: number;
  /** Alcohol by volume, as a percentage (e.g. 40 = 40%). */
  abv: number;
}

export interface AlcoholConversionResult {
  /** Total volume of beverage consumed, in millilitres. */
  totalVolumeMl: number;
  /** Volume of pure ethanol, in millilitres. */
  ethanolVolumeMl: number;
  /** Mass of pure ethanol, in grams. */
  ethanolGrams: number;
  /** Mass of pure ethanol, in ounces (avoirdupois). */
  ethanolOunces: number;
  /** Per-shot grams of ethanol, for reference. */
  gramsPerShot: number;
  /** Standard-drink equivalents, keyed by standard drink id. */
  standardDrinks: Record<string, number>;
}

/**
 * Convert a number of shots into grams of pure ethanol.
 *
 * Returns `null` if the inputs are invalid (non-finite, negative, or zero
 * shot volume / ABV).
 */
export function shotsToGrams(
  input: AlcoholConversionInput,
): AlcoholConversionResult | null {
  const { shots, shotVolumeMl, abv } = input;

  if (
    !Number.isFinite(shots) ||
    !Number.isFinite(shotVolumeMl) ||
    !Number.isFinite(abv) ||
    shots < 0 ||
    shotVolumeMl <= 0 ||
    abv < 0 ||
    abv > 100
  ) {
    return null;
  }

  const totalVolumeMl = shots * shotVolumeMl;
  const ethanolVolumeMl = totalVolumeMl * (abv / 100);
  const ethanolGrams = ethanolVolumeMl * ETHANOL_DENSITY_G_PER_ML;
  const ethanolOunces = ethanolGrams / 28.3495; // g → avoirdupois oz
  const gramsPerShot = shotVolumeMl * (abv / 100) * ETHANOL_DENSITY_G_PER_ML;

  const standardDrinks: Record<string, number> = {};
  for (const def of STANDARD_DRINKS) {
    standardDrinks[def.id] = ethanolGrams / def.gramsPerDrink;
  }

  return {
    totalVolumeMl,
    ethanolVolumeMl,
    ethanolGrams,
    ethanolOunces,
    gramsPerShot,
    standardDrinks,
  };
}

/**
 * Reverse conversion: given a target mass of pure ethanol, how many shots
 * does that correspond to? Useful for "I want to stay under X grams" planning.
 */
export function gramsToShots(
  targetGrams: number,
  shotVolumeMl: number,
  abv: number,
): number | null {
  if (
    !Number.isFinite(targetGrams) ||
    !Number.isFinite(shotVolumeMl) ||
    !Number.isFinite(abv) ||
    targetGrams < 0 ||
    shotVolumeMl <= 0 ||
    abv <= 0 ||
    abv > 100
  ) {
    return null;
  }

  const gramsPerShot = shotVolumeMl * (abv / 100) * ETHANOL_DENSITY_G_PER_ML;
  if (gramsPerShot <= 0) return null;
  return targetGrams / gramsPerShot;
}

// ─── Lookup helpers ─────────────────────────────────────────────────────────

export function getShotSize(id: string): ShotSize | undefined {
  return SHOT_SIZES.find((s) => s.id === id);
}

export function getBeveragePreset(id: string): BeveragePreset | undefined {
  return BEVERAGE_PRESETS.find((b) => b.id === id);
}

export function getStandardDrink(
  id: string,
): StandardDrinkDefinition | undefined {
  return STANDARD_DRINKS.find((d) => d.id === id);
}

/**
 * Round to a fixed number of decimals without floating-point artefacts.
 */
export function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function gramsToDrinks(targetGrams: number): {
  shots: { us: number; uk: number; eu: number };
  standardDrinks: { us: number; uk: number; australian: number };
} | null {
  if (targetGrams <= 0) return null;

  const spiritShotUs = getShotSize("us-single")?.volumeMl ?? 44.36;
  const spiritShotUk = getShotSize("uk-single")?.volumeMl ?? 25;
  const spiritShotEu = getShotSize("eu-standard")?.volumeMl ?? 40;

  const wineGlassMl = 150;
  const wineAbv = 12.5;
  const beerCanMl = 355;
  const beerAbv = 5;

  const shots = {
    us: roundTo(gramsToShots(targetGrams, spiritShotUs, 40) ?? 0, 2),
    uk: roundTo(gramsToShots(targetGrams, spiritShotUk, 40) ?? 0, 2),
    eu: roundTo(gramsToShots(targetGrams, spiritShotEu, 40) ?? 0, 2),
  };

  const wineGrams = wineGlassMl * (wineAbv / 100) * ETHANOL_DENSITY_G_PER_ML;
  const beerGrams = beerCanMl * (beerAbv / 100) * ETHANOL_DENSITY_G_PER_ML;

  const standardDrinks = {
    us: roundTo(targetGrams / 14, 2),
    uk: roundTo(targetGrams / 8, 2),
    australian: roundTo(targetGrams / 10, 2),
  };

  return { shots, standardDrinks };
}
