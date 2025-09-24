import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/members - Get members (optionally filtered by school)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')

    let query = supabase
      .from('members')
      .select(`
        *,
        schools (
          id,
          name,
          organizations (
            id,
            name
          )
        )
      `)
      .order('name')

    if (schoolId) {
      query = query.eq('school_id', schoolId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Debug logging for Winter Kamin issue
    if (schoolId) {
      console.log(`API Debug - School ID: ${schoolId}`)
      console.log(`API Debug - Total members returned: ${data?.length || 0}`)
      if (data && data.length > 0) {
        const winterMembers = data.filter(member => member.name.toLowerCase().includes('winter'))
        console.log(`API Debug - Winter members found: ${winterMembers.length}`)
        if (winterMembers.length > 0) {
          console.log('API Debug - Winter member names:', winterMembers.map(m => m.name))
        }
      }
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/members - Create new member (admin only)
export async function POST(request: NextRequest) {
  try {
    const { name, school_id, organization_id, submission_url } = await request.json()

    if (!name || !school_id || !organization_id || !submission_url) {
      return NextResponse.json({ 
        error: 'Name, school_id, organization_id, and submission_url are required' 
      }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('members')
      .insert([{ name, school_id, organization_id, submission_url }])
      .select(`
        *,
        schools (
          id,
          name,
          organizations (
            id,
            name
          )
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
