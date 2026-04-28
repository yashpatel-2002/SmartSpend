import { useState, useEffect } from 'react'
import { exportExpenses, importExpenses, getImportHistory, getExportStats, deleteImportHistoryItem, clearImportHistory } from '../services/importexport'
import { getExpenses } from '../services/expenses'
import { 
  getPredictions, 
  getAnomalies, 
  getRecommendations, 
  getPredictionHistory,
  getAnomaliesHistory,
  getRecommendationsHistory 
} from '../services/ai'
import toast from 'react-hot-toast'
import { saveAs } from 'file-saver'
import { 
  HiOutlineUpload, 
  HiOutlineDownload, 
  HiOutlineDocumentText,
  HiOutlineDocumentDownload,
  HiOutlineDocumentAdd,
  HiOutlineRefresh,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineCalendar,
  HiOutlineCloudUpload,
  HiOutlineCloudDownload,
  HiOutlineTrash,
  HiOutlineEye,
  HiOutlineInformationCircle,
  HiOutlineChartBar,
  HiOutlineChip,
  HiOutlineLightBulb,
  HiOutlineShieldExclamation,
  HiOutlineX,
  HiOutlineSearch,
  HiOutlineFilter
} from 'react-icons/hi'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import LoadingSpinner from '../components/LoadingSpinner'
import { format, subDays } from 'date-fns'

// Color palette for charts
const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#6366f1']

