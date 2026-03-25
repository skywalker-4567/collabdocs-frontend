import { useState, useEffect } from 'react'
import {
  getThreads, createThread, resolveThread,
  deleteThread, addReply, deleteComment
} from '../api/documents'

export default function CommentSidebar({ docId, yourRole, selectedRange, onClearRange }) {
  const [threads, setThreads] = useState([])
  const [newComment, setNewComment] = useState('')
  const [replyText, setReplyText] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchThreads()
  }, [docId])

  const fetchThreads = async () => {
    try {
      const res = await getThreads(docId)
      setThreads(res.data)
    } catch (err) {
      console.error('Failed to load threads', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateThread = async () => {
    if (!newComment.trim()) return
    try {
      await createThread(docId, {
        startIndex: selectedRange?.start ?? 0,
        endIndex: selectedRange?.end ?? 0,
        body: newComment,
      })
      setNewComment('')
      onClearRange()
      fetchThreads()
    } catch (err) {
      console.error('Failed to create thread', err)
    }
  }

  const handleResolve = async (threadId) => {
    try {
      await resolveThread(docId, threadId)
      fetchThreads()
    } catch (err) {
      console.error('Failed to resolve thread', err)
    }
  }

  const handleDeleteThread = async (threadId) => {
    if (!confirm('Delete this thread?')) return
    try {
      await deleteThread(docId, threadId)
      fetchThreads()
    } catch (err) {
      console.error('Failed to delete thread', err)
    }
  }

  const handleReply = async (threadId) => {
    const text = replyText[threadId]
    if (!text?.trim()) return
    try {
      await addReply(docId, threadId, { body: text })
      setReplyText({ ...replyText, [threadId]: '' })
      fetchThreads()
    } catch (err) {
      console.error('Failed to add reply', err)
    }
  }

  const handleDeleteComment = async (threadId, commentId) => {
    if (!confirm('Delete this comment?')) return
    try {
      await deleteComment(docId, threadId, commentId)
      fetchThreads()
    } catch (err) {
      console.error('Failed to delete comment', err)
    }
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  const canEdit = yourRole === 'OWNER' || yourRole === 'EDITOR'

  return (
    <div className="w-72 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700">Comments</h2>
      </div>

      {/* New comment box */}
      {canEdit && (
        <div className="px-4 py-3 border-b border-gray-100">
          {selectedRange && (
            <p className="text-xs text-blue-500 mb-2">
              Selected: chars {selectedRange.start}–{selectedRange.end}
            </p>
          )}
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleCreateThread}
            className="mt-2 w-full bg-blue-600 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            Comment
          </button>
        </div>
      )}

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {loading ? (
          <p className="text-xs text-gray-400">Loading...</p>
        ) : threads.length === 0 ? (
          <p className="text-xs text-gray-400 text-center mt-8">No comments yet</p>
        ) : (
          threads.map((thread) => (
            <div key={thread.id} className="border border-gray-100 rounded-xl p-3">
              {/* Thread header */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs font-medium text-gray-700">
                    {thread.comments?.[0]?.authorName || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-400">{formatTime(thread.createdAt)}</p>
                </div>
                <div className="flex gap-2">
                  {canEdit && (
                    <button
                      onClick={() => handleResolve(thread.id)}
                      className="text-xs text-green-500 hover:text-green-700"
                      title="Resolve"
                    >
                      ✓
                    </button>
                  )}
                  {yourRole === 'OWNER' && (
                    <button
                      onClick={() => handleDeleteThread(thread.id)}
                      className="text-xs text-gray-300 hover:text-red-400"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Comments in thread */}
              <div className="space-y-2 mb-3">
                {thread.comments?.map((comment) => (
                  <div key={comment.id} className="flex justify-between items-start gap-2">
                    <div>
                      <p className="text-xs font-medium text-gray-600">{comment.authorName}</p>
                      <p className="text-sm text-gray-800">{comment.body}</p>
                    </div>
                    {yourRole === 'OWNER' && (
                      <button
                        onClick={() => handleDeleteComment(thread.id, comment.id)}
                        className="text-gray-200 hover:text-red-400 text-xs shrink-0"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Reply box */}
              {canEdit && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={replyText[thread.id] || ''}
                    onChange={(e) => setReplyText({ ...replyText, [thread.id]: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleReply(thread.id)}
                    placeholder="Reply..."
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => handleReply(thread.id)}
                    className="text-blue-500 text-xs hover:text-blue-700"
                  >
                    Send
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}