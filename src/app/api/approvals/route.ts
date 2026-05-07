import { NextRequest, NextResponse } from "next/server"
import { getAllApprovals, getPendingApprovals, resolveApproval } from "@/lib/approvals-store"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const pending = request.nextUrl.searchParams.get("pending") === "true"
  const items = pending ? getPendingApprovals() : getAllApprovals()
  return NextResponse.json(items)
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { id, status } = body

  if (!id || !['approved', 'dismissed'].includes(status)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const updated = resolveApproval(id, status)
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(updated)
}
