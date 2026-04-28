import { createContext, useContext, useState, useEffect } from 'react'
import { getNotifications, markAsRead, markAllAsRead } from '../services/notifications'
import { useAuth } from './AuthContext'

const NotificationContext = createContext()

export const useNotifications = () => useContext(NotificationContext)

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications()
    }
  }, [isAuthenticated])

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications()
      setNotifications(data)
      setUnreadCount(data.filter(n => !n.read).length)
    } catch (error) {
      console.error('Failed to fetch notifications', error)
    }
  }

  const markNotificationRead = async (id) => {
    await markAsRead(id)
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllRead = async () => {
    await markAllAsRead()
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      refresh: fetchNotifications,
      markAsRead: markNotificationRead,
      markAllAsRead: markAllRead
    }}>
      {children}
    </NotificationContext.Provider>
  )
}