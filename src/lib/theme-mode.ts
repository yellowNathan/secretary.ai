import { useEffect, useState } from "react"

// Light / dark / follow-the-device, remembered on this device. Works with
// every style and colour from the Design panel: each one ships both a light
// and a dark palette, and this just switches between them.
export type ThemeMode = "system" | "light" | "dark"

const KEY = "theme-mode"
const media = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : null
const listeners = new Set<(m: ThemeMode) => void>()

export function getThemeMode(): ThemeMode {
  const v = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null
  return v === "light" || v === "dark" ? v : "system"
}

export function applyThemeMode(mode: ThemeMode = getThemeMode()) {
  if (typeof document === "undefined") return
  const dark = mode === "dark" || (mode === "system" && !!media?.matches)
  document.documentElement.classList.toggle("dark", dark)
}

export function setThemeMode(mode: ThemeMode) {
  localStorage.setItem(KEY, mode)
  applyThemeMode(mode)
  listeners.forEach((l) => l(mode))
}

/** Call once at startup: applies the saved mode and follows device changes. */
export function initThemeMode() {
  applyThemeMode()
  media?.addEventListener("change", () => {
    if (getThemeMode() === "system") applyThemeMode("system")
  })
}

export function useThemeMode(): [ThemeMode, (m: ThemeMode) => void] {
  const [mode, setMode] = useState<ThemeMode>(getThemeMode)
  useEffect(() => {
    listeners.add(setMode)
    return () => {
      listeners.delete(setMode)
    }
  }, [])
  return [mode, setThemeMode]
}
