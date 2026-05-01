import { NextRequest, NextResponse } from "next/server"
import { getMeetingSettings, updateMeetingSettings } from "@/lib/meeting-tracker"

export async function GET() {
  return NextResponse.json(getMeetingSettings())
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  updateMeetingSettings(body)
  return NextResponse.json(getMeetingSettings())
}
