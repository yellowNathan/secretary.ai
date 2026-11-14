// Delight-primitive stylesheet — injected once at first mount.
//
// Vendored source (was @omg-dev/ui). These primitives ship plain, namespaced
// (`.vui-*`) CSS in a single injected `<style>` tag rather than Tailwind
// utility classes. That's deliberate and survives `shadcn init` rewriting
// `index.css` at bake time: the styles live here in a `.ts` module nothing
// else touches, so there's no `@source` hack and no reliance on Tailwind's
// content scan. The text/number primitives INHERIT the surrounding text color
// (so they sit correctly on any surface — a dark card, a colored hero — and
// honor a text-* utility you put on them). The standalone scroll cue reads
// --muted-foreground with a neutral prefers-color-scheme fallback for a bare,
// unthemed app. Edit the CSS below freely; it's yours now.

export const STYLE_ID = "vibes-ui-styles"

export function ensureStyles() {
  if (typeof document === "undefined") return
  if (document.getElementById(STYLE_ID)) return
  const el = document.createElement("style")
  el.id = STYLE_ID
  el.textContent = CSS
  document.head.appendChild(el)
}

const CSS = `
.vui {
  /* Only the scroll cue still needs a bare-app fallback (--muted-foreground).
     The text/number primitives inherit their color now, so no --vui-fg. */
  --vui-muted: #71717a;
  /* Shared transition tokens for the <Transitions> family (.vui-t-*). Soft,
     fast-out eases; tune these in one place. */
  --vui-ease-soft: cubic-bezier(0.22, 1, 0.36, 1);
  --vui-ease-bounce: cubic-bezier(0.34, 1.36, 0.64, 1);
  font-family: inherit;
}
@media (prefers-color-scheme: dark) {
  .vui {
    --vui-muted: #a1a1aa;
  }
}

/* ── AnimatedNumber — odometer / slot-text rolling digits ──────────────── */
.vui-num {
  display: inline-flex;
  align-items: baseline;
  /* No \`color\` here on purpose: inherit the surrounding text color (or honor a
     text-* utility on the element) like normal inline text. Pinning this to
     var(--foreground) made the number render page-foreground-dark even on a
     dark card / colored surface, where its siblings (which inherit) sit light —
     a dark-on-dark theme conflict. */
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.vui-num-reel {
  position: relative;
  display: inline-block;
  height: 1em;
  overflow: hidden;
  vertical-align: bottom;
}
.vui-num-track {
  display: flex;
  flex-direction: column;
  /* The roll itself. Long, soft ease so digits settle like an odometer.
     transform is set inline per-digit; the per-position stagger (delay) is
     set inline too so significant digits cascade in after the small ones. */
  transition: transform 0.85s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}
.vui-num-cell {
  height: 1em;
  display: flex;
  align-items: center;
  justify-content: center;
}
.vui-num-sym {
  display: inline-block;
}
@media (prefers-reduced-motion: reduce) {
  .vui-num-track { transition: none; }
}

/* ── AnimatedText — split-flap / slot-text rolling letters ────────────── */
.vui-text {
  display: inline-flex;
  align-items: baseline;
  /* Inherit the surrounding text color (or honor a text-* utility) — see the
     note on .vui-num. Don't pin to var(--foreground): it overrode the color of
     whatever surface the text sits on. */
  line-height: 1;
  white-space: pre;
}
.vui-text-reel {
  position: relative;
  display: inline-block;
  /* Fixed character cell — every reel is as wide as the alphabet's widest
     glyph, so the row reads like a split-flap board and never reflows mid-roll. */
  height: 1em;
  overflow: hidden;
  vertical-align: bottom;
}
.vui-text-track {
  display: flex;
  flex-direction: column;
  /* The roll itself. Long, soft ease so letters settle like a flap board.
     transform is set inline per-letter; the per-position stagger (delay) is
     set inline too so the word reveals left-to-right. */
  transition: transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}
.vui-text-cell {
  height: 1em;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: pre;
}
.vui-text-sym {
  display: inline-block;
  white-space: pre;
}
@media (prefers-reduced-motion: reduce) {
  .vui-text-track { transition: none; }
}

/* ── ScrollAffordance — "there's more below" cue ──────────────────────── */
.vui-scroll {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: var(--muted-foreground, var(--vui-muted));
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.02em;
  /* Fade + lift away the instant the user starts scrolling — the cue has
     done its job, lingering would be noise. */
  transition: opacity 0.4s ease, transform 0.4s ease;
  pointer-events: none;
  user-select: none;
}
.vui-scroll[data-hidden="true"] {
  opacity: 0;
  transform: translateY(6px);
}
.vui-scroll-chevron {
  width: 22px;
  height: 22px;
  animation: vui-bob 1.8s ease-in-out infinite;
}
@keyframes vui-bob {
  0%, 100% { transform: translateY(0); opacity: 0.65; }
  50% { transform: translateY(4px); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .vui-scroll-chevron { animation: none; }
  .vui-scroll { transition: none; }
}

/* ── Transitions (transitions.dev, vendored) ──────────────────────────────
   Dependency-free, CSS-only micro-interactions. Only transform/opacity/filter
   animate (never color/size/shadow), close is faster than open, and every
   family carries a prefers-reduced-motion guard. Driven by the React wrappers
   in transitions.tsx via .is-open / .is-closing / data-* state. */

/* Modal — dialog open/close (+ optional fading backdrop) */
.vui-t-modal {
  transform-origin: center;
  transform: scale(0.95);
  opacity: 0;
  pointer-events: none;
  transition:
    transform 300ms var(--vui-ease-soft, cubic-bezier(0.22, 1, 0.36, 1)),
    opacity   300ms var(--vui-ease-soft, cubic-bezier(0.22, 1, 0.36, 1));
  will-change: transform, opacity;
}
.vui-t-modal.is-open { transform: scale(1); opacity: 1; pointer-events: auto; }
.vui-t-modal.is-closing {
  transform: scale(0.96);
  opacity: 0;
  pointer-events: none;
  transition:
    transform 150ms var(--vui-ease-soft, cubic-bezier(0.22, 1, 0.36, 1)),
    opacity   150ms var(--vui-ease-soft, cubic-bezier(0.22, 1, 0.36, 1));
}
.vui-t-backdrop {
  opacity: 0;
  transition: opacity 300ms var(--vui-ease-soft, cubic-bezier(0.22, 1, 0.36, 1));
}
.vui-t-backdrop.is-open { opacity: 1; }
.vui-t-backdrop.is-closing {
  opacity: 0;
  transition: opacity 150ms var(--vui-ease-soft, cubic-bezier(0.22, 1, 0.36, 1));
}

/* Menu — popover/dropdown anchored to its trigger (set data-origin) */
.vui-t-menu {
  transform-origin: top left;
  transform: scale(0.97);
  opacity: 0;
  pointer-events: none;
  transition:
    transform 250ms var(--vui-ease-soft, cubic-bezier(0.22, 1, 0.36, 1)),
    opacity   250ms var(--vui-ease-soft, cubic-bezier(0.22, 1, 0.36, 1));
  will-change: transform, opacity;
}
.vui-t-menu[data-origin="top-right"]     { transform-origin: top right; }
.vui-t-menu[data-origin="top-center"]    { transform-origin: top center; }
.vui-t-menu[data-origin="bottom-left"]   { transform-origin: bottom left; }
.vui-t-menu[data-origin="bottom-center"] { transform-origin: bottom center; }
.vui-t-menu[data-origin="bottom-right"]  { transform-origin: bottom right; }
.vui-t-menu.is-open { transform: scale(1); opacity: 1; pointer-events: auto; }
.vui-t-menu.is-closing {
  transform: scale(0.99);
  opacity: 0;
  pointer-events: none;
  transition:
    transform 150ms var(--vui-ease-soft, cubic-bezier(0.22, 1, 0.36, 1)),
    opacity   150ms var(--vui-ease-soft, cubic-bezier(0.22, 1, 0.36, 1));
}

/* Panel — inline reveal / drawer / expander (stays mounted, toggles data-open).
   Override --vui-t-panel-y with ~half the panel height for a fuller open. */
.vui-t-panel {
  transform: translateY(var(--vui-t-panel-y, 16px));
  opacity: 0;
  filter: blur(2px);
  pointer-events: none;
  transition:
    transform 350ms var(--vui-ease-soft, cubic-bezier(0.22, 1, 0.36, 1)),
    opacity   350ms var(--vui-ease-soft, cubic-bezier(0.22, 1, 0.36, 1)),
    filter    350ms var(--vui-ease-soft, cubic-bezier(0.22, 1, 0.36, 1));
  will-change: transform, opacity, filter;
}
.vui-t-panel[data-open="true"] {
  transform: translateY(0);
  opacity: 1;
  filter: blur(0);
  pointer-events: auto;
  transition:
    transform 400ms var(--vui-ease-soft, cubic-bezier(0.22, 1, 0.36, 1)),
    opacity   400ms var(--vui-ease-soft, cubic-bezier(0.22, 1, 0.36, 1)),
    filter    400ms var(--vui-ease-soft, cubic-bezier(0.22, 1, 0.36, 1));
}

/* PageSlide — side-by-side wizard / tab steps. Pages before the active one
   exit left, pages after exit right (direction set inline per page). */
.vui-t-pages { position: relative; }
.vui-t-page {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
  transform: translateX(var(--vui-t-page-x, 8px));
  filter: blur(3px);
  transition:
    opacity   200ms var(--vui-ease-soft, cubic-bezier(0.22, 1, 0.36, 1)),
    transform 200ms var(--vui-ease-soft, cubic-bezier(0.22, 1, 0.36, 1)),
    filter    200ms var(--vui-ease-soft, cubic-bezier(0.22, 1, 0.36, 1));
  will-change: opacity, transform, filter;
}
.vui-t-page.is-active {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(0);
  filter: blur(0);
}

/* IconSwap — cross-fade/scale between two stacked icons (play/pause, moon/sun) */
.vui-t-icon-swap { position: relative; display: inline-grid; }
.vui-t-icon-swap .vui-t-icon {
  grid-area: 1 / 1;
  transition:
    opacity   200ms ease-in-out,
    filter    200ms ease-in-out,
    transform 200ms ease-in-out;
  will-change: opacity, filter, transform;
}
.vui-t-icon-swap[data-state="a"] .vui-t-icon[data-icon="a"],
.vui-t-icon-swap[data-state="b"] .vui-t-icon[data-icon="b"] {
  opacity: 1; filter: blur(0); transform: scale(1);
}
.vui-t-icon-swap[data-state="a"] .vui-t-icon[data-icon="b"],
.vui-t-icon-swap[data-state="b"] .vui-t-icon[data-icon="a"] {
  opacity: 0; filter: blur(2px); transform: scale(0.25);
}

/* TextSwap — smoothly replace a label/status string in place.
   --vui-t-text-dur is read by the wrapper to time the text content swap, so
   tune the duration here (one place) and the JS phase stays in sync. */
.vui-t-text {
  --vui-t-text-dur: 200ms;
  display: inline-block;
  transform: translateY(0);
  filter: blur(0);
  opacity: 1;
  transition:
    transform var(--vui-t-text-dur) ease-out,
    filter    var(--vui-t-text-dur) ease-out,
    opacity   var(--vui-t-text-dur) ease-out;
  will-change: transform, filter, opacity;
}
.vui-t-text.is-exit { transform: translateY(-8px); filter: blur(2px); opacity: 0; }
.vui-t-text.is-enter-start {
  transform: translateY(8px); filter: blur(2px); opacity: 0; transition: none;
}

/* NotificationBadge — pop a count/dot in and out on a relative trigger */
@keyframes vui-t-badge-slide-in {
  from { transform: translate(-8.2px, 12.4px); }
  to   { transform: translate(0, 0); }
}
.vui-t-badge {
  position: absolute;
  top: -6px;
  right: -8px;
  pointer-events: none;
  will-change: transform;
}
.vui-t-badge[data-open="true"] {
  animation: vui-t-badge-slide-in 260ms var(--vui-ease-soft, cubic-bezier(0.22, 1, 0.36, 1));
}
.vui-t-badge-dot {
  display: block;
  transform-origin: center;
  transform: scale(1);
  opacity: 1;
  filter: blur(0);
  transition:
    transform 500ms var(--vui-ease-bounce, cubic-bezier(0.34, 1.36, 0.64, 1)),
    opacity   400ms var(--vui-ease-bounce, cubic-bezier(0.34, 1.36, 0.64, 1)),
    filter    500ms var(--vui-ease-bounce, cubic-bezier(0.34, 1.36, 0.64, 1));
  will-change: transform, opacity, filter;
}
.vui-t-badge[data-open="false"] .vui-t-badge-dot {
  transform: scale(0);
  opacity: 0;
  filter: blur(2px);
  transition:
    transform 180ms cubic-bezier(0.4, 0, 0.2, 1),
    opacity   180ms cubic-bezier(0.4, 0, 0.2, 1),
    filter    180ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Expand — height-auto reveal via grid-template-rows 0fr→1fr (no JS measuring,
   no max-height guesswork). The inner wrapper clips overflow while collapsed;
   min-height:0 lets the grid track actually shrink to zero. Content fades in
   slightly behind the height so a tall body doesn't pop. */
.vui-t-expand {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 320ms var(--vui-ease-soft, cubic-bezier(0.22, 1, 0.36, 1));
}
.vui-t-expand[data-open="true"] { grid-template-rows: 1fr; }
.vui-t-expand > .vui-t-expand-inner {
  overflow: hidden;
  min-height: 0;
  opacity: 0;
  transition: opacity 180ms var(--vui-ease-soft, cubic-bezier(0.22, 1, 0.36, 1));
}
.vui-t-expand[data-open="true"] > .vui-t-expand-inner {
  opacity: 1;
  transition: opacity 240ms var(--vui-ease-soft, cubic-bezier(0.22, 1, 0.36, 1)) 80ms;
}

/* View Transitions — soft default cross-fade for the animateView() helper
   (document.startViewTransition). Slightly slower than the UA default so
   morphs read as intentional rather than a flicker. */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 260ms;
  animation-timing-function: var(--vui-ease-soft, cubic-bezier(0.22, 1, 0.36, 1));
}

@media (prefers-reduced-motion: reduce) {
  .vui-t-modal, .vui-t-backdrop, .vui-t-menu, .vui-t-panel, .vui-t-page,
  .vui-t-icon-swap .vui-t-icon, .vui-t-text, .vui-t-expand,
  .vui-t-expand > .vui-t-expand-inner {
    transition: none !important;
  }
  .vui-t-badge, .vui-t-badge-dot { animation: none !important; transition: none !important; }
  /* Kill View-Transition animations too — animateView() also short-circuits in
     JS, but a transition started elsewhere still gets neutralized here. */
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) { animation: none !important; }
}
`
