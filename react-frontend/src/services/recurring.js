import api from './api'

export const getRecurringRules = () =>
  api.get('/recurring/').then(res => res.data)

export const createRecurringRule = (data) =>
  api.post('/recurring/', data).then(res => res.data)

export const updateRecurringRule = (id, data) =>
  api.put(`/recurring/${id}`, data).then(res => res.data)

export const deleteRecurringRule = (id) =>
  api.delete(`/recurring/${id}`).then(res => res.data)

export const processRecurring = () =>
  api.post('/recurring/process').then(res => res.data)