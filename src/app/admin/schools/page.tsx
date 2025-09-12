'use client'

import { useState, useEffect } from 'react'
import { School, Organization } from '@/lib/supabase'
import SchoolModal from '@/components/SchoolModal'

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSchool, setEditingSchool] = useState<School | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // For local development, use mock data if API fails
      if (process.env.NODE_ENV === 'development') {
        try {
          const [schoolsResponse, orgsResponse] = await Promise.all([
            fetch('/api/schools'),
            fetch('/api/organizations')
          ])
          
          const schoolsData = await schoolsResponse.json()
          const orgsData = await orgsResponse.json()
          
          if (Array.isArray(schoolsData) && schoolsData.length > 0 && Array.isArray(orgsData) && orgsData.length > 0) {
            setSchools(schoolsData)
            setOrganizations(orgsData)
            setLoading(false)
            return
          }
        } catch (error) {
          console.log('API failed, using mock data for development')
        }
        
        // Use mock data for development
        setOrganizations([
          { id: '1', name: 'Sigma Kappa Delta', created_at: new Date().toISOString() },
          { id: '2', name: 'Sigma Tau Delta', created_at: new Date().toISOString() }
        ])
        setSchools([
          { id: '1', name: 'University of Alabama', organization_id: '1', created_at: new Date().toISOString() },
          { id: '2', name: 'Auburn University', organization_id: '1', created_at: new Date().toISOString() },
          { id: '3', name: 'University of Georgia', organization_id: '2', created_at: new Date().toISOString() },
          { id: '4', name: 'Georgia Tech', organization_id: '2', created_at: new Date().toISOString() }
        ])
        setLoading(false)
        return
      }
      
      // Production code
      const [schoolsResponse, orgsResponse] = await Promise.all([
        fetch('/api/schools'),
        fetch('/api/organizations')
      ])
      
      const schoolsData = await schoolsResponse.json()
      const orgsData = await orgsResponse.json()
      
      setSchools(schoolsData)
      setOrganizations(orgsData)
      } catch {
        console.error('Error loading data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingSchool(null)
    setIsModalOpen(true)
  }

  const handleEdit = (school: School) => {
    setEditingSchool(school)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this school? This will also delete all associated members.')) {
      return
    }

    try {
      const response = await fetch(`/api/schools/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        loadData()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting school:', error)
      alert('Error deleting school')
    }
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingSchool(null)
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
        <h1 className="text-3xl font-bold text-gray-900">Schools</h1>
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add School
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
                Organization
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {schools.map((school) => (
              <tr key={school.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {school.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {school.organizations?.name || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(school.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEdit(school)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(school.id)}
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

      {schools.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No schools found.</p>
          <p className="text-gray-400 mt-2">Click &quot;Add School&quot; to get started.</p>
        </div>
      )}

      {isModalOpen && (
        <SchoolModal
          school={editingSchool}
          organizations={organizations}
          onClose={handleModalClose}
        />
      )}
    </div>
  )
}
