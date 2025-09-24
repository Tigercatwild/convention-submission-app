'use client'

import { useState, useEffect } from 'react'
import { Organization, School, Member } from '@/lib/supabase'

export default function Home() {
  const [step, setStep] = useState(1)
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const [organizationsLoading, setOrganizationsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [schoolSearchTerm, setSchoolSearchTerm] = useState('')

  // Load organizations on component mount
  useEffect(() => {
    const loadOrganizations = async () => {
      setOrganizationsLoading(true)
      try {
        const response = await fetch('/api/organizations')
        const data = await response.json()
        
        // Check if the response is an error or if data is not an array
        if (data.error) {
          console.error('API Error:', data.error)
          setOrganizations([])
        } else if (Array.isArray(data)) {
          setOrganizations(data)
        } else {
          console.error('Unexpected data format:', data)
          setOrganizations([])
        }
      } catch (error) {
        console.error('Error loading organizations:', error)
        setOrganizations([])
      } finally {
        setOrganizationsLoading(false)
      }
    }
    loadOrganizations()
  }, [])

  const handleOrgSelect = async (org: Organization) => {
    setSelectedOrg(org)
    setSchoolSearchTerm('') // Clear school search when selecting new organization
    setLoading(true)
    try {
      const response = await fetch(`/api/schools?orgId=${org.id}`)
      const data = await response.json()
      
      if (data.error) {
        console.error('API Error:', data.error)
        setSchools([])
      } else if (Array.isArray(data)) {
        setSchools(data)
      } else {
        console.error('Unexpected data format:', data)
        setSchools([])
      }
      setStep(2)
    } catch (error) {
      console.error('Error loading schools:', error)
      setSchools([])
    } finally {
      setLoading(false)
    }
  }

  const handleSchoolSelect = async (school: School) => {
    setSelectedSchool(school)
    setLoading(true)
    try {
      const response = await fetch(`/api/members?schoolId=${school.id}`)
      const data = await response.json()
      
      if (data.error) {
        console.error('API Error:', data.error)
        setMembers([])
      } else if (Array.isArray(data)) {
        setMembers(data)
      } else {
        console.error('Unexpected data format:', data)
        setMembers([])
      }
      setStep(3)
    } catch (error) {
      console.error('Error loading members:', error)
      setMembers([])
    } finally {
      setLoading(false)
    }
  }

  const handleMemberSelect = (member: Member) => {
    // If clicking the same member that's already selected, deselect it
    if (selectedMember?.id === member.id) {
      setSelectedMember(null)
    } else {
      setSelectedMember(member)
    }
  }

  const handleSubmit = () => {
    if (selectedMember?.submission_url) {
      window.location.href = selectedMember.submission_url
    }
  }

  const filteredMembers = searchTerm.trim() === '' 
    ? [] 
    : members.filter(member =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase())
      )

  const filteredSchools = schoolSearchTerm.trim() === '' 
    ? schools 
    : schools.filter(school =>
        school.name.toLowerCase().startsWith(schoolSearchTerm.toLowerCase())
      )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Membership Validation Portal for Convention Submission
            </h1>
            <p className="text-gray-600">
              Select your organization, school, and name to access your submission form
            </p>
            <div className="mt-4">
              
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            {/* Step 1: Select Organization */}
            {step === 1 && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                  Step 1: Select Your Organization
                </h2>
                {organizationsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading organizations...</p>
                  </div>
                ) : organizations.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No organizations available. Please try again later.</p>
                    <button
                      onClick={() => window.location.reload()}
                      className="mt-4 text-blue-600 hover:text-blue-800"
                    >
                      Refresh
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {organizations.map((org) => (
                      <button
                        key={org.id}
                        onClick={() => handleOrgSelect(org)}
                        className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                      >
                        <div className="font-medium text-gray-900">{org.name}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Select School */}
            {step === 2 && (
              <div>
                <div className="mb-6">
                  <button
                    onClick={() => setStep(1)}
                    className="text-blue-600 hover:text-blue-800 mb-2"
                  >
                    ← Back to Organizations
                  </button>
                  <h2 className="text-2xl font-semibold text-gray-900">
                    Step 2: Select Your School
                  </h2>
                  <p className="text-gray-600">
                    Organization: <span className="font-medium">{selectedOrg?.name}</span>
                  </p>
                </div>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading schools...</p>
                  </div>
                ) : schools.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No schools available for this organization.</p>
                  </div>
                ) : (
                  <div>
                    <div className="mb-4">
                      <input
                        type="text"
                        placeholder="Search for your school..."
                        value={schoolSearchTerm}
                        onChange={(e) => setSchoolSearchTerm(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {filteredSchools.length > 0 ? (
                        filteredSchools.map((school) => (
                          <button
                            key={school.id}
                            onClick={() => handleSchoolSelect(school)}
                            className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                          >
                            <div className="font-medium text-gray-900">{school.name}</div>
                          </button>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-500">
                            No schools found matching &quot;{schoolSearchTerm}&quot;.
                          </p>
                          <p className="text-sm text-gray-600 mt-2">
                            Try a different search term or check the spelling.
                          </p>
                        </div>
                      )}
                    </div>
                    {schools.length > 0 && (
                      <div className="mt-4 text-center">
                        <p className="text-sm text-gray-600">
                          Showing {filteredSchools.length} of {schools.length} schools
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Select Member */}
            {step === 3 && (
              <div>
                <div className="mb-6">
                  <button
                    onClick={() => setStep(2)}
                    className="text-blue-600 hover:text-blue-800 mb-2"
                  >
                    ← Back to Schools
                  </button>
                  <h2 className="text-2xl font-semibold text-gray-900">
                    Step 3: Find Your Name
                  </h2>
                  <p className="text-gray-600">
                    {selectedOrg?.name} → {selectedSchool?.name}
                  </p>
                </div>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading members...</p>
                  </div>
                ) : (
                  <div>
                    <div className="mb-4">
                      <input
                        type="text"
                        placeholder="Search for your name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {filteredMembers.length > 0 && (
                        <p className="text-sm text-gray-600 mb-3 text-center">
                          Click on your name to select it:
                        </p>
                      )}
                      {filteredMembers.map((member) => (
                        <button
                          key={member.id}
                          onClick={() => handleMemberSelect(member)}
                          className={`w-full p-3 text-left border rounded-lg transition-colors cursor-pointer ${
                            selectedMember?.id === member.id
                              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-gray-900">{member.name}</div>
                            {selectedMember?.id === member.id ? (
                              <div className="text-blue-600 font-semibold text-sm">✓ Selected (click to deselect)</div>
                            ) : (
                              <div className="text-gray-400 text-sm">Click to select</div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                    {filteredMembers.length === 0 && (
                      <div className="text-center py-8">
                        {searchTerm.trim() === '' ? (
                          <p className="text-gray-500">
                            Start typing your name to search...
                          </p>
                        ) : (
                          <div>
                            <p className="text-gray-500 mb-4">
                              No members found matching &quot;{searchTerm}&quot;.
                            </p>
                            <p className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                              If your name is not listed under your school, please contact your Advisor to confirm your WriteAway status.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    {selectedMember && (
                      <div className="mt-6 space-y-3">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <p className="text-green-800 font-medium">
                            Selected: {selectedMember.name}
                          </p>
                          <p className="text-green-600 text-sm mt-1">
                            Ready to proceed to your submission page
                          </p>
                        </div>
                        <div className="flex space-x-3">
                          <button
                            onClick={() => setSelectedMember(null)}
                            className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                          >
                            ← Change Selection
                          </button>
                          <button
                            onClick={handleSubmit}
                            className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                          >
                            Go to Submission Page →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
