import { useNotifications } from '../contexts/NotificationContext'
import { useAuth } from '../contexts/AuthContext'
import { 
  HiOutlineSun, 
  HiOutlineBell, 
  HiOutlineMenu, 
  HiOutlineSearch, 
  HiOutlineUser,
  HiOutlineLogout,
  HiOutlineCog,
  HiOutlineChevronDown,
  HiOutlineX,
  HiOutlineSparkles
} from 'react-icons/hi'
import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { getExpenses } from '../services/expenses'

export default function Header({ toggleSidebar }) {
  const { unreadCount } = useNotifications()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const [searchSuggestions, setSearchSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [recentSearches, setRecentSearches] = useState([])
  const profileMenuRef = useRef(null)
  const searchInputRef = useRef(null)
  const suggestionsRef = useRef(null)

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches')
    if (saved) {
      setRecentSearches(JSON.parse(saved).slice(0, 5))
    }
  }, [])

  // Handle click outside profile menu and suggestions
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false)
      }
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) && 
          searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search input when expanded on mobile
  useEffect(() => {
    if (showMobileSearch && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [showMobileSearch])

  // Fetch search suggestions as user types
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchSuggestions([])
        return
      }

      try {
        const response = await getExpenses({ 
          search: searchQuery,
          per_page: 5
        })
        setSearchSuggestions(response.items || [])
        setShowSuggestions(true)
      } catch (error) {
        console.error('Error fetching suggestions:', error)
      }
    }

    const debounceTimer = setTimeout(fetchSuggestions, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchQuery])

  const saveRecentSearch = (query) => {
    if (!query.trim()) return
    
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem('recentSearches', JSON.stringify(updated))
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery)
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`)
      setShowMobileSearch(false)
      setShowSuggestions(false)
      setSearchQuery('')
    }
  }

  const handleSuggestionClick = (expense) => {
    navigate(`/expenses?id=${expense.id}`)
    setShowSuggestions(false)
    setSearchQuery('')
    setShowMobileSearch(false)
  }

  const handleRecentSearchClick = (query) => {
    setSearchQuery(query)
    navigate(`/search?q=${encodeURIComponent(query)}`)
    setShowSuggestions(false)
    setShowMobileSearch(false)
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem('recentSearches')
  }

  const handleLogout = () => {
    logout()
    setShowProfileMenu(false)
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left section - Mobile menu toggle */}
          <div className="flex items-center lg:hidden">
            <button 
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
            >
              <HiOutlineMenu className="text-xl text-gray-600" />
            </button>
          </div>

          {/* Logo/Brand - Centered on mobile, left on desktop */}
          <div className="flex-1 lg:flex-none flex justify-center lg:justify-start">
            <Link to="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-md group-hover:shadow-lg transition-all group-hover:scale-110">
                <HiOutlineSparkles className="text-white text-lg" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hidden sm:block">
                FinanceFlow
              </span>
            </Link>
          </div>

          {/* Search bar - Desktop */}
          <div className="hidden lg:flex flex-1 max-w-xl mx-8">
            <div className="relative w-full">
              <form onSubmit={handleSearch} className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search expenses by description, category, or amount..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  className="w-full h-10 pl-10 pr-12 bg-gray-100 border-2 border-transparent rounded-xl focus:border-blue-500 focus:bg-white transition-all text-sm"
                />
                <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                {searchQuery && (
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    Search
                  </button>
                )}
              </form>

              {/* Search Suggestions Dropdown */}
              {showSuggestions && (searchSuggestions.length > 0 || recentSearches.length > 0) && (
                <div 
                  ref={suggestionsRef}
                  className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50"
                >
                  {/* Recent Searches */}
                  {recentSearches.length > 0 && (
                    <div className="p-2">
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-xs font-medium text-gray-500">Recent Searches</span>
                        <button
                          onClick={clearRecentSearches}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          Clear
                        </button>
                      </div>
                      {recentSearches.map((query, index) => (
                        <button
                          key={index}
                          onClick={() => handleRecentSearchClick(query)}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors text-left"
                        >
                          <HiOutlineSearch className="text-gray-400 text-sm" />
                          <span className="text-sm text-gray-700">{query}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Search Results */}
                  {searchSuggestions.length > 0 && (
                    <div className="p-2 border-t border-gray-200">
                      <div className="px-3 py-2">
                        <span className="text-xs font-medium text-gray-500">Matching Expenses</span>
                      </div>
                      {searchSuggestions.map((expense) => (
                        <button
                          key={expense.id}
                          onClick={() => handleSuggestionClick(expense)}
                          className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors text-left"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {expense.description || 'Untitled Expense'}
                              </span>
                              <span className="text-xs text-gray-500">
                                ${expense.amount?.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-500">
                                {expense.category_name}
                              </span>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-500">
                                {new Date(expense.date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* View All Results */}
                  {searchQuery.trim().length >= 2 && (
                    <div className="p-2 border-t border-gray-200">
                      <button
                        onClick={handleSearch}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <HiOutlineSearch className="text-lg" />
                        View all results for "{searchQuery}"
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right section - Icons and Profile */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Mobile search toggle */}
            <button
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Search"
            >
              <HiOutlineSearch className="text-xl text-gray-600" />
            </button>

            {/* Notifications */}
            <Link
              to="/notifications"
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative group"
              aria-label="Notifications"
            >
              <HiOutlineBell className="text-xl text-gray-600 group-hover:scale-110 transition-transform" />
              {unreadCount > 0 && (
                <>
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs flex items-center justify-center rounded-full">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full animate-ping opacity-75" />
                </>
              )}
            </Link>

            {/* Profile dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors group"
                aria-label="Profile menu"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-md group-hover:scale-110 transition-transform">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="hidden md:block text-sm font-medium text-gray-700">
                  {user?.username || 'User'}
                </span>
                <HiOutlineChevronDown className={`hidden md:block text-gray-500 text-sm transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown menu */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-scale-in origin-top-right">
                  <div className="p-4 border-b border-gray-200">
                    <p className="font-semibold text-gray-900">{user?.username}</p>
                    <p className="text-sm text-gray-500 truncate mt-0.5">{user?.email}</p>
                  </div>
                  
                  <div className="p-2">
                    <Link
                      to="/profile"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-gray-100 transition-colors group"
                    >
                      <HiOutlineUser className="text-lg text-gray-500 group-hover:text-blue-600 transition-colors" />
                      <span className="text-sm text-gray-700">Profile</span>
                    </Link>
                    
                    <Link
                      to="/settings"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-gray-100 transition-colors group"
                    >
                      <HiOutlineCog className="text-lg text-gray-500 group-hover:text-blue-600 transition-colors" />
                      <span className="text-sm text-gray-700">Settings</span>
                    </Link>
                  </div>
                  
                  <div className="p-2 border-t border-gray-200">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-red-50 w-full transition-colors group"
                    >
                      <HiOutlineLogout className="text-lg text-gray-500 group-hover:text-red-600 group-hover:rotate-180 transition-all duration-300" />
                      <span className="text-sm text-gray-700 group-hover:text-red-600">Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile search bar - Slides down */}
        {showMobileSearch && (
          <div className="lg:hidden py-3 border-t border-gray-200 animate-slide-down">
            <form onSubmit={handleSearch} className="relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-12 bg-gray-100 border-2 border-transparent rounded-xl focus:border-blue-500 focus:bg-white transition-all text-sm"
              />
              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
              {searchQuery && (
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Go
                </button>
              )}
            </form>
            
            {/* Mobile search suggestions - Simplified */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="mt-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                {searchSuggestions.slice(0, 3).map((expense) => (
                  <button
                    key={expense.id}
                    onClick={() => handleSuggestionClick(expense)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors text-left border-b border-gray-100 last:border-0"
                  >
                    <HiOutlineSearch className="text-gray-400 text-sm" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">
                          {expense.description || 'Untitled'}
                        </span>
                        <span className="text-xs text-gray-500">${expense.amount?.toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {expense.category_name} • {new Date(expense.date).toLocaleDateString()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }

        .animate-slide-down {
          animation: slide-down 0.2s ease-out;
        }
      `}} />
    </header>
  )
}