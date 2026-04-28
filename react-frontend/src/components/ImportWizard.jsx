import { useState } from 'react'
import { importExpenses } from '../services/importexport'
import toast from 'react-hot-toast'

export default function ImportWizard({ onComplete }) {
  const [step, setStep] = useState(1) // 1: upload, 2: preview, 3: results
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)

  const handleFileChange = (e) => {
    const selected = e.target.files[0]
    setFile(selected)
    // Simple preview: read first 5 lines
    const reader = new FileReader()
    reader.onload = (event) => {
      const lines = event.target.result.split('\n').slice(0, 5)
      setPreview(lines)
    }
    reader.readAsText(selected)
    setStep(2)
  }

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    try {
      const res = await importExpenses(file)
      setResult(res)
      setStep(3)
      toast.success(`Imported ${res.imported} expenses`)
      if (onComplete) onComplete()
    } catch (error) {
      toast.error('Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="card bg-base-100 shadow-lg">
      <div className="card-body">
        <h2 className="card-title">Import Expenses</h2>

        {step === 1 && (
          <div>
            <input
              type="file"
              className="file-input file-input-bordered w-full"
              accept=".csv"
              onChange={handleFileChange}
            />
            <p className="text-sm text-base-content/70 mt-2">
              CSV must have columns: date, category, amount, description (optional)
            </p>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="font-semibold">Preview (first 5 rows)</h3>
            <pre className="bg-base-200 p-2 rounded mt-2 overflow-x-auto">
              {preview.join('\n')}
            </pre>
            <div className="flex justify-end gap-2 mt-4">
              <button className="btn" onClick={() => setStep(1)}>Back</button>
              <button className="btn btn-primary" onClick={handleImport} disabled={importing}>
                {importing ? 'Importing...' : 'Confirm Import'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && result && (
          <div>
            <div className={`alert ${result.errors.length === 0 ? 'alert-success' : 'alert-warning'}`}>
              <p>Imported: {result.imported} expenses</p>
              {result.errors.length > 0 && (
                <details className="mt-2">
                  <summary>View {result.errors.length} errors</summary>
                  <pre className="text-xs mt-2">{result.errors.join('\n')}</pre>
                </details>
              )}
            </div>
            <button className="btn btn-primary mt-4" onClick={() => { setStep(1); setFile(null); setResult(null); }}>
              Import Another
            </button>
          </div>
        )}
      </div>
    </div>
  )
}