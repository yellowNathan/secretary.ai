// Transitions — dependency-free, CSS-only micro-interactions.
//
// Vendored from transitions.dev (Jakub Antalík), editable source. The motion
// lives in the injected `.vui-t-*` stylesheet (see vibes-ui-styles.ts); these
// React wrappers just own the awkward bits — flipping `.is-open` AFTER first
// paint so the open transition actually runs, keeping a closing element mounted
// until its exit finishes, and the three-phase reflow dance for swapping text.
// Self-contained: no Tailwind utility classes, no motion library, no runtime
// dependency beyond React. Only transform/opacity/filter animate, and every
// family honors prefers-reduced-motion.
//
// Reach for these when the DELIGHT rule "motion should REDUCE perceived travel"
// applies: a dialog, a menu, a drawer, a wizard step, or any element/label that
// swaps. Don't pull in Framer Motion for these — and don't wrap them in
// <AnimatePresence>; the two systems fight over the same element.

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import { flushSync } from "react-dom"
import { ensureStyles } from "@/components/ui/vibes-ui-styles"

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ")
}

/**
 * Mount/show lifecycle for an open/close element. Returns `mounted` (keep it in
 * the DOM through the exit transition) and `show` (drives `.is-open`). On open
 * it waits two animation frames before flipping `show`, so the element first
 * paints in its closed state and the open transition has somewhere to travel
 * from; on close it holds the element mounted for `closeMs` while `.is-closing`
 * plays, then unmounts it.
 */
function usePresence(open: boolean, closeMs: number) {
  const [mounted, setMounted] = useState(open)
  const [show, setShow] = useState(open)

  useEffect(() => {
    if (open) {
      setMounted(true)
      let raf2 = 0
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setShow(true))
      })
      return () => {
        cancelAnimationFrame(raf1)
        cancelAnimationFrame(raf2)
      }
    }
    setShow(false)
    const timer = setTimeout(() => setMounted(false), closeMs)
    return () => clearTimeout(timer)
  }, [open, closeMs])

  return { mounted, show }
}

// ── Modal ──────────────────────────────────────────────────────────────────

export type ModalProps = {
  /** Whether the dialog is open. */
  open: boolean
  /** Called when the backdrop is clicked (wire it to your close handler). */
  onClose?: () => void
  children: ReactNode
  /** Render a fading scrim behind the dialog. Default `true`. */
  backdrop?: boolean
  className?: string
  style?: CSSProperties
}

/**
 * Centered dialog that scales + fades in, and (faster) back out. Stays mounted
 * through the close transition, then unmounts itself. Renders an optional
 * click-to-close backdrop. Style the dialog surface via `className` — bring your
 * own `Card` or padding/background.
 */
