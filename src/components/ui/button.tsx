import * as React from "react"

import { cn } from "@/lib/utils"
import { playSound, type SoundName } from "@/components/ui/sound"

// Squishy base Button — vendored, self-contained (no class-variance-authority
// and no @base-ui dependency, so it works in a bare app without extra installs).
//
// The iOS "squish": `active:scale-[0.97]` on press, eased with the omg motion
// curve, snapping back instantly on release (`active:transition-none`). Corners
// pair the baked `squircle` utility with `rounded-md` so they read as soft
// continuous corners on Chromium 139+ and fall back to normal rounding
// everywhere else.
//
// Opt-in press SOUND: pass `sound` (or `sound="success"` etc.) and the button
// plays a synthesized, zero-file Web Audio tick on press — the audio companion
// to the visual squish. Off by default (silence is the right default; sound on
// EVERY button is noise), gesture-driven so the browser lets it through, and it
// self-mutes under prefers-reduced-motion. See `./sound`.
//
// Every colour reads the app's shadcn theme variables (--primary, --secondary,
// …), so the button inherits whatever preset the app uses. Edit freely — it's
// vendored into your project, not imported from a package.

type Variant = "default" | "secondary" | "outline" | "ghost" | "destructive"
type Size = "default" | "sm" | "lg" | "icon"

const VARIANTS: Record<Variant, string> = {
  default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline:
    "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  destructive: "bg-destructive text-white hover:bg-destructive/90",
}

const SIZES: Record<Size, string> = {
  default: "h-9 px-4 py-2",
  sm: "h-8 gap-1.5 px-3 text-xs",
  lg: "h-10 px-6",
  icon: "size-9",
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  /**
   * Play a synthesized press sound on pointer-down. `true` uses the soft
   * `"tap"` tick; pass a preset name (`"click"`, `"success"`, …) to pick
   * another. Off by default. Fires on pointer-down so the tick lands with the
   * press, not the release.
   */
  sound?: boolean | SoundName
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = "default", size = "default", sound, onPointerDown, ...props },
    ref,
  ) {
    const handlePointerDown = React.useCallback(
      (event: React.PointerEvent<HTMLButtonElement>) => {
        if (sound && !props.disabled) playSound(sound === true ? "tap" : sound)
        onPointerDown?.(event)
      },
      [sound, props.disabled, onPointerDown],
    )
    return (
      <button
        ref={ref}
        data-slot="button"
        onPointerDown={handlePointerDown}
        className={cn(
          "inline-flex shrink-0 select-none items-center justify-center gap-2 rounded-md squircle text-sm font-medium whitespace-nowrap outline-none transition-[transform,background-color,box-shadow,border-color,color] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.97] active:transition-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          VARIANTS[variant],
          SIZES[size],
          className,
        )}
        {...props}
      />
    )
  },
)
