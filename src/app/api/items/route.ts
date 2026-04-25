import { NextRequest, NextResponse } from "next/server"
import { dbGetAllItems } from "@/lib/db"

export async function GET(request: NextRequest) {
  const tab = request.nextUrl.searchParams.get("tab")
  const items = await dbGetAllItems(tab)
  return NextResponse.json(items)
}
