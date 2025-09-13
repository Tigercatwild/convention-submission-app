import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/members/bulk-fast - Fast bulk upload using direct Supabase operations
export async function POST(request: NextRequest) {
  try {
    const { members } = await request.json()

    if (!Array.isArray(members) || members.length === 0) {
      return NextResponse.json({ error: 'Members array is required' }, { status: 400 })
    }

    // Step 1: Get all unique organizations and schools from the data
    const uniqueOrgs = [...new Set(members.map(m => m.organization_name))]
    const uniqueSchools = [...new Set(members.map(m => `${m.organization_name}|${m.school_name}`))]

    // Step 2: Bulk fetch existing organizations
    const { data: existingOrgs, error: orgFetchError } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .in('name', uniqueOrgs)

    if (orgFetchError) {
      return NextResponse.json({ error: `Failed to fetch organizations: ${orgFetchError.message}` }, { status: 500 })
    }

    const existingOrgMap = new Map(existingOrgs.map(org => [org.name, org.id]))

    // Step 3: Create missing organizations in bulk
    const orgsToCreate = uniqueOrgs.filter(orgName => !existingOrgMap.has(orgName))
    let newOrgMap = new Map(existingOrgMap)

    if (orgsToCreate.length > 0) {
      const { data: newOrgs, error: createOrgError } = await supabaseAdmin
        .from('organizations')
        .insert(orgsToCreate.map(name => ({ name })))
        .select('id, name')

      if (createOrgError) {
        return NextResponse.json({ error: `Failed to create organizations: ${createOrgError.message}` }, { status: 500 })
      }

      newOrgs.forEach(org => newOrgMap.set(org.name, org.id))
    }

    // Step 4: Bulk fetch existing schools
    const schoolQueries = uniqueSchools.map(schoolKey => {
      const [orgName, schoolName] = schoolKey.split('|')
      const orgId = newOrgMap.get(orgName)
      return { organization_id: orgId, name: schoolName }
    })

    const { data: existingSchools, error: schoolFetchError } = await supabaseAdmin
      .from('schools')
      .select('id, name, organization_id')
      .or(schoolQueries.map(q => `and(organization_id.eq.${q.organization_id},name.eq.${q.name})`).join(','))

    if (schoolFetchError) {
      return NextResponse.json({ error: `Failed to fetch schools: ${schoolFetchError.message}` }, { status: 500 })
    }

    const existingSchoolMap = new Map(
      existingSchools.map(school => [`${school.organization_id}|${school.name}`, school.id])
    )

    // Step 5: Create missing schools in bulk
    const schoolsToCreate = schoolQueries.filter(q => 
      !existingSchoolMap.has(`${q.organization_id}|${q.name}`)
    )

    let newSchoolMap = new Map(existingSchoolMap)

    if (schoolsToCreate.length > 0) {
      const { data: newSchools, error: createSchoolError } = await supabaseAdmin
        .from('schools')
        .insert(schoolsToCreate)
        .select('id, name, organization_id')

      if (createSchoolError) {
        return NextResponse.json({ error: `Failed to create schools: ${createSchoolError.message}` }, { status: 500 })
      }

      newSchools.forEach(school => 
        newSchoolMap.set(`${school.organization_id}|${school.name}`, school.id)
      )
    }

    // Step 6: Prepare members for bulk insert
    const membersToInsert = members.map(member => {
      const orgId = newOrgMap.get(member.organization_name)
      const schoolId = newSchoolMap.get(`${orgId}|${member.school_name}`)
      
      if (!orgId || !schoolId) {
        throw new Error(`Failed to resolve organization or school for member: ${member.member_name}`)
      }

      return {
        name: member.member_name,
        school_id: schoolId,
        organization_id: orgId,
        submission_url: member.submission_url
      }
    })

    // Step 7: Bulk insert all members at once
    const { data: insertedMembers, error: insertError } = await supabaseAdmin
      .from('members')
      .insert(membersToInsert)
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

    if (insertError) {
      return NextResponse.json({ error: `Failed to insert members: ${insertError.message}` }, { status: 500 })
    }

    return NextResponse.json({ 
      message: `${insertedMembers.length} members created successfully`,
      data: insertedMembers,
      stats: {
        organizationsCreated: orgsToCreate.length,
        schoolsCreated: schoolsToCreate.length,
        membersCreated: insertedMembers.length
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Bulk upload error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}
