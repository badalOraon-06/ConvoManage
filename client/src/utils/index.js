export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export const formatTime = (time) => {
  return time
}

export const formatDateTime = (date, time) => {
  const sessionDate = new Date(date)
  const [hours, minutes] = time.split(':')
  sessionDate.setHours(parseInt(hours), parseInt(minutes))
  
  return sessionDate.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

export const isSessionLive = (date, startTime, endTime) => {
  const now = new Date()
  const sessionDate = new Date(date)
  
  const [startHours, startMinutes] = startTime.split(':')
  const [endHours, endMinutes] = endTime.split(':')
  
  const startDateTime = new Date(sessionDate)
  startDateTime.setHours(parseInt(startHours), parseInt(startMinutes))
  
  const endDateTime = new Date(sessionDate)
  endDateTime.setHours(parseInt(endHours), parseInt(endMinutes))
  
  return now >= startDateTime && now <= endDateTime
}

export const isSessionUpcoming = (date, startTime) => {
  const now = new Date()
  const sessionDate = new Date(date)
  const [hours, minutes] = startTime.split(':')
  sessionDate.setHours(parseInt(hours), parseInt(minutes))
  
  return sessionDate > now
}

export const isSessionPast = (date, endTime) => {
  const now = new Date()
  const sessionDate = new Date(date)
  const [hours, minutes] = endTime.split(':')
  sessionDate.setHours(parseInt(hours), parseInt(minutes))
  
  return sessionDate < now
}

export const getSessionStatus = (date, startTime, endTime) => {
  if (isSessionLive(date, startTime, endTime)) {
    return 'live'
  } else if (isSessionPast(date, endTime)) {
    return 'completed'
  } else {
    return 'scheduled'
  }
}

export const getTimeUntilSession = (date, startTime) => {
  const now = new Date()
  const sessionDate = new Date(date)
  const [hours, minutes] = startTime.split(':')
  sessionDate.setHours(parseInt(hours), parseInt(minutes))
  
  const diff = sessionDate - now
  
  if (diff <= 0) return null
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours_remaining = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes_remaining = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (days > 0) {
    return `${days}d ${hours_remaining}h`
  } else if (hours_remaining > 0) {
    return `${hours_remaining}h ${minutes_remaining}m`
  } else {
    return `${minutes_remaining}m`
  }
}

export const truncateText = (text, maxLength = 100) => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export const generateAvatar = (name) => {
  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=40`
}

export const getStatusColor = (status) => {
  switch (status) {
    case 'live':
      return 'bg-red-100 text-red-800'
    case 'scheduled':
      return 'bg-blue-100 text-blue-800'
    case 'completed':
      return 'bg-gray-100 text-gray-800'
    case 'cancelled':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export const getRoleColor = (role) => {
  switch (role) {
    case 'admin':
      return 'bg-purple-100 text-purple-800'
    case 'speaker':
      return 'bg-green-100 text-green-800'
    case 'attendee':
      return 'bg-blue-100 text-blue-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validatePassword = (password) => {
  return password.length >= 6
}

export const capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}
