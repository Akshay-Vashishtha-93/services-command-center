import { NextRequest, NextResponse } from "next/server"
import { getAllItems } from "@/lib/data-store"

export async function GET(request: NextRequest) {
  const tab = request.nextUrl.searchParams.get("tab")
  let items = getAllItems().filter(i => !i.is_archived)
  if (tab) {
    items = items.filter(i => i.sheet_tab === tab)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekFromNow = new Date(today)
  weekFromNow.setDate(weekFromNow.getDate() + 7)

  return NextResponse.json({
    total: items.length,
    done: items.filter(i => i.status === 'done' || i.status === 'cancelled').length,
    in_progress: items.filter(i => i.status === 'in_progress').length,
    not_started: items.filter(i => i.status === 'not_started').length,
    blocked: items.filter(i => i.status === 'blocked' || i.status === 'on_hold').length,
    overdue: items.filter(i => {
      if (!i.eta || i.status === 'done' || i.status === 'cancelled') return false
      return new Date(i.eta) < today
    }).length,
    due_this_week: items.filter(i => {
      if (!i.eta || i.status === 'done' || i.status === 'cancelled') return false
      const eta = new Date(i.eta)
      return eta >= today && eta <= weekFromNow
    }).length,
  })
}
