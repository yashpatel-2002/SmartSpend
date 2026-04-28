import { useState, useEffect } from 'react'
import { getRecurringRules, createRecurringRule, updateRecurringRule, deleteRecurringRule, processRecurring } from '../services/recurring'
import { getExpenses } from '../services/expenses'
import RecurringRuleForm from '../components/forms/RecurringRuleForm'
import ConfirmationModal from '../components/ConfirmationModal'
import LoadingSpinner from '../components/LoadingSpinner'
import { 
  HiOutlinePlus, 
  HiOutlineRefresh, 
  HiOutlinePencil, 
  HiOutlineTrash,
  HiOutlineClock,
  HiOutlineCalendar,
  HiOutlineCurrencyDollar,
  HiOutlineTag,
  HiOutlinePlay,
  HiOutlinePause,
  HiOutlineExclamationCircle,
  HiOutlineTrendingUp,
  HiOutlineChartBar
} from 'react-icons/hi'
import { format, differenceInDays, addMonths, isAfter, isBefore, startOfMonth, endOfMonth } from 'date-fns'
import toast from 'react-hot-toast'

export default function RecurringExpenses() {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState(null)
  const [deletingRule, setDeletingRule] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [filter, setFilter] = useState('all') // all, active, inactive
  const [expenseData, setExpenseData] = useState({})
  const [ruleStats, setRuleStats] = useState({})

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchRules(),
        fetchExpensesForRules()
      ])
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to load recurring expenses data')
    } finally {
      setLoading(false)
    }
  }

  const fetchRules = async () => {
    try {
      const data = await getRecurringRules()
      setRules(data)
      calculateRuleStats(data)
    } catch (error) {
      toast.error('Failed to load recurring rules')
      throw error
    }
  }

  const fetchExpensesForRules = async () => {
    try {
      // Fetch expenses from the last 3 months to calculate stats
      const threeMonthsAgo = format(addMonths(new Date(), -3), 'yyyy-MM-dd')
      const today = format(new Date(), 'yyyy-MM-dd')
      
      const expenses = await getExpenses({ 
        start_date: threeMonthsAgo,
        end_date: today,
        per_page: 1000 
      })
      
      // Group expenses by description to match with rules
      const expenseMap = {}
      expenses.items.forEach(exp => {
        const key = exp.description?.toLowerCase() || ''
        if (!expenseMap[key]) {
          expenseMap[key] = []
        }
        expenseMap[key].push(exp)
      })
      
      setExpenseData(expenseMap)
    } catch (error) {
      console.error('Failed to fetch expenses for rules:', error)
    }
  }

  const calculateRuleStats = (rulesList) => {
    const stats = {}
    const now = new Date()
    const currentMonthStart = startOfMonth(now)
    const currentMonthEnd = endOfMonth(now)
    
    rulesList.forEach(rule => {
      // Calculate days until next payment
      const nextDate = new Date(rule.next_date)
      const daysUntil = differenceInDays(nextDate, now)
      
      // Calculate if rule is due soon
      const isDueSoon = daysUntil <= 3 && daysUntil >= 0
      
      // Calculate monthly progress (for monthly rules)
      let monthlyProgress = 0
      if (rule.frequency === 'monthly' && rule.active) {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        const daysPassed = Math.min(now.getDate(), daysInMonth)
        monthlyProgress = Math.round((daysPassed / daysInMonth) * 100)
      }
      
      // Calculate total spent on this rule
      const ruleExpenses = expenseData[rule.description?.toLowerCase()] || []
      const totalSpent = ruleExpenses.reduce((sum, exp) => sum + exp.amount, 0)
      
      // Calculate this month's spending for this rule
      const thisMonthExpenses = ruleExpenses.filter(exp => {
        const expDate = new Date(exp.date)
        return expDate >= currentMonthStart && expDate <= currentMonthEnd
      })
      const thisMonthSpent = thisMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0)
      
      stats[rule.id] = {
        daysUntil,
        isDueSoon,
        monthlyProgress,
        totalSpent,
        thisMonthSpent,
        occurrences: ruleExpenses.length,
        lastExpense: ruleExpenses.length > 0 ? ruleExpenses[ruleExpenses.length - 1] : null
      }
    })
    
    setRuleStats(stats)
  }

  const handleCreate = async (data) => {
    try {
      await createRecurringRule(data)
      toast.success('Recurring rule created successfully')
      await fetchAllData()
      setShowForm(false)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Creation failed')
    }
  }

  const handleUpdate = async (id, data) => {
    try {
      await updateRecurringRule(id, data)
      toast.success('Rule updated successfully')
      await fetchAllData()
      setEditingRule(null)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Update failed')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteRecurringRule(deletingRule.id)
      toast.success('Rule deleted successfully')
      await fetchAllData()
    } catch (error) {
      toast.error('Deletion failed')
    } finally {
      setDeletingRule(null)
    }
  }

  const handleProcessNow = async () => {
    setProcessing(true)
    try {
      const res = await processRecurring()
      toast.success(res.message || 'Recurring expenses processed')
      await fetchAllData()
    } catch (error) {
      toast.error('Failed to process recurring expenses')
    } finally {
      setProcessing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAllData()
    setRefreshing(false)
    toast.success('Data refreshed')
  }

  const toggleRuleStatus = async (rule) => {
    try {
      await updateRecurringRule(rule.id, { ...rule, active: !rule.active })
      toast.success(`Rule ${!rule.active ? 'activated' : 'paused'} successfully`)
      await fetchAllData()
    } catch (error) {
      toast.error('Failed to update rule status')
    }
  }

  const getFrequencyIcon = (frequency) => {
    switch(frequency?.toLowerCase()) {
      case 'daily': return '🔄'
      case 'weekly': return '📅'
      case 'monthly': return '📆'
      case 'yearly': return '🎉'
      default: return '⏰'
    }
  }

  const getNextDateStatus = (nextDate) => {
    const today = new Date()
    const next = new Date(nextDate)
    const diffDays = Math.ceil((next - today) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'overdue'
    if (diffDays <= 3) return 'upcoming'
    return 'normal'
  }

  const filteredRules = rules.filter(rule => {
    if (filter === 'active') return rule.active
    if (filter === 'inactive') return !rule.active
    return true
  })

  if (loading) return <LoadingSpinner />

  const activeCount = rules.filter(r => r.active).length
  const inactiveCount = rules.filter(r => !r.active).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Recurring Expenses
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm md:text-base">
              Manage your automated and recurring payments
            </p>
          </div>
          <div className="flex gap-2 md:gap-3">
            <button 
              className="px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 flex items-center gap-2"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <HiOutlineRefresh className={`text-lg md:text-xl ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button 
              className="px-3 md:px-4 py-2 text-sm md:text-base bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-300 flex items-center gap-2"
              onClick={handleProcessNow}
              disabled={processing}
            >
              <HiOutlineClock className={`text-lg md:text-xl ${processing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{processing ? 'Processing...' : 'Process Now'}</span>
            </button>
            <button 
              className="px-3 md:px-4 py-2 text-sm md:text-base bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105 flex items-center gap-2"
              onClick={() => setShowForm(true)}
            >
              <HiOutlinePlus className="text-lg md:text-xl" />
              <span className="hidden sm:inline">New Rule</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white dark:bg-gray-800 p-2 rounded-xl shadow-lg flex gap-2">
          {[
            { key: 'all', label: 'All', count: rules.length },
            { key: 'active', label: 'Active', count: activeCount },
            { key: 'inactive', label: 'Inactive', count: inactiveCount }
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-1 py-2 px-4 rounded-lg capitalize transition-all duration-200 text-sm md:text-base ${
                filter === f.key 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        {/* Rules Grid */}
        {filteredRules.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <div className="text-6xl mb-4">🔄</div>
            <h3 className="text-xl font-semibold mb-2">No recurring rules found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create your first recurring expense rule to automate your tracking
            </p>
            <button 
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105 inline-flex items-center gap-2"
              onClick={() => setShowForm(true)}
            >
              <HiOutlinePlus className="text-lg" />
              Create Rule
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {filteredRules.map((rule) => {
              const stats = ruleStats[rule.id] || {
                daysUntil: 0,
                isDueSoon: false,
                monthlyProgress: 0,
                totalSpent: 0,
                thisMonthSpent: 0,
                occurrences: 0
              }
              const status = getNextDateStatus(rule.next_date)
              
              return (
                <div 
                  key={rule.id} 
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{getFrequencyIcon(rule.frequency)}</div>
                      <div>
                        <h3 className="font-semibold text-lg">{rule.description || 'Unnamed Rule'}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{rule.category_name}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => toggleRuleStatus(rule)}
                        className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
                        title={rule.active ? 'Pause rule' : 'Activate rule'}
                      >
                        {rule.active ? (
                          <HiOutlinePause className="text-lg text-yellow-600 dark:text-yellow-400" />
                        ) : (
                          <HiOutlinePlay className="text-lg text-green-600 dark:text-green-400" />
                        )}
                      </button>
                      <button 
                        onClick={() => setEditingRule(rule)}
                        className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
                      >
                        <HiOutlinePencil className="text-lg text-blue-600 dark:text-blue-400" />
                      </button>
                      <button 
                        onClick={() => setDeletingRule(rule)}
                        className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
                      >
                        <HiOutlineTrash className="text-lg text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Amount</p>
                      <p className="text-xl font-bold text-blue-600 dark:text-blue-400">${parseFloat(rule.amount).toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Frequency</p>
                      <p className="font-medium capitalize">{rule.frequency}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Every {rule.interval} {rule.frequency}(s)</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Next payment</span>
                      <span className={`font-medium flex items-center gap-1 ${
                        status === 'overdue' ? 'text-red-600 dark:text-red-400' : 
                        status === 'upcoming' ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-white'
                      }`}>
                        <HiOutlineCalendar />
                        {format(new Date(rule.next_date), 'MMM d, yyyy')}
                        {status === 'overdue' && <HiOutlineExclamationCircle className="text-red-600 dark:text-red-400" />}
                        {stats.isDueSoon && !status === 'overdue' && <span className="text-xs ml-1">(Soon)</span>}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Started</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {format(new Date(rule.start_date), 'MMM d, yyyy')}
                      </span>
                    </div>

                    {rule.end_date && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Ends</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {format(new Date(rule.end_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Status</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        rule.active 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {rule.active ? 'Active' : 'Paused'}
                      </span>
                    </div>

                    {/* Real stats from expense data */}
                    {stats.occurrences > 0 && (
                      <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-gray-600 dark:text-gray-400">Total spent</span>
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          ${stats.totalSpent.toFixed(2)} ({stats.occurrences}×)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Dynamic progress bar based on actual data */}
                  {rule.frequency === 'monthly' && rule.active && (
                    <div className="mt-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600 dark:text-gray-400">Progress this month</span>
                        <span className="font-medium text-blue-600 dark:text-blue-400">{stats.monthlyProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${stats.monthlyProgress}%` }}
                        />
                      </div>
                      {stats.thisMonthSpent > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Spent this month: ${stats.thisMonthSpent.toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Forms and Modals */}
        {showForm && (
          <RecurringRuleForm
            onClose={() => setShowForm(false)}
            onSubmit={handleCreate}
          />
        )}

        {editingRule && (
          <RecurringRuleForm
            rule={editingRule}
            onClose={() => setEditingRule(null)}
            onSubmit={(data) => handleUpdate(editingRule.id, data)}
          />
        )}

        {deletingRule && (
          <ConfirmationModal
            title="Delete Recurring Rule"
            message={`Are you sure you want to delete the rule "${deletingRule.description || 'Unnamed'}"? This action cannot be undone.`}
            warning={ruleStats[deletingRule.id]?.occurrences > 0 ? 
              `This rule has generated ${ruleStats[deletingRule.id].occurrences} expense(s) totaling $${ruleStats[deletingRule.id].totalSpent.toFixed(2)}.` : 
              ''}
            onConfirm={handleDelete}
            onCancel={() => setDeletingRule(null)}
          />
        )}
      </div>
    </div>
  )
}