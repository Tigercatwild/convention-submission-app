import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST /api/members/bulk - Bulk upload members (admin only)
export async function POST(request: NextRequest) {
  try {
    const { members } = await request.json()

    if (!Array.isArray(members) || members.length === 0) {
      return NextResponse.json({ error: 'Members array is required' }, { status: 400 })
    }

    // New format: members with organization_name, school_name, member_name, submission_url
    // We'll create organizations and schools automatically if they don't exist
    const processedMembers = []
    
    for (const member of members) {
      if (!member.organization_name || !member.school_name || !member.member_name || !member.submission_url) {
        return NextResponse.json({ 
          error: 'Each member must have organization_name, school_name, member_name, and submission_url' 
        }, { status: 400 })
      }

      // Find or create organization
      let { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('name', member.organization_name)
        .single()

      if (orgError && orgError.code === 'PGRST116') {
        // Organization doesn't exist, create it
        const { data: newOrg, error: createOrgError } = await supabase
          .from('organizations')
          .insert({ name: member.organization_name })
          .select('id')
          .single()

        if (createOrgError) {
          return NextResponse.json({ error: `Failed to create organization: ${createOrgError.message}` }, { status: 500 })
        }
        org = newOrg
      } else if (orgError) {
        return NextResponse.json({ error: `Failed to find organization: ${orgError.message}` }, { status: 500 })
      }

      // Find or create school
      let { data: school, error: schoolError } = await supabase
        .from('schools')
        .select('id')
        .eq('name', member.school_name)
        .eq('organization_id', org.id)
        .single()

      if (schoolError && schoolError.code === 'PGRST116') {
        // School doesn't exist, create it
        const { data: newSchool, error: createSchoolError } = await supabase
          .from('schools')
          .insert({ 
            name: member.school_name,
            organization_id: org.id
          })
          .select('id')
          .single()

        if (createSchoolError) {
          return NextResponse.json({ error: `Failed to create school: ${createSchoolError.message}` }, { status: 500 })
        }
        school = newSchool
      } else if (schoolError) {
        return NextResponse.json({ error: `Failed to find school: ${schoolError.message}` }, { status: 500 })
      }

      processedMembers.push({
        name: member.member_name,
        school_id: school.id,
        organization_id: org.id,
        submission_url: member.submission_url
      })
    }

    const { data, error } = await supabase
      .from('members')
      .insert(processedMembers)
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
