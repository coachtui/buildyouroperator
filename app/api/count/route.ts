import { NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'

const TOTAL_SPOTS = 50

export async function GET() {
  const { count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })

  const taken = count ?? 0
  const remaining = Math.max(0, TOTAL_SPOTS - taken)

  return NextResponse.json({ remaining, taken, total: TOTAL_SPOTS })
}
