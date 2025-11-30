import axios from 'axios'

// Use environment variable in production, localhost in development
const getBaseURL = () => {
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_API_URL 
      ? `${import.meta.env.VITE_API_URL}/api` 
      : '/api'
  }
  return 'http://localhost:5000/api'
}

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000
})

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updatePassword: (data) => api.put('/auth/update-password', data)
}

// Users API
export const usersAPI = {
  getPsychologists: (params) => api.get('/users/psychologists', { params }),
  getPsychologist: (id) => api.get(`/users/psychologist/${id}`),
  updateProfile: (data) => api.put('/users/profile', data),
  uploadAvatar: (formData) => api.post('/users/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getMyPatients: () => api.get('/users/my-patients'),
  getSpecializations: () => api.get('/users/specializations')
}

// Appointments API
export const appointmentsAPI = {
  create: (data) => api.post('/appointments', data),
  getAll: (params) => api.get('/appointments', { params }),
  getOne: (id) => api.get(`/appointments/${id}`),
  updateStatus: (id, data) => api.put(`/appointments/${id}/status`, data),
  getAvailability: (psychologistId, date) => 
    api.get(`/appointments/psychologist/${psychologistId}/availability`, { params: { date } })
}

// Messages API
export const messagesAPI = {
  getConversations: () => api.get('/messages/conversations'),
  createConversation: (participantId) => api.post('/messages/conversations', { participantId }),
  getMessages: (conversationId, params) => api.get(`/messages/${conversationId}`, { params }),
  sendMessage: (conversationId, data) => api.post(`/messages/${conversationId}`, data),
  sendFile: (conversationId, formData) => api.post(`/messages/${conversationId}/file`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// Notes API
export const notesAPI = {
  create: (data) => api.post('/notes', data),
  getAll: (params) => api.get('/notes', { params }),
  getOne: (id) => api.get(`/notes/${id}`),
  update: (id, data) => api.put(`/notes/${id}`, data),
  delete: (id) => api.delete(`/notes/${id}`),
  addAttachment: (id, formData) => api.post(`/notes/${id}/attachment`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// Blog API
export const blogAPI = {
  getAll: (params) => api.get('/blog', { params }),
  getOne: (slug) => api.get(`/blog/${slug}`),
  getMyPosts: (params) => api.get('/blog/my-posts', { params }),
  create: (data) => api.post('/blog', data),
  update: (id, data) => api.put(`/blog/${id}`, data),
  delete: (id) => api.delete(`/blog/${id}`),
  like: (id) => api.post(`/blog/${id}/like`),
  uploadCover: (id, formData) => api.post(`/blog/${id}/cover`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getComments: (id) => api.get(`/blog/${id}/comments`),
  addComment: (id, data) => api.post(`/blog/${id}/comments`, data),
  getCategories: () => api.get('/blog/categories/list')
}

// Payments API
export const paymentsAPI = {
  initiate: (appointmentId) => api.post('/payments/initiate', { appointmentId }),
  complete: (data) => api.post('/payments/complete', data),
  getAll: (params) => api.get('/payments', { params }),
  getOne: (id) => api.get(`/payments/${id}`),
  refund: (id, data) => api.post(`/payments/${id}/refund`, data),
  getEarnings: (params) => api.get('/payments/psychologist/earnings', { params })
}

export default api


