// Floating bottom tab bar — the iOS-style pill switcher from the omg home
// screen, vendored for apps. A translucent blurred pill wrapped in a gradient
// white hairline that catches the light along its top edge (the way an iOS
// material does), with an active capsule that *slides* between tabs via a pure
// GPU translate.
//
// This is the presentational, controlled component: pass it your tabs, the
// active id, and an onSelect handler. It owns no routing — wire `active` /
// `onSelect` to your router or local state.
//
//   const [tab, setTab] = useState("home")
//   <BottomNav
//     tabs={[
//       { id: "home",    label: "Home",    Icon: Home },
//       { id: "browse",  label: "Browse",  Icon: Compass },
//       { id: "profile", label: "Profile", Icon: User },
//     ]}
//     active={tab}
//     onSelect={setTab}
//   />
//
// Self-contained: colours read the app's shadcn theme vars (--primary,
// --background, --muted-foreground) so it follows whatever preset the app uses.
// Vendored — edit freely.

import type { ComponentType, CSSProperties } from "react"

import { cn } from "@/lib/utils"

// Tab width and gap are fixed so the sliding capsule can be a pure translate —
// the only animated property (GPU-cheap, interruptible). TAB_GAP must match the
// `gap-1` between tab buttons.
const TAB_W = "4.5rem"
const TAB_GAP = "0.25rem"
// The omg motion curve (Ionic's iOS drawer easing).
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)"

// A whisper of haptic feedback on tap where the platform supports it (iOS
// Safari ignores it; Android/Chrome buzz ~10ms). No-op everywhere else.
function haptic() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(8)
    } catch {
      /* feature-detected but disallowed (e.g. no user gesture) — ignore */
    }
  }
}

export type BottomNavItem<T extends string> = {
  id: T
  label: string
  Icon: ComponentType<{ className?: string }>
  // Visible but inert — rendered dimmed; taps don't fire onSelect.
  disabled?: boolean
}

export function BottomNav<T extends string>({
  tabs,
  active,
  onSelect,
  className,
}: {
  tabs: ReadonlyArray<BottomNavItem<T>>
  active: T
  onSelect: (id: T) => void
  className?: string
}) {
  const activeIndex = Math.max(
    0,
    tabs.findIndex((t) => t.id === active),
  )
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[calc(0.875rem+env(safe-area-inset-bottom))]",
        className,
      )}
    >
      {/* Gradient hairline: brightest on the top edge, fading down — the
          border itself is the p-px ring around the blurred pill. */}
      <div className="pointer-events-auto rounded-full bg-gradient-to-b from-white/70 via-white/25 to-white/10 p-px shadow-[0_8px_28px_oklch(0_0_0/14%)] dark:from-white/25 dark:via-white/10 dark:to-white/5">
        <nav className="relative flex items-center gap-1 rounded-full bg-background/85 p-1.5 backdrop-blur-xl">
          {/* Sliding capsule: translate by activeIndex × (tab width + gap). */}
          <span
            aria-hidden
            className="absolute inset-y-1.5 left-1.5 w-[var(--tab-w)] rounded-full bg-primary/12 transition-transform duration-[260ms]"
            style={
              {
                "--tab-w": TAB_W,
                transitionTimingFunction: EASE,
                transform: `translateX(calc(${activeIndex} * (${TAB_W} + ${TAB_GAP})))`,
              } as CSSProperties
            }
          />
          {tabs.map(({ id, label, Icon, disabled }) => {
            const selected = id === active
            return (
              <button
                key={id}
                type="button"
                aria-label={label}
                aria-current={selected ? "page" : undefined}
                aria-disabled={disabled || undefined}
                onClick={() => {
                  if (disabled) return
                  haptic()
                  if (!selected) onSelect(id)
                }}
                className={cn(
                  "relative flex w-[var(--tab-w)] flex-col items-center gap-0.5 rounded-full px-4 py-1.5 transition-[color,transform] duration-200 ease-out",
                  disabled
                    ? "text-muted-foreground/40"
                    : selected
                      ? "text-primary active:scale-[0.96]"
                      : "text-muted-foreground hover:text-foreground active:scale-[0.96]",
                )}
                style={{ "--tab-w": TAB_W } as CSSProperties}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="text-[10.5px] font-medium tracking-[-0.01em]">
                  {label}
                </span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
