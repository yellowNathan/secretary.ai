import { Monitor, Moon, Sun } from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useThemeMode, type ThemeMode } from "@/lib/theme-mode"
import { cn } from "@/lib/utils"

const options: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
]

// compact = icon-only (desktop top bar); otherwise icon + text (menu).
export function ThemeToggle({ compact = false, className }: { compact?: boolean; className?: string }) {
  const [mode, setMode] = useThemeMode()
  return (
    <ToggleGroup
      aria-label="Theme"
      variant="outline"
      spacing={0}
      value={[mode]}
      onValueChange={(v: string[]) => {
        if (v[0]) setMode(v[0] as ThemeMode)
      }}
      className={cn(!compact && "w-full", className)}
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          aria-label={compact ? `${o.label} theme` : undefined}
          title={`${o.label} theme`}
          className={cn(
            "data-[pressed]:bg-primary data-[pressed]:text-primary-foreground",
            compact ? "size-10" : "h-11 flex-1 gap-2",
          )}
        >
          <o.icon className="size-4" aria-hidden="true" />
          {!compact && o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
