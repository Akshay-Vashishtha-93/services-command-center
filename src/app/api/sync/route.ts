import { NextRequest, NextResponse } from "next/server"
import { getSyncLogs, getLastSyncTime, addSyncLog } from "@/lib/sync-store"
import { fetchSheetData } from "@/lib/sheets-sync"
import { dbGetAllItems, dbUpdateItem, dbAddItem } from "@/lib/db"
import { setLastMeetingDate } from "@/lib/meeting-tracker"
import { createClient } from "@supabase/supabase-js"

export const dynamic = 'force-dynamic'

const supabase = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return url && key ? createClient(url, key) : null
})()

export async function GET() {
  return NextResponse.json({
    logs: getSyncLogs(),
    last_sync: getLastSyncTime(),
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const mode = body.mode || "sync" // "sync" or "full"
  const meetingDate = body.meeting_date || null // ISO date string for meeting reference

  try {
    // 1. Fetch latest data from Google Sheet
    const sheetRows = await fetchSheetData()

    // 2. Store meeting date if provided
    if (meetingDate) {
      setLastMeetingDate(meetingDate)
    }

    if (mode === "full") {
      return await fullReimport(sheetRows, meetingDate)
    }

    // 3. Incremental sync — match by item_number
    const dbItems = await dbGetAllItems("Services Enhancement")
    const dbByItemNum = new Map<string, typeof dbItems[0]>()
    for (const item of dbItems) {
      if (item.item_number) dbByItemNum.set(item.item_number, item)
    }

    let updated = 0
    let added = 0
    let unchanged = 0

    for (const row of sheetRows) {
      const itemNum = `SE-${row.item_number}`
      const match = dbByItemNum.get(itemNum)

      if (match) {
        const updates: Record<string, string | null> = {}
        if (row.title !== match.title) updates.title = row.title
        if (row.status !== match.status) updates.status = row.status
        if (row.eta !== match.eta) updates.eta = row.eta
        if (row.owner_name && row.owner_name !== match.owner_name) updates.owner_name = row.owner_name
        if (row.remarks !== (match.remarks || "")) updates.remarks = row.remarks || null
        if (row.workstream) {
          const normalizedWs = normalizeWorkstreamForDB(row.workstream)
          if (normalizedWs && normalizedWs !== match.workstream) updates.workstream = normalizedWs
        }

        if (Object.keys(updates).length > 0) {
          await dbUpdateItem(match.id, updates)
          updated++
        } else {
          unchanged++
        }
      } else {
        const category = inferCategory(row.title, row.item_number)
        await dbAddItem({
          item_number: `SE-${row.item_number}`,
          title: row.title,
          category_name: category,
          category_slug: category.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          workstream: normalizeWorkstreamForDB(row.workstream),
          owner_name: row.owner_name || null,
          owner_secondary_name: null,
          status: row.status,
          priority: null,
          eta: row.eta,
          actual_end_date: null,
          source: null,
          sprint: null,
          remarks: row.remarks || null,
          details: null,
          expected_impact: null,
          sheet_tab: "Services Enhancement",
          is_archived: false,
        })
        added++
      }
    }

    const log = addSyncLog({
      source: "google_sheets",
      action: "Synced from Google Sheets",
      details: `Fetched ${sheetRows.length} rows. ${updated} updated, ${added} new, ${unchanged} unchanged.`,
      items_affected: updated + added,
      status: "success",
    })

    return NextResponse.json({ log, last_sync: log.synced_at })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    const log = addSyncLog({
      source: "google_sheets",
      action: "Sync failed",
      details: message,
      items_affected: 0,
      status: "error",
    })
    return NextResponse.json({ log, last_sync: log.synced_at, error: message }, { status: 500 })
  }
}

// ─── Full re-import: wipe existing SE items and create fresh from sheet ──────
async function fullReimport(sheetRows: Awaited<ReturnType<typeof fetchSheetData>>, meetingDate: string | null) {
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
  }

  // Delete all existing "Services Enhancement" items
  await supabase.from("items").delete().eq("sheet_tab", "Services Enhancement")

  // Assign categories based on sheet item number ranges and title keywords
  // Sheet structure (from the actual sheet):
  // #1-12: Babysitter/Nanny
  // #13: Party Planning KSA
  // #14-21: Birthday/Party (design items)
  // #22: Birthday/Party (copy review)
  // #23-25: Kids Interior
  // #26-28: Wallpaper
  // #29: Wallpaper KSA
  // #30: HealthyHome KSA
  // #31-33: HealthyHome
  // #34: Midwife
  // #35: Tutor at Home
  // #36: Home Cleaning
  // #37: Gear Refresh
  // #38: General (GA tracking)

  let added = 0
  for (const row of sheetRows) {
    const category = inferCategoryFromNumber(row.item_number, row.title)
    const id = crypto.randomUUID()
    await supabase.from("items").insert({
      id,
      item_number: `SE-${row.item_number}`,
      title: row.title,
      category_name: category,
      category_slug: category.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      workstream: normalizeWorkstreamForDB(row.workstream),
      owner_name: row.owner_name || null,
      owner_secondary_name: null,
      status: row.status,
      priority: null,
      eta: row.eta,
      actual_end_date: null,
      source: null,
      sprint: null,
      remarks: row.remarks || null,
      details: null,
      expected_impact: null,
      sheet_tab: "Services Enhancement",
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    added++
  }

  const log = addSyncLog({
    source: "google_sheets",
    action: "Full re-import from Google Sheets",
    details: `Wiped existing data and imported ${added} items fresh from sheet.`,
    items_affected: added,
    status: "success",
  })

  return NextResponse.json({ log, last_sync: log.synced_at })
}

function normalizeWorkstreamForDB(raw: string): string | null {
  const s = raw.trim().toLowerCase()
  if (s === "brand" || s === "branding") return "brand"
  if (s === "tech" || s === "technology" || s === "development" || s === "dev") return "tech"
  if (s === "design" || s === "ui" || s === "ux") return "design"
  if (s === "strategy" || s === "product" || s === "ops" || s === "operations" || s === "business") return "strategy"
  if (s === "all") return null
  return null
}

// Category from item number range + title fallback
function inferCategoryFromNumber(num: number, title: string): string {
  if (num >= 1 && num <= 12) return "Babysitter/Nanny"
  if (num >= 13 && num <= 22) return "Birthday/Party"
  if (num >= 23 && num <= 25) return "Kids Interior"
  if (num >= 26 && num <= 29) return "Wallpaper"
  if (num === 30) return "HealthyHome"
  if (num >= 31 && num <= 33) return "HealthyHome"
  if (num === 34) return "Midwife"
  if (num === 35) return "Tutor at Home"
  if (num === 36) return "Home Cleaning"
  if (num === 37) return "Gear Refresh"
  if (num === 38) return "General"
  return inferCategory(title, num)
}

function inferCategory(title: string, itemNumber: number): string {
  const t = title.toLowerCase()
  if (t.includes("babysitter") || t.includes("nanny")) return "Babysitter/Nanny"
  if (t.includes("party") || t.includes("birthday") || t.includes("package")) return "Birthday/Party"
  if (t.includes("kids interior") || t.includes("nursery room")) return "Kids Interior"
  if (t.includes("wallpaper") || t.includes("3d")) return "Wallpaper"
  if (t.includes("tutor")) return "Tutor at Home"
  if (t.includes("healthyhome") || t.includes("healthy home") || t.includes("thh")) return "HealthyHome"
  if (t.includes("home cleaning") || t.includes("cleaning")) return "Home Cleaning"
  if (t.includes("gear refresh") || t.includes("gear")) return "Gear Refresh"
  if (t.includes("midwife") || t.includes("breastfeeding")) return "Midwife"
  return "General"
}
