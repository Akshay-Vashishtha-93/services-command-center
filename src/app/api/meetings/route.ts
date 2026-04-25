import { NextRequest, NextResponse } from "next/server"
import {
  dbGetAllMeetings,
  dbCreateMeeting,
  dbGetMeetingActionItems,
  dbGetMeetingDecisions,
  dbSaveMeetingDecisions,
  dbSaveMeetingActionItems,
} from "@/lib/db"
import { parseTranscript, suggestCategory } from "@/lib/transcript-parser"

export async function GET() {
  const meetings = await dbGetAllMeetings()
  const result = await Promise.all(
    meetings.map(async (m) => ({
      ...m,
      action_items_count: (await dbGetMeetingActionItems(m.id)).length,
      decisions_count: (await dbGetMeetingDecisions(m.id)).length,
    }))
  )
  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { title, date, transcript, attendees } = body

  if (!title || !date) {
    return NextResponse.json({ error: "Title and date are required" }, { status: 400 })
  }

  const meeting = await dbCreateMeeting({
    title,
    date,
    transcript: transcript || "",
    attendees: attendees || [],
  })

  // Parse transcript and save decisions + action items
  if (transcript?.trim()) {
    const parsed = parseTranscript(transcript)
    await dbSaveMeetingDecisions(meeting.id, parsed.decisions.map(d => ({
      text: d.text,
      status: d.alignment,
    })))
    await dbSaveMeetingActionItems(meeting.id, parsed.actionItems.map(a => ({
      title: a.title,
      description: a.description,
      owner: a.owners.join(", "),
      status: "pending" as const,
      category_suggestion: suggestCategory(`${a.title} ${a.description}`),
    })))
  }

  const actionItems = await dbGetMeetingActionItems(meeting.id)
  const decisions = await dbGetMeetingDecisions(meeting.id)

  return NextResponse.json({ ...meeting, action_items: actionItems, decisions }, { status: 201 })
}
