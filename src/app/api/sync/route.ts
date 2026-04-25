import { NextRequest, NextResponse } from "next/server"
import { getSyncLogs, getLastSyncTime, triggerRefresh } from "@/lib/sync-store"

export async function GET() {
  return NextResponse.json({
    logs: getSyncLogs(),
    last_sync: getLastSyncTime(),
  })
}

export async function POST() {
  const log = triggerRefresh()
  return NextResponse.json({
    log,
    last_sync: log.synced_at,
  })
}
