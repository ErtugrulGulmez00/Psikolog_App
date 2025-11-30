import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token')
      if (storedToken) {
        setToken(storedToken)
        await fetchUser()
      } else {
        setLoading(false)
      }
    }
    initAuth()
  }, [])

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me')
      if (response.data.success && response.data.user) {
        setUser(response.data.user)
      } else {
        throw new Error('Invalid response')
      }
    } catch (error) {
      console.error('Fetch user error:', error)
      // Clear invalid token
      localStorage.removeItem('token')
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password })
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Giriş başarısız')
    }
    
    const { token: newToken, user: userData } = response.data
    
    localStorage.setItem('token', newToken)
    setToken(newToken)
    setUser(userData)
    
    return userData
  }

  const register = async (data) => {
    const response = await api.post('/auth/register', data)
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Kayıt başarısız')
    }
    
    const { token: newToken, user: userData } = response.data
    
    localStorage.setItem('token', newToken)
    setToken(newToken)
    setUser(userData)
    
    return userData
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  const updateProfile = async (data) => {
    const response = await api.put('/users/profile', data)
    setUser(response.data.user)
    return response.data.user
  }

  const updateAvatar = async (file) => {
    const formData = new FormData()
    formData.append('avatar', file)
    
    const response = await api.post('/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    
    setUser(prev => ({ ...prev, avatar: response.data.avatar }))
    return response.data.avatar
  }

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user && !!token,
    isPsychologist: user?.role === 'psychologist',
    isPatient: user?.role === 'patient',
    login,
    register,
    logout,
    updateProfile,
    updateAvatar,
    refreshUser: fetchUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
