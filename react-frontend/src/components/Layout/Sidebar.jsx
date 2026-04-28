import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useState, useEffect } from 'react'
import { 
  HiOutlineHome, 
  HiOutlineChartPie, 
  HiOutlineCash, 
  HiOutlineTag, 
  HiOutlineUser, 
  HiOutlineRefresh, 
  HiOutlineUpload, 
  HiOutlineStar,
  HiOutlineCreditCard,
  HiOutlineBell, 
  HiOutlineQuestionMarkCircle,
  HiOutlineCog,
  HiOutlineLogout,
  HiOutlineMenu,
  HiOutlineX,
  HiOutlineSparkles,
  HiOutlineTrendingUp,
  HiOutlineLightBulb,
  HiOutlineChartSquareBar,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineMail
} from 'react-icons/hi'

const navigation = [
  { name: 'Dashboard', to: '/dashboard', icon: HiOutlineHome, color: 'from-blue-500 to-cyan-500' },
  { name: 'Expenses', to: '/expenses', icon: HiOutlineCash, color: 'from-blue-500 to-cyan-500' },
  { name: 'Reports', to: '/reports', icon: HiOutlineChartPie, color: 'from-purple-500 to-pink-500' },
  { name: 'Budget', to: '/budget', icon: HiOutlineCash, color: 'from-green-500 to-emerald-500' },
  { name: 'Categories', to: '/categories', icon: HiOutlineTag, color: 'from-yellow-500 to-orange-500' },
  { name: 'Recurring', to: '/recurring', icon: HiOutlineRefresh, color: 'from-indigo-500 to-purple-500' },
  { name: 'Import/Export', to: '/import-export', icon: HiOutlineUpload, color: 'from-cyan-500 to-blue-500' },
  { name: 'Goals', to: '/goals', icon: HiOutlineStar, color: 'from-pink-500 to-rose-500' },
  { name: 'Debts', to: '/debts', icon: HiOutlineCreditCard, color: 'from-orange-500 to-red-500' },
  { name: 'AI Insights', to: '/insights', icon: HiOutlineLightBulb, color: 'from-teal-500 to-cyan-500' },
  { name: 'Advanced Analytics', to: '/advanced-analytics', icon: HiOutlineChartSquareBar, color: 'from-purple-500 to-indigo-500' },
  { name: 'Forecast', to: '/forecast', icon: HiOutlineTrendingUp, color: 'from-blue-500 to-purple-500' },
  { name: 'Notifications', to: '/notifications', icon: HiOutlineBell, color: 'from-red-500 to-pink-500' },
  { name: 'Profile', to: '/profile', icon: HiOutlineUser, color: 'from-violet-500 to-purple-500' },
  { name: 'Settings', to: '/settings', icon: HiOutlineCog, color: 'from-gray-500 to-slate-500' },
  { name: 'Help', to: '/help', icon: HiOutlineQuestionMarkCircle, color: 'from-blue-500 to-indigo-500' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const { theme } = useTheme()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location])

  // Dispatch event when collapse state changes
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('sidebarCollapsed', { detail: { collapsed: isCollapsed } }));
  }, [isCollapsed]);

  if (!mounted) return null

  // Get user initials for avatar
  const getUserInitials = () => {
    if (user?.username) {
      return user.username.charAt(0).toUpperCase()
    }
    return 'U'
  }

  return (
    <>
      {/* Mobile menu button - always visible on mobile */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 btn btn-circle btn-primary shadow-lg hover:shadow-primary/50 transition-all duration-300"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <HiOutlineX className="text-xl" /> : <HiOutlineMenu className="text-xl" />}
      </button>

      {/* Desktop collapse toggle - only visible on desktop when sidebar is expanded */}
      {!isMobileMenuOpen && !isCollapsed && (
        <button
          onClick={() => setIsCollapsed(true)}
          className="hidden lg:flex fixed left-[280px] top-20 z-50 w-6 h-6 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Collapse sidebar"
        >
          <HiOutlineChevronLeft className="text-sm text-gray-600 dark:text-gray-400" />
        </button>
      )}

      {/* Desktop expand button - only visible when sidebar is collapsed */}
      {!isMobileMenuOpen && isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          className="hidden lg:flex fixed left-20 top-20 z-50 w-6 h-6 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Expand sidebar"
        >
          <HiOutlineChevronRight className="text-sm text-gray-600 dark:text-gray-400" />
        </button>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 z-40 h-screen
        transform transition-all duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-20' : 'lg:w-72'} /* Changed from 80 to 72 (288px) */
        bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl
        border-r border-gray-200/50 dark:border-gray-700/50
        shadow-2xl lg:shadow-xl
        flex flex-col
      `}>
        {/* Logo and brand - sticky at top */}
        <div className={`
          sticky top-0 z-10 bg-inherit backdrop-blur-xl
          border-b border-gray-200/50 dark:border-gray-700/50
          transition-all duration-300
          ${isCollapsed ? 'px-3 py-4' : 'px-5 py-5'} /* Reduced padding */
        `}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
              <HiOutlineSparkles className="text-white text-lg" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <h1 className="text-base font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent truncate">
                  FinanceFlow
                </h1>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">Personal Expense Tracker</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation - scrollable area */}
        <nav className={`
          flex-1 overflow-y-auto overflow-x-hidden
          scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600
          hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500
          transition-all duration-300
          ${isCollapsed ? 'px-2 py-3' : 'px-2.5 py-3'}
        `}>
          <div className="space-y-0.5">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.to
              
              return (
                <NavLink
                  key={item.name}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) => `
                    group relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg
                    transition-all duration-200
                    ${isCollapsed ? 'justify-center' : ''}
                    ${isActive 
                      ? 'text-white' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                    }
                  `}
                >
                  {isActive && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${item.color} opacity-90 rounded-lg`} />
                  )}
                  <Icon className={`
                    relative z-10 text-lg flex-shrink-0
                    ${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'}
                    transition-colors
                  `} />
                  {!isCollapsed && (
                    <>
                      <span className={`relative z-10 font-medium truncate text-sm ${isActive ? 'text-white' : ''}`}>
                        {item.name}
                      </span>
                      {isActive && (
                        <div className="absolute right-2 w-1 h-5 bg-white rounded-full" />
                      )}
                    </>
                  )}
                  {isCollapsed && isActive && (
                    <div className="absolute right-0 w-1 h-5 bg-white rounded-full" />
                  )}
                  
                  {/* Tooltip for collapsed mode */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                      {item.name}
                    </div>
                  )}
                </NavLink>
              )
            })}
          </div>
        </nav>

        {/* User info and logout - sticky at bottom */}
        <div className={`
          sticky bottom-0 bg-inherit backdrop-blur-xl
          border-t border-gray-200/50 dark:border-gray-700/50
          transition-all duration-300
          ${isCollapsed ? 'p-2' : 'p-3'}
        `}>
          {/* Collapsed user avatar */}
          {isCollapsed ? (
            <div className="flex justify-center mb-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-md">
                {getUserInitials()}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 mb-2 px-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-md flex-shrink-0">
                {getUserInitials()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-gray-900 dark:text-white">
                  {user?.username || 'User'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                  <HiOutlineMail className="text-xs flex-shrink-0" />
                  <span className="truncate">{user?.email || 'user@example.com'}</span>
                </p>
              </div>
            </div>
          )}

          {/* Logout button */}
          <button
            onClick={logout}
            className={`
              w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg
              text-red-600/70 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20
              transition-all duration-200 group
              ${isCollapsed ? 'justify-center' : ''}
            `}
          >
            <HiOutlineLogout className="text-lg flex-shrink-0 group-hover:rotate-180 transition-transform duration-300" />
            {!isCollapsed && <span className="font-medium text-sm">Logout</span>}
          </button>

          {/* Version info - only show when expanded */}
          {!isCollapsed && (
            <div className="mt-2 text-center">
              <p className="text-[10px] text-gray-400 dark:text-gray-500">v3.0.0 with AI</p>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}