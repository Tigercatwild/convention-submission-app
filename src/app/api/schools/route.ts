import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/schools - Get schools (optionally filtered by organization)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')

    let query = supabase
      .from('schools')
      .select(`
        *,
        organizations (
          id,
          name
        )
      `)
      .order('name')

    if (orgId) {
      query = query.eq('organization_id', orgId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/schools - Create new school (admin only)
export async function POST(request: NextRequest) {
  try {
    const { name, organization_id } = await request.json()

    if (!name || !organization_id) {
      return NextResponse.json({ error: 'Name and organization_id are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('schools')
      .insert([{ name, organization_id }])
      .select(`
        *,
        organizations (
          id,
          name
        )
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
