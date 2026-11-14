// <ScrollAffordance> — a "there's more below" cue.
//
// Vendored, editable source (was @omg-dev/ui). Bobs while the watched container
// is at the top, fades the instant the user scrolls, and hides itself when
// there's nothing to scroll — so it's safe to render unconditionally.
// Self-contained: no Tailwind utility classes, no runtime dependency beyond
// React. Themes itself from your shadcn CSS variables (--muted-foreground)
// with light/dark fallbacks and honors prefers-reduced-motion.

import {
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type RefObject,
} from "react"
import { ensureStyles } from "@/components/ui/vibes-ui-styles"

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsoLayoutEffect = typeof document !== "undefined" ? useLayoutEffect : useEffect

export type ScrollAffordanceProps = {
  /**
   * The scroll container to watch. Omit to watch the window (the common case
   * for a long landing page). Pass a ref to watch an overflowing panel.
   */
  scrollRef?: RefObject<HTMLElement | null>
  /** Caption above the chevron. Pass `null` for a bare chevron. */
  label?: string | null
  /** Hide once scrolled this many px past the top. */
  threshold?: number
  className?: string
  style?: CSSProperties
}

/**
 * A self-aware "scroll for more" cue. It bobs while the watched container is
 * at the top, fades away the moment the user scrolls, and hides itself
 * entirely when there's nothing to scroll — so it's safe to render
 * unconditionally.
 */
export function ScrollAffordance({
  scrollRef,
  label = "Scroll",
  threshold = 24,
  className = "",
  style,
}: ScrollAffordanceProps) {
  useEffect(ensureStyles, [])
  // Start hidden; the first measurement reveals it only if there's overflow.
  const [hidden, setHidden] = useState(true)

  useIsoLayoutEffect(() => {
    if (typeof window === "undefined") return
    const el = scrollRef?.current ?? null

    const measure = () => {
      const scrollTop = el ? el.scrollTop : window.scrollY
      const scrollHeight = el
        ? el.scrollHeight
        : document.documentElement.scrollHeight
      const clientHeight = el ? el.clientHeight : window.innerHeight
      const scrollable = scrollHeight - clientHeight > threshold
      setHidden(!scrollable || scrollTop > threshold)
    }

    const source: HTMLElement | Window = el ?? window
    measure()
    source.addEventListener("scroll", measure, { passive: true })
    window.addEventListener("resize", measure)
    // Content can grow after async data loads — re-measure on layout changes.
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null
    if (ro) ro.observe(el ?? document.documentElement)

    return () => {
      source.removeEventListener("scroll", measure)
      window.removeEventListener("resize", measure)
      ro?.disconnect()
    }
  }, [scrollRef, threshold])

  return (
    <span
      className={`vui vui-scroll ${className}`.trim()}
      style={style}
      data-hidden={hidden}
      aria-hidden="true"
    >
      {label ? <span>{label}</span> : null}
      <svg
        className="vui-scroll-chevron"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </span>
  )
}
