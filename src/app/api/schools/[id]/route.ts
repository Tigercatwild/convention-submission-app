import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// PUT /api/schools/[id] - Update school (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { name, organization_id } = await request.json()
    const { id } = await params

    if (!name || !organization_id) {
      return NextResponse.json({ error: 'Name and organization_id are required' }, { status: 400 })
    }

    // Check if a school with the same name and organization already exists (excluding current school)
    const { data: existingSchool, error: checkError } = await supabase
      .from('schools')
      .select('id, name')
      .eq('name', name)
      .eq('organization_id', organization_id)
      .neq('id', id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      return NextResponse.json({ error: `Failed to check for duplicates: ${checkError.message}` }, { status: 500 })
    }

    if (existingSchool) {
      return NextResponse.json({ 
        error: `A school named "${name}" already exists in this organization. Please choose a different name.` 
      }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('schools')
      .update({ name, organization_id })
      .eq('id', id)
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

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/schools/[id] - Delete school (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { error } = await supabase
      .from('schools')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'School deleted successfully' })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
