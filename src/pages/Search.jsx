import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchDocuments } from '../api/documents'
import { useAuth } from '../context/AuthContext'

export default function Search() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setSearched(false)
    try {
      const res = await searchDocuments(query)
      setResults(res.data)
    } catch (err) {
      console.error('Search failed', err)
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const roleColor = (role) => {
    if (role === 'OWNER') return 'bg-blue-100 text-blue-700'
    if (role === 'EDITOR') return 'bg-green-100 text-green-700'
    return 'bg-gray-100 text-gray-600'
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">CollabDocs</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-gray-500 hover:text-gray-700 transition"
          >
            Dashboard
          </button>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-red-500 transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h2 className="text-lg font-medium text-gray-700 mb-6">Search Documents</h2>

        <div className="flex gap-3 mb-8">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by title or content..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {searched && results.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-10">No documents found for "{query}"</p>
        )}

        <div className="space-y-3">
          {results.map((doc) => (
            <div
              key={doc.id}
              onClick={() => navigate(`/documents/${doc.id}`)}
              className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between hover:shadow-sm cursor-pointer transition"
            >
              <div>
                <p className="font-medium text-gray-800">{doc.title}</p>
                <p className="text-xs text-gray-400 mt-1">Updated {formatDate(doc.updatedAt)}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${roleColor(doc.yourRole)}`}>
                {doc.yourRole}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}