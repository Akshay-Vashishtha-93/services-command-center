import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { url } = body

  if (!url || !url.includes("docs.google.com")) {
    return NextResponse.json(
      { error: "Please provide a valid Google Docs URL" },
      { status: 400 }
    )
  }

  // Extract document ID from various Google Docs URL formats
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (!match) {
    return NextResponse.json(
      { error: "Could not extract document ID from URL" },
      { status: 400 }
    )
  }

  const docId = match[1]
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`

  try {
    const res = await fetch(exportUrl)
    if (!res.ok) {
      return NextResponse.json(
        {
          error:
            "Could not fetch document. Make sure the document is shared with 'Anyone with the link can view'",
        },
        { status: 422 }
      )
    }

    const content = await res.text()
    // Extract title from first non-empty line
    const lines = content.split("\n").filter((l) => l.trim())
    const title = lines[0]?.trim() || "Untitled Document"

    return NextResponse.json({ content, title })
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch document. Check network and sharing settings." },
      { status: 500 }
    )
  }
}
