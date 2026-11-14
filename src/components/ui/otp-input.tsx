import * as React from "react"

import { cn } from "@/lib/utils"
import { playSound, type SoundName } from "@/components/ui/sound"

// <OtpInput> — segmented one-time-code field (the "type the 6-digit code"
// input). Vendored, self-contained (no input-otp / no @radix dependency), so
// it drops into a bare app with nothing to install.
//
// Why it's not N separate <input>s: this renders ONE real, focusable text
// input stretched invisibly across the field, with the digit cells painted
// beneath it. That single input keeps everything the platform gives you for
// free — native paste of a whole code, iOS/Android SMS autofill
// (`autocomplete="one-time-code"`), the numeric soft keyboard on mobile
// (`inputmode="numeric"`), and correct screen-reader semantics — while the
// cells are yours to style. Auto-advance and backspace "just work" because
// there's only one caret to move.
//
// Delight, on by the same rules as the rest of the kit:
//   - Squircle continuous corners (paired with `rounded-md`, the fallback) so
//     the cells match `Button`/`Card`.
//   - The active cell shows a soft blinking caret; a filled field pops a subtle
//     ring. Motion self-mutes under `prefers-reduced-motion`.
//   - Opt-in tactile SOUND (`sound` prop): a quiet `tap` per digit and a
//     `success` chime when the code completes — off by default (silence is the
//     right default), gesture-driven, and self-muting under reduced-motion.
//     See `./sound`.
//
// Controlled: drive `value` / `onChange` from state (mirrors how `VibesLogin`
// already tracks the code). `onComplete` fires once the field fills — wire your
// verify call there. Every colour reads the app's shadcn theme variables, so it
// inherits whatever preset the app uses. Edit freely — it's yours now.

export interface OtpInputProps {
  /** The current code (controlled). Only allowed characters are ever stored. */
  value: string
  /** Called with the sanitized next value on every change. */
  onChange: (value: string) => void
  /** Fires once the field reaches `length`. Great place to auto-submit/verify. */
  onComplete?: (value: string) => void
  /** Number of cells. Defaults to 6 (the vibes email-code length). */
  length?: number
  /**
   * Play a synthesized sound as the user types. `true` uses a soft `tap` per
   * digit plus a `success` chime on completion; pass a preset name to use that
   * tone for the per-digit tick instead. Off by default.
   */
  sound?: boolean | SoundName
  disabled?: boolean
  autoFocus?: boolean
  /** Soft-keyboard hint. `"numeric"` (default) for codes; `"text"` for alnum. */
  inputMode?: "numeric" | "text"
  /**
   * Which characters are accepted. Defaults to digits only. Anything typed or
   * pasted that doesn't match is dropped (so pasting "123-456" yields "123456").
   */
  allowed?: RegExp
  "aria-label"?: string
  className?: string
  /** Extra classes merged onto each cell (e.g. sizing, radius). */
  cellClassName?: string
}

export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  sound = false,
  disabled = false,
  autoFocus = false,
  inputMode = "numeric",
  allowed = /[0-9]/,
  "aria-label": ariaLabel = "Verification code",
  className,
  cellClassName,
}: OtpInputProps) {
  const [focused, setFocused] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  // Guard so onComplete fires once per fill, not on every keystroke while full.
  const completedRef = React.useRef(false)

  const tapTone: SoundName = sound === true ? "tap" : (sound as SoundName)

  const sanitize = React.useCallback(
    (raw: string) =>
      Array.from(raw)
        .filter((ch) => allowed.test(ch))
        .join("")
        .slice(0, length),
    [allowed, length],
  )

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = sanitize(e.target.value)
    if (next === value) return
    const grew = next.length > value.length
    onChange(next)

    if (next.length === length) {
      if (!completedRef.current) {
        completedRef.current = true
        if (sound) playSound("success")
        onComplete?.(next)
      }
    } else {
      completedRef.current = false
      if (grew && sound) playSound(tapTone)
    }
  }

  // The active cell is the first empty slot, clamped to the last cell when full
  // so the caret has somewhere to sit.
  const activeIndex = Math.min(value.length, length - 1)
  const cells = Array.from({ length }, (_, i) => value[i] ?? "")

  return (
    <div
      className={cn("relative inline-flex w-full", className)}
      onMouseDown={(e) => {
        // Keep clicks anywhere in the field focusing the (invisible) input,
        // even if they land between cells.
        if (e.target !== inputRef.current) {
          e.preventDefault()
          inputRef.current?.focus()
        }
      }}
    >
      <div className="flex w-full items-center justify-center gap-2">
        {cells.map((char, i) => {
          const isActive = focused && i === activeIndex && !disabled
          return (
            <div
              key={i}
              data-slot="otp-cell"
              data-active={isActive || undefined}
              data-filled={char ? true : undefined}
              className={cn(
                "relative flex h-12 w-10 items-center justify-center rounded-md squircle border border-input bg-background text-xl font-medium tabular-nums shadow-sm transition-[color,box-shadow,border-color] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]",
                isActive && "border-ring ring-[3px] ring-ring/50 z-10",
                disabled && "opacity-50",
                cellClassName,
              )}
            >
              {char || (
                // Blinking caret on the active empty cell; motion off under
                // prefers-reduced-motion (Tailwind's motion-reduce variant).
                isActive ? (
                  <span
                    aria-hidden="true"
                    className="h-6 w-px animate-pulse bg-foreground motion-reduce:animate-none"
                  />
                ) : null
              )}
            </div>
          )
        })}
      </div>

      <input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        autoFocus={autoFocus}
        inputMode={inputMode}
        pattern={inputMode === "numeric" ? "[0-9]*" : undefined}
        autoComplete="one-time-code"
        aria-label={ariaLabel}
        maxLength={length}
        // Invisible but real: fills the field, captures typing/paste/autofill,
        // and owns the (hidden) caret so the platform handles selection for us.
        className="absolute inset-0 h-full w-full cursor-default bg-transparent text-center text-transparent caret-transparent opacity-0 outline-none disabled:cursor-not-allowed"
      />
    </div>
  )
}
