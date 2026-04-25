import { NextRequest, NextResponse } from "next/server"
import { dbGetMeeting, dbGetMeetingActionItems, dbGetMeetingDecisions, dbUpdateActionItemStatus } from "@/lib/db"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const meeting = await dbGetMeeting(id)
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const [actionItems, decisions] = await Promise.all([
    dbGetMeetingActionItems(id),
    dbGetMeetingDecisions(id),
  ])

  return NextResponse.json({ ...meeting, action_items: actionItems, decisions })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const meeting = await dbGetMeeting(id)
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await request.json()
  if (body.action_item_id && body.status) {
    const updated = await dbUpdateActionItemStatus(id, body.action_item_id, body.status)
    if (!updated) return NextResponse.json({ error: "Action item not found" }, { status: 404 })
    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: "Invalid update" }, { status: 400 })
}
