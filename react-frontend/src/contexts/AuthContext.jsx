import { createContext, useState, useContext, useEffect } from 'react'
import { login as apiLogin, register as apiRegister, getMe } from '../services/auth'
import toast from 'react-hot-toast'

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('token'))

  useEffect(() => {
    if (token) {
      loadUser()
    } else {
      setLoading(false)
    }
  }, [token])

  const loadUser = async () => {
    try {
      const userData = await getMe()
      setUser(userData)
    } catch (error) {
      console.error('Failed to load user', error)
      logout()
    } finally {
      setLoading(false)
    }
  }

  const login = async (username, password) => {
    try {
      const data = await apiLogin(username, password)
      localStorage.setItem('token', data.access_token)
      setToken(data.access_token)
      setUser(data.user)
      toast.success('Logged in successfully')
      return true
    } catch (error) {
      toast.error(error.response?.data?.error || 'Login failed')
      return false
    }
  }

  const register = async (username, email, password) => {
    try {
      await apiRegister(username, email, password)
      toast.success('Registration successful! Please log in.')
      return true
    } catch (error) {
      toast.error(error.response?.data?.error || 'Registration failed')
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    toast.success('Logged out')
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}