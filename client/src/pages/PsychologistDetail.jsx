import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usersAPI, appointmentsAPI, messagesAPI } from '../services/api'
import { formatPrice, formatDate, getDayName } from '../utils/helpers'
import { toast } from 'react-hot-toast'
import { 
  Star, Clock, Award, Calendar, MessageSquare, 
  Video, GraduationCap, CheckCircle, ArrowLeft,
  ChevronLeft, ChevronRight
} from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import Avatar from '../components/common/Avatar'
import Modal from '../components/common/Modal'
import { format, addDays, startOfWeek, isSameDay } from 'date-fns'
import { tr } from 'date-fns/locale'

const PsychologistDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  
  const [psychologist, setPsychologist] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [availableSlots, setAvailableSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [bookingModal, setBookingModal] = useState(false)
  const [bookingNotes, setBookingNotes] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))

  useEffect(() => {
    if (id && id !== 'undefined') {
      fetchPsychologist()
    } else {
      setLoading(false)
      toast.error('Geçersiz psikolog ID')
      navigate('/psychologists')
    }
  }, [id])

  useEffect(() => {
    if (psychologist) {
      fetchAvailability(selectedDate)
    }
  }, [selectedDate, psychologist])

  const fetchPsychologist = async () => {
    if (!id || id === 'undefined') return
    
    try {
      setLoading(true)
      const res = await usersAPI.getPsychologist(id)
      setPsychologist(res.data.psychologist)
    } catch (error) {
      console.error('Fetch psychologist error:', error)
      toast.error('Psikolog bilgileri yüklenemedi')
      navigate('/psychologists')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailability = async (date) => {
    try {
      const res = await appointmentsAPI.getAvailability(id, date.toISOString())
      setAvailableSlots(res.data.slots)
    } catch (error) {
      console.error('Fetch availability error:', error)
    }
  }

  const handleDateSelect = (date) => {
    setSelectedDate(date)
    setSelectedSlot(null)
  }

  const handleBookAppointment = async () => {
    if (!isAuthenticated) {
      toast.error('Randevu almak için giriş yapmalısınız')
      navigate('/login')
      return
    }

    if (!selectedSlot) {
      toast.error('Lütfen bir saat seçin')
      return
    }

    setBookingLoading(true)
    try {
      await appointmentsAPI.create({
        psychologistId: id,
        date: selectedDate.toISOString(),
        startTime: selectedSlot,
        notes: bookingNotes
      })
      
      toast.success('Randevunuz oluşturuldu! Onay bekliyor.')
      setBookingModal(false)
      setSelectedSlot(null)
      setBookingNotes('')
      fetchAvailability(selectedDate)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Randevu oluşturulamadı')
    } finally {
      setBookingLoading(false)
    }
  }

  const startConversation = async () => {
    if (!isAuthenticated) {
      toast.error('Mesaj göndermek için giriş yapmalısınız')
      navigate('/login')
      return
    }

    try {
      const res = await messagesAPI.createConversation(id)
      navigate(`/messages/${res.data.conversation._id}`)
    } catch (error) {
      toast.error('Konuşma başlatılamadı')
    }
  }

  const weekDays = [...Array(7)].map((_, i) => addDays(weekStart, i))

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!psychologist) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-500">Psikolog bulunamadı</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-8">
      <div className="container-custom">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-6"
        >
          <ArrowLeft size={20} />
          <span>Geri</span>
        </button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Card */}
            <div className="card p-8">
              <div className="flex flex-col md:flex-row gap-6">
                <Avatar
                  src={psychologist.avatar}
                  firstName={psychologist.firstName}
                  lastName={psychologist.lastName}
                  size="xl"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h1 className="font-display text-2xl font-bold text-neutral-900">
                      {psychologist.title && `${psychologist.title} `}
                      {psychologist.firstName} {psychologist.lastName}
                    </h1>
                    {psychologist.isVerified && (
                      <span className="badge-success flex items-center gap-1">
                        <CheckCircle size={14} />
                        Onaylı
                      </span>
                    )}
                  </div>
                  
                  {psychologist.rating > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex items-center gap-1">
                        <Star size={18} className="fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{psychologist.rating.toFixed(1)}</span>
                      </div>
                      <span className="text-neutral-500">
                        ({psychologist.reviewCount} değerlendirme)
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mb-4">
                    {psychologist.specializations?.map((spec, index) => (
                      <span key={index} className="badge-primary">
                        {spec}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-neutral-600">
                    {psychologist.experience > 0 && (
                      <div className="flex items-center gap-1">
                        <Award size={16} />
                        <span>{psychologist.experience} yıl deneyim</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock size={16} />
                      <span>{psychologist.sessionDuration || 50} dk seans</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* About */}
            {psychologist.bio && (
              <div className="card p-8">
                <h2 className="font-display text-lg font-semibold text-neutral-900 mb-4">
                  Hakkında
                </h2>
                <p className="text-neutral-600 whitespace-pre-line">
                  {psychologist.bio}
                </p>
              </div>
            )}

            {/* Education */}
            {psychologist.education?.length > 0 && (
              <div className="card p-8">
                <h2 className="font-display text-lg font-semibold text-neutral-900 mb-4">
                  <GraduationCap size={20} className="inline mr-2" />
                  Eğitim
                </h2>
                <div className="space-y-4">
                  {psychologist.education.map((edu, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary-500 rounded-full mt-2" />
                      <div>
                        <p className="font-medium text-neutral-900">{edu.degree}</p>
                        <p className="text-sm text-neutral-500">
                          {edu.school} {edu.year && `• ${edu.year}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certificates */}
            {psychologist.certificates?.length > 0 && (
              <div className="card p-8">
                <h2 className="font-display text-lg font-semibold text-neutral-900 mb-4">
                  <Award size={20} className="inline mr-2" />
                  Sertifikalar
                </h2>
                <div className="space-y-4">
                  {psychologist.certificates.map((cert, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-secondary-500 rounded-full mt-2" />
                      <div>
                        <p className="font-medium text-neutral-900">{cert.name}</p>
                        <p className="text-sm text-neutral-500">
                          {cert.issuer} {cert.year && `• ${cert.year}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Booking */}
          <div className="space-y-6">
            {/* Price Card */}
            <div className="card p-6 sticky top-24">
              <div className="text-center mb-6">
                <span className="text-3xl font-bold text-primary-600">
                  {formatPrice(psychologist.sessionPrice)}
                </span>
                <span className="text-neutral-500">/seans</span>
              </div>

              {/* Calendar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setWeekStart(addDays(weekStart, -7))}
                    className="p-2 hover:bg-neutral-100 rounded-lg"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="font-medium">
                    {format(weekStart, 'MMMM yyyy', { locale: tr })}
                  </span>
                  <button
                    onClick={() => setWeekStart(addDays(weekStart, 7))}
                    className="p-2 hover:bg-neutral-100 rounded-lg"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map(day => (
                    <div key={day} className="text-center text-xs text-neutral-500 py-2">
                      {day}
                    </div>
                  ))}
                  {weekDays.map((date) => {
                    const isSelected = isSameDay(date, selectedDate)
                    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0))
                    
                    return (
                      <button
                        key={date.toISOString()}
                        onClick={() => !isPast && handleDateSelect(date)}
                        disabled={isPast}
                        className={`
                          aspect-square rounded-lg text-sm font-medium transition-colors
                          ${isSelected 
                            ? 'bg-primary-600 text-white' 
                            : isPast 
                              ? 'text-neutral-300 cursor-not-allowed'
                              : 'hover:bg-primary-50 text-neutral-700'
                          }
                        `}
                      >
                        {format(date, 'd')}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Time Slots */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-neutral-900 mb-3">
                  {format(selectedDate, 'dd MMMM EEEE', { locale: tr })}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {availableSlots.length > 0 ? (
                    availableSlots.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => slot.available && setSelectedSlot(slot.time)}
                        disabled={!slot.available}
                        className={`
                          py-2 px-3 rounded-lg text-sm font-medium transition-colors
                          ${selectedSlot === slot.time
                            ? 'bg-primary-600 text-white'
                            : slot.available
                              ? 'bg-neutral-100 hover:bg-primary-50 text-neutral-700'
                              : 'bg-neutral-50 text-neutral-300 cursor-not-allowed line-through'
                          }
                        `}
                      >
                        {slot.time}
                      </button>
                    ))
                  ) : (
                    <p className="col-span-3 text-center text-neutral-500 py-4">
                      Bu gün için müsait saat bulunmuyor
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => setBookingModal(true)}
                  disabled={!selectedSlot}
                  className="btn-primary w-full"
                >
                  <Calendar size={18} className="mr-2" />
                  Randevu Al
                </button>
                <button
                  onClick={startConversation}
                  className="btn-secondary w-full"
                >
                  <MessageSquare size={18} className="mr-2" />
                  Mesaj Gönder
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <Modal
        isOpen={bookingModal}
        onClose={() => setBookingModal(false)}
        title="Randevu Onayı"
      >
        <div className="space-y-6">
          <div className="bg-primary-50 rounded-xl p-4">
            <div className="flex items-center gap-4">
              <Avatar
                src={psychologist.avatar}
                firstName={psychologist.firstName}
                lastName={psychologist.lastName}
                size="md"
              />
              <div>
                <p className="font-medium text-neutral-900">
                  {psychologist.title} {psychologist.firstName} {psychologist.lastName}
                </p>
                <p className="text-sm text-neutral-600">
                  {format(selectedDate, 'dd MMMM yyyy', { locale: tr })} - {selectedSlot}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="label">Randevu Notu (Opsiyonel)</label>
            <textarea
              value={bookingNotes}
              onChange={(e) => setBookingNotes(e.target.value)}
              className="input resize-none"
              rows={3}
              placeholder="Görüşmek istediğiniz konuları belirtebilirsiniz..."
            />
          </div>

          <div className="bg-neutral-50 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <span className="text-neutral-600">Seans Ücreti</span>
              <span className="text-xl font-bold text-primary-600">
                {formatPrice(psychologist.sessionPrice)}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setBookingModal(false)}
              className="btn-secondary flex-1"
            >
              İptal
            </button>
            <button
              onClick={handleBookAppointment}
              disabled={bookingLoading}
              className="btn-primary flex-1"
            >
              {bookingLoading ? <LoadingSpinner size="sm" /> : 'Randevuyu Onayla'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default PsychologistDetail


