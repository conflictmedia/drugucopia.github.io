"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  parseDurationToMinutes,
  formatMinutesVerbose,
} from "@/lib/parse-duration";
import { cn } from "@/lib/utils";

export interface DurationInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "onChange" | "value" | "type" | "defaultValue"
  > {
  /** Current value in minutes. */
  value: number;
  /**
   * Callback fired when a valid duration is parsed from the input.
   * Receives the parsed minute value. Invalid inputs are not propagated —
   * the consumer is informed via `onParseError` instead.
   */
  onChange: (minutes: number) => void;
  /** Optional: called when the current input cannot be parsed. */
  onParseError?: (rawInput: string) => void;
  /** Minimum allowed value in minutes (clamped after parse). Default: 1. */
  min?: number;
  /** Maximum allowed value in minutes (clamped after parse). Default: Infinity. */
  max?: number;
  /**
   * Fallback used when the input is cleared or unparseable on blur.
   * Defaults to the current `value`.
   */
  fallback?: number;
  /** Show the verbose interpretation hint below the input. Default: true. */
  showHint?: boolean;
  /** Suffix shown to the right of the input (e.g. "minutes"). */
  suffix?: React.ReactNode;
  /** Optional className applied to the wrapper div. */
  wrapperClassName?: string;
}

/**
 * DurationInput — a text input that accepts flexible time expressions and
 * transparently converts them to minutes via {@link parseDurationToMinutes}.
 *
 * Behavior:
 *  - While focused, the input shows whatever the user typed (so they can edit
 *    freely without the field snapping to a normalized form on every keystroke).
 *  - On blur (or Enter), the input is parsed. If valid, `onChange` is called
 *    with the parsed (clamped) minutes and the field is normalized to a
 *    friendly form like "1h 30m". If invalid, the field reverts to the
 *    previous valid value and `onParseError` is called.
 *  - The displayed value while not focused is always a normalized verbose form.
 *
 * Supported input formats (case-insensitive):
 *   "1hr", "1h", "1 hour", "1 hours", "1.5h"
 *   "1min", "1m", "1 minute"
 *   "1h 30m", "1 hour 30 minutes", "1hr30min"
 *   "1:30" (HH:MM)
 *   "90"  (bare number → minutes)
 *   "1 day", "2 days", "1d"
 *   "1 week", "1w"
 */
export const DurationInput = React.forwardRef<
  HTMLInputElement,
  DurationInputProps
>(function DurationInput(
  {
    value,
    onChange,
    onParseError,
    min = 1,
    max = Infinity,
    fallback,
    showHint = true,
    suffix,
    className,
    wrapperClassName,
    onBlur,
    onKeyDown,
    ...rest
  },
  ref,
) {
  // Local string state — what's actually in the text box.
  // We initialize/refresh from `value` whenever the input is not focused.
  const [draft, setDraft] = React.useState<string>(() =>
    formatMinutesVerbose(value),
  );
  const [isFocused, setIsFocused] = React.useState(false);
  const [isInvalid, setIsInvalid] = React.useState(false);

  // Resolve the forwarded ref.
  const setRefs = React.useCallback(
    (node: HTMLInputElement | null) => {
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
    },
    [ref],
  );

  // Keep draft in sync with the external `value` whenever the field isn't
  // actively being edited.
  React.useEffect(() => {
    if (isFocused) return;
    setDraft(formatMinutesVerbose(value));
    setIsInvalid(false);
  }, [value, isFocused]);

  const commit = React.useCallback(
    (rawInput: string) => {
      const trimmed = rawInput.trim();
      if (!trimmed) {
        // Treat empty input as "revert to fallback / previous value".
        const fb = fallback ?? value;
        const clamped = Math.max(min, Math.min(max, fb));
        setDraft(formatMinutesVerbose(clamped));
        setIsInvalid(false);
        if (clamped !== value) onChange(clamped);
        return;
      }

      const parsed = parseDurationToMinutes(trimmed);
      if (parsed === null) {
        // Revert to current value, mark invalid.
        setDraft(formatMinutesVerbose(value));
        setIsInvalid(true);
        onParseError?.(trimmed);
        return;
      }

      const clamped = Math.max(min, Math.min(max, parsed));
      setDraft(formatMinutesVerbose(clamped));
      setIsInvalid(false);
      if (clamped !== value) onChange(clamped);
    },
    [value, onChange, onParseError, min, max, fallback],
  );

  const handleBlur = React.useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      commit(e.target.value);
      onBlur?.(e);
    },
    [commit, onBlur],
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commit((e.target as HTMLInputElement).value);
        // Also blur to lock in the normalized display.
        (e.target as HTMLInputElement).blur();
      } else if (e.key === "Escape") {
        // Revert without committing.
        setDraft(formatMinutesVerbose(value));
        (e.target as HTMLInputElement).blur();
      }
      onKeyDown?.(e);
    },
    [commit, value, onKeyDown],
  );

  const handleFocus = React.useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      // Select all on focus for quick replacement.
      e.target.select();
    },
    [],
  );

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDraft(e.target.value);
      // Live-clear invalid flag as the user types.
      if (isInvalid) setIsInvalid(false);
    },
    [isInvalid],
  );

  // Hint: show how the input will be interpreted (only while focused and not
  // already in a normalized form).
  const showLiveHint =
    showHint &&
    isFocused &&
    draft.trim() !== "" &&
    draft.trim() !== formatMinutesVerbose(value);

  const liveParsed = showLiveHint
    ? parseDurationToMinutes(draft)
    : null;

  return (
    <div className={cn("flex flex-col gap-1", wrapperClassName)}>
      <div className="flex items-center gap-2">
        <Input
          ref={setRefs}
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          value={draft}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            isInvalid && "input-error",
            className,
          )}
          {...rest}
        />
        {suffix != null && (
          <span className="text-sm text-neutral-content whitespace-nowrap shrink-0">
            {suffix}
          </span>
        )}
      </div>
      {showLiveHint && liveParsed !== null && (
        <p className="text-[11px] text-info leading-tight">
          → {formatMinutesVerbose(liveParsed)}
        </p>
      )}
      {showLiveHint && liveParsed === null && (
        <p className="text-[11px] text-error leading-tight">
          Couldn&apos;t parse — try formats like "1h 30m", "90m", "1:30", or "1 hour"
        </p>
      )}
    </div>
  );
});