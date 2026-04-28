import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getExpenses } from '../services/expenses'
import { getBudgetStatus } from '../services/budget'
import { getSummary, getSpendingByCategory, getSpendingOverTime } from '../services/reports'
import { getRecentActivity } from '../services/activities'
import { getGoals } from '../services/goals'
import { getDebts } from '../services/debts'
import ExpenseList from '../components/ExpenseList'
import ExpenseForm from '../components/ExpenseForm'
import BudgetCard from '../components/BudgetCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { 
  HiOutlinePlus, 
  HiOutlineTrendingUp, 
  HiOutlineCalendar,
  HiOutlineChartBar,
  HiOutlineSparkles,
  HiOutlineCash,
  HiOutlineCreditCard,
  HiOutlineShoppingBag,
  HiOutlineHome,
  HiOutlineHeart,
  HiOutlineBookOpen,
  HiOutlineBriefcase,
  HiOutlineChip,
  HiOutlineChartPie
} from 'react-icons/hi'
import { LineChart, PieChart } from '../components/Charts'
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, isValid } from 'date-fns'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const navigate = useNavigate()
  const [expenses, setExpenses] = useState([])
  const [budgetStatus, setBudgetStatus] = useState(null)
  const [summary, setSummary] = useState(null)
  const [recentActivity, setRecentActivity] = useState([])
  const [categoryData, setCategoryData] = useState([])
  const [spendingTrend, setSpendingTrend] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  })
  
  const [stats, setStats] = useState({
    totalExpenses: 0,
    monthlyAverage: 0,
    categoriesUsed: 0,
    totalBudget: 0,
    budgetUtilization: 0,
    budgetSurplus: 0,
    savingsTrend: 0,
    potentialSavings: 0,
    unnecessaryExpenses: 0,
    savingsRate: 0,
    goalsProgress: 0,
    netWorth: 0
  })

  // Category colors for consistent display
  const categoryColors = {
    'Food': '#3b82f6',
    'Entertainment': '#8b5cf6',
    'Education': '#10b981',
    'Transport': '#f59e0b',
    'Utilities': '#ef4444',
    'Shopping': '#ec4899',
    'Health': '#14b8a6',
    'Other': '#6b7280'
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      console.log('Fetching dashboard data...')
      
      const promises = [
        getExpenses({ per_page: 10 }).catch(err => {
          console.error('Error fetching expenses:', err)
          return { items: [] }
        }),
        getBudgetStatus().catch(err => {
          console.error('Error fetching budget:', err)
          return null
        }),
        getSummary().catch(err => {
          console.error('Error fetching summary:', err)
          return null
        }),
        getSpendingByCategory(new Date().getFullYear(), new Date().getMonth() + 1).catch(err => {
          console.error('Error fetching categories:', err)
          return []
        }),
        getSpendingOverTime('day', dateRange.start, dateRange.end).catch(err => {
          console.error('Error fetching spending trend:', err)
          return []
        }),
        getRecentActivity(10).catch(err => {
          console.error('Error fetching activities:', err)
          return []
        }),
        getGoals().catch(err => {
          console.error('Error fetching goals:', err)
          return []
        }),
        getDebts().catch(err => {
          console.error('Error fetching debts:', err)
          return []
        })
      ]

      const [
        expData, 
        budgetData, 
        summaryData, 
        categoryDataResponse, 
        trendData, 
        activityData,
        goalsData,
        debtsData
      ] = await Promise.all(promises)

      setExpenses(expData?.items || [])
      setBudgetStatus(budgetData)
      setSummary(summaryData)

      // Transform category data for PieChart
      if (categoryDataResponse && categoryDataResponse.length > 0) {
        const transformedCategories = categoryDataResponse.map(cat => ({
          name: cat.name || cat.category_name || 'Unknown',
          value: parseFloat(cat.amount || cat.total || 0),
          color: categoryColors[cat.name] || cat.color || '#6b7280'
        }))
        setCategoryData(transformedCategories)
      } else {
        setCategoryData([])
      }

      // Transform trend data for LineChart
      if (trendData && trendData.length > 0) {
        const transformedTrend = trendData
          .map(item => {
            const dateValue = item.date || item.day || item.dateStr || item.dayStr || Object.values(item)[0];
            if (!dateValue) return null;
            
            try {
              let date;
              if (typeof dateValue === 'string') {
                if (dateValue.includes('T')) {
                  date = new Date(dateValue);
                } else if (dateValue.includes('-')) {
                  date = new Date(dateValue + 'T00:00:00');
                } else {
                  date = new Date(dateValue);
                }
              } else {
                date = new Date(dateValue);
              }
              
              if (!isValid(date)) return null;
              
              const amount = parseFloat(item.amount || item.total || item.value || item.sum || 0);
              
              return {
                name: format(date, 'MMM d'),
                amount: isNaN(amount) ? 0 : amount
              };
            } catch {
              return null;
            }
          })
          .filter(item => item !== null);
        
        setSpendingTrend(transformedTrend);
      } else {
        setSpendingTrend([]);
      }

      setRecentActivity(activityData || [])

      // Calculate all stats
      const allExpensesResponse = await getExpenses({ per_page: 1000 }).catch(() => ({ items: [] }))
      const allExpenses = allExpensesResponse.items || []
      
      const totalExpenses = allExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0)
      
      const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd')
      const recentExpenses = allExpenses.filter(exp => exp.date >= thirtyDaysAgo)
      const monthlyAverage = recentExpenses.length > 0 
        ? recentExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0) / 30
        : 0

      const uniqueCategories = [...new Set(allExpenses.map(exp => exp.category_name).filter(Boolean))]

      // SMART SAVINGS CALCULATIONS
      const budgetSurplus = budgetData?.has_budget 
        ? Math.max(0, parseFloat(budgetData.amount || 0) - parseFloat(budgetData.spent || 0))
        : 0

      const unnecessaryCategories = ['Entertainment', 'Shopping', 'Dining', 'Luxury']
      const unnecessaryExpenses = allExpenses
        .filter(exp => unnecessaryCategories.includes(exp.category_name))
        .reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0)

      const savingsRate = budgetData?.has_budget && budgetData.amount > 0
        ? (budgetSurplus / budgetData.amount) * 100
        : 0

      const highSpendingThreshold = monthlyAverage * 1.5
      const potentialSavings = allExpenses
        .filter(exp => parseFloat(exp.amount || 0) > highSpendingThreshold)
        .reduce((sum, exp) => sum + (parseFloat(exp.amount) - monthlyAverage), 0)

      const goalsProgress = goalsData?.length > 0
        ? goalsData.reduce((sum, goal) => {
            const progress = (goal.current_amount / goal.target_amount) * 100
            return sum + (progress > 100 ? 100 : progress)
          }, 0) / goalsData.length
        : 0

      const totalDebts = debtsData?.reduce((sum, debt) => 
        sum + (debt.settled ? 0 : parseFloat(debt.amount || 0)), 0) || 0
      const netWorth = totalExpenses - totalDebts

      const lastMonthStart = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd')
      const lastMonthEnd = format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd')
      const lastMonthExpenses = allExpenses.filter(
        exp => exp.date >= lastMonthStart && exp.date <= lastMonthEnd
      )
      const lastMonthTotal = lastMonthExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0)
      
      const lastMonthSurplus = budgetData?.has_budget 
        ? Math.max(0, parseFloat(budgetData.amount || 0) - lastMonthTotal)
        : 0
      
      const savingsTrend = lastMonthSurplus > 0 
        ? ((budgetSurplus - lastMonthSurplus) / lastMonthSurplus * 100).toFixed(1)
        : 0

      setStats({
        totalExpenses,
        monthlyAverage,
        categoriesUsed: uniqueCategories.length,
        totalBudget: parseFloat(budgetData?.amount || 0),
        budgetUtilization: parseFloat(budgetData?.percentage || 0),
        budgetSurplus,
        savingsTrend: parseFloat(savingsTrend),
        potentialSavings,
        unnecessaryExpenses,
        savingsRate,
        goalsProgress,
        netWorth
      })

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period)
    const now = new Date()
    let start, end

    switch(period) {
      case 'week':
        start = format(subDays(now, 7), 'yyyy-MM-dd')
        end = format(now, 'yyyy-MM-dd')
        break
      case 'month':
        start = format(startOfMonth(now), 'yyyy-MM-dd')
        end = format(endOfMonth(now), 'yyyy-MM-dd')
        break
      case 'year':
        start = format(startOfYear(now), 'yyyy-MM-dd')
        end = format(endOfYear(now), 'yyyy-MM-dd')
        break
      default:
        start = format(startOfMonth(now), 'yyyy-MM-dd')
        end = format(endOfMonth(now), 'yyyy-MM-dd')
    }

    setDateRange({ start, end })
  }

  const getActivityIcon = (type) => {
    switch(type?.toLowerCase()) {
      case 'expense': return '💰'
      case 'budget': return '📊'
      case 'goal': return '🎯'
      case 'debt': return '💳'
      case 'recurring': return '🔄'
      case 'income': return '💵'
      case 'saving': return '🏦'
      case 'investment': return '📈'
      default: return '📝'
    }
  }

  const getCategoryIcon = (category) => {
    switch(category?.toLowerCase()) {
      case 'food': return <HiOutlineShoppingBag className="text-lg" />
      case 'transport': return <HiOutlineBriefcase className="text-lg" />
      case 'utilities': return <HiOutlineHome className="text-lg" />
      case 'entertainment': return <HiOutlineSparkles className="text-lg" />
      case 'health': return <HiOutlineHeart className="text-lg" />
      case 'education': return <HiOutlineBookOpen className="text-lg" />
      default: return <HiOutlineCash className="text-lg" />
    }
  }

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Unknown'
    try {
      const date = new Date(dateString)
      if (!isValid(date)) return 'Unknown'
      
      const now = new Date()
      const diffInSeconds = Math.floor((now - date) / 1000)
      const diffInMinutes = Math.floor(diffInSeconds / 60)
      const diffInHours = Math.floor(diffInMinutes / 60)
      const diffInDays = Math.floor(diffInHours / 24)

      if (diffInDays > 30) return `${Math.floor(diffInDays / 30)} months ago`
      if (diffInDays > 0) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
      if (diffInHours > 0) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
      if (diffInMinutes > 0) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
      return 'Just now'
    } catch {
      return 'Unknown'
    }
  }

  const getSmartSavingsMessage = () => {
    if (stats.budgetSurplus > 0) {
      return `You're under budget by $${stats.budgetSurplus.toFixed(2)}`
    } else if (stats.potentialSavings > 0) {
      return `Potential savings: $${stats.potentialSavings.toFixed(2)} from large expenses`
    } else if (stats.unnecessaryExpenses > 0) {
      return `You spent $${stats.unnecessaryExpenses.toFixed(2)} on non-essentials`
    } else {
      return 'Track expenses to see savings opportunities'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const trend = summary?.last_month_total && summary?.current_month_total
    ? ((summary.current_month_total - summary.last_month_total) / summary.last_month_total * 100).toFixed(1)
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        {/* Combined Header with Purple Gradient - Removed duplicate title */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 shadow-lg relative">
          {/* Add Expense Button - Positioned at top right corner */}
          <button 
            className="absolute top-4 right-4 px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-lg z-10"
            onClick={() => setShowAddModal(true)}
          >
            <HiOutlinePlus className="text-lg" />
            <span className="font-medium">Add Expense</span>
          </button>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <HiOutlineChip className="text-2xl text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white">
                    Dashboard
                  </h1>
                  <p className="text-purple-100 mt-1 text-sm md:text-base">
                    Welcome back! Here's your financial overview
                  </p>
                </div>
              </div>
              
              <div className="mt-4">
                <h2 className="text-lg font-semibold text-white">AI-Powered Financial Insights</h2>
                <p className="text-purple-100 text-sm mt-1">
                  Click below to generate AI-powered predictions, detect anomalies, and get personalized recommendations
                </p>
              </div>
            </div>
          </div>

          {/* AI Navigation Buttons */}
          <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-white/20">
            <button
              onClick={() => navigate('/insights')}
              className="px-4 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition-colors flex items-center gap-2 flex-1 md:flex-none justify-center"
            >
              <HiOutlineChartPie className="text-lg" />
              View Insights
            </button>
            <button
              onClick={() => navigate('/forecast')}
              className="px-4 py-2 bg-purple-700 text-white rounded-lg font-medium hover:bg-purple-800 transition-colors flex items-center gap-2 flex-1 md:flex-none justify-center"
            >
              <HiOutlineTrendingUp className="text-lg" />
              Forecast
            </button>
            <button
              onClick={() => navigate('/advanced-analytics')}
              className="px-4 py-2 bg-indigo-700 text-white rounded-lg font-medium hover:bg-indigo-800 transition-colors flex items-center gap-2 flex-1 md:flex-none justify-center"
            >
              <HiOutlineChartBar className="text-lg" />
              Advanced Analytics
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {/* This Month Card */}
          <div className="group bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">This Month</p>
                <p className="text-lg md:text-xl lg:text-2xl font-bold mt-1 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                  ${(summary?.current_month_total || 0).toFixed(2)}
                </p>
              </div>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 flex items-center justify-center transition-all duration-300">
                <HiOutlineCalendar className="text-base md:text-lg text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-2 md:mt-3 flex items-center gap-2 text-xs">
              <span className={`px-2 py-0.5 rounded-full ${trend > 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'}`}>
                {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
              </span>
              <span className="text-gray-500 dark:text-gray-400">vs last month</span>
            </div>
          </div>

          {/* Daily Average Card */}
          <div className="group bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">Daily Average</p>
                <p className="text-lg md:text-xl lg:text-2xl font-bold mt-1 bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
                  ${stats.monthlyAverage.toFixed(2)}
                </p>
              </div>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 flex items-center justify-center transition-all duration-300">
                <HiOutlineChartBar className="text-base md:text-lg text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="mt-2 md:mt-3 text-xs text-gray-500 dark:text-gray-400">
              Last 30 days
            </div>
          </div>

          {/* Categories Used Card */}
          <div className="group bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">Categories Used</p>
                <p className="text-lg md:text-xl lg:text-2xl font-bold mt-1 bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent">
                  {stats.categoriesUsed}
                </p>
              </div>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-green-100 dark:bg-green-900/30 group-hover:bg-green-200 dark:group-hover:bg-green-900/50 flex items-center justify-center transition-all duration-300">
                <HiOutlineCreditCard className="text-base md:text-lg text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="mt-2 md:mt-3 text-xs text-gray-500 dark:text-gray-400">
              Out of 8 total
            </div>
          </div>

          {/* Smart Savings Card */}
          <div className="group bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400">Smart Savings</p>
                {stats.budgetSurplus > 0 ? (
                  <p className="text-lg md:text-xl lg:text-2xl font-bold mt-1 text-green-600 dark:text-green-400">
                    ${stats.budgetSurplus.toFixed(2)}
                  </p>
                ) : stats.potentialSavings > 0 ? (
                  <p className="text-lg md:text-xl lg:text-2xl font-bold mt-1 text-yellow-600 dark:text-yellow-400">
                    ${stats.potentialSavings.toFixed(2)}
                  </p>
                ) : (
                  <p className="text-lg md:text-xl lg:text-2xl font-bold mt-1 text-gray-600 dark:text-gray-400">
                    $0.00
                  </p>
                )}
              </div>
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl ${
                stats.budgetSurplus > 0 
                  ? 'bg-green-100 dark:bg-green-900/30 group-hover:bg-green-200 dark:group-hover:bg-green-900/50' 
                  : stats.potentialSavings > 0
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 group-hover:bg-yellow-200 dark:group-hover:bg-yellow-900/50'
                    : 'bg-gray-100 dark:bg-gray-700'
              } flex items-center justify-center transition-all duration-300`}>
                <HiOutlineSparkles className={`text-base md:text-lg ${
                  stats.budgetSurplus > 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : stats.potentialSavings > 0
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-gray-400'
                }`} />
              </div>
            </div>
            <div className="mt-2 md:mt-3">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {getSmartSavingsMessage()}
              </p>
              <div className="flex items-center gap-2 text-xs mt-1">
                <span className={`flex items-center gap-1 ${
                  stats.savingsTrend > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stats.savingsTrend > 0 ? '↑' : '↓'} {Math.abs(stats.savingsTrend)}%
                </span>
                <span className="text-gray-500 dark:text-gray-400">vs last month</span>
              </div>
            </div>
          </div>
        </div>

        {/* Budget Card - With smaller font for the amount */}
        {budgetStatus?.has_budget && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base md:text-lg font-semibold">Monthly Budget</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {new Date().toLocaleString('default', { month: 'long' })} {new Date().getFullYear()}
                </p>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Track your monthly spending</span>
            </div>

            <div className="space-y-4">
              {/* Budget Progress */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔥</span>
                  <div>
                    {/* Smaller font for the budget amount */}
                    <p className="text-sm md:text-base font-medium">
                      <span className={budgetStatus.spent > budgetStatus.amount ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}>
                        ${budgetStatus.spent?.toFixed(2)}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">/ ${budgetStatus.amount?.toFixed(2)}</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {budgetStatus.percentage?.toFixed(1)}% used
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    budgetStatus.percentage > 100 
                      ? 'bg-red-600' 
                      : budgetStatus.percentage > 80 
                        ? 'bg-yellow-500' 
                        : 'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(budgetStatus.percentage, 100)}%` }}
                />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Remaining</p>
                  <p className={`text-sm font-semibold ${
                    budgetStatus.amount - budgetStatus.spent > 0 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    ${Math.abs(budgetStatus.amount - budgetStatus.spent).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {budgetStatus.amount - budgetStatus.spent > 0 ? 'left' : 'overspent'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Daily average</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    ${((budgetStatus.amount - budgetStatus.spent) / Math.max(1, new Date().getDate())).toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                  {budgetStatus.percentage > 100 ? (
                    <span className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded-full">
                      Exceeded
                    </span>
                  ) : budgetStatus.percentage > 80 ? (
                    <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded-full">
                      Warning
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                      On Track
                    </span>
                  )}
                </div>
              </div>

              {/* Alert if overspent */}
              {budgetStatus.spent > budgetStatus.amount && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                    <span className="text-lg">⚠️</span>
                    <span className="font-medium">Budget exceeded!</span>
                    <span className="text-xs ml-auto">
                      You've overspent by ${(budgetStatus.spent - budgetStatus.amount).toFixed(2)}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
              <h3 className="text-base md:text-lg font-semibold">Spending Overview</h3>
              <select 
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedPeriod}
                onChange={(e) => handlePeriodChange(e.target.value)}
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>
            {spendingTrend.length > 0 ? (
              <div className="h-[250px] md:h-[300px]">
                <LineChart data={spendingTrend} />
              </div>
            ) : (
              <div className="h-[250px] md:h-[300px] flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                <HiOutlineChartBar className="text-4xl md:text-5xl mb-3 opacity-50" />
                <p className="text-sm md:text-base">No spending data for this period</p>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
              <h3 className="text-base md:text-lg font-semibold">Category Breakdown</h3>
              <span className="px-3 py-1 text-xs md:text-sm border border-gray-300 dark:border-gray-600 rounded-full">
                {format(new Date(), 'MMMM yyyy')}
              </span>
            </div>
            {categoryData.length > 0 ? (
              <div className="h-[250px] md:h-[300px]">
                <PieChart data={categoryData} />
              </div>
            ) : (
              <div className="h-[250px] md:h-[300px] flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                <HiOutlineChartBar className="text-4xl md:text-5xl mb-3 opacity-50" />
                <p className="text-sm md:text-base">No category data for this month</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Expenses and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h3 className="text-base md:text-lg font-semibold">Recent Expenses</h3>
              <button 
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 flex items-center gap-2"
                onClick={() => window.location.href = '/expenses'}
              >
                <span>View All</span>
                <HiOutlineTrendingUp className="text-lg" />
              </button>
            </div>
            {expenses.length > 0 ? (
              <ExpenseList expenses={expenses} onRefresh={fetchData} />
            ) : (
              <div className="text-center py-8 md:py-12">
                <HiOutlineCash className="text-4xl md:text-5xl text-gray-300 dark:text-gray-600 mx-auto mb-3 md:mb-4" />
                <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">No expenses yet.</p>
                <p className="text-xs md:text-sm text-gray-400 dark:text-gray-500 mt-1">Click "Add Expense" to get started.</p>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h3 className="text-base md:text-lg font-semibold">Recent Activity</h3>
              <button 
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 flex items-center gap-2"
                onClick={() => window.location.href = '/notifications'}
              >
                <span>View All</span>
                <HiOutlineTrendingUp className="text-lg" />
              </button>
            </div>
            {recentActivity.length > 0 ? (
              <div className="space-y-2 md:space-y-3 max-h-[350px] md:max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                {recentActivity.map((activity, index) => (
                  <div 
                    key={activity.id || index} 
                    className="flex items-start gap-2 md:gap-3 p-2 md:p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-300"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center flex-shrink-0 text-base md:text-xl">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-sm font-medium">
                        {activity.action || 'Activity'}
                        {activity.amount && (
                          <span className="text-gray-500 dark:text-gray-400 ml-1">
                            - ${parseFloat(activity.amount).toFixed(2)}
                          </span>
                        )}
                      </p>
                      <div className="flex flex-wrap items-center gap-1 md:gap-2 mt-0.5 md:mt-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTimeAgo(activity.created_at)}
                        </p>
                        {activity.category && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded-full">
                            {getCategoryIcon(activity.category)}
                            <span>{activity.category}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 md:py-12">
                <HiOutlineSparkles className="text-4xl md:text-5xl text-gray-300 dark:text-gray-600 mx-auto mb-3 md:mb-4" />
                <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Add Expense Modal */}
        {showAddModal && (
          <ExpenseForm
            onClose={() => setShowAddModal(false)}
            onSuccess={() => {
              setShowAddModal(false)
              fetchData()
              toast.success('Expense added successfully!')
            }}
          />
        )}
      </div>

      {/* Add custom CSS animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-\\[slideUp_0\\.5s_ease-out\\] {
          animation: slideUp 0.5s ease-out;
        }

        .animate-\\[slideIn_0\\.3s_ease-out\\] {
          animation: slideIn 0.3s ease-out;
        }

        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }

        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 2px;
        }

        .dark .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #4a5568;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #a0aec0;
        }

        .dark .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #718096;
        }
      `}} />
    </div>
  )
}