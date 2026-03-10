import axios from 'axios'

const API_BASE_URL = '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

export const assetAPI = {
  getAll: () => api.get('/assets'),
  getById: (id) => api.get(`/assets/${id}`),
  create: (data) => api.post('/assets', data),
  update: (id, data) => api.put(`/assets/${id}`, data),
  delete: (id) => api.delete(`/assets/${id}`)
}

export const maintenanceItemAPI = {
  getAll: (assetId) => api.get('/maintenance-items', { params: { asset_id: assetId } }),
  getById: (id) => api.get(`/maintenance-items/${id}`),
  create: (data) => api.post('/maintenance-items', data),
  update: (id, data) => api.put(`/maintenance-items/${id}`, data),
  delete: (id) => api.delete(`/maintenance-items/${id}`)
}

export const maintenanceLogAPI = {
  getAll: (itemId) => api.get('/maintenance-logs', { params: { maintenance_item_id: itemId } }),
  getById: (id) => api.get(`/maintenance-logs/${id}`),
  create: (data) => {
    if (data instanceof FormData) {
      return axios.post(`${API_BASE_URL}/maintenance-logs`, data)
    }
    return api.post('/maintenance-logs', data)
  },
  update: (id, data) => {
    if (data instanceof FormData) {
      return axios.put(`${API_BASE_URL}/maintenance-logs/${id}`, data)
    } else {
      return api.put(`/maintenance-logs/${id}`, data)
    }
  },
  delete: (id) => api.delete(`/maintenance-logs/${id}`),
  deleteAttachment: (id) => api.delete(`/maintenance-logs/attachments/${id}`)
}

export const generalMaintenanceAPI = {
  getAll: (assetId) => api.get(`/general-maintenance`, { params: { asset_id: assetId } }),
  getById: (id) => api.get(`/general-maintenance/${id}`),
  create: (data) => axios.post(`${API_BASE_URL}/general-maintenance`, data),
  update: (id, data) => {
    if (data instanceof FormData) {
      return axios.put(`${API_BASE_URL}/general-maintenance/${id}`, data)
    } else {
      return api.put(`/general-maintenance/${id}`, data)
    }
  },
  delete: (id) => api.delete(`/general-maintenance/${id}`),
  deleteAttachment: (id) => api.delete(`/general-maintenance/attachments/${id}`)
}

export const backupAPI = {
  export: () => {
    return axios.get(`${API_BASE_URL}/backup/export`, {
      responseType: 'blob'
    })
  },
  import: (file, mode = 'merge') => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('mode', mode)
    return axios.post(`${API_BASE_URL}/backup/import`, formData)
  }
}

export default api