export function Modal({
  open,
  onClose,
  children,
  backdrop = true,
  className = "",
  style,
}: ModalProps) {
  useEffect(ensureStyles, [])
  const { mounted, show } = usePresence(open, 150)
  if (!mounted) return null
  const state = show ? "is-open" : "is-closing"

  return (
    <>
      {backdrop ? (
        <div
          className={cx("vui", "vui-t-backdrop", state)}
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}
      <div
        className={cx("vui", "vui-t-modal", state, className)}
        style={style}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </>
  )
}

// ── Menu ─────────────────────────────────────────────────────────────────────

export type MenuOrigin =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"

export type MenuProps = {
  /** Whether the menu is open. */
  open: boolean
  children: ReactNode
  /** Corner the menu scales out from — match it to the trigger. Default `top-left`. */
  origin?: MenuOrigin
  className?: string
  style?: CSSProperties
}

/**
 * Popover/dropdown that scales from its anchor corner. Position the element
 * yourself (the caller owns layout — e.g. an absolutely-positioned wrapper under
 * the trigger); this only animates open/close and unmounts when closed.
 */
export function Menu({
  open,
  children,
  origin = "top-left",
  className = "",
  style,
}: MenuProps) {
  useEffect(ensureStyles, [])
  const { mounted, show } = usePresence(open, 150)
  if (!mounted) return null

  return (
    <div
      className={cx("vui", "vui-t-menu", show ? "is-open" : "is-closing", className)}
      data-origin={origin}
      style={style}
      role="menu"
    >
      {children}
    </div>
  )
}

// ── Panel ────────────────────────────────────────────────────────────────────

export type PanelProps = {
  /** Whether the panel is revealed. */
  open: boolean
  children: ReactNode
  className?: string
  style?: CSSProperties
}

/**
 * Inline reveal — a drawer, sheet, or expander that slides up, fades, and
 * un-blurs into place. Stays mounted in both states (so it can clip inside an
 * `overflow: hidden` container); set `--vui-t-panel-y` to ~half the panel
 * height via `style` for a fuller travel.
 */
export function Panel({ open, children, className = "", style }: PanelProps) {
  useEffect(ensureStyles, [])
  return (
    <div
      className={cx("vui", "vui-t-panel", className)}
      data-open={open ? "true" : "false"}
      style={style}
    >
      {children}
    </div>
  )
}

// ── Expand ───────────────────────────────────────────────────────────────────

export type ExpandProps = {
  /** Whether the region is expanded. */
  open: boolean
  children: ReactNode
  className?: string
  style?: CSSProperties
}

/**
 * Height-auto reveal that animates smoothly WITHOUT measuring the DOM — an
 * accordion row, a disclosure, a "show more" section, a collapsible filter
 * panel. Built on the `grid-template-rows: 0fr → 1fr` trick, so it interpolates
 * to the content's natural height (no fixed `max-height` guesswork, no JS
 * measurement, no clipping when the content grows). Stays mounted in both
 * states and clips its overflow while collapsed. Reach for this instead of
 * toggling `hidden`/`display:none` (which snaps) or hand-rolling a `max-height`
 * hack. For an overlay drawer/sheet that floats above content use `Panel`; this
 * one pushes surrounding layout as it opens.
 */
export function Expand({ open, children, className = "", style }: ExpandProps) {
  useEffect(ensureStyles, [])
  return (
    <div
      className={cx("vui", "vui-t-expand", className)}
      data-open={open ? "true" : "false"}
      style={style}
    >
      <div className="vui-t-expand-inner">{children}</div>
    </div>
  )
}

// ── animateView (View Transitions) ─────────────────────────────────────────────

/**
 * Run a state update inside a native View Transition so the browser cross-fades
 * / morphs between the before and after DOM — list reorders, a filter that adds
 * or removes rows, a route/tab swap, an item moving between two lists. Give the
 * elements that should morph a stable `viewTransitionName` (via `style`) and the
 * browser tweens their position/size for you.
 *
 * Uses `document.startViewTransition` with `flushSync` so React commits the
 * update synchronously inside the transition callback. Degrades gracefully: if
 * the API is unsupported OR the user prefers reduced motion, the update is
 * applied immediately with no animation. Safe to call from any event handler.
 *
 *   animateView(() => setItems(reorder(items)))
 */
export function animateView(update: () => void): void {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void | Promise<void>) => unknown
  }
  const reducedMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches

  if (typeof doc.startViewTransition !== "function" || reducedMotion) {
    update()
    return
  }
  doc.startViewTransition(() => flushSync(update))
}

// ── PageSlide ────────────────────────────────────────────────────────────────

export type PageSlideProps = {
  /** Active page index (0-based). */
  page: number
  /** One node per page, in order. Pages before `page` exit left, after exit right. */
  pages: ReactNode[]
  className?: string
  style?: CSSProperties
}

/**
 * Side-by-side wizard / tab steps. Only the active page is interactive; the
 * others sit stacked, blurred, and shifted toward the side they came from, so
 * forward/back reads as horizontal travel. Keeps every page mounted.
 */
