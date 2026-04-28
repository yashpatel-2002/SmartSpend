import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { createExpense, updateExpense } from '../services/expenses'
import { getCategories } from '../services/categories'
import toast from 'react-hot-toast'
import { HiOutlineX, HiOutlineCalendar, HiOutlineTag, HiOutlineCurrencyDollar, HiOutlinePencil } from 'react-icons/hi'

export default function ExpenseForm({ expense, onClose, onSuccess }) {
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm({
    defaultValues: expense || {
      amount: '',
      category_id: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    }
  })
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1) // For multi-step form on mobile

  const amount = watch('amount')

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const data = await getCategories()
      setCategories(data)
    } catch (error) {
      toast.error('Failed to load categories')
    }
  }

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      if (expense) {
        await updateExpense(expense.id, data)
        toast.success('Expense updated successfully!')
      } else {
        await createExpense(data)
        toast.success('Expense added successfully!')
      }
      onSuccess()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Operation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl p-0 overflow-hidden bg-base-100 rounded-3xl">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-primary to-secondary p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white">
                {expense ? 'Edit Expense' : 'Add New Expense'}
              </h3>
              <p className="text-white/80 mt-1">
                {expense ? 'Update your expense details' : 'Track your spending'}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="btn btn-circle btn-ghost text-white hover:bg-white/20"
            >
              <HiOutlineX className="text-2xl" />
            </button>
          </div>
        </div>

        {/* Form content */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          {/* Step indicators for mobile */}
          <div className="flex lg:hidden gap-2 mb-6">
            {[1, 2, 3].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                  step === i 
                    ? 'bg-primary text-white' 
                    : 'bg-base-200 text-base-content/60'
                }`}
              >
                Step {i}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Step 1: Amount & Date (always visible on desktop, conditional on mobile) */}
            <div className={`space-y-4 ${step === 1 || window.innerWidth >= 1024 ? 'block' : 'hidden'}`}>
              <h4 className="font-medium text-base-content/70 lg:hidden">Step 1: Amount & Date</h4>
              
              {/* Amount input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-base-content/70">Amount</label>
                <div className="relative group">
                  <HiOutlineCurrencyDollar className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40 group-focus-within:text-primary transition-colors" />
                  <input
                    type="number"
                    step="0.01"
                    className={`input-modern w-full pl-12 pr-4 py-3 ${errors.amount ? 'border-error' : ''}`}
                    placeholder="0.00"
                    {...register('amount', { 
                      required: 'Amount is required', 
                      min: { value: 0.01, message: 'Amount must be greater than 0' }
                    })}
                  />
                </div>
                {errors.amount && (
                  <p className="text-error text-sm mt-1">{errors.amount.message}</p>
                )}
              </div>

              {/* Date input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-base-content/70">Date</label>
                <div className="relative group">
                  <HiOutlineCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40 group-focus-within:text-primary transition-colors" />
                  <input
                    type="date"
                    className={`input-modern w-full pl-12 pr-4 py-3 ${errors.date ? 'border-error' : ''}`}
                    {...register('date', { required: 'Date is required' })}
                  />
                </div>
                {errors.date && (
                  <p className="text-error text-sm mt-1">{errors.date.message}</p>
                )}
              </div>
            </div>

            {/* Step 2: Category & Description (always visible on desktop, conditional on mobile) */}
            <div className={`space-y-4 ${step === 2 || window.innerWidth >= 1024 ? 'block' : 'hidden'}`}>
              <h4 className="font-medium text-base-content/70 lg:hidden">Step 2: Category & Details</h4>
              
              {/* Category select */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-base-content/70">Category</label>
                <div className="relative group">
                  <HiOutlineTag className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40 group-focus-within:text-primary transition-colors" />
                  <select
                    className={`input-modern w-full pl-12 pr-4 py-3 ${errors.category_id ? 'border-error' : ''}`}
                    {...register('category_id', { required: 'Category is required' })}
                  >
                    <option value="">Select a category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id} style={{ backgroundColor: cat.color + '20' }}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.category_id && (
                  <p className="text-error text-sm mt-1">{errors.category_id.message}</p>
                )}
              </div>

              {/* Description input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-base-content/70">Description (optional)</label>
                <div className="relative group">
                  <HiOutlinePencil className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/40 group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    className="input-modern w-full pl-12 pr-4 py-3"
                    placeholder="e.g., Grocery shopping"
                    {...register('description')}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Preview & Submit (mobile only) */}
          {step === 3 && (
            <div className="mt-6 p-4 bg-base-200/50 rounded-xl space-y-3">
              <h4 className="font-medium">Review your expense</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-base-content/40">Amount</p>
                  <p className="font-semibold">${amount || '0.00'}</p>
                </div>
                <div>
                  <p className="text-base-content/40">Date</p>
                  <p className="font-semibold">{watch('date')}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-base-content/40">Category</p>
                  <p className="font-semibold">
                    {categories.find(c => c.id === Number(watch('category_id')))?.name || 'Not selected'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation buttons for mobile */}
          <div className="flex lg:hidden justify-between mt-6">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="btn btn-outline"
              >
                Previous
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="btn btn-primary ml-auto"
                disabled={step === 1 && (!watch('amount') || !watch('date'))}
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                className="btn btn-primary ml-auto"
                disabled={loading}
              >
                {loading ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  expense ? 'Update Expense' : 'Add Expense'
                )}
              </button>
            )}
          </div>

          {/* Desktop submit button */}
          <div className="hidden lg:flex justify-end gap-3 mt-8">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary px-8"
              disabled={loading}
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                expense ? 'Update Expense' : 'Add Expense'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}