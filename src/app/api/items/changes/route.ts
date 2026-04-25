import { NextRequest, NextResponse } from "next/server"
import { getChanges } from "@/lib/data-store"

export async function GET(request: NextRequest) {
  const days = parseInt(request.nextUrl.searchParams.get("days") || "7")
  return NextResponse.json(getChanges(days))
}
