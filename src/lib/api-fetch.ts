import { getAuthContext } from "@omg-dev/sdk"

/** Authenticated same-origin API requests using the platform-managed session. */
export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (!path.startsWith("/api/") || path.startsWith("//")) throw new Error("Only local API paths are allowed")
  const { token } = getAuthContext()
  const headers = new Headers(init.headers)
  if (token) headers.set("Authorization", `Bearer ${token}`)
  return fetch(path, { ...init, headers, credentials: "same-origin" })
}
