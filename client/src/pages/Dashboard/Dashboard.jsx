import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { sessionService, userService } from '../../services'
import { toast } from 'react-hot-toast'
import { 
  CalendarIcon, 
  UserGroupIcon, 
  ClockIcon,
  PlusIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import Button from '../../components/UI/Button'
import { formatDateTime, getSessionStatus, getTimeUntilSession } from '../../utils'

const Dashboard = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [upcomingSessions, setUpcomingSessions] = useState([])
  const [mySessions, setMySessions] = useState([])
  const [stats, setStats] = useState(null)

  useEffect(() => {
    loadDashboardData()
  }, [user])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Load upcoming sessions
      const sessionsResponse = await sessionService.getSessions({
        upcoming: true,
        limit: 5
      })
      setUpcomingSessions(sessionsResponse.sessions || [])

      // Load user-specific sessions
      if (user?.role === 'speaker') {
        const speakerSessions = await sessionService.getMySpeakingSessions()
        setMySessions(speakerSessions.sessions || [])
      } else if (user?.role === 'attendee') {
        const registeredSessions = await sessionService.getMyRegisteredSessions()
        setMySessions(registeredSessions.sessions || [])
      }

      // Load admin stats
      if (user?.role === 'admin') {
        const statsResponse = await userService.getStats()
        setStats(statsResponse.stats)
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  const getDashboardTitle = () => {
    switch (user?.role) {
      case 'admin':
        return 'Admin Dashboard'
      case 'speaker':
        return 'Speaker Dashboard'
      case 'attendee':
        return 'Attendee Dashboard'
      default:
        return 'Dashboard'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            {getDashboardTitle()}
          </h2>
          <p className="text-gray-600 mt-1">
            Welcome back, {user?.name}! Here's what's happening.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          {user?.role === 'admin' && (
            <Link to="/app/sessions/create">
              <Button>
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Session
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards - Admin Only */}
      {user?.role === 'admin' && stats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserGroupIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Users
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.users.total}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CalendarIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Sessions
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.sessions.total}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Upcoming Sessions
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.sessions.upcoming}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserGroupIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Recent Registrations
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.recentRegistrations}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming Sessions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Upcoming Sessions
            </h3>
          </div>
          <div className="px-6 py-4">
            {upcomingSessions.length > 0 ? (
              <div className="space-y-4">
                {upcomingSessions.map((session) => (
                  <div key={session._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">
                        {session.title}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {formatDateTime(session.date, session.startTime)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Speaker: {session.speaker?.name}
                      </p>
                      {getTimeUntilSession(session.date, session.startTime) && (
                        <p className="text-xs text-primary-600 mt-1">
                          Starts in {getTimeUntilSession(session.date, session.startTime)}
                        </p>
                      )}
                    </div>
                    <Link
                      to={`/app/sessions/${session._id}`}
                      className="ml-4 text-primary-600 hover:text-primary-900"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </Link>
                  </div>
                ))}
                <div className="text-center">
                  <Link
                    to="/app/sessions"
                    className="text-sm text-primary-600 hover:text-primary-900"
                  >
                    View all sessions →
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No upcoming sessions found
              </p>
            )}
          </div>
        </div>

        {/* My Sessions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {user?.role === 'speaker' ? 'My Speaking Sessions' : 'My Registered Sessions'}
            </h3>
          </div>
          <div className="px-6 py-4">
            {mySessions.length > 0 ? (
              <div className="space-y-4">
                {mySessions.slice(0, 5).map((session) => (
                  <div key={session._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">
                        {session.title}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {formatDateTime(session.date, session.startTime)}
                      </p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        getSessionStatus(session.date, session.startTime, session.endTime) === 'live'
                          ? 'bg-red-100 text-red-800'
                          : getSessionStatus(session.date, session.startTime, session.endTime) === 'completed'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {getSessionStatus(session.date, session.startTime, session.endTime)}
                      </span>
                    </div>
                    <Link
                      to={`/app/sessions/${session._id}`}
                      className="ml-4 text-primary-600 hover:text-primary-900"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                {user?.role === 'speaker' 
                  ? 'You have no speaking sessions yet' 
                  : 'You have not registered for any sessions yet'
                }
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Popular Sessions - Admin Only */}
      {user?.role === 'admin' && stats?.popularSessions && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Most Popular Sessions
            </h3>
          </div>
          <div className="px-6 py-4">
            <div className="space-y-4">
              {stats.popularSessions.map((session, index) => (
                <div key={session._id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-600">
                        {index + 1}
                      </span>
                    </div>
                    <div className="ml-4">
                      <h4 className="text-sm font-medium text-gray-900">
                        {session.title}
                      </h4>
                      <p className="text-sm text-gray-500">
                        Speaker: {session.speaker[0]?.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {session.attendeeCount} attendees
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
