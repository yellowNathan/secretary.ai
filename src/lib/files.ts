import { getAuthContext } from "@omg-dev/sdk"

// Files are stored with the platform's storage. Download links expire after an
// hour, so ask for a fresh one each time the person opens a file.
export async function fileUrl(key: string): Promise<string> {
  const { token } = getAuthContext()
  const res = await fetch("/api/_storage/presign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ action: "get", key, scope: "user" }),
  })
  if (!res.ok) throw new Error(`Could not open file (${res.status})`)
  const data = (await res.json()) as { url?: string }
  if (!data.url) throw new Error("Could not open file")
  return data.url
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
