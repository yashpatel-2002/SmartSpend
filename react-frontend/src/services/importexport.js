import api from './api'

export const exportExpenses = async (format, startDate, endDate) => {
  try {
    const response = await api.get('/importexport/export', {
      params: { format, start_date: startDate, end_date: endDate },
      responseType: 'blob'
    })
    return response.data
  } catch (error) {
    // Re-throw with better error message
    if (error.response?.status === 501) {
      throw new Error(`${format.toUpperCase()} export is not implemented yet`)
    }
    throw error
  }
}

export const importExpenses = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  try {
    const response = await api.post('/importexport/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  } catch (error) {
    throw error
  }
}

export const getImportHistory = async () => {
  try {
    const response = await api.get('/importexport/history')
    return response.data
  } catch (error) {
    console.error('Failed to fetch import history:', error)
    return []
  }
}

export const getExportStats = async () => {
  try {
    const response = await api.get('/importexport/stats')
    return response.data
  } catch (error) {
    console.error('Failed to fetch export stats:', error)
    return {}
  }
}

export const clearImportHistory = async () => {
  try {
    const response = await api.delete('/importexport/history/clear')
    return response.data
  } catch (error) {
    throw error
  }
}

export const deleteImportHistoryItem = async (id) => {
  try {
    const response = await api.delete(`/importexport/history/${id}`)
    return response.data
  } catch (error) {
    throw error
  }
}