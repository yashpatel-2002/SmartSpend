import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from '../Header'
import Footer from '../Footer'
import { useState, useEffect } from 'react'
import { useTheme } from '../../contexts/ThemeContext'

export default function MainLayout() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Listen for sidebar collapse state changes
  useEffect(() => {
    const handleSidebarChange = (e) => {
      setSidebarCollapsed(e.detail.collapsed);
    };
    window.addEventListener('sidebarCollapsed', handleSidebarChange);
    return () => window.removeEventListener('sidebarCollapsed', handleSidebarChange);
  }, []);

  if (!mounted) return null

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-h-screen w-full transition-all duration-300">
        <Header />
        
        {/* Main content area with proper scrolling */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            <div className="animate-fade-in">
              <Outlet />
            </div>
          </div>
        </main>

        {/* Footer - now properly positioned at bottom with full width */}
        <Footer />
      </div>

      {/* Floating action button for quick add (mobile) */}
      <button className="lg:hidden fixed bottom-20 right-4 btn btn-primary btn-circle btn-lg shadow-2xl hover:shadow-primary/50 transition-all duration-300 z-40">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  )
}