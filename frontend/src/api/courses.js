import client from './client'

export const getCourses      = ()         => client.get('/courses').then((r) => r.data)
export const createCourse    = (data)     => client.post('/courses', data).then((r) => r.data)
export const getCourse       = (id)       => client.get(`/courses/${id}`).then((r) => r.data)
export const getCourseGroups = (id)       => client.get(`/courses/${id}/groups`).then((r) => r.data)
export const createGroup     = (id, data) => client.post(`/courses/${id}/groups`, data).then((r) => r.data)
