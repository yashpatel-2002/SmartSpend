import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { getCategories } from '../services/categories'
import Input from './Forms/Input'
import Select from './Forms/Select'

export default function RecurringRuleForm({ rule, onClose, onSubmit }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
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

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const data = await getCategories()
      setCategories(data)
    } catch (error) {
      console.error('Failed to load categories')
    }
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">{rule ? 'Edit Recurring Rule' : 'New Recurring Rule'}</h3>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Select
            label="Category"
            {...register('category_id', { required: 'Category is required' })}
            error={errors.category_id?.message}
          >
            <option value="">Select category</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </Select>

          <Input
            label="Amount ($)"
            type="number"
            step="0.01"
            {...register('amount', { required: 'Amount is required', min: 0.01 })}
            error={errors.amount?.message}
          />

          <Input
            label="Description (optional)"
            {...register('description')}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select label="Frequency" {...register('frequency')}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </Select>

            <Input
              label="Interval"
              type="number"
              min="1"
              {...register('interval')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              {...register('start_date', { required: 'Start date is required' })}
              error={errors.start_date?.message}
            />
            <Input
              label="End Date (optional)"
              type="date"
              {...register('end_date')}
            />
          </div>

          <div className="form-control mt-4">
            <label className="label cursor-pointer">
              <span className="label-text">Active</span>
              <input type="checkbox" className="checkbox" {...register('active')} />
            </label>
          </div>

          <div className="modal-action">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}