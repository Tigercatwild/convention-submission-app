'use client'

import { useState } from 'react'
// Removed unused imports since API now handles org/school creation

export default function BulkUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null)
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null)
  // Removed unused state variables since API now handles org/school creation

  // No need to load data since API handles org/school creation automatically

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Check file size (10MB limit)
      const maxSize = 10 * 1024 * 1024 // 10MB in bytes
      if (selectedFile.size > maxSize) {
        setResult({ 
          success: 0, 
          errors: [`File size (${(selectedFile.size / 1024 / 1024).toFixed(2)}MB) exceeds the 10MB limit. Please use a smaller file or split your data.`] 
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
    setUploadProgress(null)

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

      // For large files, we'll process in chunks to avoid payload limits
      const chunkSize = 100 // Process 100 members at a time
      const chunks = []
      for (let i = 0; i < members.length; i += chunkSize) {
        chunks.push(members.slice(i, i + chunkSize))
      }

      let totalSuccess = 0
      const allErrors: string[] = []

      // Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        setUploadProgress({ current: i + 1, total: chunks.length })
        console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} members)`)
        
        const response = await fetch('/api/members/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ members: chunk }),
        })

        if (response.ok) {
          const data = await response.json()
          totalSuccess += data.data.length
        } else {
          // Try to parse JSON error, but handle cases where response might be HTML
          let errorMessage = `Chunk ${i + 1} failed`
          try {
            const error = await response.json()
            errorMessage = error.error || errorMessage
          } catch (parseError) {
            // If JSON parsing fails, try to get text content
            try {
              const errorText = await response.text()
              if (response.status === 413) {
                errorMessage = `Chunk ${i + 1}: File too large. Please use a smaller CSV file or split your data into multiple files.`
              } else {
                errorMessage = `Chunk ${i + 1}: Server error (${response.status}): ${errorText.substring(0, 200)}`
              }
            } catch (textError) {
              if (response.status === 413) {
                errorMessage = `Chunk ${i + 1}: File too large. Please use a smaller CSV file or split your data into multiple files.`
              } else {
                errorMessage = `Chunk ${i + 1}: Server error (${response.status}): Unable to read error details`
              }
            }
          }
          allErrors.push(errorMessage)
        }
      }

      // Set final result
      setResult({ 
        success: totalSuccess, 
        errors: allErrors 
      })
    } catch (error) {
      console.error('Bulk upload error:', error)
      setResult({ 
        success: 0, 
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'] 
      })
    } finally {
      setLoading(false)
      setUploadProgress(null)
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
          <strong>File size limit:</strong> 10MB maximum. For larger datasets, please split your CSV into multiple files.
        </p>
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

          {uploadProgress && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-800 font-medium">
                  Processing chunk {uploadProgress.current} of {uploadProgress.total}
                </span>
                <span className="text-blue-600 text-sm">
                  {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {result && (
            <div className={`p-4 rounded-lg ${
              result.errors.length > 0 
                ? 'bg-red-50 border border-red-200' 
                : 'bg-green-50 border border-green-200'
            }`}>
              {result.errors.length === 0 ? (
                <p className="text-green-800">
                  Successfully uploaded {result.success} members!
                </p>
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
