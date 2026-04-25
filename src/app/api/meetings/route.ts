import { NextRequest, NextResponse } from "next/server"
import {
  getAllMeetings,
  createMeeting,
  getMeetingActionItems,
  getMeetingDecisions,
} from "@/lib/meetings-store"

export async function GET() {
  const meetings = getAllMeetings()
  const result = meetings.map((m) => ({
    ...m,
    action_items_count: getMeetingActionItems(m.id).length,
    decisions_count: getMeetingDecisions(m.id).length,
  }))
  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { title, date, transcript, attendees } = body

  if (!title || !date) {
    return NextResponse.json(
      { error: "Title and date are required" },
      { status: 400 }
    )
  }

  const meeting = createMeeting({
    title,
    date,
    transcript: transcript || "",
    attendees: attendees || [],
  })

  const actionItems = getMeetingActionItems(meeting.id)
  const decisions = getMeetingDecisions(meeting.id)

  return NextResponse.json(
    { ...meeting, action_items: actionItems, decisions },
    { status: 201 }
  )
}
