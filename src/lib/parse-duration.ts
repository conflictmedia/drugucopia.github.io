/**
 * Flexible duration parser — converts human-friendly time strings into minutes.
 *
 * Accepted formats (case-insensitive, plural-tolerant):
 *   "1hr", "1h", "1 hour", "1 hours", "1hour"
 *   "1min", "1m", "1 minute", "1 minutes", "1minute"
 *   "1d", "1 day", "1 days"
 *   "1w", "1 week", "1 weeks"
 *   "1h 30m", "1 hour 30 minutes", "1hr30min"
 *   "1.5h", "0.5h", "2.25 hours"
 *   "1:30"  (→ 1 hour 30 minutes = 90 minutes)
 *   "90"    (bare number interpreted as minutes)
 *
 * Returns `null` when the input cannot be parsed.
 */

export type ParsedDurationUnit = "minutes" | "hours" | "days" | "weeks";

export interface ParsedDuration {
  /** Total duration expressed in minutes. */
  minutes: number;
  /** The original input string (trimmed). */
  raw: string;
}

/** Multiplier to convert a single unit into minutes. */
const UNIT_TO_MINUTES: Record<ParsedDurationUnit, number> = {
  minutes: 1,
  hours: 60,
  days: 60 * 24,
  weeks: 60 * 24 * 7,
};

/**
 * Regex aliases for each supported unit. Order matters — longer/more-specific
 * aliases must come first so that e.g. "min" doesn't accidentally match "minutes"
 * prefix-only and leave "utes" dangling. (We use word boundaries so this is safe
 * either way, but keeping the explicit ordering makes intent clear.)
 */
const UNIT_ALIASES: { regex: RegExp; unit: ParsedDurationUnit }[] = [
  // hours
  { regex: /^hrs?\.?$/i, unit: "hours" },
  { regex: /^hours?$/i, unit: "hours" },
  { regex: /^h$/i, unit: "hours" },
  // minutes
  { regex: /^mins?\.?$/i, unit: "minutes" },
  { regex: /^minutes?$/i, unit: "minutes" },
  { regex: /^m$/i, unit: "minutes" },
  // days
  { regex: /^days?$/i, unit: "days" },
  { regex: /^d$/i, unit: "days" },
  // weeks
  { regex: /^weeks?$/i, unit: "weeks" },
  { regex: /^wks?\.?$/i, unit: "weeks" },
  { regex: /^w$/i, unit: "weeks" },
];

function resolveUnit(token: string): ParsedDurationUnit | null {
  for (const alias of UNIT_ALIASES) {
    if (alias.regex.test(token)) return alias.unit;
  }
  return null;
}

/**
 * Parse a flexible duration string into minutes.
 *
 * Examples:
 *   parseDurationToMinutes("1hr")      → 60
 *   parseDurationToMinutes("1h")       → 60
 *   parseDurationToMinutes("1 hour")   → 60
 *   parseDurationToMinutes("1.5h")     → 90
 *   parseDurationToMinutes("1h 30m")   → 90
 *   parseDurationToMinutes("1:30")     → 90
 *   parseDurationToMinutes("90")       → 90
 *   parseDurationToMinutes("1min")     → 1
 *   parseDurationToMinutes("1m")       → 1
 *   parseDurationToMinutes("1 minute") → 1
 *   parseDurationToMinutes("2 days")   → 2880
 *   parseDurationToMinutes("garbage")  → null
 *   parseDurationToMinutes("")         → null
 */
