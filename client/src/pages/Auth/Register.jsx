import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from 'react-hot-toast'
import Input from '../../components/UI/Input'
import Button from '../../components/UI/Button'

const Register = () => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    password: '',
    confirmPassword: '',
    terms: false
  })
  const [errors, setErrors] = useState({})
  const [showErrors, setShowErrors] = useState(false)
  
  const { register: registerUser, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/app/dashboard', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    // Clear error when user starts typing
    if (showErrors && errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required'
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
    } else if (formData.name.length > 50) {
      newErrors.name = 'Name cannot exceed 50 characters'
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    if (!formData.role) {
      newErrors.role = 'Please select a role'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    
    if (!formData.terms) {
      newErrors.terms = 'You must agree to the terms and conditions'
    }
    
    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setShowErrors(true)
    
    const validationErrors = validateForm()
    setErrors(validationErrors)
    
    if (Object.keys(validationErrors).length > 0) {
      return
    }
    
    setLoading(true)
    
    try {
      const result = await registerUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role
      })
      
      if (result.success) {
        toast.success('Registration successful! Welcome to ConvoManage!')
        navigate('/app/dashboard', { replace: true })
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">C</span>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              to="/login"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              label="Full name"
              type="text"
              name="name"
              autoComplete="name"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleInputChange}
              error={showErrors ? errors.name : ''}
            />

            <Input
              label="Email address"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleInputChange}
              error={showErrors ? errors.email : ''}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                <option value="">Select your role</option>
                <option value="attendee">Attendee</option>
                <option value="speaker">Speaker</option>
              </select>
              {showErrors && errors.role && (
                <p className="mt-1 text-sm text-red-600">{errors.role}</p>
              )}
            </div>

            <Input
              label="Password"
              type="password"
              name="password"
              autoComplete="new-password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleInputChange}
              error={showErrors ? errors.password : ''}
            />

            <Input
              label="Confirm password"
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              error={showErrors ? errors.confirmPassword : ''}
            />
          </div>

          <div className="flex items-center">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              checked={formData.terms}
              onChange={handleInputChange}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
              I agree to the{' '}
              <a href="#" className="text-primary-600 hover:text-primary-500">
                Terms and Conditions
              </a>{' '}
              and{' '}
              <a href="#" className="text-primary-600 hover:text-primary-500">
                Privacy Policy
              </a>
            </label>
          </div>
          {showErrors && errors.terms && (
            <p className="text-sm text-red-600">{errors.terms}</p>
          )}

          <div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              loading={loading}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
          </div>
        </form>

        <div className="text-center">
          <Link
            to="/"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Register
