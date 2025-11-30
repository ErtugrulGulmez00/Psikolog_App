import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { appointmentsAPI } from '../services/api'
import { formatDate, formatPrice, getStatusText, getStatusColor } from '../utils/helpers'
import { toast } from 'react-hot-toast'
import { 
  Calendar, Clock, Video, Filter, 
  CheckCircle, XCircle, AlertCircle
} from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import Avatar from '../components/common/Avatar'
import Modal from '../components/common/Modal'
import EmptyState from '../components/common/EmptyState'

const Appointments = () => {
  const { user, isPsychologist } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [actionModal, setActionModal] = useState({ open: false, action: null })
  const [cancelReason, setCancelReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchAppointments()
  }, [filter])

  const fetchAppointments = async () => {
    try {
      setLoading(true)
      const params = filter !== 'all' ? { status: filter } : {}
      const res = await appointmentsAPI.getAll(params)
      setAppointments(res.data.appointments)
    } catch (error) {
      console.error('Fetch appointments error:', error)
      toast.error('Randevular yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (status) => {
    if (!selectedAppointment) return
    
    setActionLoading(true)
    try {
      await appointmentsAPI.updateStatus(selectedAppointment._id, {
        status,
        cancelReason: status === 'cancelled' ? cancelReason : undefined
      })
      
      toast.success(
        status === 'confirmed' ? 'Randevu onaylandı' :
        status === 'cancelled' ? 'Randevu iptal edildi' :
        status === 'completed' ? 'Randevu tamamlandı' :
        'Randevu güncellendi'
      )
      
      setActionModal({ open: false, action: null })
      setCancelReason('')
      setSelectedAppointment(null)
      fetchAppointments()
    } catch (error) {
      toast.error(error.response?.data?.message || 'İşlem başarısız')
    } finally {
      setActionLoading(false)
    }
  }

  const openActionModal = (appointment, action) => {
    setSelectedAppointment(appointment)
    setActionModal({ open: true, action })
  }

  const getStatusBadgeClass = (status) => {
    const classes = {
      pending: 'badge-warning',
      confirmed: 'badge-primary',
      completed: 'badge-success',
      cancelled: 'badge-danger',
      'no-show': 'badge-danger'
    }
    return classes[status] || 'badge-primary'
  }

  const isUpcoming = (appointment) => {
    const appointmentDate = new Date(appointment.date)
    const [hours, minutes] = appointment.startTime.split(':')
    appointmentDate.setHours(parseInt(hours), parseInt(minutes))
    return appointmentDate > new Date()
  }

  const canJoinCall = (appointment) => {
    if (appointment.status !== 'confirmed') return false
    
    const appointmentDate = new Date(appointment.date)
    const [hours, minutes] = appointment.startTime.split(':')
    appointmentDate.setHours(parseInt(hours), parseInt(minutes))
    
    const now = new Date()
    const diffMinutes = (appointmentDate - now) / (1000 * 60)
    
    // Can join 10 minutes before and during the session
    return diffMinutes <= 10 && diffMinutes > -(appointment.duration || 50)
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-neutral-900 mb-4 md:mb-0">
          Randevular
        </h1>
        
        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all', label: 'Tümü' },
            { value: 'pending', label: 'Bekleyen' },
            { value: 'confirmed', label: 'Onaylı' },
            { value: 'completed', label: 'Tamamlanan' },
            { value: 'cancelled', label: 'İptal' }
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === value
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : appointments.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Randevu bulunamadı"
          description={filter !== 'all' ? 'Bu filtreye uygun randevu yok' : 'Henüz randevunuz bulunmuyor'}
          action={
            !isPsychologist && (
              <Link to="/psychologists" className="btn-primary">
                Psikolog Bul
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => {
            const otherPerson = isPsychologist ? appointment.patient : appointment.psychologist
            const upcoming = isUpcoming(appointment)
            const canJoin = canJoinCall(appointment)
            
            return (
              <div key={appointment._id} className="card p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* User Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <Avatar
                      src={otherPerson?.avatar}
                      firstName={otherPerson?.firstName}
                      lastName={otherPerson?.lastName}
                      size="lg"
                    />
                    <div>
                      <h3 className="font-medium text-neutral-900">
                        {otherPerson?.title && `${otherPerson.title} `}
                        {otherPerson?.firstName} {otherPerson?.lastName}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-neutral-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {formatDate(appointment.date, 'dd MMMM yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {appointment.startTime} - {appointment.endTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status & Price */}
                  <div className="flex items-center gap-4">
                    <span className={getStatusBadgeClass(appointment.status)}>
                      {getStatusText(appointment.status)}
                    </span>
                    <span className="font-semibold text-neutral-900">
                      {formatPrice(appointment.price)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Join Call */}
                    {canJoin && (
                      <Link
                        to={`/call/${appointment.roomId}`}
                        className="btn-primary py-2 px-4"
                      >
                        <Video size={18} className="mr-2" />
                        Görüşmeye Katıl
                      </Link>
                    )}

                    {/* Psychologist Actions */}
                    {isPsychologist && appointment.status === 'pending' && (
                      <>
                        <button
                          onClick={() => openActionModal(appointment, 'confirm')}
                          className="btn bg-green-600 text-white hover:bg-green-700 py-2 px-4"
                        >
                          <CheckCircle size={18} className="mr-2" />
                          Onayla
                        </button>
                        <button
                          onClick={() => openActionModal(appointment, 'cancel')}
                          className="btn-danger py-2 px-4"
                        >
                          <XCircle size={18} className="mr-2" />
                          Reddet
                        </button>
                      </>
                    )}

                    {isPsychologist && appointment.status === 'confirmed' && !upcoming && (
                      <button
                        onClick={() => openActionModal(appointment, 'complete')}
                        className="btn bg-green-600 text-white hover:bg-green-700 py-2 px-4"
                      >
                        <CheckCircle size={18} className="mr-2" />
                        Tamamla
                      </button>
                    )}

                    {/* Patient Cancel */}
                    {!isPsychologist && ['pending', 'confirmed'].includes(appointment.status) && upcoming && (
                      <button
                        onClick={() => openActionModal(appointment, 'cancel')}
                        className="btn-danger py-2 px-4"
                      >
                        <XCircle size={18} className="mr-2" />
                        İptal
                      </button>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {appointment.patientNotes && (
                  <div className="mt-4 pt-4 border-t border-neutral-100">
                    <p className="text-sm text-neutral-600">
                      <span className="font-medium">Not:</span> {appointment.patientNotes}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Action Modal */}
      <Modal
        isOpen={actionModal.open}
        onClose={() => {
          setActionModal({ open: false, action: null })
          setCancelReason('')
        }}
        title={
          actionModal.action === 'confirm' ? 'Randevuyu Onayla' :
          actionModal.action === 'cancel' ? 'Randevuyu İptal Et' :
          actionModal.action === 'complete' ? 'Randevuyu Tamamla' : ''
        }
      >
        {selectedAppointment && (
          <div className="space-y-6">
            <div className="bg-neutral-50 rounded-xl p-4">
              <div className="flex items-center gap-4">
                <Avatar
                  src={isPsychologist ? selectedAppointment.patient?.avatar : selectedAppointment.psychologist?.avatar}
                  firstName={isPsychologist ? selectedAppointment.patient?.firstName : selectedAppointment.psychologist?.firstName}
                  lastName={isPsychologist ? selectedAppointment.patient?.lastName : selectedAppointment.psychologist?.lastName}
                  size="md"
                />
                <div>
                  <p className="font-medium">
                    {isPsychologist 
                      ? `${selectedAppointment.patient?.firstName} ${selectedAppointment.patient?.lastName}`
                      : `${selectedAppointment.psychologist?.title || ''} ${selectedAppointment.psychologist?.firstName} ${selectedAppointment.psychologist?.lastName}`
                    }
                  </p>
                  <p className="text-sm text-neutral-500">
                    {formatDate(selectedAppointment.date, 'dd MMMM yyyy')} - {selectedAppointment.startTime}
                  </p>
                </div>
              </div>
            </div>

            {actionModal.action === 'cancel' && (
              <div>
                <label className="label">İptal Nedeni</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="input resize-none"
                  rows={3}
                  placeholder="İptal nedeninizi belirtin (opsiyonel)"
                />
              </div>
            )}

            {actionModal.action === 'confirm' && (
              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl">
                <CheckCircle size={20} className="text-green-600 mt-0.5" />
                <p className="text-sm text-green-800">
                  Randevuyu onayladığınızda, danışan bilgilendirilecek ve görüşme saatinde
                  görüntülü görüşme başlatabileceksiniz.
                </p>
              </div>
            )}

            {actionModal.action === 'complete' && (
              <div className="flex items-start gap-3 p-4 bg-primary-50 rounded-xl">
                <AlertCircle size={20} className="text-primary-600 mt-0.5" />
                <p className="text-sm text-primary-800">
                  Randevuyu tamamlandı olarak işaretlediğinizde, 
                  bu işlem geri alınamaz.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setActionModal({ open: false, action: null })
                  setCancelReason('')
                }}
                className="btn-secondary flex-1"
              >
                Vazgeç
              </button>
              <button
                onClick={() => handleStatusUpdate(
                  actionModal.action === 'confirm' ? 'confirmed' :
                  actionModal.action === 'cancel' ? 'cancelled' :
                  'completed'
                )}
                disabled={actionLoading}
                className={`flex-1 ${
                  actionModal.action === 'cancel' ? 'btn-danger' : 'btn-primary'
                }`}
              >
                {actionLoading ? <LoadingSpinner size="sm" /> : 
                  actionModal.action === 'confirm' ? 'Onayla' :
                  actionModal.action === 'cancel' ? 'İptal Et' :
                  'Tamamla'
                }
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Appointments


