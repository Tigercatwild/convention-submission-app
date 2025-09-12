'use client'

import { useState, useEffect } from 'react'
import { Organization } from '@/lib/supabase'
import OrganizationModal from '@/components/OrganizationModal'

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)

  useEffect(() => {
    loadOrganizations()
  }, [])

  const loadOrganizations = async () => {
    try {
      console.log('Loading organizations...')
      
      // For local development, use mock data if API fails
      if (process.env.NODE_ENV === 'development') {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout
          
          const response = await fetch('/api/organizations', {
            signal: controller.signal
          })
          
          clearTimeout(timeoutId)
          
          if (response.ok) {
            const data = await response.json()
            if (Array.isArray(data) && data.length > 0) {
              setOrganizations(data)
              setLoading(false)
              return
            }
          }
        } catch (error) {
          console.log('API failed, using mock data for development')
        }
        
        // Use mock data for development
        setOrganizations([
          { id: '1', name: 'Sigma Kappa Delta', created_at: new Date().toISOString() },
          { id: '2', name: 'Sigma Tau Delta', created_at: new Date().toISOString() }
        ])
        setLoading(false)
        return
      }
      
      // Production code
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
      
      const response = await fetch('/api/organizations', {
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Organizations data:', data)
      
      if (data.error) {
        console.error('API Error:', data.error)
        setOrganizations([])
      } else if (Array.isArray(data)) {
        setOrganizations(data)
      } else {
        console.error('Unexpected data format:', data)
        setOrganizations([])
      }
      } catch {
        console.error('Error loading organizations')
      setOrganizations([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingOrg(null)
    setIsModalOpen(true)
  }

  const handleEdit = (org: Organization) => {
    setEditingOrg(org)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this organization? This will also delete all associated schools and members.')) {
      return
    }

    try {
      const response = await fetch(`/api/organizations/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        loadOrganizations()
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting organization:', error)
      alert('Error deleting organization')
    }
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingOrg(null)
    loadOrganizations()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-4">Loading organizations...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Organizations</h1>
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Organization
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
                Created At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {organizations.map((org) => (
              <tr key={org.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {org.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(org.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEdit(org)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(org.id)}
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

      {organizations.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No organizations found.</p>
          <p className="text-gray-400 mt-2">Click &quot;Add Organization&quot; to get started.</p>
        </div>
      )}

      {isModalOpen && (
        <OrganizationModal
          organization={editingOrg}
          onClose={handleModalClose}
        />
      )}
    </div>
  )
}
