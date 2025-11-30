import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { appointmentsAPI, messagesAPI, paymentsAPI } from '../services/api'
import { formatDate, formatTime, formatPrice, getStatusColor, getStatusText } from '../utils/helpers'
import { 
  Calendar, 
  MessageSquare, 
  CreditCard, 
  Video, 
  Clock,
  TrendingUp,
  Users,
  ArrowRight
} from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import Avatar from '../components/common/Avatar'

const Dashboard = () => {
  const { user, isPsychologist } = useAuth()
  const [loading, setLoading] = useState(true)
  const [upcomingAppointments, setUpcomingAppointments] = useState([])
  const [recentConversations, setRecentConversations] = useState([])
  const [stats, setStats] = useState({
    totalAppointments: 0,
    totalEarnings: 0,
    totalPatients: 0
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch upcoming appointments
      const appointmentsRes = await appointmentsAPI.getAll({ 
        status: 'confirmed',
        startDate: new Date().toISOString(),
        limit: 5
      })
      setUpcomingAppointments(appointmentsRes.data.appointments)

      // Fetch recent conversations
      const conversationsRes = await messagesAPI.getConversations()
      setRecentConversations(conversationsRes.data.conversations.slice(0, 5))

      // Fetch stats for psychologists
      if (isPsychologist) {
        const earningsRes = await paymentsAPI.getEarnings()
        setStats({
          totalAppointments: earningsRes.data.summary.totalSessions || 0,
          totalEarnings: earningsRes.data.summary.totalEarnings || 0,
          totalPatients: 0 // Would need a separate API call
        })
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-8 text-white">
        <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">
          Hoş geldin, {user?.firstName}!
        </h1>
        <p className="text-primary-100">
          {isPsychologist 
            ? 'Bugün randevularınızı ve danışanlarınızı yönetin.'
            : 'Randevularınızı takip edin ve psikologunuzla iletişimde kalın.'
          }
        </p>
      </div>

      {/* Stats Cards - Psychologist Only */}
      {isPsychologist && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500 mb-1">Toplam Seans</p>
                <p className="text-2xl font-bold text-neutral-900">{stats.totalAppointments}</p>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <Calendar size={24} className="text-primary-600" />
              </div>
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500 mb-1">Toplam Kazanç</p>
                <p className="text-2xl font-bold text-neutral-900">{formatPrice(stats.totalEarnings)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <TrendingUp size={24} className="text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500 mb-1">Aktif Danışan</p>
                <p className="text-2xl font-bold text-neutral-900">{stats.totalPatients}</p>
              </div>
              <div className="w-12 h-12 bg-secondary-100 rounded-xl flex items-center justify-center">
                <Users size={24} className="text-secondary-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Upcoming Appointments */}
        <div className="card">
          <div className="p-6 border-b border-neutral-100">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-neutral-900">
                Yaklaşan Randevular
              </h2>
              <Link to="/appointments" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
                Tümünü Gör <ArrowRight size={16} />
              </Link>
            </div>
          </div>
          
          <div className="divide-y divide-neutral-100">
            {upcomingAppointments.length > 0 ? (
              upcomingAppointments.map((appointment) => {
                const otherPerson = isPsychologist ? appointment.patient : appointment.psychologist
                return (
                  <div key={appointment._id} className="p-4 hover:bg-neutral-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <Avatar 
                        src={otherPerson?.avatar}
                        firstName={otherPerson?.firstName}
                        lastName={otherPerson?.lastName}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-neutral-900 truncate">
                          {otherPerson?.firstName} {otherPerson?.lastName}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-neutral-500">
                          <Calendar size={14} />
                          <span>{formatDate(appointment.date, 'dd MMM')}</span>
                          <Clock size={14} />
                          <span>{appointment.startTime}</span>
                        </div>
                      </div>
                      <Link 
                        to={`/call/${appointment.roomId}`}
                        className="btn-primary py-2 px-4 text-sm"
                      >
                        <Video size={16} className="mr-2" />
                        Katıl
                      </Link>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="p-8 text-center text-neutral-500">
                <Calendar size={40} className="mx-auto mb-3 text-neutral-300" />
                <p>Yaklaşan randevunuz bulunmuyor</p>
                {!isPsychologist && (
                  <Link to="/psychologists" className="text-primary-600 text-sm mt-2 inline-block">
                    Psikolog Bul
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Recent Messages */}
        <div className="card">
          <div className="p-6 border-b border-neutral-100">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-neutral-900">
                Son Mesajlar
              </h2>
              <Link to="/messages" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
                Tümünü Gör <ArrowRight size={16} />
              </Link>
            </div>
          </div>
          
          <div className="divide-y divide-neutral-100">
            {recentConversations.length > 0 ? (
              recentConversations.map((conversation) => {
                const userId = user?.id || user?._id
                const otherParticipant = conversation.participants.find(
                  p => (p.id || p._id) !== userId
                )
                const unreadCount = conversation.unreadCount?.get?.(userId) || 0
                
                return (
                  <Link 
                    key={conversation._id} 
                    to={`/messages/${conversation._id}`}
                    className="p-4 hover:bg-neutral-50 transition-colors flex items-center gap-4"
                  >
                    <Avatar 
                      src={otherParticipant?.avatar}
                      firstName={otherParticipant?.firstName}
                      lastName={otherParticipant?.lastName}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-neutral-900 truncate">
                        {otherParticipant?.firstName} {otherParticipant?.lastName}
                      </p>
                      <p className="text-sm text-neutral-500 truncate">
                        {conversation.lastMessage?.content || 'Henüz mesaj yok'}
                      </p>
                    </div>
                    {unreadCount > 0 && (
                      <span className="w-6 h-6 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                )
              })
            ) : (
              <div className="p-8 text-center text-neutral-500">
                <MessageSquare size={40} className="mx-auto mb-3 text-neutral-300" />
                <p>Henüz mesajınız bulunmuyor</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold text-neutral-900 mb-4">
          Hızlı İşlemler
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {!isPsychologist && (
            <Link 
              to="/psychologists"
              className="p-4 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors text-center"
            >
              <Users size={24} className="mx-auto mb-2 text-primary-600" />
              <span className="text-sm font-medium text-primary-700">Psikolog Bul</span>
            </Link>
          )}
          <Link 
            to="/appointments"
            className="p-4 bg-secondary-50 rounded-xl hover:bg-secondary-100 transition-colors text-center"
          >
            <Calendar size={24} className="mx-auto mb-2 text-secondary-600" />
            <span className="text-sm font-medium text-secondary-700">Randevular</span>
          </Link>
          <Link 
            to="/messages"
            className="p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors text-center"
          >
            <MessageSquare size={24} className="mx-auto mb-2 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Mesajlar</span>
          </Link>
          <Link 
            to="/payments"
            className="p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors text-center"
          >
            <CreditCard size={24} className="mx-auto mb-2 text-green-600" />
            <span className="text-sm font-medium text-green-700">
              {isPsychologist ? 'Kazançlar' : 'Ödemeler'}
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Dashboard


