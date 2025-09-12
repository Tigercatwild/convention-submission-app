import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/members/[id] - Get member details (for redirect)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { data, error } = await supabase
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
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/members/[id] - Update member (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { name, school_id, organization_id, submission_url } = await request.json()
    const { id } = await params

    if (!name || !school_id || !organization_id || !submission_url) {
      return NextResponse.json({ 
        error: 'Name, school_id, organization_id, and submission_url are required' 
      }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('members')
      .update({ name, school_id, organization_id, submission_url })
      .eq('id', id)
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

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/members/[id] - Delete member (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Member deleted successfully' })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
