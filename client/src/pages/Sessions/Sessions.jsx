import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import Button from '../../components/UI/Button'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import { toast } from 'react-hot-toast'

const Sessions = () => {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [pagination, setPagination] = useState({
    current: 1,
    limit: 10,
    total: 0,
    pages: 0
  })

  const fetchSessions = async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString()
      })

      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim())
      }
      if (filterStatus !== 'all') {
        params.append('status', filterStatus)
      }
      if (filterCategory !== 'all') {
        params.append('category', filterCategory)
      }

      const response = await api.get(`/sessions?${params.toString()}`)
      setSessions(response.data.sessions)
      setPagination(response.data.pagination)
    } catch (error) {
      console.error('Error fetching sessions:', error)
      toast.error('Failed to fetch sessions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [searchTerm, filterStatus, filterCategory])

  const handleJoinSession = async (sessionId) => {
    try {
      await api.post(`/sessions/${sessionId}/register`)
      toast.success('Successfully joined session!')
      fetchSessions(pagination.current)
    } catch (error) {
      console.error('Error joining session:', error)
      toast.error(error.response?.data?.error || 'Failed to join session')
    }
  }

  const handleLeaveSession = async (sessionId) => {
    try {
      await api.delete(`/sessions/${sessionId}/register`)
      toast.success('Successfully left session!')
      fetchSessions(pagination.current)
    } catch (error) {
      console.error('Error leaving session:', error)
      toast.error(error.response?.data?.error || 'Failed to leave session')
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
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status]}`}>
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
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${categoryStyles[category]}`}>
        {category.charAt(0).toUpperCase() + category.slice(1)}
      </span>
    )
  }

  const isUserAttending = (session) => {
    return session.attendees?.some(attendee => attendee.user._id === user?.id)
  }

  const canJoinSession = (session) => {
    return session.status === 'scheduled' && 
           session.attendees?.length < session.maxAttendees &&
           !isUserAttending(session)
  }

  if (loading && sessions.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
          <p className="text-gray-600">Discover and join interesting sessions</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'speaker') && (
          <Link to="/sessions/create">
            <Button className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Session
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Search sessions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="live">Live</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
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

      {/* Sessions Grid */}
      {sessions.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || filterStatus !== 'all' || filterCategory !== 'all'
              ? 'Try adjusting your filters'
              : 'No sessions are available at the moment'
            }
          </p>
          {(user?.role === 'admin' || user?.role === 'speaker') && (
            <Link to="/sessions/create">
              <Button>Create First Session</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => (
            <div key={session._id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{session.title}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusBadge(session.status)}
                    {getCategoryBadge(session.category)}
                  </div>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-4 line-clamp-3">{session.description}</p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {session.speaker?.name}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 1v8m6-12h2a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2z" />
                  </svg>
                  {new Date(session.date).toLocaleDateString()} at {session.startTime}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {session.attendees?.length || 0} / {session.maxAttendees} attendees
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Link 
                  to={`/sessions/${session._id}`}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View Details
                </Link>
                
                {user && (
                  <div>
                    {isUserAttending(session) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleLeaveSession(session._id)}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        Leave
                      </Button>
                    ) : canJoinSession(session) ? (
                      <Button
                        size="sm"
                        onClick={() => handleJoinSession(session._id)}
                      >
                        Join
                      </Button>
                    ) : (
                      <span className="text-xs text-gray-500">
                        {session.status === 'completed' ? 'Completed' :
                         session.status === 'cancelled' ? 'Cancelled' :
                         session.attendees?.length >= session.maxAttendees ? 'Full' : 'Unavailable'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchSessions(pagination.current - 1)}
            disabled={pagination.current === 1}
          >
            Previous
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
              const page = i + 1
              return (
                <Button
                  key={page}
                  variant={pagination.current === page ? "primary" : "outline"}
                  size="sm"
                  onClick={() => fetchSessions(page)}
                >
                  {page}
                </Button>
              )
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchSessions(pagination.current + 1)}
            disabled={pagination.current === pagination.pages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

export default Sessions
