import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDocuments, createDocument, deleteDocument } from '../api/documents'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const res = await getDocuments()
      // Spring returns paginated response — actual list is in res.data.content
      setDocuments(res.data.content || res.data)
    } catch (err) {
      setError('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      const res = await createDocument({ title: newTitle })
      setShowModal(false)
      setNewTitle('')
      navigate(`/documents/${res.data.id}`)
    } catch (err) {
      setError('Failed to create document')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation() // prevent navigating to doc when clicking delete
    if (!confirm('Delete this document?')) return
    try {
      await deleteDocument(id)
      setDocuments(documents.filter((d) => d.id !== id))
    } catch {
      setError('Failed to delete document')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    })
  }

  const roleColor = (role) => {
    if (role === 'OWNER') return 'bg-blue-100 text-blue-700'
    if (role === 'EDITOR') return 'bg-green-100 text-green-700'
    return 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">CollabDocs</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user?.fullName}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-red-500 transition"
          >
            Logout
          </button>
          <button
  onClick={() => navigate('/search')}
  className="text-sm text-gray-500 hover:text-gray-700 transition"
>
  Search
</button>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-gray-700">My Documents</h2>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            + New Document
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : documents.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">No documents yet</p>
            <p className="text-sm mt-1">Create one to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => navigate(`/documents/${doc.id}`)}
                className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between hover:shadow-sm cursor-pointer transition"
              >
                <div>
                  <p className="font-medium text-gray-800">{doc.title}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Updated {formatDate(doc.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${roleColor(doc.yourRole)}`}>
                    {doc.yourRole}
                  </span>
                  {doc.yourRole === 'OWNER' && (
                    <button
                      onClick={(e) => handleDelete(e, doc.id)}
                      className="text-gray-300 hover:text-red-400 text-sm transition"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Document Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-medium text-gray-800 mb-4">New Document</h3>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Document title"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowModal(false); setNewTitle('') }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}