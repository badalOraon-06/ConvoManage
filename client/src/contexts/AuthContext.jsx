import React, { createContext, useContext, useReducer, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext()

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        loading: true,
        error: null
      }
    
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        loading: false,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        error: null
      }
    
    case 'LOGIN_FAILURE':
      return {
        ...state,
        loading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        error: action.payload
      }
    
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        error: null,
        loading: false
      }
    
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      }
    
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      }
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      }
    
    default:
      return state
  }
}

// Initial state
const initialState = {
  isAuthenticated: false,
  user: null,
  token: localStorage.getItem('token'),
  loading: true,
  error: null
}

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Check if user is authenticated on app load
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      loadUser()
    } else {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [])

  // Load user profile
  const loadUser = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const response = await api.get('/auth/me')
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user: response.data.user,
          token: localStorage.getItem('token')
        }
      })
    } catch (error) {
      console.error('Load user error:', error)
      localStorage.removeItem('token')
      dispatch({ type: 'LOGOUT' })
    }
  }

  // Login function
  const login = async (credentials) => {
    try {
      dispatch({ type: 'LOGIN_START' })
      
      const response = await api.post('/auth/login', credentials)
      const { token, user } = response.data
      
      localStorage.setItem('token', token)
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token }
      })
      
      return { success: true, user }
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed'
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: message
      })
      return { success: false, error: message }
    }
  }

  // Register function
  const register = async (userData) => {
    try {
      dispatch({ type: 'LOGIN_START' })
      
      const response = await api.post('/auth/register', userData)
      const { token, user } = response.data
      
      localStorage.setItem('token', token)
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token }
      })
      
      return { success: true, user }
    } catch (error) {
      const message = error.response?.data?.error || 'Registration failed'
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: message
      })
      return { success: false, error: message }
    }
  }

  // Logout function
  const logout = () => {
    localStorage.removeItem('token')
    dispatch({ type: 'LOGOUT' })
  }

  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/auth/profile', profileData)
      dispatch({
        type: 'UPDATE_USER',
        payload: response.data.user
      })
      return { success: true, user: response.data.user }
    } catch (error) {
      const message = error.response?.data?.error || 'Profile update failed'
      return { success: false, error: message }
    }
  }

  // Change password
  const changePassword = async (passwordData) => {
    try {
      await api.post('/auth/change-password', passwordData)
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.error || 'Password change failed'
      return { success: false, error: message }
    }
  }

  // Clear error
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' })
  }

  const value = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    loadUser,
    clearError
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