export function PageSlide({ page, pages, className = "", style }: PageSlideProps) {
  useEffect(ensureStyles, [])
  return (
    <div className={cx("vui", "vui-t-pages", className)} style={style}>
      {pages.map((node, i) => (
        <div
          key={i}
          className={cx("vui-t-page", i === page && "is-active")}
          style={
            {
              "--vui-t-page-x":
                i < page
                  ? "calc(var(--vui-t-page-dist, 8px) * -1)"
                  : "var(--vui-t-page-dist, 8px)",
            } as CSSProperties
          }
          aria-hidden={i === page ? undefined : true}
        >
          {node}
        </div>
      ))}
    </div>
  )
}

// ── IconSwap ─────────────────────────────────────────────────────────────────

export type IconSwapProps = {
  /** Which icon is showing. */
  active: "a" | "b"
  /** First icon (shown when `active === "a"`). */
  a: ReactNode
  /** Second icon (shown when `active === "b"`). */
  b: ReactNode
  className?: string
  style?: CSSProperties
}

/**
 * Cross-fade + scale between two stacked icons (play/pause, moon/sun,
 * copy/check). Both icons render at once, sharing a grid cell; the inactive one
 * fades, blurs, and shrinks away.
 */
export function IconSwap({ active, a, b, className = "", style }: IconSwapProps) {
  useEffect(ensureStyles, [])
  return (
    <span
      className={cx("vui", "vui-t-icon-swap", className)}
      data-state={active}
      style={style}
    >
      <span className="vui-t-icon" data-icon="a" aria-hidden={active !== "a"}>
        {a}
      </span>
      <span className="vui-t-icon" data-icon="b" aria-hidden={active !== "b"}>
        {b}
      </span>
    </span>
  )
}

// ── TextSwap ─────────────────────────────────────────────────────────────────

export type TextSwapProps = {
  /** The current text. Changing it animates the old out (up) and the new in (from below). */
  children: string
  className?: string
  style?: CSSProperties
}

/**
 * Swap a short label/status string in place: the old text lifts up + blurs +
 * fades, then the new text rises from below. Handy for state words ("Saving…" →
 * "Saved", "Copy" → "Copied"). For runtime numbers reach for `AnimatedNumber`,
 * and for rolling slot-text reach for `AnimatedText`; this is for arbitrary
 * label replacement.
 */
export function TextSwap({ children, className = "", style }: TextSwapProps) {
  useEffect(ensureStyles, [])
  const ref = useRef<HTMLSpanElement | null>(null)
  const [text, setText] = useState(children)
  const prev = useRef(children)

  useEffect(() => {
    const el = ref.current
    if (!el || children === prev.current) return
    const next = children
    prev.current = next

    el.classList.add("is-exit")
    const dur =
      parseFloat(getComputedStyle(el).getPropertyValue("--vui-t-text-dur")) || 200
    const timer = setTimeout(() => {
      setText(next)
      el.classList.remove("is-exit")
      el.classList.add("is-enter-start")
      // Force reflow so the jump-below state paints before we release it.
      void el.offsetWidth
      el.classList.remove("is-enter-start")
    }, dur)
    return () => clearTimeout(timer)
  }, [children])

  return (
    <span ref={ref} className={cx("vui", "vui-t-text", className)} style={style}>
      {text}
    </span>
  )
}

// ── NotificationBadge ────────────────────────────────────────────────────────

export type NotificationBadgeProps = {
  /** Whether the badge is shown. Toggling pops it in / out. */
  show: boolean
  /** Badge contents (a count, a dot). */
  children?: ReactNode
  className?: string
  style?: CSSProperties
}

/**
 * A count/dot that pops in with a slight overshoot and shrinks-blurs out. Place
 * it inside a `position: relative` trigger (e.g. a bell button); it pins to the
 * top-right corner and never intercepts pointer events.
 */
export function NotificationBadge({
  show,
  children,
  className = "",
  style,
}: NotificationBadgeProps) {
  useEffect(ensureStyles, [])
  return (
    <span
      className={cx("vui", "vui-t-badge", className)}
      data-open={show ? "true" : "false"}
      style={style}
      aria-hidden={!show}
    >
      <span className="vui-t-badge-dot">{children}</span>
    </span>
  )
}
