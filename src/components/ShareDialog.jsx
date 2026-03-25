import { useState } from 'react'
import { shareDocument, revokeAccess } from '../api/documents'

export default function ShareDialog({ docId, permissions, yourRole, onClose, onUpdate }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('EDITOR')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleShare = async () => {
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      await shareDocument(docId, { email, role })
      setEmail('')
      onUpdate()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to share')
    } finally {
      setLoading(false)
    }
  }

  const handleRevoke = async (userId) => {
    if (!confirm('Revoke access for this user?')) return
    try {
      await revokeAccess(docId, userId)
      onUpdate()
    } catch {
      setError('Failed to revoke access')
    }
  }

  const roleColor = (role) => {
    if (role === 'OWNER') return 'bg-blue-100 text-blue-700'
    if (role === 'EDITOR') return 'bg-green-100 text-green-700'
    return 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-medium text-gray-800">Share Document</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Share input — only OWNER can share */}
        {yourRole === 'OWNER' && (
          <div className="mb-6">
            <div className="flex gap-2 mb-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none"
              >
                <option value="VIEWER">Viewer</option>
                <option value="EDITOR">Editor</option>
                <option value="OWNER">Owner</option>
              </select>
            </div>
            <button
              onClick={handleShare}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loading ? 'Sharing...' : 'Share'}
            </button>
            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          </div>
        )}

        {/* Permissions list */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">People with access</p>
          {permissions.map((p) => (
            <div key={p.userId} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">{p.fullName}</p>
                <p className="text-xs text-gray-400">{p.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${roleColor(p.role)}`}>
                  {p.role}
                </span>
                {yourRole === 'OWNER' && p.role !== 'OWNER' && (
                  <button
                    onClick={() => handleRevoke(p.userId)}
                    className="text-gray-300 hover:text-red-400 text-sm transition"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}