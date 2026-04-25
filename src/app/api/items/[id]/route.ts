import { NextRequest, NextResponse } from "next/server"
import { getItem, updateItem } from "@/lib/data-store"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const item = getItem(id)
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(item)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const updated = updateItem(id, body)
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(updated)
}
