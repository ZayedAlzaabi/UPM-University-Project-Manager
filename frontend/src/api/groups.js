import client from './client'

export const getGroup      = (id)       => client.get(`/groups/${id}`).then((r) => r.data)
export const updateGroup   = (id, data) => client.patch(`/groups/${id}`, data).then((r) => r.data)
export const addMember     = (id, data) => client.post(`/groups/${id}/members`, data).then((r) => r.data)
export const getGroupTasks = (id)       => client.get(`/groups/${id}/tasks`).then((r) => r.data)
export const createTask    = (id, data) => client.post(`/groups/${id}/tasks`, data).then((r) => r.data)
