import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/members/bulk-csv - Ultra-fast CSV import using SQL
export async function POST(request: NextRequest) {
  try {
    const { csvData } = await request.json()

    if (!csvData || typeof csvData !== 'string') {
      return NextResponse.json({ error: 'CSV data is required' }, { status: 400 })
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

    // Use a single SQL query to handle everything
    const sql = `
      WITH org_data AS (
        SELECT DISTINCT organization, school
        FROM (VALUES ${dataRows.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ')})
        AS t(organization, school)
      ),
      org_inserts AS (
        INSERT INTO organizations (name)
        SELECT DISTINCT organization
        FROM org_data
        WHERE organization NOT IN (SELECT name FROM organizations)
        RETURNING id, name
      ),
      all_orgs AS (
        SELECT id, name FROM organizations
        UNION ALL
        SELECT id, name FROM org_inserts
      ),
      school_inserts AS (
        INSERT INTO schools (name, organization_id)
        SELECT DISTINCT 
          o.school,
          ao.id
        FROM org_data o
        JOIN all_orgs ao ON ao.name = o.organization
        WHERE NOT EXISTS (
          SELECT 1 FROM schools s 
          WHERE s.name = o.school AND s.organization_id = ao.id
        )
        RETURNING id, name, organization_id
      ),
      all_schools AS (
        SELECT id, name, organization_id FROM schools
        UNION ALL
        SELECT id, name, organization_id FROM school_inserts
      ),
      member_inserts AS (
        INSERT INTO members (name, school_id, organization_id, submission_url)
        SELECT 
          m.member_name,
          s.id,
          s.organization_id,
          m.submission_url
        FROM (VALUES ${dataRows.map((_, i) => 
          `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`
        ).join(', ')}) AS m(member_name, organization, school, submission_url)
        JOIN all_schools s ON s.name = m.school
        JOIN all_orgs o ON o.id = s.organization_id AND o.name = m.organization
        RETURNING id, name, school_id, organization_id, submission_url
      )
      SELECT 
        (SELECT COUNT(*) FROM org_inserts) as orgs_created,
        (SELECT COUNT(*) FROM school_inserts) as schools_created,
        (SELECT COUNT(*) FROM member_inserts) as members_created
    `

    // Prepare parameters
    const params = dataRows.flatMap(row => [
      row.organization,
      row.school,
      row.member_name,
      row.submission_url
    ])

    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: sql,
      params: params
    })

    if (error) {
      // Fallback to the bulk-fast method if SQL function doesn't exist
      console.log('SQL function not available, falling back to bulk-fast method')
      
      const members = dataRows.map(row => ({
        organization_name: row.organization,
        school_name: row.school,
        member_name: row.member_name,
        submission_url: row.submission_url
      }))

      // Call the bulk-fast endpoint
      const bulkResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/members/bulk-fast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members })
      })

      if (!bulkResponse.ok) {
        const errorData = await bulkResponse.json()
        return NextResponse.json({ error: errorData.error }, { status: bulkResponse.status })
      }

      const bulkData = await bulkResponse.json()
      return NextResponse.json(bulkData, { status: 201 })
    }

    return NextResponse.json({
      message: `Successfully processed ${dataRows.length} rows`,
      data: data[0],
      stats: {
        organizationsCreated: data[0]?.orgs_created || 0,
        schoolsCreated: data[0]?.schools_created || 0,
        membersCreated: data[0]?.members_created || 0
      }
    }, { status: 201 })

  } catch (error) {
    console.error('CSV import error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}
