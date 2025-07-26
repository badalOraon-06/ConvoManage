import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  HomeIcon,
  CalendarIcon,
  UserGroupIcon,
  ChartBarIcon,
  CogIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline'

const Sidebar = ({ open, setOpen }) => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navigation = [
    { name: 'Dashboard', href: '/app/dashboard', icon: HomeIcon },
    { name: 'Sessions', href: '/app/sessions', icon: CalendarIcon },
    { name: 'Profile', href: '/app/profile', icon: UserIcon },
  ]

  // Add admin-only navigation items
  if (user?.role === 'admin') {
    navigation.push(
      { name: 'Users', href: '/app/admin/users', icon: UserGroupIcon },
      { name: 'Statistics', href: '/app/admin/stats', icon: ChartBarIcon }
    )
  }

  const isActive = (href) => {
    return location.pathname === href || location.pathname.startsWith(href + '/')
  }

  return (
    <>
      {/* Mobile sidebar overlay */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={() => setOpen(false)}
          />
        </div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <Link to="/app/dashboard" className="flex items-center">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <span className="ml-2 text-xl font-bold text-gray-900">ConvoManage</span>
          </Link>
          
          {/* Mobile close button */}
          <button
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            onClick={() => setOpen(false)}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <nav className="mt-8 px-6">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200
                    ${isActive(item.href)
                      ? 'bg-primary-100 text-primary-900 border-r-2 border-primary-500'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                  onClick={() => setOpen(false)}
                >
                  <Icon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                  {item.name}
                </Link>
              )
            })}
          </div>

          {/* Quick Actions */}
          <div className="mt-8">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Quick Actions
            </h3>
            <div className="mt-2 space-y-1">
              {user?.role === 'admin' && (
                <Link
                  to="/app/sessions/create"
                  className="group flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors duration-200"
                  onClick={() => setOpen(false)}
                >
                  <PlusIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                  Create Session
                </Link>
              )}
            </div>
          </div>
        </nav>

        {/* User profile and logout */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center">
            <img
              className="h-8 w-8 rounded-full"
              src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || '')}&background=random&size=32`}
              alt={user?.name}
            />
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="ml-2 p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md transition-colors duration-200"
              title="Logout"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar
