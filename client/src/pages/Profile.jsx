import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-hot-toast'
import { 
  Camera, Save, Plus, X, Clock, 
  GraduationCap, Award, Calendar
} from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import Avatar from '../components/common/Avatar'

const Profile = () => {
  const { user, updateProfile, updateAvatar, isPsychologist } = useAuth()
  const fileInputRef = useRef(null)
  
  const [loading, setLoading] = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    title: user?.title || '',
    bio: user?.bio || '',
    experience: user?.experience || 0,
    sessionPrice: user?.sessionPrice || 0,
    sessionDuration: user?.sessionDuration || 50,
    specializations: user?.specializations || [],
    education: user?.education || [],
    certificates: user?.certificates || [],
    availability: user?.availability || []
  })
  
  const [newSpecialization, setNewSpecialization] = useState('')
  const [newEducation, setNewEducation] = useState({ degree: '', school: '', year: '' })
  const [newCertificate, setNewCertificate] = useState({ name: '', issuer: '', year: '' })

  const handleChange = (e) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }))
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Lütfen bir resim dosyası seçin')
      return
    }

    setAvatarLoading(true)
    try {
      await updateAvatar(file)
      toast.success('Profil fotoğrafı güncellendi')
    } catch (error) {
      toast.error('Fotoğraf yüklenemedi')
    } finally {
      setAvatarLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await updateProfile(formData)
      toast.success('Profil güncellendi')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Profil güncellenemedi')
    } finally {
      setLoading(false)
    }
  }

  // Specializations
  const addSpecialization = () => {
    if (newSpecialization.trim()) {
      setFormData(prev => ({
        ...prev,
        specializations: [...prev.specializations, newSpecialization.trim()]
      }))
      setNewSpecialization('')
    }
  }

  const removeSpecialization = (index) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.filter((_, i) => i !== index)
    }))
  }

  // Education
  const addEducation = () => {
    if (newEducation.degree && newEducation.school) {
      setFormData(prev => ({
        ...prev,
        education: [...prev.education, { ...newEducation, year: Number(newEducation.year) || null }]
      }))
      setNewEducation({ degree: '', school: '', year: '' })
    }
  }

  const removeEducation = (index) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }))
  }

  // Certificates
  const addCertificate = () => {
    if (newCertificate.name && newCertificate.issuer) {
      setFormData(prev => ({
        ...prev,
        certificates: [...prev.certificates, { ...newCertificate, year: Number(newCertificate.year) || null }]
      }))
      setNewCertificate({ name: '', issuer: '', year: '' })
    }
  }

  const removeCertificate = (index) => {
    setFormData(prev => ({
      ...prev,
      certificates: prev.certificates.filter((_, i) => i !== index)
    }))
  }

  // Availability
  const toggleAvailability = (day) => {
    const existing = formData.availability.find(a => a.day === day)
    if (existing) {
      setFormData(prev => ({
        ...prev,
        availability: prev.availability.filter(a => a.day !== day)
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        availability: [...prev.availability, { day, startTime: '09:00', endTime: '17:00' }]
      }))
    }
  }

  const updateAvailabilityTime = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      availability: prev.availability.map(a => 
        a.day === day ? { ...a, [field]: value } : a
      )
    }))
  }

  const days = [
    { value: 1, label: 'Pazartesi' },
    { value: 2, label: 'Salı' },
    { value: 3, label: 'Çarşamba' },
    { value: 4, label: 'Perşembe' },
    { value: 5, label: 'Cuma' },
    { value: 6, label: 'Cumartesi' },
    { value: 0, label: 'Pazar' }
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="font-display text-2xl font-bold text-neutral-900 mb-6">
        Profil Ayarları
      </h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Avatar Section */}
        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold text-neutral-900 mb-4">
            Profil Fotoğrafı
          </h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar
                src={user?.avatar}
                firstName={user?.firstName}
                lastName={user?.lastName}
                size="xl"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarLoading}
                className="absolute bottom-0 right-0 w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center hover:bg-primary-700 transition-colors"
              >
                {avatarLoading ? <LoadingSpinner size="sm" /> : <Camera size={18} />}
              </button>
            </div>
            <div>
              <p className="text-sm text-neutral-600">
                JPG, PNG veya GIF formatında, maksimum 5MB
              </p>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold text-neutral-900 mb-4">
            Temel Bilgiler
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {isPsychologist && (
              <div className="md:col-span-2">
                <label className="label">Ünvan</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="input"
                  placeholder="Dr., Uzm. Psk., vb."
                />
              </div>
            )}
            <div>
              <label className="label">Ad</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Soyad</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="input"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="label">Telefon</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="input"
                placeholder="05XX XXX XX XX"
              />
            </div>
          </div>
        </div>

        {/* Psychologist Only Sections */}
        {isPsychologist && (
          <>
            {/* Bio */}
            <div className="card p-6">
              <h2 className="font-display text-lg font-semibold text-neutral-900 mb-4">
                Hakkımda
              </h2>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                className="input resize-none"
                rows={5}
                placeholder="Kendinizi ve yaklaşımınızı tanıtın..."
              />
            </div>

            {/* Session Settings */}
            <div className="card p-6">
              <h2 className="font-display text-lg font-semibold text-neutral-900 mb-4">
                Seans Ayarları
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="label">Deneyim (Yıl)</label>
                  <input
                    type="number"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    className="input"
                    min="0"
                  />
                </div>
                <div>
                  <label className="label">Seans Ücreti (₺)</label>
                  <input
                    type="number"
                    name="sessionPrice"
                    value={formData.sessionPrice}
                    onChange={handleChange}
                    className="input"
                    min="0"
                  />
                </div>
                <div>
                  <label className="label">Seans Süresi (dk)</label>
                  <input
                    type="number"
                    name="sessionDuration"
                    value={formData.sessionDuration}
                    onChange={handleChange}
                    className="input"
                    min="30"
                    step="5"
                  />
                </div>
              </div>
            </div>

            {/* Specializations */}
            <div className="card p-6">
              <h2 className="font-display text-lg font-semibold text-neutral-900 mb-4">
                Uzmanlık Alanları
              </h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {formData.specializations.map((spec, index) => (
                  <span key={index} className="badge-primary flex items-center gap-1">
                    {spec}
                    <button
                      type="button"
                      onClick={() => removeSpecialization(index)}
                      className="hover:text-red-600"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSpecialization}
                  onChange={(e) => setNewSpecialization(e.target.value)}
                  className="input flex-1"
                  placeholder="Yeni uzmanlık alanı ekle..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialization())}
                />
                <button
                  type="button"
                  onClick={addSpecialization}
                  className="btn-secondary"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* Education */}
            <div className="card p-6">
              <h2 className="font-display text-lg font-semibold text-neutral-900 mb-4">
                <GraduationCap size={20} className="inline mr-2" />
                Eğitim
              </h2>
              <div className="space-y-3 mb-4">
                {formData.education.map((edu, index) => (
                  <div key={index} className="flex items-center justify-between bg-neutral-50 p-3 rounded-lg">
                    <div>
                      <p className="font-medium">{edu.degree}</p>
                      <p className="text-sm text-neutral-500">{edu.school} {edu.year && `• ${edu.year}`}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEducation(index)}
                      className="text-neutral-400 hover:text-red-600"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="grid md:grid-cols-4 gap-2">
                <input
                  type="text"
                  value={newEducation.degree}
                  onChange={(e) => setNewEducation(prev => ({ ...prev, degree: e.target.value }))}
                  className="input"
                  placeholder="Derece"
                />
                <input
                  type="text"
                  value={newEducation.school}
                  onChange={(e) => setNewEducation(prev => ({ ...prev, school: e.target.value }))}
                  className="input"
                  placeholder="Okul"
                />
                <input
                  type="number"
                  value={newEducation.year}
                  onChange={(e) => setNewEducation(prev => ({ ...prev, year: e.target.value }))}
                  className="input"
                  placeholder="Yıl"
                />
                <button type="button" onClick={addEducation} className="btn-secondary">
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* Certificates */}
            <div className="card p-6">
              <h2 className="font-display text-lg font-semibold text-neutral-900 mb-4">
                <Award size={20} className="inline mr-2" />
                Sertifikalar
              </h2>
              <div className="space-y-3 mb-4">
                {formData.certificates.map((cert, index) => (
                  <div key={index} className="flex items-center justify-between bg-neutral-50 p-3 rounded-lg">
                    <div>
                      <p className="font-medium">{cert.name}</p>
                      <p className="text-sm text-neutral-500">{cert.issuer} {cert.year && `• ${cert.year}`}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCertificate(index)}
                      className="text-neutral-400 hover:text-red-600"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="grid md:grid-cols-4 gap-2">
                <input
                  type="text"
                  value={newCertificate.name}
                  onChange={(e) => setNewCertificate(prev => ({ ...prev, name: e.target.value }))}
                  className="input"
                  placeholder="Sertifika Adı"
                />
                <input
                  type="text"
                  value={newCertificate.issuer}
                  onChange={(e) => setNewCertificate(prev => ({ ...prev, issuer: e.target.value }))}
                  className="input"
                  placeholder="Veren Kurum"
                />
                <input
                  type="number"
                  value={newCertificate.year}
                  onChange={(e) => setNewCertificate(prev => ({ ...prev, year: e.target.value }))}
                  className="input"
                  placeholder="Yıl"
                />
                <button type="button" onClick={addCertificate} className="btn-secondary">
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* Availability */}
            <div className="card p-6">
              <h2 className="font-display text-lg font-semibold text-neutral-900 mb-4">
                <Calendar size={20} className="inline mr-2" />
                Müsaitlik Takvimi
              </h2>
              <div className="space-y-3">
                {days.map(({ value, label }) => {
                  const dayAvailability = formData.availability.find(a => a.day === value)
                  const isEnabled = !!dayAvailability
                  
                  return (
                    <div key={value} className="flex items-center gap-4 p-3 bg-neutral-50 rounded-lg">
                      <label className="flex items-center gap-3 cursor-pointer min-w-[140px]">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => toggleAvailability(value)}
                          className="w-5 h-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className={isEnabled ? 'font-medium' : 'text-neutral-500'}>
                          {label}
                        </span>
                      </label>
                      
                      {isEnabled && (
                        <div className="flex items-center gap-2 flex-1">
                          <Clock size={16} className="text-neutral-400" />
                          <input
                            type="time"
                            value={dayAvailability.startTime}
                            onChange={(e) => updateAvailabilityTime(value, 'startTime', e.target.value)}
                            className="input py-1 px-2 w-auto"
                          />
                          <span className="text-neutral-400">-</span>
                          <input
                            type="time"
                            value={dayAvailability.endTime}
                            onChange={(e) => updateAvailabilityTime(value, 'endTime', e.target.value)}
                            className="input py-1 px-2 w-auto"
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <LoadingSpinner size="sm" /> : (
              <>
                <Save size={18} className="mr-2" />
                Kaydet
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default Profile