export default function ImportExport() {
  const [exportFormat, setExportFormat] = useState('csv')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [importFile, setImportFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [importHistory, setImportHistory] = useState([])
  const [exportStats, setExportStats] = useState({
    totalRecords: 0,
    lastImport: null,
    lastExport: null,
    totalImports: 0,
    totalExports: 0,
    monthlyImports: [],
    monthlyExports: [],
    importTrend: []
  })
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false)
  const [showAIAnalysisModal, setShowAIAnalysisModal] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState('overview')
  
  // AI Analysis states - Now loading from database tables only (no automatic generation)
  const [aiAnalysisData, setAiAnalysisData] = useState(null)
  const [generatingAIAnalysis, setGeneratingAIAnalysis] = useState(false)
  const [predictionsHistory, setPredictionsHistory] = useState([])
  const [anomaliesHistory, setAnomaliesHistory] = useState([])
  const [recommendationsHistory, setRecommendationsHistory] = useState([])
  const [showAiHistoryModal, setShowAiHistoryModal] = useState(false)
  const [activeAiHistoryTab, setActiveAiHistoryTab] = useState('predictions')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchImportHistory(),
        fetchExportStats(),
        fetchTotalRecords(),
        fetchAnalyticsData(),
        fetchAIHistory() // Load existing AI history from database
      ])
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to load import/export data')
    } finally {
      setLoading(false)
    }
  }

  const fetchImportHistory = async () => {
    try {
      const history = await getImportHistory()
      setImportHistory(history)
    } catch (error) {
      console.error('Failed to fetch import history:', error)
      setImportHistory([])
    }
  }

  const fetchExportStats = async () => {
    try {
      const stats = await getExportStats()
      setExportStats(prev => ({ ...prev, ...stats }))
    } catch (error) {
      console.error('Failed to fetch export stats:', error)
    }
  }

  const fetchTotalRecords = async () => {
    try {
      const expenses = await getExpenses({ per_page: 1 })
      setExportStats(prev => ({ ...prev, totalRecords: expenses.total || 0 }))
    } catch (error) {
      console.error('Failed to fetch total records:', error)
    }
  }

  const fetchAIHistory = async () => {
    try {
      // Load AI data from database tables (existing data only, no generation)
      const [predictions, anomalies, recommendations] = await Promise.all([
        getPredictionHistory(20).catch(() => []),
        getAnomaliesHistory(false, 50).catch(() => []),
        getRecommendationsHistory(30).catch(() => [])
      ])
      
      setPredictionsHistory(predictions)
      setAnomaliesHistory(anomalies)
      setRecommendationsHistory(recommendations)
      
      console.log('✅ Loaded AI history from database:', {
        predictions: predictions.length,
        anomalies: anomalies.length,
        recommendations: recommendations.length
      })
    } catch (error) {
      console.error('Failed to fetch AI history:', error)
    }
  }

  const fetchAnalyticsData = async () => {
    try {
      const monthlyImports = {}
      const monthlyExports = {}
      
      importHistory.forEach(item => {
        const monthKey = format(new Date(item.date), 'MMM yyyy')
        monthlyImports[monthKey] = (monthlyImports[monthKey] || 0) + 1
      })

      const trendData = Object.keys(monthlyImports).map(month => ({
        month,
        imports: monthlyImports[month] || 0,
        exports: monthlyExports[month] || 0
      }))

      setExportStats(prev => ({
        ...prev,
        monthlyImports: Object.entries(monthlyImports).map(([month, count]) => ({ month, count })),
        monthlyExports: Object.entries(monthlyExports).map(([month, count]) => ({ month, count })),
        importTrend: trendData
      }))
    } catch (error) {
      console.error('Failed to fetch analytics data:', error)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
    toast.success('Data refreshed')
  }

  const validateDateRange = () => {
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates')
      return false
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast.error('Start date cannot be after end date')
      return false
    }
    return true
  }

  const handleExport = async () => {
    if (!validateDateRange()) return
    
    setExporting(true)
    try {
      const blob = await exportExpenses(exportFormat, startDate, endDate)
      const fileName = `expenses_${startDate}_to_${endDate}.${exportFormat}`
      saveAs(blob, fileName)
      
      setExportStats(prev => ({
        ...prev,
        totalExports: (prev.totalExports || 0) + 1,
        lastExport: new Date().toISOString()
      }))
      
      toast.success(`Export completed successfully: ${fileName}`)
      
      await fetchExportStats()
      await fetchTotalRecords()
      
      setStartDate('')
      setEndDate('')
      
    } catch (error) {
      console.error('Export failed:', error)
      
      if (error.response?.status === 501) {
        toast.error(`${exportFormat.toUpperCase()} export is not implemented yet. Please try another format.`)
      } else {
        toast.error(error.response?.data?.error || 'Export failed')
      }
    } finally {
      setExporting(false)
    }
  }

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Please select a file')
      return
    }
    
    const fileExtension = importFile.name.split('.').pop().toLowerCase()
    if (!['csv', 'xlsx', 'xls'].includes(fileExtension)) {
      toast.error('Please select a valid CSV or Excel file')
      return
    }
    
    if (importFile.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit')
      return
    }
    
    setImporting(true)
    try {
      const result = await importExpenses(importFile)
      
      if (result.imported > 0) {
        toast.success(`Successfully imported ${result.imported} expenses`)
        
        setExportStats(prev => ({
          ...prev,
          totalImports: (prev.totalImports || 0) + 1,
          lastImport: new Date().toISOString()
        }))
      }
      
      if (result.errors && result.errors.length > 0) {
        result.errors.forEach(error => {
          toast.error(error, { duration: 5000 })
        })
      }
      
      await Promise.all([
        fetchImportHistory(),
        fetchExportStats(),
        fetchTotalRecords()
      ])
      
      setImportFile(null)
      document.getElementById('file-input').value = ''
      
    } catch (error) {
      console.error('Import failed:', error)
      toast.error(error.response?.data?.error || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  // MANUAL AI ANALYSIS - ONLY triggered by button click
  const handleRunAIAnalysis = async () => {
    setGeneratingAIAnalysis(true)
    setShowAIAnalysisModal(true)
    
    try {
      // Fetch AI insights - ONLY when button is clicked
      const [predictions, anomalies, recommendations] = await Promise.all([
        getPredictions(),
        getAnomalies(),
        getRecommendations()
      ])
      
      const analysisResult = {
        id: Date.now(),
        date: new Date().toISOString(),
        predictions,
        anomalies,
        recommendations,
        summary: {
          anomaliesFound: anomalies?.anomalies?.length || 0,
          recommendationsGenerated: recommendations?.recommendations?.length || 0,
          predictedNextMonth: predictions?.predictions?.next_month || 0,
          trend: predictions?.predictions?.trend || 'stable'
        }
      }
      
      setAiAnalysisData(analysisResult)
      
      // Refresh AI history from database after analysis
      await fetchAIHistory()
      
      toast.success('AI analysis completed and saved to database!')
    } catch (error) {
      console.error('AI analysis failed:', error)
      toast.error('Failed to run AI analysis')
    } finally {
      setGeneratingAIAnalysis(false)
    }
  }

  const handleDeleteHistoryItem = async (id) => {
    setDeletingId(id)
    try {
      await deleteImportHistoryItem(id)
      toast.success('History item deleted')
      await fetchImportHistory()
    } catch (error) {
      toast.error('Failed to delete history item')
    } finally {
      setDeletingId(null)
    }
  }

  const handleClearAllHistory = async () => {
    if (window.confirm('Are you sure you want to clear all import history?')) {
      try {
        await clearImportHistory()
        toast.success('All history cleared')
        await fetchImportHistory()
      } catch (error) {
        toast.error('Failed to clear history')
      }
    }
  }

  const handleViewDetails = (item) => {
    setSelectedHistoryItem(item)
    setShowDetailsModal(true)
  }

  const getStatusIcon = (status) => {
    switch(status) {
      case 'success':
        return <HiOutlineCheckCircle className="text-green-600 dark:text-green-400" />
      case 'warning':
        return <HiOutlineExclamationCircle className="text-yellow-600 dark:text-yellow-400" />
      case 'error':
        return <HiOutlineExclamationCircle className="text-red-600 dark:text-red-400" />
      default:
        return <HiOutlineInformationCircle className="text-blue-600 dark:text-blue-400" />
    }
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'success': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'warning': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'error': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  // Filter import history
  const filteredHistory = importHistory.filter(item => {
    const matchesSearch = item.file.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDate = dateFilter === 'all' || 
      (dateFilter === 'today' && format(new Date(item.date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')) ||
      (dateFilter === 'week' && new Date(item.date) > subDays(new Date(), 7)) ||
      (dateFilter === 'month' && new Date(item.date) > subDays(new Date(), 30))
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    
    return matchesSearch && matchesDate && matchesStatus
  })

  // Calculate import statistics
  const importStats = {
    totalImports: importHistory.length,
    totalRecords: importHistory.reduce((sum, item) => sum + item.count, 0),
    successRate: importHistory.length > 0 
      ? (importHistory.filter(i => i.status === 'success').length / importHistory.length * 100).toFixed(1)
      : 0,
    averageRecords: importHistory.length > 0
      ? Math.round(importHistory.reduce((sum, item) => sum + item.count, 0) / importHistory.length)
      : 0
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Import & Export Data
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm md:text-base">
              Manage your financial data - backup, restore, and transfer
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAiHistoryModal(true)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              title="View AI Analysis History"
            >
              <HiOutlineChartBar className="text-lg" />
              AI History ({predictionsHistory.length + anomaliesHistory.length + recommendationsHistory.length})
            </button>
            <button
              onClick={() => setShowAnalyticsModal(true)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <HiOutlineChartBar className="text-lg" />
              Analytics
            </button>
            <button 
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <HiOutlineRefresh className={`text-lg ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* AI Analysis Button - MANUAL ONLY */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <HiOutlineChip className="text-3xl" />
              </div>
              <div>
                <h2 className="text-xl font-bold">AI-Powered Data Analysis</h2>
                <p className="text-purple-100 mt-1">Click the button to run AI analysis on your expense data</p>
              </div>
            </div>
            <button
              onClick={handleRunAIAnalysis}
              disabled={generatingAIAnalysis}
              className="bg-white text-purple-600 px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {generatingAIAnalysis ? (
                <>
                  <span className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></span>
                  Analyzing...
                </>
              ) : (
                <>
                  <HiOutlineChip className="text-xl" />
                  Run AI Analysis
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <HiOutlineDocumentText className="text-2xl text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Total Records</p>
                <p className="text-xl md:text-2xl font-bold">{exportStats.totalRecords.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <HiOutlineCloudUpload className="text-2xl text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Total Imports</p>
                <p className="text-xl md:text-2xl font-bold">{exportStats.totalImports || importHistory.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <HiOutlineChip className="text-2xl text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">AI Predictions</p>
                <p className="text-xl md:text-2xl font-bold">{predictionsHistory.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <HiOutlineShieldExclamation className="text-2xl text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Anomalies Detected</p>
                <p className="text-xl md:text-2xl font-bold">{anomaliesHistory.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Import/Export Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Export Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 md:p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <HiOutlineDownload className="text-white text-2xl" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Export Data</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Download your expenses as CSV, JSON, or Excel</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Format</label>
                  <select 
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                  >
                    <option value="csv">CSV (.csv)</option>
                    <option value="json">JSON (.json)</option>
                    <option value="xlsx">Excel (.xlsx)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={endDate || undefined}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || undefined}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              {startDate && endDate && (
                <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Date range:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-600 dark:text-gray-400">Days selected:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1} days
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={handleExport}
                disabled={exporting || !startDate || !endDate}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {exporting ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <HiOutlineDocumentDownload className="text-lg" />
                    Export Now
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Import Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 md:p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                <HiOutlineUpload className="text-white text-2xl" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Import Data</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Upload CSV or Excel files to add expenses</p>
              </div>
            </div>

            <div className="space-y-4">
              <div 
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                  importFile 
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-600/50 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <input
                  id="file-input"
                  type="file"
                  className="hidden"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files[0])}
                />
                
                {importFile ? (
                  <div className="space-y-3">
                    <div className="text-4xl">📄</div>
                    <p className="font-medium text-gray-900 dark:text-white">{importFile.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatFileSize(importFile.size)}
                    </p>
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => {
                          setImportFile(null)
                          document.getElementById('file-input').value = ''
                        }}
                        className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        Choose different file
                      </button>
                    </div>
                  </div>
                ) : (
                  <label htmlFor="file-input" className="cursor-pointer block">
                    <div className="text-4xl mb-3">📁</div>
                    <p className="font-medium text-gray-900 dark:text-white">Click to upload or drag and drop</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      CSV or Excel files (max 10MB)
                    </p>
                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg mt-4 transition-colors">
                      Select File
                    </button>
                  </label>
                )}
              </div>

              <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4">
                <h3 className="font-medium mb-2 text-gray-900 dark:text-white">File Requirements:</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Required columns: date, category, amount</li>
                  <li>• Optional columns: description</li>
                  <li>• Date format: YYYY-MM-DD or DD/MM/YYYY</li>
                  <li>• Amount format: numbers with decimal point (e.g., 45.99)</li>
                  <li>• Categories will be created automatically if they don't exist</li>
                </ul>
              </div>

              <button
                onClick={handleImport}
                disabled={importing || !importFile}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {importing ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <HiOutlineDocumentAdd className="text-lg" />
                    Import Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Import History with Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h3 className="text-lg font-semibold">Import History</h3>
            
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="all">All Status</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>

              {importHistory.length > 0 && (
                <button 
                  className="px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-600 dark:text-red-400 flex items-center gap-2"
                  onClick={handleClearAllHistory}
                >
                  <HiOutlineTrash className="text-lg" />
                  Clear All
                </button>
              )}
            </div>
          </div>
          
          {filteredHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">File Name</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Records</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="py-3 px-4 text-sm">{format(new Date(item.date), 'MMM d, yyyy HH:mm')}</td>
                      <td className="py-3 px-4 text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <HiOutlineDocumentText className="text-blue-600 dark:text-blue-400" />
                          <span className="truncate max-w-[200px]">{item.file}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">{item.count} {item.count === 1 ? 'expense' : 'expenses'}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.status)}
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button 
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            onClick={() => handleViewDetails(item)}
                            title="View details"
                          >
                            <HiOutlineEye className="text-lg text-gray-600 dark:text-gray-400" />
                          </button>
                          <button 
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            onClick={() => handleDeleteHistoryItem(item.id)}
                            disabled={deletingId === item.id}
                            title="Delete"
                          >
                            {deletingId === item.id ? (
                              <span className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin block" />
                            ) : (
                              <HiOutlineTrash className="text-lg text-red-600 dark:text-red-400" />
                            )}
                          </button>
                        </div>
                        </td>
                       </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <HiOutlineDocumentText className="text-4xl mx-auto mb-3 opacity-50" />
              <p>No import history found</p>
              <p className="text-sm mt-2">
                {searchTerm || dateFilter !== 'all' || statusFilter !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Your imported files will appear here'}
              </p>
            </div>
          )}
        </div>

        {/* AI Analysis Summary Card */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-purple-100 dark:border-purple-800">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
              <HiOutlineChip className="text-xl text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium mb-3 text-gray-900 dark:text-white">AI Analysis Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Predictions</p>
                  <p className="text-xl font-bold text-purple-600">{predictionsHistory.length}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Latest: {predictionsHistory[0] ? `$${predictionsHistory[0].predicted_amount?.toFixed(2)}` : 'None'}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Anomalies</p>
                  <p className="text-xl font-bold text-red-600">{anomaliesHistory.length}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {anomaliesHistory.filter(a => !a.is_reviewed).length} unreviewed
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Recommendations</p>
                  <p className="text-xl font-bold text-green-600">{recommendationsHistory.length}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Active recommendations
                  </p>
                </div>
              </div>
              <div className="mt-4 text-center">
                <button
                  onClick={handleRunAIAnalysis}
                  disabled={generatingAIAnalysis}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors inline-flex items-center gap-2"
                >
                  {generatingAIAnalysis ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Running Analysis...
                    </>
                  ) : (
                    <>
                      <HiOutlineChip className="text-lg" />
                      Run New AI Analysis
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Analysis Modal - Shows results after manual button click */}
      {showAIAnalysisModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 sticky top-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <HiOutlineChip className="text-white text-xl" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">AI Analysis Results</h3>
                    <p className="text-white/80 text-sm mt-1">
                      {generatingAIAnalysis ? 'Analyzing your data...' : 'Analysis Complete'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAIAnalysisModal(false)}
                  className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <HiOutlineX className="text-white text-xl" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {generatingAIAnalysis ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Running AI analysis on your data...</p>
                  <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
                </div>
              ) : aiAnalysisData ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Next Month Prediction</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        ${aiAnalysisData.summary.predictedNextMonth.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Anomalies Found</p>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {aiAnalysisData.summary.anomaliesFound}
                      </p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Recommendations</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {aiAnalysisData.summary.recommendationsGenerated}
                      </p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Trend</p>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 capitalize">
                        {aiAnalysisData.summary.trend}
                      </p>
                    </div>
                  </div>

                  {aiAnalysisData.anomalies?.anomalies?.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                        <HiOutlineShieldExclamation className="text-red-500" />
                        Detected Anomalies
                      </h4>
                      <div className="space-y-3">
                        {aiAnalysisData.anomalies.anomalies.slice(0, 3).map((anomaly, index) => (
                          <div key={index} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                            <p className="font-medium">{anomaly.category}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{anomaly.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {aiAnalysisData.recommendations?.recommendations?.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                        <HiOutlineLightBulb className="text-yellow-500" />
                        Recommendations
                      </h4>
                      <div className="space-y-3">
                        {aiAnalysisData.recommendations.recommendations.slice(0, 3).map((rec, index) => (
                          <div key={index} className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                            <p className="font-medium">{rec.title}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{rec.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600 dark:text-gray-400">No analysis data available. Click "Run AI Analysis" to generate insights.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI History Modal */}
      {showAiHistoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 sticky top-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <HiOutlineChartBar className="text-white text-xl" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">AI Analysis History</h3>
                    <p className="text-white/80 text-sm mt-1">All AI analyses saved in database</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAiHistoryModal(false)}
                  className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <HiOutlineX className="text-white text-xl" />
                </button>
              </div>
            </div>

            <div className="border-b border-gray-200 dark:border-gray-700 px-6 pt-4">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveAiHistoryTab('predictions')}
                  className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                    activeAiHistoryTab === 'predictions'
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                  }`}
                >
                  Predictions ({predictionsHistory.length})
                </button>
                <button
                  onClick={() => setActiveAiHistoryTab('anomalies')}
                  className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                    activeAiHistoryTab === 'anomalies'
                      ? 'text-red-600 dark:text-red-400 border-b-2 border-red-600'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                  }`}
                >
                  Anomalies ({anomaliesHistory.length})
                </button>
                <button
                  onClick={() => setActiveAiHistoryTab('recommendations')}
                  className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                    activeAiHistoryTab === 'recommendations'
                      ? 'text-green-600 dark:text-green-400 border-b-2 border-green-600'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                  }`}
                >
                  Recommendations ({recommendationsHistory.length})
                </button>
              </div>
            </div>

            <div className="p-6">
              {activeAiHistoryTab === 'predictions' && (
                <div>
                  {predictionsHistory.length > 0 ? (
                    <div className="space-y-4">
                      {predictionsHistory.map((pred) => (
                        <div key={pred.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {format(new Date(pred.created_at), 'PPP pp')}
                              </p>
                              <p className="text-xl font-bold text-blue-600 mt-2">
                                ${pred.predicted_amount?.toFixed(2)}
                              </p>
                              <div className="flex gap-4 mt-2">
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                  Month: {pred.month}/{pred.year}
                                </span>
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                  Confidence: {pred.confidence}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <HiOutlineChip className="text-5xl text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">No predictions yet. Run AI analysis to generate predictions.</p>
                    </div>
                  )}
                </div>
              )}

              {activeAiHistoryTab === 'anomalies' && (
                <div>
                  {anomaliesHistory.length > 0 ? (
                    <div className="space-y-4">
                      {anomaliesHistory.map((anomaly) => (
                        <div key={anomaly.id} className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <HiOutlineShieldExclamation className="text-red-500" />
                                <span className="font-medium">{anomaly.category}</span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{anomaly.reason}</p>
                              <div className="flex gap-4 mt-3">
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                                  {anomaly.severity}
                                </span>
                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                                  {anomaly.date ? format(new Date(anomaly.date), 'MMM d, yyyy') : 'No date'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <HiOutlineShieldExclamation className="text-5xl text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">No anomalies detected. Run AI analysis to find unusual transactions.</p>
                    </div>
                  )}
                </div>
              )}

              {activeAiHistoryTab === 'recommendations' && (
                <div>
                  {recommendationsHistory.length > 0 ? (
                    <div className="space-y-4">
                      {recommendationsHistory.map((rec) => (
                        <div key={rec.id} className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                          <div className="flex items-start gap-3">
                            <HiOutlineLightBulb className="text-green-600 text-xl mt-1" />
                            <div>
                              <p className="font-medium">{rec.title}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{rec.description}</p>
                              <p className="text-xs text-gray-500 mt-2">
                                {format(new Date(rec.created_at), 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <HiOutlineLightBulb className="text-5xl text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">No recommendations yet. Run AI analysis to get personalized advice.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedHistoryItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 sticky top-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <HiOutlineDocumentText className="text-white text-xl" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Import Details</h3>
                    <p className="text-white/80 text-sm mt-1">Complete information about this import</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowDetailsModal(false)}
                  className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <HiOutlineX className="text-white text-xl" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Import Date</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                    {format(new Date(selectedHistoryItem.date), 'PPP')}
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Records Imported</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400 mt-1">
                    {selectedHistoryItem.count}
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">File Name:</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white max-w-[300px] truncate">
                    {selectedHistoryItem.file}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Status:</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedHistoryItem.status)}
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(selectedHistoryItem.status)}`}>
                      {selectedHistoryItem.status}
                    </span>
                  </div>
                </div>
              </div>

              {selectedHistoryItem.errors && selectedHistoryItem.errors.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-3">Errors Encountered</h4>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 max-h-60 overflow-y-auto">
                    {selectedHistoryItem.errors.map((error, index) => (
                      <div key={index} className="flex items-start gap-2 mb-2">
                        <HiOutlineExclamationCircle className="text-red-500 text-lg flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button 
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </button>
                <button 
                  onClick={handleRunAIAnalysis}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <HiOutlineChip className="text-lg" />
                  Run AI Analysis
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {showAnalyticsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 sticky top-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <HiOutlineChartBar className="text-white text-xl" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Import/Export Analytics</h3>
                    <p className="text-white/80 text-sm mt-1">Detailed insights about your data transfers</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAnalyticsModal(false)}
                  className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <HiOutlineX className="text-white text-xl" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Import Success Rate</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{importStats.successRate}%</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Avg Records/Import</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{importStats.averageRecords}</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Total Imports</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{importStats.totalImports}</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Total Exports</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{exportStats.totalExports || 0}</p>
                </div>
              </div>

              <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setActiveAnalyticsTab('overview')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeAnalyticsTab === 'overview'
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveAnalyticsTab('trends')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeAnalyticsTab === 'trends'
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                  }`}
                >
                  Trends
                </button>
              </div>

              {activeAnalyticsTab === 'overview' && (
                <div className="space-y-6">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <h4 className="text-sm font-medium mb-4">Import Activity Trend</h4>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={exportStats.importTrend}>
                          <defs>
                            <linearGradient id="importGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Area type="monotone" dataKey="imports" stroke="#3b82f6" fill="url(#importGradient)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <h4 className="text-sm font-medium mb-4">Status Distribution</h4>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Success', value: importHistory.filter(i => i.status === 'success').length },
                              { name: 'Warning', value: importHistory.filter(i => i.status === 'warning').length },
                              { name: 'Error', value: importHistory.filter(i => i.status === 'error').length }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            fill="#8884d8"
                            paddingAngle={2}
                            dataKey="value"
                            label
                          >
                            {[0, 1, 2].map((index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {activeAnalyticsTab === 'trends' && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h4 className="text-sm font-medium mb-4">Imports Over Time</h4>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={exportStats.importTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="imports" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button 
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  onClick={() => setShowAnalyticsModal(false)}
                >
                  Close Analytics
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}} />
    </div>
  )
}