'use client'

import { useState, useEffect } from 'react'
import { Member, School, Organization } from '@/lib/supabase'
import MemberModal from '@/components/MemberModal'

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [membersResponse, schoolsResponse, orgsResponse] = await Promise.all([
        fetch('/api/members'),
        fetch('/api/schools'),
        fetch('/api/organizations')
      ])
      
      const membersData = await membersResponse.json()
      const schoolsData = await schoolsResponse.json()
      const orgsData = await orgsResponse.json()
      
      setMembers(membersData)
      setSchools(schoolsData)
      setOrganizations(orgsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingMember(null)
    setIsModalOpen(true)
  }

  const handleEdit = (member: Member) => {
    setEditingMember(member)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this member?')) {
      return
    }

    try {
      const response = await fetch(`/api/members/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        loadData()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting member:', error)
      alert('Error deleting member')
    }
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingMember(null)
    loadData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Members</h1>
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Member
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                School
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Organization
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Submission URL
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {members.map((member) => (
              <tr key={member.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {member.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {member.schools?.name || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {member.schools?.organizations?.name || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <a 
                    href={member.submission_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 truncate max-w-xs block"
                  >
                    {member.submission_url}
                  </a>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEdit(member)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(member.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {members.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No members found.</p>
          <p className="text-gray-400 mt-2">Click &quot;Add Member&quot; to get started.</p>
        </div>
      )}

      {isModalOpen && (
        <MemberModal
          member={editingMember}
          schools={schools}
          organizations={organizations}
          onClose={handleModalClose}
        />
      )}
    </div>
  )
}
