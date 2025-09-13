'use client'

import { useState } from 'react'
// Removed unused imports since API now handles org/school creation

export default function BulkUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [useFastMode, setUseFastMode] = useState(true)
  const [duplicateHandling, setDuplicateHandling] = useState<'skip' | 'update' | 'error'>('skip')
  const [demoMode, setDemoMode] = useState(false)
  const [result, setResult] = useState<{ success: number; errors: string[]; stats?: { organizationsCreated: number; schoolsCreated: number; membersCreated: number; duplicatesSkipped?: number; duplicatesUpdated?: number } } | null>(null)
  // Removed unused state variables since API now handles org/school creation

  // No need to load data since API handles org/school creation automatically

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Check file size (4.5MB limit for Vercel serverless functions)
      const maxSize = 4.5 * 1024 * 1024 // 4.5MB in bytes
      if (selectedFile.size > maxSize) {
        setResult({ 
          success: 0, 
          errors: [`File size (${(selectedFile.size / 1024 / 1024).toFixed(2)}MB) exceeds the 4.5MB limit. Please use a smaller file or split your data.`] 
        })
        return
      }
      
      setFile(selectedFile)
      setResult(null)
    }
  }

  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n')
    const headers = lines[0].split(',').map(h => h.trim())
    
    const members = []
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      
      const values = line.split(',').map(v => v.trim())
      if (values.length !== headers.length) continue
      
      const member: Record<string, string> = {}
      headers.forEach((header, index) => {
        member[header.toLowerCase().replace(/\s+/g, '_')] = values[index]
      })
      members.push(member)
    }
    
    return members
  }

  const handleUpload = async () => {
    if (!file) return

    setLoading(true)
    setResult(null)

    try {
      const csvText = await file.text()
      const csvMembers = parseCSV(csvText)
      
      // Convert to the new format that the API expects
      const members = csvMembers.map(member => ({
        organization_name: member.organization,
        school_name: member.school,
        member_name: member.member_name,
        submission_url: member.submission_url
      }))

      // Check JSON payload size (JSON can be 3-4x larger than CSV)
      const membersPayload = JSON.stringify({ members, duplicateHandling })
      const csvPayload = JSON.stringify({ csvData: csvText, duplicateHandling })
      const maxPayloadSize = 4.5 * 1024 * 1024 // 4.5MB for Vercel serverless functions
      
      console.log(`File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
      console.log(`Members payload size: ${(membersPayload.length / 1024 / 1024).toFixed(2)}MB`)
      console.log(`CSV payload size: ${(csvPayload.length / 1024 / 1024).toFixed(2)}MB`)
      console.log(`Max payload size: ${(maxPayloadSize / 1024 / 1024).toFixed(2)}MB`)

      // Choose the fastest method based on user preference and payload size
      let endpoint, body
      if (useFastMode) {
        // For ultra-fast mode, prefer CSV payload as it's usually smaller
        // Only fall back to members payload if CSV is too large
        if (csvPayload.length <= maxPayloadSize) {
          endpoint = '/api/members/bulk-csv'
          body = csvPayload
          console.log('Using ultra-fast CSV mode')
        } else if (membersPayload.length <= maxPayloadSize) {
          endpoint = '/api/members/bulk-fast'
          body = membersPayload
          console.log('CSV payload too large, falling back to fast bulk mode')
        } else {
          // Both payloads are too large
          setResult({ 
            success: 0, 
            errors: [`File too large. CSV payload: ${(csvPayload.length / 1024 / 1024).toFixed(2)}MB, Members payload: ${(membersPayload.length / 1024 / 1024).toFixed(2)}MB. Maximum is 4.5MB. Please split your data.`] 
          })
          return
        }
      } else {
        endpoint = '/api/members/bulk-fast'
        body = membersPayload
      }

      // Final size check
      if (body.length > maxPayloadSize) {
        setResult({ 
          success: 0, 
          errors: [`Payload size (${(body.length / 1024 / 1024).toFixed(2)}MB) exceeds the 4.5MB limit. Please use a smaller file or split your data.`] 
        })
        return
      }
      
      console.log(`Processing ${members.length} members with ${endpoint.includes('csv') ? 'ultra-fast CSV' : 'fast bulk'} upload (duplicates: ${duplicateHandling})`)
      
      // Demo mode - simulate successful upload
      if (demoMode) {
        console.log('Running in demo mode - simulating successful upload')
        setTimeout(() => {
          setResult({ 
            success: members.length, 
            errors: [],
            stats: {
              organizationsCreated: Math.floor(members.length / 10),
              schoolsCreated: Math.floor(members.length / 5),
              membersCreated: members.length,
              duplicatesSkipped: Math.floor(members.length / 20),
              duplicatesUpdated: 0
            }
          })
          setLoading(false)
        }, 2000)
        return
      }
      
      console.log(`Attempting to call ${endpoint} with ${(body.length / 1024 / 1024).toFixed(2)}MB payload`)
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      }).catch(fetchError => {
        console.error('Fetch error:', fetchError)
        throw new Error(`Network error: ${fetchError.message}`)
      })

      if (response.ok) {
        const data = await response.json()
        setResult({ 
          success: data.data.length, 
          errors: [],
          stats: data.stats
        })
      } else {
        // Try to parse JSON error, but handle cases where response might be HTML
        let errorMessage = 'Upload failed'
        console.log(`Upload failed with status: ${response.status}`)
        try {
          const error = await response.json()
          console.log('Error response:', error)
          errorMessage = error.error || errorMessage
        } catch {
          // If JSON parsing fails, try to get text content
          try {
            const errorText = await response.text()
            if (response.status === 413) {
              errorMessage = 'File too large. Please use a smaller CSV file (max 4.5MB) or split your data into multiple files.'
            } else {
              errorMessage = `Server error (${response.status}): ${errorText.substring(0, 200)}`
            }
          } catch {
            if (response.status === 413) {
              errorMessage = 'File too large. Please use a smaller CSV file (max 4.5MB) or split your data into multiple files.'
            } else {
              errorMessage = `Server error (${response.status}): Unable to read error details`
            }
          }
        }
        setResult({ success: 0, errors: [errorMessage] })
      }
    } catch (error) {
      console.error('Bulk upload error:', error)
      
      // If it's a network/API error, provide helpful guidance
      if (error instanceof Error && (error.message.includes('fetch') || error.message.includes('Network'))) {
        setResult({ 
          success: 0, 
          errors: [
            'API connection failed. This usually means:',
            '1. Supabase environment variables are not configured in Vercel',
            '2. The database is not set up yet',
            '3. There is a network connectivity issue',
            '',
            'To fix this:',
            '• Set up Supabase and add environment variables to Vercel',
            '• Or test locally with: npm run dev'
          ]
        })
      } else {
        setResult({ 
          success: 0, 
          errors: [error instanceof Error ? error.message : 'Unknown error occurred'] 
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Bulk Upload Members</h1>
        <p className="text-gray-600">
          Upload a CSV file to add multiple members at once. The CSV should have the following columns:
        </p>
        <p className="text-sm text-gray-500 mt-2">
          <strong>File size limit:</strong> 4.5MB maximum (Vercel serverless function limit). For larger datasets, please split your CSV into multiple files.
        </p>
        <div className="mt-4 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={useFastMode}
                  onChange={(e) => setUseFastMode(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">
                  <strong>Ultra-fast mode</strong> (recommended) - Uses direct SQL operations for maximum speed
                </span>
              </label>
            </div>
            
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={demoMode}
                  onChange={(e) => setDemoMode(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">
                  <strong>Demo mode</strong> - Simulate upload without API (for testing)
                </span>
              </label>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duplicate Handling
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="duplicateHandling"
                  value="skip"
                  checked={duplicateHandling === 'skip'}
                  onChange={(e) => setDuplicateHandling(e.target.value as 'skip' | 'update' | 'error')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">
                  <strong>Skip duplicates</strong> - Ignore existing members (recommended)
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="duplicateHandling"
                  value="update"
                  checked={duplicateHandling === 'update'}
                  onChange={(e) => setDuplicateHandling(e.target.value as 'skip' | 'update' | 'error')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">
                  <strong>Update duplicates</strong> - Update existing members with new data
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="duplicateHandling"
                  value="error"
                  checked={duplicateHandling === 'error'}
                  onChange={(e) => setDuplicateHandling(e.target.value as 'skip' | 'update' | 'error')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">
                  <strong>Error on duplicates</strong> - Stop upload if duplicates found
                </span>
              </label>
            </div>
          </div>
        </div>
        <div className="mt-4 bg-gray-50 p-4 rounded-lg">
          <code className="text-sm">
            organization, school, member_name, submission_url
          </code>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-6">
          <div>
            <label htmlFor="csvFile" className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV File
            </label>
            <input
              id="csvFile"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {file && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800">
                Selected file: <span className="font-medium">{file.name}</span>
              </p>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Uploading...' : 'Upload Members'}
          </button>


          {result && (
            <div className={`p-4 rounded-lg ${
              result.errors.length > 0 
                ? 'bg-red-50 border border-red-200' 
                : 'bg-green-50 border border-green-200'
            }`}>
              {result.errors.length === 0 ? (
                <div>
                  <p className="text-green-800 font-medium mb-2">
                    Successfully uploaded {result.success} members!
                  </p>
                  {result.stats && (
                    <div className="text-green-700 text-sm space-y-1">
                      <p>• Organizations created: {result.stats.organizationsCreated}</p>
                      <p>• Schools created: {result.stats.schoolsCreated}</p>
                      <p>• Members created: {result.stats.membersCreated}</p>
                      {result.stats.duplicatesSkipped && result.stats.duplicatesSkipped > 0 && (
                        <p>• Duplicates skipped: {result.stats.duplicatesSkipped}</p>
                      )}
                      {result.stats.duplicatesUpdated && result.stats.duplicatesUpdated > 0 && (
                        <p>• Duplicates updated: {result.stats.duplicatesUpdated}</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-red-800 font-medium mb-2">Upload failed:</p>
                  <ul className="text-red-700 list-disc list-inside">
                    {result.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">CSV Format Example</h3>
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">organization</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">school</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">member_name</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">submission_url</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-2 text-sm text-gray-900">Sigma Kappa Delta</td>
                <td className="px-4 py-2 text-sm text-gray-900">University of Alabama</td>
                <td className="px-4 py-2 text-sm text-gray-900">John Doe</td>
                <td className="px-4 py-2 text-sm text-gray-900">https://example.com/submit/john-doe</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-sm text-gray-900">Sigma Tau Delta</td>
                <td className="px-4 py-2 text-sm text-gray-900">University of Georgia</td>
                <td className="px-4 py-2 text-sm text-gray-900">Jane Smith</td>
                <td className="px-4 py-2 text-sm text-gray-900">https://example.com/submit/jane-smith</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