export function parseDurationToMinutes(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;

  // Numbers passed directly are treated as minutes.
  if (typeof input === "number") {
    if (!isFinite(input) || input < 0) return null;
    return input;
  }

  const raw = String(input).trim();
  if (!raw) return null;

  // 1) Colon format "HH:MM" (and "HH:MM:SS")
  if (/^\d+:\d{1,2}(:\d{1,2})?$/.test(raw)) {
    const parts = raw.split(":").map((p) => parseInt(p, 10));
    let total = 0;
    if (parts.length === 2) {
      // HH:MM
      total = parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      // HH:MM:SS — round seconds to nearest minute
      total = parts[0] * 60 + parts[1] + Math.round(parts[2] / 60);
    }
    return total >= 0 ? total : null;
  }

  // 2) Bare numeric input — interpret as minutes (allows decimals like "1.5").
  if (/^\d+(\.\d+)?$/.test(raw)) {
    const n = parseFloat(raw);
    if (!isFinite(n) || n < 0) return null;
    return Math.round(n);
  }

  // 3) Tokenized form: "<number><unit> [<number><unit> ...]"
  //    Whitespace between number and unit is optional.
  //    Examples: "1hr", "1 hr", "1h 30m", "1 hour 30 minutes", "1.5h"
  //
  // We use a global regex to walk through (number, unit) pairs.
  const tokenRegex = /(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?/g;
  let totalMinutes = 0;
  let matchedAny = false;
  let lastUnitWasMissing = false;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(raw)) !== null) {
    const numStr = match[1];
    const unitStr = match[2];

    // Skip tokens where we got an empty match (shouldn't happen, but guard anyway).
    if (numStr === undefined) continue;

    const num = parseFloat(numStr);
    if (!isFinite(num) || num < 0) return null;

    if (unitStr === undefined || unitStr === "") {
      // Number without a unit. We allow this only at the end of the string
      // OR if the overall input contains only this number (already handled above).
      // In a mixed expression like "1h 30" the trailing 30 is interpreted as minutes.
      // In an expression like "30 1h" we treat the 30 as minutes as well.
      totalMinutes += Math.round(num);
      lastUnitWasMissing = true;
      matchedAny = true;
      continue;
    }

    const unit = resolveUnit(unitStr);
    if (!unit) {
      // Unknown unit — fail rather than guess.
      return null;
    }

    totalMinutes += Math.round(num * UNIT_TO_MINUTES[unit]);
    lastUnitWasMissing = false;
    matchedAny = true;
  }

  if (!matchedAny) return null;
  // Allow trailing unitless number, but reject inputs where NO unit was ever seen
  // except the bare-number case handled above. (That path already returned.)
  if (lastUnitWasMissing && !/[a-zA-Z]/.test(raw)) {
    // Pure numeric with whitespace — should have been handled by regex #2 above,
    // but be defensive. This branch shouldn't normally be hit.
    return Math.round(parseFloat(raw.replace(/\s+/g, "")));
  }

  return totalMinutes >= 0 ? totalMinutes : null;
}

/**
 * Format a duration (in minutes) back into a friendly, abbreviated string.
 * Useful for showing the user how their input was interpreted.
 *
 *   formatMinutesVerbose(90)  → "1h 30m"
 *   formatMinutesVerbose(60)  → "1h"
 *   formatMinutesVerbose(45)  → "45m"
 *   formatMinutesVerbose(1440) → "1d"
 */
export function formatMinutesVerbose(minutes: number): string {
  if (!isFinite(minutes) || minutes <= 0) return "0m";

  const weeks = Math.floor(minutes / (60 * 24 * 7));
  minutes -= weeks * 60 * 24 * 7;
  const days = Math.floor(minutes / (60 * 24));
  minutes -= days * 60 * 24;
  const hours = Math.floor(minutes / 60);
  minutes -= hours * 60;
  const mins = minutes;

  const parts: string[] = [];
  if (weeks > 0) parts.push(`${weeks}w`);
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);

  return parts.length > 0 ? parts.join(" ") : "0m";
}

/**
 * Convenience wrapper that parses and clamps in one go.
 * Returns the clamped minute value, or `fallback` if parsing fails.
 */
export function parseDurationToMinutesClamped(
  input: string | number | null | undefined,
  opts: { min: number; max: number; fallback: number },
): number {
  const parsed = parseDurationToMinutes(input);
  if (parsed === null) return opts.fallback;
  return Math.max(opts.min, Math.min(opts.max, parsed));
}