// Sign-in goes through omg.dev's secure hosted page, which offers Google,
// Apple and an emailed one-time code. The app never sees or stores passwords.
// These helpers mirror the SDK's own <VibesLogin> logic so our custom screens
// send people to the same place.

const ACCESS_GATE_URL = "https://app.omg.dev/access"
const DIRECT_AUTH_HOSTS = new Set(["omg.dev", "www.omg.dev", "app.omg.dev", "console.omg.dev"])
const DIRECT_AUTH_HOST_FAMILY = /^[a-z0-9-]+\.(?:apps|preview)\.omg\.dev$/
const APPS_OMG_DEV_HOST = /^[a-z0-9-]+\.apps\.omg\.dev$/

function isCrossSiteAppHost(host: string): boolean {
  const h = host.toLowerCase().replace(/:\d+$/, "")
  if (!h || h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h.endsWith(".localhost")) return false
  if (DIRECT_AUTH_HOSTS.has(h) || DIRECT_AUTH_HOST_FAMILY.test(h)) return false
  return true
}

/** True where the hosted sign-in page can send people back to this app. */
export function canUseHostedSignIn(): boolean {
  if (typeof window === "undefined") return false
  const h = window.location.host.toLowerCase().replace(/:\d+$/, "")
  return APPS_OMG_DEV_HOST.test(h) || isCrossSiteAppHost(h)
}

/** Open the secure sign-in page; afterwards it returns to `returnPath`. */
export function goToSignIn(returnPath = "/") {
  const url = new URL(ACCESS_GATE_URL)
  url.searchParams.set("return", new URL(returnPath, window.location.origin).toString())
  window.location.href = url.toString()
}

// Details typed on the sign-up form wait here until sign-in finishes, then
// <ProfileSync> saves them to the person's profile.
const PENDING_KEY = "signup:pending"

export type SignupDetails = {
  first_name: string
  last_name: string
  username: string
  phone: string
  email: string
}

export function savePendingSignup(d: SignupDetails) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(d))
}

export function takePendingSignup(): SignupDetails | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    return raw ? (JSON.parse(raw) as SignupDetails) : null
  } catch {
    return null
  }
}

export function clearPendingSignup() {
  localStorage.removeItem(PENDING_KEY)
}
