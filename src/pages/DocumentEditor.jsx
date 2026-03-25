import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { getDocument, heartbeat, leaveDocument } from '../api/documents'
import { useAuth } from '../context/AuthContext'
import ShareDialog from '../components/ShareDialog'
import CommentSidebar from '../components/CommentSidebar'
import VersionHistory from '../components/VersionHistory'
import { updateDocument } from '../api/documents'
export default function DocumentEditor() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [doc, setDoc] = useState(null)
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeUsers, setActiveUsers] = useState([])
  const [connected, setConnected] = useState(false)
  const [saving, setSaving] = useState(false)

  // Refs persist across renders without causing re-renders
  const stompClient = useRef(null)
  const clientVersion = useRef(0)
  const pendingEdit = useRef(null)
  const heartbeatInterval = useRef(null)
  const isRemoteEdit = useRef(false)

  const [showShare, setShowShare] = useState(false)

  const [showComments, setShowComments] = useState(false)
const [selectedRange, setSelectedRange] = useState(null)

  const saveTimeout = useRef(null)

const [showHistory, setShowHistory] = useState(false)
  // Load document on mount
  useEffect(() => {
    fetchDocument()
    return () => cleanup()
  }, [id])

  const fetchDocument = async () => {
    try {
      const res = await getDocument(id)
      setDoc(res.data)
      setContent(res.data.content || '')
      setTitle(res.data.title || '')
      clientVersion.current = res.data.version || 0
      setLoading(false)
      connectWebSocket()
    } catch (err) {
      navigate('/dashboard')
    }
  }

  const refreshDoc = async () => {
  const res = await getDocument(id)
  setDoc(res.data)
}

  const connectWebSocket = () => {
    const token = localStorage.getItem('token')

    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      connectHeaders: { Authorization: `Bearer ${token}` },
      onConnect: () => {
        setConnected(true)

        // Subscribe to accepted edits from all users
        client.subscribe(`/topic/document/${id}/edits`, (msg) => {
          const edit = JSON.parse(msg.body)
          applyRemoteEdit(edit)
        })

        // Subscribe to presence updates
        client.subscribe(`/topic/document/${id}/presence`, (msg) => {
          const data = JSON.parse(msg.body)
          setActiveUsers(data.activeUsers || [])
        })

        // Subscribe to error responses (stale version rejection)
        client.subscribe(`/user/queue/errors`, (msg) => {
          const error = JSON.parse(msg.body)
          if (error.documentId == id) {
            handleRejection(error)
          }
        })

        // Subscribe to sync responses
        client.subscribe(`/user/queue/sync`, (msg) => {
          const data = JSON.parse(msg.body)
          if (data.documentId == id) {
            isRemoteEdit.current = true
            setContent(data.content || '')
            clientVersion.current = data.version
            isRemoteEdit.current = false
            // Retry pending edit after sync
            if (pendingEdit.current) {
              sendEdit(pendingEdit.current)
              pendingEdit.current = null
            }
          }
        })

        startHeartbeat()
      },
      onDisconnect: () => setConnected(false),
    })

    client.activate()
    stompClient.current = client
  }

  const applyRemoteEdit = (edit) => {
    // Don't apply our own edits (server echoes to everyone including sender)
    if (edit.editorEmail === user.email) {
      clientVersion.current = edit.serverVersion
      return
    }

    isRemoteEdit.current = true
    setContent((prev) => {
      let result = prev
      if (edit.type === 'INSERT') {
        result = prev.slice(0, edit.position) + edit.content + prev.slice(edit.position)
      } else if (edit.type === 'DELETE') {
        result = prev.slice(0, edit.position) + prev.slice(edit.position + edit.length)
      } else if (edit.type === 'REPLACE') {
        result = prev.slice(0, edit.position) + edit.content + prev.slice(edit.position + edit.length)
      }
      return result
    })
    clientVersion.current = edit.serverVersion
    isRemoteEdit.current = false
  }

  const handleRejection = (error) => {
    // Server rejected our edit — request full sync then retry
    if (stompClient.current?.connected) {
      stompClient.current.publish({
        destination: `/app/document/${id}/sync`,
        body: JSON.stringify({}),
      })
    }
  }

  const sendEdit = useCallback((editPayload) => {
    if (!stompClient.current?.connected) return
    stompClient.current.publish({
      destination: `/app/document/${id}/edit`,
      body: JSON.stringify({ ...editPayload, clientVersion: clientVersion.current }),
    })
  }, [id])

  // Detect what changed in the textarea and send appropriate operation
  const handleContentChange = (e) => {
    if (isRemoteEdit.current) return
    const newContent = e.target.value
    const oldContent = content

    // Simple diff — find where the change happened
    let position = 0
    while (position < oldContent.length && position < newContent.length &&
           oldContent[position] === newContent[position]) {
      position++
    }
    const autoSave = (newContent) => {
  if (saveTimeout.current) clearTimeout(saveTimeout.current)
  saveTimeout.current = setTimeout(async () => {
    try {
      setSaving(true)
      await updateDocument(id, { content: newContent })
    } catch (err) {
      console.error('Autosave failed', err)
    } finally {
      setSaving(false)
    }
  }, 1500) // save 1.5 seconds after user stops typing
}

    const oldRemaining = oldContent.slice(position)
    const newRemaining = newContent.slice(position)

    let edit
    if (newContent.length > oldContent.length && oldRemaining === newRemaining.slice(newContent.length - oldContent.length)) {
      // Pure insertion
      edit = {
        type: 'INSERT',
        position,
        content: newContent.slice(position, position + (newContent.length - oldContent.length)),
        length: 0,
      }
    } else if (newContent.length < oldContent.length && newRemaining === oldRemaining.slice(oldContent.length - newContent.length)) {
      // Pure deletion
      edit = {
        type: 'DELETE',
        position,
        content: '',
        length: oldContent.length - newContent.length,
      }
    } else {
      // Replace
      edit = {
        type: 'REPLACE',
        position,
        content: newRemaining,
        length: oldRemaining.length,
      }
    }

    setContent(newContent)
    autoSave(newContent)  // add this line
    pendingEdit.current = edit
    sendEdit(edit)
  }

  const startHeartbeat = () => {
    heartbeat(id)
    heartbeatInterval.current = setInterval(() => heartbeat(id), 3000)
  }
  

  const cleanup = () => {
    if (heartbeatInterval.current) clearInterval(heartbeatInterval.current)
    leaveDocument(id)
    if (stompClient.current) stompClient.current.deactivate()
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const avatarColors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500',
    'bg-orange-500', 'bg-pink-500', 'bg-teal-500'
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading document...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-400 hover:text-gray-600 text-sm transition"
          >
            ← Back
          </button>
          <h1 className="text-base font-medium text-gray-800">{title}</h1>
          <span className="text-xs text-gray-400">v{clientVersion.current}</span>
        </div>

        <div className="flex items-center gap-3">
  {/* Presence avatars */}
  <div className="flex -space-x-2">
    {activeUsers.map((u, i) => (
      <div
        key={u.userId}
        title={u.fullName}
        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white ${avatarColors[i % avatarColors.length]}`}
      >
        {getInitials(u.fullName)}
      </div>
    ))}
  </div>

  {/* Share button */}
  <button
    onClick={() => setShowShare(true)}
    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
  >
    Share
  </button>
  <button
  onClick={() => setShowComments(!showComments)}
  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
    showComments
      ? 'bg-gray-100 text-gray-700'
      : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
  }`}
>
  Comments
</button>
<button
  onClick={() => setShowHistory(true)}
  className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
>
  History
</button>

  {/* Connection status */}
  <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-300'}`}
       title={connected ? 'Connected' : 'Disconnected'} />
</div>
      </div>

      {/* Editor + Sidebar */}
<div className="flex-1 flex overflow-hidden">
  <div className="flex-1 flex justify-center px-6 py-10">
    <div className="w-full max-w-3xl bg-white border border-gray-200 rounded-xl shadow-sm">
      <textarea
        value={content}
        onChange={handleContentChange}
        onSelect={(e) => {
          const start = e.target.selectionStart
          const end = e.target.selectionEnd
          if (start !== end) setSelectedRange({ start, end })
          else setSelectedRange(null)
        }}
        disabled={doc?.yourRole === 'VIEWER'}
        placeholder={doc?.yourRole === 'VIEWER' ? 'You have view-only access.' : 'Start typing...'}
        className="w-full h-full min-h-[70vh] p-8 text-gray-800 text-base leading-relaxed resize-none focus:outline-none rounded-xl font-mono"
      />
    </div>
  </div>

  {showHistory && (
  <VersionHistory
    docId={id}
    yourRole={doc?.yourRole}
    onClose={() => setShowHistory(false)}
    onRestore={fetchDocument}
  />
)}
</div>
</div>
  )}