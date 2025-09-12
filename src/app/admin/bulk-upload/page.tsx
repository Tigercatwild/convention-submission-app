'use client'

import { useState, useEffect } from 'react'
import { School, Organization } from '@/lib/supabase'

export default function BulkUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null)
  // Removed unused state variables since API now handles org/school creation

  // No need to load data since API handles org/school creation automatically

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
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

      const response = await fetch('/api/members/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ members }),
      })

      if (response.ok) {
        const data = await response.json()
        setResult({ success: data.data.length, errors: [] })
      } else {
        const error = await response.json()
        setResult({ success: 0, errors: [error.error] })
      }
    } catch (error) {
      setResult({ 
        success: 0, 
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'] 
      })
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
