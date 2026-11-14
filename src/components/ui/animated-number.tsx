// <AnimatedNumber> — odometer rolling digits (the number half of slot-text;
// its sibling <AnimatedText> rolls arbitrary letters).
//
// Vendored, editable source (was @omg-dev/ui). Any number that changes deserves
// to *move*: counts, prices, stats. Self-contained — no Tailwind utility
// classes, no CSS import beyond the injected `.vui-*` stylesheet, no runtime
// dependency beyond React. Themes itself from your shadcn CSS variables
// (--foreground) with light/dark fallbacks and honors prefers-reduced-motion.

import { useEffect, type CSSProperties } from "react"
import { ensureStyles } from "@/components/ui/vibes-ui-styles"

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]

export type AnimatedNumberProps = {
  /** The value to display. Changing it rolls the digits to the new number. */
  value: number
  /**
   * Format the raw value into the string that gets rendered. Defaults to the
   * host locale's grouped integer (e.g. `1,234`). Any digit in the output
   * animates; everything else (separators, currency, units) stays static.
   */
  format?: (value: number) => string
  className?: string
  style?: CSSProperties
}

/**
 * Rolling-digit number. Each digit is a vertical reel of 0–9 that translates
 * to the target digit; CSS handles the motion, so re-rendering with a new
 * `value` is all it takes to animate. Significant digits cascade in slightly
 * after the small ones for an odometer feel.
 */
export function AnimatedNumber({
  value,
  format = defaultFormat,
  className = "",
  style,
}: AnimatedNumberProps) {
  useEffect(ensureStyles, [])

  const text = format(value)
  const chars = Array.from(text)
  // Stagger from the least-significant character so the ripple travels left.
  const lastIndex = chars.length - 1

  return (
    <span
      className={`vui vui-num ${className}`.trim()}
      style={style}
      role="text"
      aria-label={text}
    >
      {chars.map((char, i) => {
        if (!isDigit(char)) {
          return (
            <span key={i} className="vui-num-sym" aria-hidden="true">
              {char}
            </span>
          )
        }
        const digit = char.charCodeAt(0) - 48
        const fromRight = lastIndex - i
        return (
          <Reel key={i} digit={digit} delay={Math.min(fromRight, 6) * 0.05} />
        )
      })}
    </span>
  )
}

function Reel({ digit, delay }: { digit: number; delay: number }) {
  return (
    <span className="vui-num-reel" aria-hidden="true">
      <span
        className="vui-num-track"
        style={{
          transform: `translateY(${-digit}em)`,
          transitionDelay: `${delay}s`,
        }}
      >
        {DIGITS.map((d) => (
          <span key={d} className="vui-num-cell">
            {d}
          </span>
        ))}
      </span>
    </span>
  )
}

function isDigit(char: string) {
  return char.length === 1 && char >= "0" && char <= "9"
}

function defaultFormat(value: number): string {
  try {
    return new Intl.NumberFormat().format(value)
  } catch {
    return String(value)
  }
}
