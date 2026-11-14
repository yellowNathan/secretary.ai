// <AnimatedText> — split-flap / slot-text rolling letters.
//
// The text half of the slot-text effect (its sibling <AnimatedNumber> rolls
// digits). Any word that changes deserves to *move*: a rotating headline verb,
// a status that flips, a name that resolves. Each character position is a
// vertical reel of glyphs that translates to the target letter — like a
// split-flap departure board. Self-contained — no Tailwind utility classes, no
// CSS import beyond the injected `.vui-*` stylesheet, no runtime dependency
// beyond React. Themes itself from your shadcn CSS variables (--foreground)
// with light/dark fallbacks and honors prefers-reduced-motion.

import { useEffect, useMemo, type CSSProperties } from "react"
import { ensureStyles } from "@/components/ui/vibes-ui-styles"

// The reel alphabet — every glyph a character can roll *through*. Space sits
// first so blanks rest at the top of the reel. Any character in `value` that
// isn't here renders static (no reel), the way <AnimatedNumber> leaves
// separators and currency symbols still.
const ALPHABET = Array.from(
  " ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?'-&@",
)

export type AnimatedTextProps = {
  /** The text to display. Changing it rolls each letter to its new glyph. */
  value: string
  /**
   * Override the glyphs a reel can roll through. Defaults to spaces, letters,
   * digits and common punctuation. A tighter set (e.g. just `"ABC…Z"`) makes
   * the roll shorter and the board feel snappier.
   */
  alphabet?: string
  className?: string
  style?: CSSProperties
}

/**
 * Rolling-letter text. Each character is a vertical reel of the alphabet that
 * translates to the target glyph; CSS handles the motion, so re-rendering with
 * a new `value` is all it takes to animate. Characters reveal left-to-right so
 * the roll reads like the word is being dealt out.
 */
export function AnimatedText({
  value,
  alphabet,
  className = "",
  style,
}: AnimatedTextProps) {
  useEffect(ensureStyles, [])

  // Resolve the reel alphabet and a glyph→row lookup once per alphabet.
  const { set, index } = useMemo(() => {
    const chars = alphabet ? Array.from(alphabet) : ALPHABET
    return { set: chars, index: new Map(chars.map((c, i) => [c, i])) }
  }, [alphabet])

  const chars = Array.from(value)

  return (
    <span
      className={`vui vui-text ${className}`.trim()}
      style={style}
      role="text"
      aria-label={value}
    >
      {chars.map((char, i) => {
        const row = index.get(char)
        if (row === undefined) {
          return (
            <span key={i} className="vui-text-sym" aria-hidden="true">
              {char}
            </span>
          )
        }
        // Reveal left-to-right; cap the stagger so long strings still settle.
        return (
          <Reel key={i} row={row} set={set} delay={Math.min(i, 8) * 0.06} />
        )
      })}
    </span>
  )
}

function Reel({
  row,
  set,
  delay,
}: {
  row: number
  set: string[]
  delay: number
}) {
  return (
    <span className="vui-text-reel" aria-hidden="true">
      <span
        className="vui-text-track"
        style={{
          transform: `translateY(${-row}em)`,
          transitionDelay: `${delay}s`,
        }}
      >
        {set.map((c, i) => (
          <span key={i} className="vui-text-cell">
            {c === " " ? " " : c}
          </span>
        ))}
      </span>
    </span>
  )
}
