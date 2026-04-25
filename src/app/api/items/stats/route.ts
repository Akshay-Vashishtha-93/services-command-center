import { NextRequest, NextResponse } from "next/server"
import { dbGetStats } from "@/lib/db"

export async function GET(request: NextRequest) {
  const tab = request.nextUrl.searchParams.get("tab")
  const stats = await dbGetStats(tab)
  return NextResponse.json(stats)
}
