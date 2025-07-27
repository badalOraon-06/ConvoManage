import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../../components/UI/Button'
import Input from '../../components/UI/Input'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import Modal from '../../components/UI/Modal'
import { toast } from 'react-hot-toast'

const Profile = () => {
  const { user, updateProfile, changePassword, loading } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [isEditing, setIsEditing] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const fileInputRef = useRef(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    avatar: ''
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        bio: user.bio || '',
        avatar: user.avatar || ''
      })
    }
  }, [user])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validatePasswordForm = () => {
    const newErrors = {}
    
    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required'
    }
    
    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required'
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters'
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setSaving(true)
    try {
      const result = await updateProfile(formData)
      if (result.success) {
        toast.success('Profile updated successfully!')
        setIsEditing(false)
      } else {
        toast.error(result.message || 'Failed to update profile')
      }
    } catch (error) {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordUpdate = async (e) => {
    e.preventDefault()
    
    if (!validatePasswordForm()) return
    
    setSaving(true)
    try {
      const result = await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      })
      
      if (result.success) {
        toast.success('Password changed successfully!')
        setShowPasswordModal(false)
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
      } else {
        toast.error(result.message || 'Failed to change password')
      }
    } catch (error) {
      toast.error('Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800'
      case 'speaker':
        return 'bg-blue-100 text-blue-800'
      case 'attendee':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleAvatarClick = () => {
    setShowAvatarModal(true)
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      // In a real app, you would upload to a service like AWS S3 or Cloudinary
      // For now, we'll just show a placeholder functionality
      const reader = new FileReader()
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          avatar: e.target.result
        }))
        setShowAvatarModal(false)
        toast.success('Avatar uploaded! Remember to save your profile.')
      }
      reader.readAsDataURL(file)
    }
  }

  const removeAvatar = () => {
    setFormData(prev => ({
      ...prev,
      avatar: ''
    }))
    setShowAvatarModal(false)
    toast.success('Avatar removed! Remember to save your profile.')
  }

  if (loading && !user) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8">
          <div className="flex items-center space-x-6">
            <div className="relative">
              <div 
                className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-2xl font-bold text-gray-700 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={handleAvatarClick}
              >
                {(isEditing ? formData.avatar : user?.avatar) ? (
                  <img 
                    src={isEditing ? formData.avatar : user?.avatar} 
                    alt={user?.name} 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  getInitials(user?.name || 'U')
                )}
              </div>
              {isEditing && (
                <button
                  onClick={handleAvatarClick}
                  className="absolute -bottom-2 -right-2 bg-blue-600 text-white rounded-full p-2 hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">{user?.name}</h1>
              <p className="text-blue-100 mb-3">{user?.email}</p>
              <div className="flex items-center space-x-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(user?.role)}`}>
                  {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                </span>
                <span className="text-blue-100 text-sm">
                  Member since {user?.createdAt ? new Date(user.createdAt).getFullYear() : 'Unknown'}
                </span>
              </div>
            </div>
            <Button
              onClick={() => setIsEditing(!isEditing)}
              variant="secondary"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
            >
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {['profile', 'security', 'activity'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Information</h2>
                
                {isEditing ? (
                  <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <Input
                        label="Full Name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        error={errors.name}
                        required
                      />
                      <Input
                        label="Email Address"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        error={errors.email}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bio
                      </label>
                      <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Tell us about yourself..."
                      />
                    </div>
                    
                    <Input
                      label="Avatar URL"
                      name="avatar"
                      value={formData.avatar}
                      onChange={handleInputChange}
                      placeholder="https://example.com/avatar.jpg"
                    />
                    
                    <div className="flex justify-end space-x-4">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setIsEditing(false)}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={saving}
                        className="flex items-center space-x-2"
                      >
                        {saving && <LoadingSpinner size="sm" />}
                        <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Full Name
                        </label>
                        <p className="text-gray-900">{user?.name || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Email Address
                        </label>
                        <p className="text-gray-900">{user?.email}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Role
                        </label>
                        <p className="text-gray-900 capitalize">{user?.role}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Account Status
                        </label>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user?.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    
                    {user?.bio && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Bio
                        </label>
                        <p className="text-gray-900 whitespace-pre-wrap">{user.bio}</p>
                      </div>
                    )}
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Member Since
                        </label>
                        <p className="text-gray-900">
                          {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 'Unknown'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Last Login
                        </label>
                        <p className="text-gray-900">
                          {user?.lastLogin ? new Date(user.lastLogin).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'Never'}
                        </p>
                      </div>
                    </div>

                    {/* Profile Statistics */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Statistics</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-blue-50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-blue-600">0</div>
                          <div className="text-sm text-blue-600">Sessions Created</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-green-600">0</div>
                          <div className="text-sm text-green-600">Sessions Attended</div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-purple-600">0</div>
                          <div className="text-sm text-purple-600">Messages Sent</div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {Math.floor((new Date() - new Date(user?.createdAt || new Date())) / (1000 * 60 * 60 * 24)) || 0}
                          </div>
                          <div className="text-sm text-orange-600">Days Active</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Security Settings</h2>
                
                {/* Change Password Section */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Password</h3>
                      <p className="text-sm text-gray-500">Change your account password</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setShowPasswordModal(true)}
                      className="flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Change Password
                    </Button>
                  </div>
                  <div className="text-sm text-gray-600">
                    Last changed: {user?.passwordChangedAt ? 
                      new Date(user.passwordChangedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'Never'
                    }
                  </div>
                </div>

                {/* Two-Factor Authentication */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Two-Factor Authentication</h3>
                      <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                    </div>
                    <Button
                      variant="outline"
                      disabled
                      className="opacity-50 cursor-not-allowed"
                    >
                      Coming Soon
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">Not enabled</span>
                  </div>
                </div>

                {/* Login Sessions */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Active Sessions</h3>
                      <p className="text-sm text-gray-500">Manage your active login sessions</p>
                    </div>
                    <Button
                      variant="outline"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      Revoke All
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-medium text-green-900">Current Session</div>
                          <div className="text-sm text-green-700">Windows • Chrome • Your current session</div>
                        </div>
                      </div>
                      <div className="text-sm text-green-600 font-medium">Active</div>
                    </div>
                  </div>
                </div>

                {/* Account Privacy */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Privacy Settings</h3>
                    <p className="text-sm text-gray-500">Control your account privacy and visibility</p>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">Profile Visibility</div>
                        <div className="text-sm text-gray-500">Who can see your profile information</div>
                      </div>
                      <select className="border border-gray-300 rounded-md px-3 py-2 text-sm">
                        <option value="public">Everyone</option>
                        <option value="users">Registered Users</option>
                        <option value="private">Only Me</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">Activity Status</div>
                        <div className="text-sm text-gray-500">Show when you're online</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-red-900">Danger Zone</h3>
                    <p className="text-sm text-red-700">These actions cannot be undone</p>
                  </div>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="text-red-600 border-red-300 hover:bg-red-100 w-full sm:w-auto"
                      disabled
                    >
                      Delete Account
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
                
                {/* Sample activity items - in a real app, this would come from an API */}
                <div className="space-y-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">Profile updated</span>
                        </p>
                        <p className="text-xs text-gray-500">You updated your profile information</p>
                        <p className="text-xs text-gray-400 mt-1">Today at 2:30 PM</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">Account verified</span>
                        </p>
                        <p className="text-xs text-gray-500">Your email address has been verified</p>
                        <p className="text-xs text-gray-400 mt-1">Yesterday at 10:15 AM</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">Account created</span>
                        </p>
                        <p className="text-xs text-gray-500">Welcome to ConvoManage!</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '2 days ago'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 text-center">
                  <Button variant="secondary" disabled>
                    Load More Activity
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Avatar Upload Modal */}
      <Modal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        title="Change Profile Picture"
        size="small"
      >
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-32 h-32 mx-auto bg-gray-100 rounded-full flex items-center justify-center text-3xl font-bold text-gray-600 mb-4">
              {formData.avatar ? (
                <img 
                  src={formData.avatar} 
                  alt="Preview" 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                getInitials(user?.name || 'U')
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Image
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="secondary"
                className="w-full"
              >
                Choose Image
              </Button>
              <p className="text-xs text-gray-500 mt-1">
                Supported formats: JPG, PNG, GIF (max 5MB)
              </p>
            </div>

            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or enter image URL
              </label>
              <Input
                name="avatar"
                value={formData.avatar}
                onChange={handleInputChange}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
          </div>

          <div className="flex justify-between space-x-4 pt-4">
            <Button
              onClick={removeAvatar}
              variant="secondary"
              className="text-red-600 hover:text-red-700"
            >
              Remove Avatar
            </Button>
            <div className="space-x-2">
              <Button
                variant="secondary"
                onClick={() => setShowAvatarModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => setShowAvatarModal(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Password Change Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false)
          setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
          setErrors({})
        }}
        title="Change Password"
      >
        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <Input
            label="Current Password"
            name="currentPassword"
            type="password"
            value={passwordData.currentPassword}
            onChange={handlePasswordChange}
            error={errors.currentPassword}
            required
          />
          
          <Input
            label="New Password"
            name="newPassword"
            type="password"
            value={passwordData.newPassword}
            onChange={handlePasswordChange}
            error={errors.newPassword}
            required
          />
          
          <Input
            label="Confirm New Password"
            name="confirmPassword"
            type="password"
            value={passwordData.confirmPassword}
            onChange={handlePasswordChange}
            error={errors.confirmPassword}
            required
          />
          
          <div className="flex justify-end space-x-4 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowPasswordModal(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2"
            >
              {saving && <LoadingSpinner size="sm" />}
              <span>{saving ? 'Changing...' : 'Change Password'}</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default Profile
