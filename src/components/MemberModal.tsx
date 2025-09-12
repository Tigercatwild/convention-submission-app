'use client'

import { useState, useEffect } from 'react'
import { Member, School, Organization } from '@/lib/supabase'

interface MemberModalProps {
  member: Member | null
  schools: School[]
  organizations: Organization[]
  onClose: () => void
}

export default function MemberModal({ member, schools, organizations, onClose }: MemberModalProps) {
  const [name, setName] = useState('')
  const [schoolId, setSchoolId] = useState('')
  const [organizationId, setOrganizationId] = useState('')
  const [submissionUrl, setSubmissionUrl] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (member) {
      setName(member.name)
      setSchoolId(member.school_id)
      setOrganizationId(member.organization_id)
      setSubmissionUrl(member.submission_url)
    }
  }, [member])

  const handleSchoolChange = (newSchoolId: string) => {
    setSchoolId(newSchoolId)
    const selectedSchool = schools.find(s => s.id === newSchoolId)
    if (selectedSchool) {
      setOrganizationId(selectedSchool.organization_id)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = member 
        ? `/api/members/${member.id}`
        : '/api/members'
      
      const method = member ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name, 
          school_id: schoolId, 
          organization_id: organizationId, 
          submission_url: submissionUrl 
        }),
      })

      if (response.ok) {
        onClose()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving member:', error)
      alert('Error saving member')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {member ? 'Edit Member' : 'Add Member'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Member Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter member name"
            />
          </div>

          <div>
            <label htmlFor="school" className="block text-sm font-medium text-gray-700 mb-2">
              School
            </label>
            <select
              id="school"
              value={schoolId}
              onChange={(e) => handleSchoolChange(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a school</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-2">
              Organization
            </label>
            <select
              id="organization"
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select an organization</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="submissionUrl" className="block text-sm font-medium text-gray-700 mb-2">
              Submission URL
            </label>
            <input
              id="submissionUrl"
              type="url"
              value={submissionUrl}
              onChange={(e) => setSubmissionUrl(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/submit"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving...' : (member ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
