import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { getCategories } from '../../services/categories'
import { 
  HiOutlineX, 
  HiOutlineTag, 
  HiOutlineCurrencyDollar, 
  HiOutlineCalendar,
  HiOutlineRefresh,
  HiOutlineClock,
  HiOutlineInformationCircle,
  HiOutlineCheckCircle
} from 'react-icons/hi'

export default function RecurringRuleForm({ rule, onClose, onSubmit }) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: rule || {
      category_id: '',
      amount: '',
      description: '',
      frequency: 'monthly',
      interval: 1,
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      active: true
    }
  })
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)

  const watchFrequency = watch('frequency')
  const watchInterval = watch('interval')
  const watchAmount = watch('amount')
  const watchStartDate = watch('start_date')
  const watchActive = watch('active')

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    if (categories.length > 0 && rule?.category_id) {
      const cat = categories.find(c => c.id === rule.category_id)
      setSelectedCategory(cat)
    }
  }, [categories, rule])

  const fetchCategories = async () => {
    try {
      const data = await getCategories()
      setCategories(data)
    } catch (error) {
      console.error('Failed to load categories')
    }
  }

  const handleCategoryChange = (e) => {
    const catId = e.target.value
    const cat = categories.find(c => c.id === parseInt(catId))
    setSelectedCategory(cat)
  }

  // Calculate next occurrence preview
  const getNextOccurrence = () => {
    if (!watchStartDate) return 'Select start date'
    
    const startDate = new Date(watchStartDate)
    const today = new Date()
    
    if (startDate > today) {
      return formatDate(startDate)
    }
    
    // Calculate next occurrence based on frequency
    let nextDate = new Date(startDate)
    while (nextDate <= today) {
      switch(watchFrequency) {
        case 'daily':
          nextDate.setDate(nextDate.getDate() + (watchInterval || 1))
          break
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + (7 * (watchInterval || 1)))
          break
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + (watchInterval || 1))
          break
        case 'yearly':
          nextDate.setFullYear(nextDate.getFullYear() + (watchInterval || 1))
          break
        default:
          return formatDate(startDate)
      }
    }
    return formatDate(nextDate)
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const getFrequencyIcon = () => {
    switch(watchFrequency) {
      case 'daily': return '🔄'
      case 'weekly': return '📅'
      case 'monthly': return '📆'
      case 'yearly': return '🎉'
      default: return '⏰'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 sticky top-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <HiOutlineRefresh className="text-white text-xl" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {rule ? 'Edit Recurring Rule' : 'Create Recurring Rule'}
                </h3>
                <p className="text-white/80 text-sm mt-1">
                  {rule ? 'Update your automated expense' : 'Set up an automated recurring expense'}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <HiOutlineX className="text-white text-xl" />
            </button>
          </div>
        </div>

        {/* Form content */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Category Selection with Color Preview */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <HiOutlineTag className="text-indigo-500" />
              Category <span className="text-red-500">*</span>
            </label>
            <div className="relative group">
              <select
                className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all duration-300 appearance-none
                  ${errors.category_id 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200 dark:border-red-700' 
                    : 'border-gray-200 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-200 dark:focus:ring-indigo-800'}`}
                {...register('category_id', { required: 'Category is required' })}
                onChange={handleCategoryChange}
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id} style={{ backgroundColor: cat.color + '20' }}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {selectedCategory && (
              <div className="mt-2 flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedCategory.color }}></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">{selectedCategory.name}</span>
              </div>
            )}
            {errors.category_id && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                {errors.category_id.message}
              </p>
            )}
          </div>

          {/* Amount & Interval Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <HiOutlineCurrencyDollar className="text-indigo-500" />
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  className={`w-full px-7 py-3 bg-gray-50 dark:bg-gray-700 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all duration-300
                    ${errors.amount 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                      : 'border-gray-200 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-200'}`}
                  placeholder="0.00"
                  {...register('amount', { 
                    required: 'Amount is required', 
                    min: { value: 0.01, message: 'Amount must be greater than 0' }
                  })}
                />
              </div>
              {errors.amount && (
                <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>
              )}
            </div>

            {/* Interval */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <HiOutlineClock className="text-indigo-500" />
                Interval
              </label>
              <div className="relative group">
                <input
                  type="number"
                  min="1"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-all duration-300"
                  {...register('interval')}
                />
              </div>
            </div>
          </div>

          {/* Frequency & Preview Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Frequency */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Frequency</label>
              <div className="relative group">
                <select
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-all duration-300 appearance-none"
                  {...register('frequency')}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Preview Badge */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-400 opacity-0">Preview</label>
              <div className="h-[50px] bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                <span className="text-2xl">{getFrequencyIcon()}</span>
                <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                  Every {watchInterval} {watchFrequency}
                  {watchInterval > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Date Range Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Start Date */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <HiOutlineCalendar className="text-indigo-500" />
                Start Date <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <input
                  type="date"
                  className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all duration-300
                    ${errors.start_date 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                      : 'border-gray-200 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-200'}`}
                  {...register('start_date', { required: 'Start date is required' })}
                />
              </div>
              {errors.start_date && (
                <p className="text-red-500 text-xs mt-1">{errors.start_date.message}</p>
              )}
            </div>

            {/* End Date */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <HiOutlineCalendar className="text-indigo-500" />
                End Date
              </label>
              <div className="relative group">
                <input
                  type="date"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-all duration-300"
                  {...register('end_date')}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Leave empty for no end date</p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <HiOutlineInformationCircle className="text-indigo-500" />
              Description <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-800 transition-all duration-300"
              placeholder="e.g., Rent, Subscription, Gym membership"
              {...register('description')}
            />
          </div>

          {/* Active Toggle with Preview Card */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  watchActive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-200 dark:bg-gray-600'
                }`}>
                  <HiOutlineCheckCircle className={`text-xl ${
                    watchActive ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                  }`} />
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Active</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {watchActive ? 'Rule will automatically create expenses' : 'Rule is paused'}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  {...register('active')}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>

          {/* Summary Preview Card */}
          {watchAmount && watchStartDate && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-indigo-200 dark:border-indigo-800">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1">
                <HiOutlineRefresh className="text-indigo-500" />
                Next occurrence
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getFrequencyIcon()}</span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      ${parseFloat(watchAmount || 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Every {watchInterval} {watchFrequency}{watchInterval > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                    {getNextOccurrence()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Starting {formatDate(new Date(watchStartDate))}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              {rule ? 'Update Rule' : 'Create Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}