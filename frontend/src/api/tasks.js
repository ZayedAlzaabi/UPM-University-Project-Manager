import client from './client'

export const updateTask  = (id, data) => client.patch(`/tasks/${id}`, data).then((r) => r.data)
export const deleteTask  = (id)       => client.delete(`/tasks/${id}`)
export const getComments = (id)       => client.get(`/tasks/${id}/comments`).then((r) => r.data)
export const addComment  = (id, data) => client.post(`/tasks/${id}/comments`, data).then((r) => r.data)

export const getAttachments    = (taskId) => client.get(`/tasks/${taskId}/attachments`).then((r) => r.data)
export const uploadAttachment  = (taskId, file) => {
  const formData = new FormData()
  formData.append('file', file)
  return client.post(`/tasks/${taskId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data)
}
export const deleteAttachment  = (id) => client.delete(`/attachments/${id}`)
