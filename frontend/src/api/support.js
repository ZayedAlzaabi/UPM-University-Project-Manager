import client from './client'

export const createSupportRequest  = (taskId, data)      => client.post(`/tasks/${taskId}/support-requests`, data).then((r) => r.data)
export const getSupportRequests    = (taskId)             => client.get(`/tasks/${taskId}/support-requests`).then((r) => r.data)
export const replySupportRequest   = (requestId, data)    => client.post(`/support-requests/${requestId}/reply`, data).then((r) => r.data)
export const resolveRequest        = (requestId)          => client.patch(`/support-requests/${requestId}`, { status: 'RESOLVED' }).then((r) => r.data)
export const getNotifications      = ()                   => client.get('/notifications').then((r) => r.data)
