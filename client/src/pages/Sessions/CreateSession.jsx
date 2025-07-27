import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import Button from '../../components/UI/Button'
import Input from '../../components/UI/Input'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import { toast } from 'react-hot-toast'

const CreateSession = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [speakers, setSpeakers] = useState([])
  const [loadingSpeakers, setLoadingSpeakers] = useState(true)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    speaker: user?.role === 'speaker' ? user.id : '',
    date: '',
    startTime: '',
    endTime: '',
    maxAttendees: 100,
    category: 'other',
    tags: '',
    meetingLink: '',
    resources: []
  })

  const [errors, setErrors] = useState({})

  useEffect(() => {
    fetchSpeakers()
  }, [])

  const fetchSpeakers = async () => {
    try {
      const response = await api.get('/users/speakers/list')
      setSpeakers(response.data.speakers || [])
    } catch (error) {
      console.error('Error fetching speakers:', error)
      toast.error('Failed to fetch speakers')
    } finally {
      setLoadingSpeakers(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title cannot exceed 100 characters'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    } else if (formData.description.length > 1000) {
      newErrors.description = 'Description cannot exceed 1000 characters'
    }

    if (!formData.speaker) {
      newErrors.speaker = 'Speaker is required'
    }

    if (!formData.date) {
      newErrors.date = 'Date is required'
    } else {
      const selectedDate = new Date(formData.date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (selectedDate < today) {
        newErrors.date = 'Date must be in the future'
      }
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required'
    }

    if (!formData.endTime) {
      newErrors.endTime = 'End time is required'
    }

    if (formData.startTime && formData.endTime) {
      const start = new Date(`2000-01-01T${formData.startTime}:00`)
      const end = new Date(`2000-01-01T${formData.endTime}:00`)
      if (end <= start) {
        newErrors.endTime = 'End time must be after start time'
      }
    }

    if (formData.maxAttendees < 1) {
      newErrors.maxAttendees = 'Max attendees must be at least 1'
    } else if (formData.maxAttendees > 1000) {
      newErrors.maxAttendees = 'Max attendees cannot exceed 1000'
    }

    if (formData.meetingLink && !isValidUrl(formData.meetingLink)) {
      newErrors.meetingLink = 'Please enter a valid URL'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isValidUrl = (string) => {
    try {
      new URL(string)
      return true
    } catch (_) {
      return false
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      const payload = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        maxAttendees: parseInt(formData.maxAttendees)
      }

      const response = await api.post('/sessions', payload)
      toast.success('Session created successfully!')
      navigate(`/sessions/${response.data.session._id}`)
    } catch (error) {
      console.error('Error creating session:', error)
      toast.error(error.response?.data?.error || 'Failed to create session')
    } finally {
      setLoading(false)
    }
  }

  if (loadingSpeakers) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/sessions')}
          className="text-gray-600 hover:text-gray-800"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Session</h1>
          <p className="text-gray-600">Set up a new learning session</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
            
            <div>
              <Input
                label="Session Title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter session title"
                error={errors.title}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe what this session is about..."
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Speaker *
                </label>
                <select
                  name="speaker"
                  value={formData.speaker}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.speaker ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                  disabled={user?.role === 'speaker'}
                >
                  <option value="">Select a speaker</option>
                  {speakers.map(speaker => (
                    <option key={speaker._id} value={speaker._id}>
                      {speaker.name} ({speaker.email})
                    </option>
                  ))}
                </select>
                {errors.speaker && (
                  <p className="mt-1 text-sm text-red-600">{errors.speaker}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="technology">Technology</option>
                  <option value="business">Business</option>
                  <option value="health">Health</option>
                  <option value="education">Education</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Schedule</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Input
                  label="Date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  error={errors.date}
                  required
                />
              </div>
              <div>
                <Input
                  label="Start Time"
                  name="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  error={errors.startTime}
                  required
                />
              </div>
              <div>
                <Input
                  label="End Time"
                  name="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={handleInputChange}
                  error={errors.endTime}
                  required
                />
              </div>
            </div>
          </div>

          {/* Additional Settings */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Additional Settings</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Max Attendees"
                  name="maxAttendees"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.maxAttendees}
                  onChange={handleInputChange}
                  error={errors.maxAttendees}
                />
              </div>
              <div>
                <Input
                  label="Meeting Link (Optional)"
                  name="meetingLink"
                  type="url"
                  value={formData.meetingLink}
                  onChange={handleInputChange}
                  placeholder="https://zoom.us/j/..."
                  error={errors.meetingLink}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags (Optional)
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                placeholder="Enter tags separated by commas (e.g., javascript, react, frontend)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Separate multiple tags with commas
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/sessions')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading && <LoadingSpinner size="sm" />}
              Create Session
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateSession
