import { useState } from 'react'
import ExpenseItem from './ExpenseItem'
import ConfirmationModal from './ConfirmationModal'
import ExpenseForm from './ExpenseForm'
import { deleteExpense } from '../services/expenses'
import toast from 'react-hot-toast'

export default function ExpenseList({ expenses, onRefresh }) {
  const [editingExpense, setEditingExpense] = useState(null)
  const [deletingExpense, setDeletingExpense] = useState(null)

  const handleDelete = async () => {
    try {
      await deleteExpense(deletingExpense.id)
      toast.success('Expense deleted')
      onRefresh()
    } catch (error) {
      toast.error('Failed to delete expense')
    } finally {
      setDeletingExpense(null)
    }
  }

  if (expenses.length === 0) {
    return <p className="text-center py-8 text-base-content/70">No expenses found. Add one!</p>
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map(exp => (
              <ExpenseItem
                key={exp.id}
                expense={exp}
                onEdit={() => setEditingExpense(exp)}
                onDelete={() => setDeletingExpense(exp)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {editingExpense && (
        <ExpenseForm
          expense={editingExpense}
          onClose={() => setEditingExpense(null)}
          onSuccess={() => {
            setEditingExpense(null)
            onRefresh()
          }}
        />
      )}

      {deletingExpense && (
        <ConfirmationModal
          title="Delete Expense"
          message={`Are you sure you want to delete "${deletingExpense.description || 'expense'}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingExpense(null)}
        />
      )}
    </>
  )
}