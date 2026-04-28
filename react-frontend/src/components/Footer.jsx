import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useState, useEffect } from 'react'
import { 
  HiOutlineSparkles,
  HiOutlineHome,
  HiOutlineChartBar,
  HiOutlineTrendingUp,
  HiOutlineChip,
  HiOutlineDocumentText,
  HiOutlineCurrencyDollar,
  HiOutlineHeart,
  HiOutlineClock
} from 'react-icons/hi'

export default function Footer() {
  const { user } = useAuth()
  const location = useLocation()
  const currentYear = new Date().getFullYear()
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  if (location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/') {
    return null; // Hide footer on public pages (homepage already has its own footer)
  }

  const quickLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: HiOutlineHome },
    { name: 'Expenses', path: '/expenses', icon: HiOutlineCurrencyDollar },
    { name: 'Reports', path: '/reports', icon: HiOutlineChartBar },
    { name: 'Budget', path: '/budget', icon: HiOutlineTrendingUp }
  ]

  const aiLinks = [
    { name: 'Insights', path: '/insights', icon: HiOutlineChip },
    { name: 'Forecast', path: '/forecast', icon: HiOutlineTrendingUp },
    { name: 'Analytics', path: '/advanced-analytics', icon: HiOutlineChartBar },
    { name: 'Import', path: '/import-export', icon: HiOutlineDocumentText }
  ]

  return (
    <footer className="w-full bg-gradient-to-r from-gray-900 to-gray-800 dark:from-gray-950 dark:to-gray-900 text-gray-300 border-t border-gray-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        {/* Main content - 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase mb-1.5">Quick</h4>
            <div className="grid grid-cols-2 gap-0.5">
              {quickLinks.map((item) => (
                <Link 
                  key={item.name}
                  to={item.path}
                  className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1 py-0.5"
                >
                  <item.icon className="text-blue-400 text-xs" />
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* AI Features */}
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase mb-1.5">AI</h4>
            <div className="grid grid-cols-2 gap-0.5">
              {aiLinks.map((item) => (
                <Link 
                  key={item.name}
                  to={item.path}
                  className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1 py-0.5"
                >
                  <item.icon className="text-purple-400 text-xs" />
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Time & Copyright */}
          <div className="flex flex-col items-end justify-center">
            <div className="text-right">
              <p className="text-xs text-gray-300 flex items-center gap-1 justify-end">
                <HiOutlineClock className="text-blue-400 text-xs" />
                {currentTime.toLocaleTimeString()}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {currentTime.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar - minimal */}
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-700/30">
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            <HiOutlineSparkles className="text-blue-400 text-xs" />
            <span>© {currentYear} FinanceFlow</span>
          </div>

          <div className="flex items-center gap-2 text-[10px]">
            <Link to="/privacy" className="text-gray-500 hover:text-gray-300 transition-colors">Privacy</Link>
            <span className="text-gray-700">•</span>
            <Link to="/terms" className="text-gray-500 hover:text-gray-300 transition-colors">Terms</Link>
            <span className="text-gray-700">•</span>
            <span className="text-gray-500">v3.0</span>
          </div>
        </div>

        {/* User indicator (only visible when logged in) */}
        {user && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 md:hidden">
            <span className="text-[8px] text-gray-600 bg-gray-800/50 px-2 py-0.5 rounded-full">
              {user.username}
            </span>
          </div>
        )}
      </div>
    </footer>
  )
}