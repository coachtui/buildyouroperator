import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { supabase } from '@/app/lib/supabase'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const lesson = req.nextUrl.searchParams.get('lesson')

  if (!token || !lesson) {
    return NextResponse.json({ messages: null })
  }

  try {
    const secret = new TextEncoder().encode(process.env.ACCESS_TOKEN_SECRET)
    const { payload } = await jwtVerify(token, secret)
    const email = payload.email as string

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (!user) return NextResponse.json({ messages: null })

    const { data: session } = await supabase
      .from('lesson_sessions')
      .select('messages')
      .eq('user_id', user.id)
      .eq('lesson_number', parseInt(lesson))
      .single()

    return NextResponse.json({ messages: session?.messages ?? null })
  } catch {
    return NextResponse.json({ messages: null })
  }
}
