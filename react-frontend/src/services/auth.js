import api from './api'

export const login = (username, password) =>
  api.post('/auth/login', { username, password }).then(res => res.data)

export const register = (username, email, password) =>
  api.post('/auth/register', { username, email, password }).then(res => res.data)

export const getMe = () =>
  api.get('/auth/me').then(res => res.data)