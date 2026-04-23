import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_FILE = path.join(process.cwd(), 'waitlist.json')

function loadList(): string[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
    }
  } catch {}
  return []
}

function saveList(list: string[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2))
}

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required.' }, { status: 400 })
  }

  const normalized = email.toLowerCase().trim()
  const list = loadList()

  if (list.includes(normalized)) {
    return NextResponse.json(
      { message: "You're already on the list. Check your inbox for Lesson 1." },
      { status: 200 }
    )
  }

  list.push(normalized)
  saveList(list)

  return NextResponse.json(
    { message: "Check your inbox — Lesson 1 is on its way." },
    { status: 200 }
  )
}

export async function GET() {
  const list = loadList()
  return NextResponse.json({ count: list.length })
}
