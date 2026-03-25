import { useState, useEffect } from 'react'
import { getHistory, previewVersion, restoreVersion } from '../api/documents'

export default function VersionHistory({ docId, yourRole, onClose, onRestore }) {
  const [operations, setOperations] = useState([])
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState(null)
  const [previewVersion_, setPreviewVersion] = useState(null)
  const [restoring, setRestoring] = useState(false)

  useEffect(() => {
    fetchHistory()
  }, [docId])

  const fetchHistory = async () => {
  try {
    const res = await getHistory(docId)
    // Handle both array and paginated response
    const data = res.data
    setOperations(Array.isArray(data) ? data : data.content || [])
  } catch (err) {
    console.error('Failed to load history', err)
  } finally {
    setLoading(false)
  }
}

  const handlePreview = async (version) => {
    try {
      const res = await previewVersion(docId, version)
      setPreview(res.data.content || '')
      setPreviewVersion(version)
    } catch (err) {
      console.error('Failed to preview version', err)
    }
  }

  const handleRestore = async () => {
    if (!confirm(`Restore document to version ${previewVersion_}?`)) return
    setRestoring(true)
    try {
      await restoreVersion(docId, previewVersion_)
      onRestore()
      onClose()
    } catch (err) {
      console.error('Failed to restore', err)
    } finally {
      setRestoring(false)
    }
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const opColor = (type) => {
    if (type === 'INSERT') return 'bg-green-100 text-green-700'
    if (type === 'DELETE') return 'bg-red-100 text-red-700'
    return 'bg-yellow-100 text-yellow-700'
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl max-h-[80vh] flex overflow-hidden">

        {/* Left — operation log */}
        <div className="w-72 border-r border-gray-200 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Version History</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="text-xs text-gray-400 p-4">Loading...</p>
            ) : operations.length === 0 ? (
              <p className="text-xs text-gray-400 p-4 text-center">No history yet</p>
            ) : (
              operations.map((op) => (
                <button
                  key={op.operationId}
                  onClick={() => handlePreview(op.serverVersion)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition ${
                    previewVersion_ === op.serverVersion ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${opColor(op.type)}`}>
                      {op.type}
                    </span>
                    <span className="text-xs text-gray-400">v{op.serverVersion}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{op.editorEmail}</p>
                  <p className="text-xs text-gray-400">{formatTime(op.timestamp)}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right — preview */}
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {previewVersion_ ? `Preview — v${previewVersion_}` : 'Select a version to preview'}
            </p>
            {yourRole === 'OWNER' && previewVersion_ && (
              <button
                onClick={handleRestore}
                disabled={restoring}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {restoring ? 'Restoring...' : 'Restore this version'}
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {preview !== null ? (
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">{preview}</pre>
            ) : (
              <p className="text-xs text-gray-400 text-center mt-20">
                Click a version on the left to preview it
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}