import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/members - Get members (optionally filtered by school and search term)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')
    const searchTerm = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50000')

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
      .limit(limit)

    if (schoolId) {
      query = query.eq('school_id', schoolId)
    }

    // Add server-side search if search term is provided
    if (searchTerm && searchTerm.trim() !== '') {
      query = query.ilike('name', `%${searchTerm.trim()}%`)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Debug logging
    if (schoolId) {
      console.log(`API Debug - School ID: ${schoolId}`)
      console.log(`API Debug - Search term: ${searchTerm || 'none'}`)
      console.log(`API Debug - Query limit: ${limit}`)
      console.log(`API Debug - Total members returned: ${data?.length || 0}`)
      if (data && data.length > 0) {
        // Check if we hit the limit
        if (data.length >= limit) {
          console.log(`API Debug - WARNING: Hit ${limit} member limit - there may be more members!`)
        }
        // Show first few member names for debugging
        console.log('API Debug - First 5 member names:', data.slice(0, 5).map(m => m.name))
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
