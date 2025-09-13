import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/members/bulk-csv - Ultra-fast CSV import using optimized bulk operations
export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ 
        error: 'Supabase configuration is missing. Please check environment variables.' 
      }, { status: 500 })
    }

    const { csvData, duplicateHandling = 'skip' } = await request.json()

    if (!csvData || typeof csvData !== 'string') {
      return NextResponse.json({ error: 'CSV data is required' }, { status: 400 })
    }

    if (!['skip', 'update', 'error'].includes(duplicateHandling)) {
      return NextResponse.json({ error: 'Invalid duplicateHandling option. Must be skip, update, or error' }, { status: 400 })
    }

    // Check CSV data size (4.5MB limit for Vercel serverless functions)
    const maxSize = 4.5 * 1024 * 1024 // 4.5MB
    if (csvData.length > maxSize) {
      return NextResponse.json({ 
        error: `CSV data too large (${(csvData.length / 1024 / 1024).toFixed(2)}MB). Maximum size is 4.5MB.` 
      }, { status: 413 })
    }

    // Parse CSV data
    const lines = csvData.split('\n').filter(line => line.trim())
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV must have at least a header and one data row' }, { status: 400 })
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
    const dataRows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim())
      const row: Record<string, string> = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      return row
    })

    // Validate required columns
    const requiredColumns = ['organization', 'school', 'member_name', 'submission_url']
    const missingColumns = requiredColumns.filter(col => !headers.includes(col))
    if (missingColumns.length > 0) {
      return NextResponse.json({ 
        error: `Missing required columns: ${missingColumns.join(', ')}` 
      }, { status: 400 })
    }

    // Convert CSV data to members format and use the bulk-fast logic
      const members = dataRows.map(row => ({
        organization_name: row.organization,
        school_name: row.school,
        member_name: row.member_name,
        submission_url: row.submission_url
      }))

    // Use the same optimized logic as bulk-fast but with CSV parsing
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
    const newOrgMap = new Map(existingOrgMap)

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

    // Step 4: Bulk fetch existing schools using a more efficient approach
    const schoolQueries = uniqueSchools.map(schoolKey => {
      const [orgName, schoolName] = schoolKey.split('|')
      const orgId = newOrgMap.get(orgName)
      return { organization_id: orgId, name: schoolName }
    })

    // Instead of one large OR query, fetch schools by organization_id to avoid 414 errors
    const existingSchools = []
    const orgIds = [...new Set(schoolQueries.map(q => q.organization_id))]
    
    for (const orgId of orgIds) {
      const schoolsForOrg = schoolQueries.filter(q => q.organization_id === orgId)
      const schoolNames = schoolsForOrg.map(q => q.name)
      
      // Process school names in chunks to avoid 414 errors
      const chunkSize = 100 // Process 100 school names at a time
      for (let i = 0; i < schoolNames.length; i += chunkSize) {
        const chunk = schoolNames.slice(i, i + chunkSize)
        
        const { data: schools, error: schoolFetchError } = await supabaseAdmin
          .from('schools')
          .select('id, name, organization_id')
          .eq('organization_id', orgId)
          .in('name', chunk)

        if (schoolFetchError) {
          return NextResponse.json({ error: `Failed to fetch schools for organization ${orgId} (chunk ${Math.floor(i/chunkSize) + 1}): ${schoolFetchError.message}` }, { status: 500 })
        }

        existingSchools.push(...(schools || []))
      }
    }

    const existingSchoolMap = new Map(
      existingSchools.map(school => [`${school.organization_id}|${school.name}`, school.id])
    )

    // Step 5: Create missing schools in bulk
    const schoolsToCreate = schoolQueries.filter(q => 
      !existingSchoolMap.has(`${q.organization_id}|${q.name}`)
    )

    const newSchoolMap = new Map(existingSchoolMap)

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

    // Step 6: Check for existing members if needed
    let existingMembers: Array<{
      id: string
      name: string
      school_id: string
      organization_id: string
      submission_url: string
    }> = []
    let duplicatesSkipped = 0
    let duplicatesUpdated = 0

    if (duplicateHandling !== 'error') {
      // Get existing members to check for duplicates
      const memberQueries = members.map(member => {
        const orgId = newOrgMap.get(member.organization_name)
        const schoolId = newSchoolMap.get(`${orgId}|${member.school_name}`)
        return { name: member.member_name, school_id: schoolId, organization_id: orgId }
      }).filter(m => m.school_id && m.organization_id)

      if (memberQueries.length > 0) {
        // Use chunked queries to avoid 414 errors with very large datasets
        const existingMembersList = []
        const schoolIds = [...new Set(memberQueries.map(m => m.school_id))]
        
        for (const schoolId of schoolIds) {
          const membersForSchool = memberQueries.filter(m => m.school_id === schoolId)
          const memberNames = membersForSchool.map(m => m.name)
          
          // Process member names in chunks to avoid 414 errors
          const chunkSize = 50 // Process 50 member names at a time
          for (let i = 0; i < memberNames.length; i += chunkSize) {
            const chunk = memberNames.slice(i, i + chunkSize)
            
            const { data: existing, error: existingError } = await supabaseAdmin
              .from('members')
              .select('id, name, school_id, organization_id, submission_url')
              .eq('school_id', schoolId)
              .in('name', chunk)

            if (existingError) {
              return NextResponse.json({ error: `Failed to check existing members for school ${schoolId} (chunk ${Math.floor(i/chunkSize) + 1}): ${existingError.message}` }, { status: 500 })
            }

            existingMembersList.push(...(existing || []))
          }
        }

        existingMembers = existingMembersList
      }
    }

    // Step 7: Prepare members for bulk insert/update
    const membersToInsert = []
    const membersToUpdate = []
    const existingMemberMap = new Map(
      existingMembers.map(m => [`${m.name}|${m.school_id}|${m.organization_id}`, m])
    )

    for (const member of members) {
      const orgId = newOrgMap.get(member.organization_name)
      const schoolId = newSchoolMap.get(`${orgId}|${member.school_name}`)
      
      if (!orgId || !schoolId) {
        throw new Error(`Failed to resolve organization or school for member: ${member.member_name}`)
      }

      const memberKey = `${member.member_name}|${schoolId}|${orgId}`
      const existingMember = existingMemberMap.get(memberKey)

      if (existingMember) {
        if (duplicateHandling === 'error') {
          return NextResponse.json({ 
            error: `Duplicate member found: ${member.member_name} in ${member.organization_name} - ${member.school_name}` 
          }, { status: 400 })
        } else if (duplicateHandling === 'update') {
          membersToUpdate.push({
            id: existingMember.id,
            submission_url: member.submission_url
          })
          duplicatesUpdated++
        } else {
          // skip
          duplicatesSkipped++
        }
      } else {
        membersToInsert.push({
          name: member.member_name,
          school_id: schoolId,
          organization_id: orgId,
          submission_url: member.submission_url
        })
      }
    }

    // Step 8: Execute bulk operations
    let insertedMembers: Array<{
      id: string
      name: string
      school_id: string
      organization_id: string
      submission_url: string
      created_at: string
      schools?: {
        id: string
        name: string
        organizations?: {
          id: string
          name: string
        }
      }
    }> = []
    const updatedMembers: Array<{
      id: string
      name: string
      school_id: string
      organization_id: string
      submission_url: string
      created_at: string
      schools?: {
        id: string
        name: string
        organizations?: {
          id: string
          name: string
        }
      }
    }> = []

    // Insert new members
    if (membersToInsert.length > 0) {
      const { data: inserted, error: insertError } = await supabaseAdmin
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

      insertedMembers = inserted || []
    }

    // Update existing members
    if (membersToUpdate.length > 0) {
      for (const memberUpdate of membersToUpdate) {
        const { data: updated, error: updateError } = await supabaseAdmin
          .from('members')
          .update({ submission_url: memberUpdate.submission_url })
          .eq('id', memberUpdate.id)
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

        if (updateError) {
          return NextResponse.json({ error: `Failed to update member: ${updateError.message}` }, { status: 500 })
        }

        updatedMembers.push(updated)
      }
    }

    const totalProcessed = insertedMembers.length + updatedMembers.length

    return NextResponse.json({
      message: `Successfully processed ${dataRows.length} CSV rows`,
      data: [...insertedMembers, ...updatedMembers],
      stats: {
        organizationsCreated: orgsToCreate.length,
        schoolsCreated: schoolsToCreate.length,
        membersCreated: insertedMembers.length,
        duplicatesSkipped: duplicatesSkipped,
        duplicatesUpdated: duplicatesUpdated
      }
    }, { status: 201 })

  } catch (error) {
    console.error('CSV import error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}
