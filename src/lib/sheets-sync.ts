/**
 * Google Sheets sync — reads from the public "Services Enhancement" sheet
 * and upserts status, ETA, owner, remarks into Supabase.
 *
 * Sheet URL: https://docs.google.com/spreadsheets/d/16NuuihN1xC7LhpParyNHV6tu9PpbJJ_o8guEZpam7v4
 * Sheet tab: "Services Enhancement"
 *
 * Columns: #, Initiative, Category(workstream), Owner, ETA, Status, Remarks
 */

const SHEET_ID = "16NuuihN1xC7LhpParyNHV6tu9PpbJJ_o8guEZpam7v4"
const SHEET_TAB = "Services Enhancement"

export type SheetRow = {
  item_number: number
  title: string
  workstream: string
  owner_name: string
  eta: string | null
  status: string
  remarks: string
}

function normalizeStatus(raw: string): string {
  const s = raw.trim().toLowerCase()
  if (s === "done" || s === "completed") return "done"
  if (s === "in progress" || s === "in-progress" || s === "wip") return "in_progress"
  if (s === "not started" || s === "not_started" || s === "pending") return "not_started"
  if (s === "blocked") return "blocked"
  if (s === "on hold" || s === "on_hold") return "on_hold"
  if (s === "delayed") return "delayed"
  if (s === "cancelled" || s === "canceled") return "cancelled"
  if (s === "in review" || s === "in_review" || s === "review") return "in_progress"
  return "not_started"
}

function normalizeWorkstream(raw: string): string | null {
  const s = raw.trim().toLowerCase()
  if (s === "brand" || s === "branding") return "brand"
  if (s === "tech" || s === "technology" || s === "development" || s === "dev") return "tech"
  if (s === "design" || s === "ui" || s === "ux") return "design"
  if (s === "strategy" || s === "product") return "strategy"
  if (s === "ops" || s === "operations" || s === "business") return "strategy"
  if (s === "all") return null
  return null
}

function parseEta(raw: string): string | null {
  if (!raw || raw.trim() === "" || raw.trim() === "-") return null
  const s = raw.trim()
  // Try "Apr 13", "May 8" etc — assume current year or next
  const monthNames = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"]
  const match = s.match(/^([A-Za-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?$/)
  if (match) {
    const monthIdx = monthNames.indexOf(match[1].toLowerCase().slice(0, 3))
    if (monthIdx !== -1) {
      const day = parseInt(match[2])
      const year = match[3] ? parseInt(match[3]) : new Date().getFullYear()
      const d = new Date(year, monthIdx, day)
      // If the date is more than 3 months in the past, assume next year
      const now = new Date()
      if (!match[3] && d < new Date(now.getFullYear(), now.getMonth() - 3, 1)) {
        d.setFullYear(d.getFullYear() + 1)
      }
      return d.toISOString().split("T")[0]
    }
  }
  // Try ISO format
  const isoMatch = s.match(/^\d{4}-\d{2}-\d{2}/)
  if (isoMatch) return isoMatch[0]
  return null
}

export async function fetchSheetData(): Promise<SheetRow[]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_TAB)}`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to fetch sheet: ${res.status}`)
  const text = await res.text()

  // Parse CSV
  const rows: SheetRow[] = []
  const lines = parseCSV(text)

  for (const cols of lines) {
    const numStr = cols[0]?.trim()
    // Skip header rows (start with #) and empty rows
    if (!numStr || numStr.startsWith("#") || isNaN(parseInt(numStr))) continue

    const itemNumber = parseInt(numStr)
    const title = cols[1]?.trim() || ""
    const workstream = cols[2]?.trim() || ""
    const owner = cols[3]?.trim() || ""
    const eta = cols[4]?.trim() || ""
    const status = cols[5]?.trim() || ""
    const remarks = cols[6]?.trim() || ""

    if (!title) continue

    rows.push({
      item_number: itemNumber,
      title,
      workstream: workstream,
      owner_name: owner,
      eta: parseEta(eta),
      status: normalizeStatus(status),
      remarks: remarks || "",
    })
  }

  return rows
}

// Simple CSV parser that handles quoted fields
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuote = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuote) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuote = false
        }
      } else {
        field += ch
      }
    } else {
      if (ch === '"') {
        inQuote = true
      } else if (ch === ',') {
        row.push(field)
        field = ""
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++
        row.push(field)
        field = ""
        if (row.some(c => c.trim())) rows.push(row)
        row = []
      } else {
        field += ch
      }
    }
  }
  // Last row
  row.push(field)
  if (row.some(c => c.trim())) rows.push(row)
  return rows
}
