import { useRef, useState } from "react"
import { useCollection, useUpload } from "@omg-dev/sdk"
import { Paperclip, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fileUrl, formatBytes } from "@/lib/files"
import type { Attachment } from "@/lib/tasks"
import { useT } from "@/lib/i18n"

// Files attached to one task. Upload stores the file and a row that points to it.
export function Attachments({ taskId }: { taskId: string }) {
  const t = useT()
  const { data, create } = useCollection<Attachment>({ collection: "attachments", api: "/api/attachments" })
  const { upload, uploading, progress } = useUpload()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const files = (data as Attachment[]).filter((a) => a.task === taskId)

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setError(null)
    try {
      const key = `task-files/${taskId}/${Date.now()}-${file.name}`
      await upload(file, { key })
      await create({ task: taskId, name: file.name, key, size: file.size })
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Upload failed"))
    }
  }

  async function open(a: Attachment) {
    try {
      window.open(await fileUrl(a.key), "_blank", "noopener")
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Could not open file"))
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-2">
      {files.map((a) => (
        <button
          key={a.id}
          onClick={() => open(a)}
          className="flex items-center gap-2 truncate text-left text-xs text-foreground underline-offset-4 hover:underline"
        >
          <Paperclip className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{a.name}</span>
          <span className="shrink-0 text-muted-foreground">{formatBytes(a.size)}</span>
        </button>
      ))}
      <input ref={inputRef} type="file" className="hidden" onChange={onPick} aria-label={t("Choose file")} />
      <Button
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="size-3.5" />
        {uploading ? t("Uploading {n}%", { n: Math.round(progress * 100) }) : t("Attach file")}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
