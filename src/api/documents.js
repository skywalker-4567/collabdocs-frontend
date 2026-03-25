import api from './axios'

export const getDocuments = (page = 0, size = 10) =>
  api.get(`/api/documents?page=${page}&size=${size}`)

export const createDocument = (data) => api.post('/api/documents', data)

export const deleteDocument = (id) => api.delete(`/api/documents/${id}`)
export const getDocument = (id) => api.get(`/api/documents/${id}`)
export const updateDocument = (id, data) => api.put(`/api/documents/${id}`, data)
export const getPresence = (id) => api.get(`/api/documents/${id}/presence`)
export const heartbeat = (id) => api.post(`/api/documents/${id}/presence/heartbeat`)
export const leaveDocument = (id) => api.delete(`/api/documents/${id}/presence`)
export const shareDocument = (id, data) => api.post(`/api/documents/${id}/share`, data)
export const revokeAccess = (id, userId) => api.delete(`/api/documents/${id}/permissions/${userId}`)
export const getThreads = (id) => api.get(`/api/documents/${id}/threads?resolved=false`)
export const createThread = (id, data) => api.post(`/api/documents/${id}/threads`, data)
export const resolveThread = (id, threadId) => api.post(`/api/documents/${id}/threads/${threadId}/resolve`)
export const deleteThread = (id, threadId) => api.delete(`/api/documents/${id}/threads/${threadId}`)
export const addReply = (id, threadId, data) => api.post(`/api/documents/${id}/threads/${threadId}/comments`, data)
export const editComment = (id, threadId, commentId, data) => api.put(`/api/documents/${id}/threads/${threadId}/comments/${commentId}`, data)
export const deleteComment = (id, threadId, commentId) => api.delete(`/api/documents/${id}/threads/${threadId}/comments/${commentId}`)
export const getHistory = (id) => api.get(`/api/documents/${id}/history`)
export const previewVersion = (id, version) => api.get(`/api/documents/${id}/history/preview?version=${version}`)
export const restoreVersion = (id, version) => api.post(`/api/documents/${id}/history/restore?version=${version}`)
export const searchDocuments = (q) => api.get(`/api/search?q=${encodeURIComponent(q)}`)