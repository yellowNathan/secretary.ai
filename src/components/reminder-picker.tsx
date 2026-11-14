import { useState } from "react"
import { formatOffset, units } from "@/lib/reminders"
import { cn } from "@/lib/utils"
import { useT } from "@/lib/i18n"

// Value is seconds before the due moment; -1 = no reminder, 0 = at the due time.
const presets = [-1, 0, 10, 60, 5 * 60, 15 * 60, 3600, 86_400, 3 * 86_400, 604_800]

const control =
  "h-11 rounded-lg border border-input bg-background px-3 text-base transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

function split(sec: number) {
  const unit = [...units].reverse().find((u) => sec > 0 && sec % u.sec === 0) ?? units[1]
  return { amount: sec > 0 ? sec / unit.sec : 1, unit: unit.id as string }
}

export function ReminderPicker({
  id,
  value,
  onChange,
  className,
}: {
  id: string
  value: number
  onChange: (seconds: number) => void
  className?: string
}) {
  const t = useT()
  const [custom, setCustom] = useState(!presets.includes(value))
  const { amount, unit } = split(value)

  function setCustomValue(nextAmount: number, nextUnit: string) {
    const u = units.find((x) => x.id === nextUnit) ?? units[1]
    const n = Math.max(0, Math.floor(Number.isFinite(nextAmount) ? nextAmount : 0))
    onChange(n * u.sec)
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <select
        id={id}
        value={custom ? "custom" : String(value)}
        onChange={(e) => {
          if (e.target.value === "custom") {
            setCustom(true)
            if (value <= 0) onChange(10 * 60)
          } else {
            setCustom(false)
            onChange(Number(e.target.value))
          }
        }}
        className={cn(control, "w-full")}
      >
        {presets.map((p) => (
          <option key={p} value={p}>
            {formatOffset(p)}
          </option>
        ))}
        <option value="custom">{t("Custom…")}</option>
      </select>
      {custom && (
        <div className="flex items-center gap-2">
          <label htmlFor={`${id}-amount`} className="sr-only">
            {t("Remind how many")}
          </label>
          <input
            id={`${id}-amount`}
            type="number"
            min={0}
            inputMode="numeric"
            value={amount}
            onChange={(e) => setCustomValue(Number(e.target.value), unit)}
            className={cn(control, "w-20 min-w-0")}
          />
          <label htmlFor={`${id}-unit`} className="sr-only">
            {t("Unit")}
          </label>
          <select
            id={`${id}-unit`}
            value={unit}
            onChange={(e) => setCustomValue(amount, e.target.value)}
            className={cn(control, "min-w-0 flex-1")}
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {t(`${u.label} before`)}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
