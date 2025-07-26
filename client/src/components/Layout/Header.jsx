import React from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSocket } from '../../contexts/SocketContext'
import { Bars3Icon, BellIcon } from '@heroicons/react/24/outline'

const Header = ({ setSidebarOpen }) => {
  const { user } = useAuth()
  const { isConnected } = useSocket()

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Mobile menu button */}
            <button 
              type="button"
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
              onClick={() => setSidebarOpen(true)}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            {/* Page title will be added by individual pages */}
            <div className="ml-4 lg:ml-0">
              <h1 className="text-2xl font-semibold text-gray-900">
                {/* This will be updated dynamically */}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Connection status */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-sm text-gray-500">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {/* Notifications */}
            <button className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md transition-colors duration-200">
              <BellIcon className="h-6 w-6" />
            </button>

            {/* User profile */}
            <div className="flex items-center space-x-2">
              <img
                className="h-8 w-8 rounded-full"
                src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || '')}&background=random&size=32`}
                alt={user?.name}
              />
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
