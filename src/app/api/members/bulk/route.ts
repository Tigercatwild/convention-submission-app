import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST /api/members/bulk - Bulk upload members (admin only)
export async function POST(request: NextRequest) {
  try {
    const { members } = await request.json()

    if (!Array.isArray(members) || members.length === 0) {
      return NextResponse.json({ error: 'Members array is required' }, { status: 400 })
    }

    // Validate each member
    for (const member of members) {
      if (!member.name || !member.school_id || !member.organization_id || !member.submission_url) {
        return NextResponse.json({ 
          error: 'Each member must have name, school_id, organization_id, and submission_url' 
        }, { status: 400 })
      }
    }

    const { data, error } = await supabase
      .from('members')
      .insert(members)
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

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      message: `${data.length} members created successfully`,
      data 
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
