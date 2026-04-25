import { NextRequest, NextResponse } from "next/server"
import { getAllItems } from "@/lib/data-store"

export async function GET(request: NextRequest) {
  const tab = request.nextUrl.searchParams.get("tab")
  let items = getAllItems()
  if (tab) {
    items = items.filter(i => i.sheet_tab === tab)
  }
  return NextResponse.json(items)
}
