import { NextRequest, NextResponse } from "next/server"
import { dbGetChanges } from "@/lib/db"

export async function GET(request: NextRequest) {
  const days = parseInt(request.nextUrl.searchParams.get("days") || "7")
  return NextResponse.json(await dbGetChanges(days))
}
