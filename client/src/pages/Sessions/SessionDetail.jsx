import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import Button from '../../components/UI/Button'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import Modal from '../../components/UI/Modal'
import { toast } from 'react-hot-toast'

const SessionDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    fetchSession()
  }, [id])

  const fetchSession = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/sessions/${id}`)
      setSession(response.data.session)
    } catch (error) {
      console.error('Error fetching session:', error)
      if (error.response?.status === 404) {
        toast.error('Session not found')
        navigate('/sessions')
      } else {
        toast.error('Failed to fetch session details')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleJoinSession = async () => {
    try {
      setActionLoading(true)
      await api.post(`/sessions/${id}/register`)
      toast.success('Successfully joined session!')
      fetchSession()
    } catch (error) {
      console.error('Error joining session:', error)
      toast.error(error.response?.data?.error || 'Failed to join session')
    } finally {
      setActionLoading(false)
    }
  }

  const handleLeaveSession = async () => {
    try {
      setActionLoading(true)
      await api.delete(`/sessions/${id}/register`)
      toast.success('Successfully left session!')
      fetchSession()
    } catch (error) {
      console.error('Error leaving session:', error)
      toast.error(error.response?.data?.error || 'Failed to leave session')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteSession = async () => {
    try {
      setActionLoading(true)
      await api.delete(`/sessions/${id}`)
      toast.success('Session deleted successfully!')
      navigate('/sessions')
    } catch (error) {
      console.error('Error deleting session:', error)
      toast.error(error.response?.data?.error || 'Failed to delete session')
    } finally {
      setActionLoading(false)
      setShowDeleteModal(false)
    }
  }

  const getStatusBadge = (status) => {
    const statusStyles = {
      scheduled: 'bg-blue-100 text-blue-800',
      live: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusStyles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getCategoryBadge = (category) => {
    const categoryStyles = {
      technology: 'bg-purple-100 text-purple-800',
      business: 'bg-indigo-100 text-indigo-800',
      health: 'bg-green-100 text-green-800',
      education: 'bg-yellow-100 text-yellow-800',
      entertainment: 'bg-pink-100 text-pink-800',
      other: 'bg-gray-100 text-gray-800'
    }
    
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${categoryStyles[category]}`}>
        {category.charAt(0).toUpperCase() + category.slice(1)}
      </span>
    )
  }

  const isUserAttending = () => {
    return session?.attendees?.some(attendee => attendee.user._id === user?.id)
  }

  const canJoinSession = () => {
    return session?.status === 'scheduled' && 
           session?.attendees?.length < session?.maxAttendees &&
           !isUserAttending()
  }

  const canEditSession = () => {
    return user && (
      user.role === 'admin' || 
      (user.role === 'speaker' && session?.speaker?._id === user.id)
    )
  }

  const canDeleteSession = () => {
    return user && (
      user.role === 'admin' || 
      (user.role === 'speaker' && session?.speaker?._id === user.id)
    )
  }

  const formatDateTime = (date, time) => {
    const sessionDate = new Date(date)
    const options = { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    }
    return `${sessionDate.toLocaleDateString('en-US', options)} at ${time}`
  }

  const calculateDuration = (startTime, endTime) => {
    const start = new Date(`2000-01-01T${startTime}:00`)
    const end = new Date(`2000-01-01T${endTime}:00`)
    const diffMs = end - start
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`
    }
    return `${diffMinutes}m`
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Session not found</h3>
        <p className="text-gray-600 mb-4">The session you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => navigate('/sessions')}>
          Back to Sessions
        </Button>
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
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{session.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            {getStatusBadge(session.status)}
            {getCategoryBadge(session.category)}
          </div>
        </div>
        {canEditSession() && (
          <div className="flex items-center gap-2">
            <Link to={`/sessions/${session._id}/edit`}>
              <Button variant="outline" size="sm">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </Button>
            </Link>
            {canDeleteSession() && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">About This Session</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{session.description}</p>
          </div>

          {/* Speaker Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Speaker</h2>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                {session.speaker?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{session.speaker?.name}</h3>
                <p className="text-sm text-gray-600">{session.speaker?.email}</p>
                {session.speaker?.bio && (
                  <p className="text-sm text-gray-700 mt-1">{session.speaker.bio}</p>
                )}
              </div>
            </div>
          </div>

          {/* Tags */}
          {session.tags && session.tags.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {session.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Resources */}
          {session.resources && session.resources.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Resources</h2>
              <div className="space-y-3">
                {session.resources.map((resource, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{resource.name}</p>
                      <p className="text-sm text-gray-600 capitalize">{resource.type}</p>
                    </div>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Session Details */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Session Details</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 1v8m6-12h2a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2z" />
                </svg>
                <div>
                  <p className="text-sm text-gray-600">Date & Time</p>
                  <p className="font-medium text-gray-900">
                    {formatDateTime(session.date, session.startTime)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="font-medium text-gray-900">
                    {calculateDuration(session.startTime, session.endTime)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <div>
                  <p className="text-sm text-gray-600">Attendees</p>
                  <p className="font-medium text-gray-900">
                    {session.attendees?.length || 0} / {session.maxAttendees}
                  </p>
                </div>
              </div>

              {session.meetingLink && (
                <div className="pt-4 border-t border-gray-200">
                  <a
                    href={session.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Join Meeting
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {user && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="space-y-3">
                {isUserAttending() ? (
                  <Button
                    variant="outline"
                    onClick={handleLeaveSession}
                    disabled={actionLoading}
                    className="w-full text-red-600 border-red-300 hover:bg-red-50"
                  >
                    {actionLoading ? <LoadingSpinner size="sm" /> : 'Leave Session'}
                  </Button>
                ) : canJoinSession() ? (
                  <Button
                    onClick={handleJoinSession}
                    disabled={actionLoading}
                    className="w-full"
                  >
                    {actionLoading ? <LoadingSpinner size="sm" /> : 'Join Session'}
                  </Button>
                ) : (
                  <div className="text-center text-sm text-gray-500">
                    {session.status === 'completed' ? 'Session completed' :
                     session.status === 'cancelled' ? 'Session cancelled' :
                     session.attendees?.length >= session.maxAttendees ? 'Session is full' : 
                     'Unable to join'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Attendees List */}
          {session.attendees && session.attendees.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Attendees ({session.attendees.length})
              </h2>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {session.attendees.map((attendee, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {attendee.user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{attendee.user?.name}</p>
                      <p className="text-xs text-gray-600">
                        Joined {new Date(attendee.registeredAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Session"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete this session? This action cannot be undone and will remove all associated data.
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteSession}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {actionLoading ? <LoadingSpinner size="sm" /> : 'Delete Session'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default SessionDetail
