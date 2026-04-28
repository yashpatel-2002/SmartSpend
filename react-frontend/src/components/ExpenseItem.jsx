import { HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi'

export default function ExpenseItem({ expense, onEdit, onDelete }) {
  return (
    <tr>
      <td>{new Date(expense.date).toLocaleDateString()}</td>
      <td>
        <span className="badge" style={{ backgroundColor: expense.category_color }}>{expense.category_name}</span>
      </td>
      <td>{expense.description || '-'}</td>
      <td className="font-medium">${expense.amount.toFixed(2)}</td>
      <td>
        <button className="btn btn-sm btn-ghost" onClick={onEdit}><HiOutlinePencil /></button>
        <button className="btn btn-sm btn-ghost text-error" onClick={onDelete}><HiOutlineTrash /></button>
      </td>
    </tr>
  )
}