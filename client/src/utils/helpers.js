import { format, formatDistance, isToday, isTomorrow, isYesterday } from 'date-fns'
import { tr } from 'date-fns/locale'

export const formatDate = (date, formatStr = 'dd MMMM yyyy') => {
  return format(new Date(date), formatStr, { locale: tr })
}

export const formatTime = (time) => {
  return time
}

export const formatDateTime = (date) => {
  return format(new Date(date), 'dd MMMM yyyy HH:mm', { locale: tr })
}

export const formatRelativeDate = (date) => {
  const d = new Date(date)
  
  if (isToday(d)) {
    return `Bugün ${format(d, 'HH:mm')}`
  }
  if (isTomorrow(d)) {
    return `Yarın ${format(d, 'HH:mm')}`
  }
  if (isYesterday(d)) {
    return `Dün ${format(d, 'HH:mm')}`
  }
  
  return format(d, 'dd MMM HH:mm', { locale: tr })
}

export const formatTimeAgo = (date) => {
  return formatDistance(new Date(date), new Date(), { 
    addSuffix: true, 
    locale: tr 
  })
}

export const formatPrice = (price, currency = 'TRY') => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency
  }).format(price)
}

export const getInitials = (firstName, lastName) => {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
}

export const truncateText = (text, maxLength) => {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export const getStatusColor = (status) => {
  const colors = {
    pending: 'warning',
    confirmed: 'primary',
    completed: 'success',
    cancelled: 'danger',
    'no-show': 'danger'
  }
  return colors[status] || 'primary'
}

export const getStatusText = (status) => {
  const texts = {
    pending: 'Beklemede',
    confirmed: 'Onaylandı',
    completed: 'Tamamlandı',
    cancelled: 'İptal Edildi',
    'no-show': 'Gelmedi'
  }
  return texts[status] || status
}

export const getCategoryLabel = (category) => {
  const labels = {
    'anxiety': 'Anksiyete',
    'depression': 'Depresyon',
    'relationships': 'İlişkiler',
    'stress': 'Stres',
    'self-improvement': 'Kişisel Gelişim',
    'parenting': 'Ebeveynlik',
    'trauma': 'Travma',
    'addiction': 'Bağımlılık',
    'other': 'Diğer'
  }
  return labels[category] || category
}

export const getDayName = (dayNumber) => {
  const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
  return days[dayNumber]
}

export const generateTimeSlots = (startTime, endTime, duration = 50) => {
  const slots = []
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)
  
  let currentTime = new Date(2000, 0, 1, startHour, startMin)
  const end = new Date(2000, 0, 1, endHour, endMin)
  
  while (currentTime < end) {
    slots.push(format(currentTime, 'HH:mm'))
    currentTime = new Date(currentTime.getTime() + duration * 60000)
  }
  
  return slots
}

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export const validatePhone = (phone) => {
  const re = /^[0-9]{10,11}$/
  return re.test(phone.replace(/\s/g, ''))
}

export const classNames = (...classes) => {
  return classes.filter(Boolean).join(' ')
}



