// In-browser file conversion. Nothing leaves the device to convert a file.
// Word files keep their text, headings and lists; complex layout is simplified.

export type Format = "pdf" | "txt" | "html" | "png" | "jpg" | "webp" | "json" | "csv"

export const formatLabels: Record<Format, string> = {
  pdf: "PDF",
  txt: "Plain text",
  html: "Web page (HTML)",
  png: "PNG image",
  jpg: "JPG image",
  webp: "WebP image",
  json: "JSON",
  csv: "CSV",
}

export function extOf(name: string): string {
  const i = name.lastIndexOf(".")
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ""
}

const IMAGE_EXTS = ["png", "jpg", "jpeg", "webp", "gif", "bmp"]
const TEXT_EXTS = ["txt", "md", "log"]

/** Which outputs a file can be converted to, based on its extension. */
export function targetsFor(name: string): Format[] {
  const ext = extOf(name)
  if (ext === "docx") return ["pdf", "txt", "html"]
  if (IMAGE_EXTS.includes(ext)) return (["pdf", "png", "jpg", "webp"] as Format[]).filter((f) => f !== normalizeImage(ext))
  if (TEXT_EXTS.includes(ext)) return ["pdf", "html"]
  if (ext === "html" || ext === "htm") return ["txt", "pdf"]
  if (ext === "csv") return ["json", "pdf"]
  if (ext === "json") return ["csv", "txt"]
  return []
}

function normalizeImage(ext: string): Format | null {
  if (ext === "jpeg" || ext === "jpg") return "jpg"
  if (ext === "png") return "png"
  if (ext === "webp") return "webp"
  return null
}

function renameTo(name: string, to: Format): string {
  const i = name.lastIndexOf(".")
  return `${i >= 0 ? name.slice(0, i) : name}.${to}`
}

const mime: Record<Format, string> = {
  pdf: "application/pdf",
  txt: "text/plain",
  html: "text/html",
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  json: "application/json",
  csv: "text/csv",
}

async function docxToHtml(file: File): Promise<string> {
  const mammoth = await import("mammoth")
  const buf = await file.arrayBuffer()
  const res = await mammoth.convertToHtml({ arrayBuffer: buf })
  return res.value
}

function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html")
  doc.querySelectorAll("li").forEach((li) => li.prepend("• "))
  doc.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, br, tr").forEach((el) => el.append("\n"))
  return (doc.body.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim()
}

// Writes text into an A4 PDF with automatic line wrapping and page breaks.
// Lines starting with "# " are drawn as headings.
async function textToPdf(text: string, title?: string): Promise<Blob> {
  const { jsPDF } = await import("jspdf")
  const pdf = new jsPDF({ unit: "pt", format: "a4" })
  const margin = 56
  const width = pdf.internal.pageSize.getWidth() - margin * 2
  const bottom = pdf.internal.pageSize.getHeight() - margin
  let y = margin

  const write = (line: string, size: number, bold: boolean) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal")
    pdf.setFontSize(size)
    const wrapped = pdf.splitTextToSize(line || " ", width) as string[]
    for (const w of wrapped) {
      if (y + size > bottom) {
        pdf.addPage()
        y = margin
      }
      pdf.text(w, margin, y + size)
      y += size * 1.4
    }
  }

  if (title) {
    write(title, 18, true)
    y += 8
  }
  for (const line of text.split("\n")) {
    if (line.startsWith("# ")) write(line.slice(2), 15, true)
    else write(line, 11, false)
  }
  return pdf.output("blob")
}

// Converts Word HTML to text that keeps headings for the PDF writer.
function docHtmlToPdfText(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html")
  doc.querySelectorAll("h1, h2, h3").forEach((h) => h.prepend("# "))
  return htmlToText(doc.body.innerHTML)
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

async function imageToImage(file: File, to: "png" | "jpg" | "webp"): Promise<Blob> {
  const img = await loadImage(file)
  const canvas = document.createElement("canvas")
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext("2d")!
  if (to === "jpg") {
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.drawImage(img, 0, 0)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Image conversion failed"))), mime[to], 0.92),
  )
}

async function imageToPdf(file: File): Promise<Blob> {
  const { jsPDF } = await import("jspdf")
  const img = await loadImage(file)
  const landscape = img.naturalWidth > img.naturalHeight
  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: landscape ? "landscape" : "portrait" })
  const pw = pdf.internal.pageSize.getWidth()
  const ph = pdf.internal.pageSize.getHeight()
  const scale = Math.min((pw - 40) / img.naturalWidth, (ph - 40) / img.naturalHeight, 1)
  const w = img.naturalWidth * scale
  const h = img.naturalHeight * scale
  const jpg = await imageToImage(file, "jpg")
  const dataUrl = await new Promise<string>((resolve) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.readAsDataURL(jpg)
  })
  pdf.addImage(dataUrl, "JPEG", (pw - w) / 2, (ph - h) / 2, w, h)
  return pdf.output("blob")
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === ",") { row.push(cell); cell = "" }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++
      row.push(cell); rows.push(row); row = []; cell = ""
    } else cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.some((v) => v !== ""))
}

function csvCell(v: unknown): string {
  const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Convert a file. Throws with a readable message when the pair isn't supported. */
export async function convertFile(file: File, to: Format): Promise<File> {
  const ext = extOf(file.name)
  if (!targetsFor(file.name).includes(to)) {
    throw new Error(`Can't convert .${ext || "?"} to ${formatLabels[to]}`)
  }
  let blob: Blob

  if (ext === "docx") {
    const html = await docxToHtml(file)
    if (to === "html") blob = new Blob([`<!doctype html><meta charset="utf-8"><body>${html}</body>`], { type: mime.html })
    else if (to === "txt") blob = new Blob([htmlToText(html)], { type: mime.txt })
    else blob = await textToPdf(docHtmlToPdfText(html))
  } else if (IMAGE_EXTS.includes(ext)) {
    blob = to === "pdf" ? await imageToPdf(file) : await imageToImage(file, to as "png" | "jpg" | "webp")
  } else if (TEXT_EXTS.includes(ext)) {
    const text = await file.text()
    if (to === "html") {
      const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;")
      blob = new Blob([`<!doctype html><meta charset="utf-8"><pre>${esc}</pre>`], { type: mime.html })
    } else blob = await textToPdf(text)
  } else if (ext === "html" || ext === "htm") {
    const text = htmlToText(await file.text())
    blob = to === "txt" ? new Blob([text], { type: mime.txt }) : await textToPdf(text)
  } else if (ext === "csv") {
    const rows = parseCsv(await file.text())
    if (to === "json") {
      const [head = [], ...body] = rows
      const objs = body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])))
      blob = new Blob([JSON.stringify(objs, null, 2)], { type: mime.json })
    } else blob = await textToPdf(rows.map((r) => r.join("   |   ")).join("\n"))
  } else {
    // json
    const data = JSON.parse(await file.text()) as unknown
    if (to === "txt") blob = new Blob([JSON.stringify(data, null, 2)], { type: mime.txt })
    else {
      const arr = (Array.isArray(data) ? data : [data]) as Record<string, unknown>[]
      const head = Array.from(new Set(arr.flatMap((o) => (o && typeof o === "object" ? Object.keys(o) : []))))
      const lines = [head.map(csvCell).join(","), ...arr.map((o) => head.map((h) => csvCell(o?.[h])).join(","))]
      blob = new Blob([lines.join("\n")], { type: mime.csv })
    }
  }
  return new File([blob], renameTo(file.name, to), { type: mime[to] })
}

export function downloadFile(file: Blob, name: string) {
  const url = URL.createObjectURL(file)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
