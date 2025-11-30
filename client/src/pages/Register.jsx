import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-hot-toast'
import { Eye, EyeOff, Mail, Lock, User, Phone, CheckCircle } from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'

const Register = () => {
  const [searchParams] = useSearchParams()
  const defaultRole = searchParams.get('role') || 'patient'
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: defaultRole
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)
  
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Şifreler eşleşmiyor')
      return
    }

    if (!agreed) {
      toast.error('Kullanım koşullarını kabul etmelisiniz')
      return
    }

    setLoading(true)

    try {
      const { confirmPassword, ...registerData } = formData
      await register(registerData)
      toast.success('Kayıt başarılı! Hoş geldiniz.')
      navigate('/dashboard')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Kayıt başarısız')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-neutral-900 mb-2">
            Ücretsiz Hesap Oluşturun
          </h1>
          <p className="text-neutral-500">
            {formData.role === 'psychologist' 
              ? 'Psikolog olarak platforma katılın' 
              : 'Profesyonel psikolojik destek alın'
            }
          </p>
        </div>

        {/* Form */}
        <div className="card p-8">
          {/* Role Selection */}
          <div className="flex gap-4 mb-6">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role: 'patient' })}
              className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                formData.role === 'patient'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                {formData.role === 'patient' && <CheckCircle size={18} className="text-primary-600" />}
                <span className={formData.role === 'patient' ? 'text-primary-700 font-medium' : 'text-neutral-600'}>
                  Danışan
                </span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role: 'psychologist' })}
              className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                formData.role === 'psychologist'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                {formData.role === 'psychologist' && <CheckCircle size={18} className="text-primary-600" />}
                <span className={formData.role === 'psychologist' ? 'text-primary-700 font-medium' : 'text-neutral-600'}>
                  Psikolog
                </span>
              </div>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Ad</label>
                <div className="relative">
                  <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="input pl-12"
                    placeholder="Adınız"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">Soyad</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="input"
                  placeholder="Soyadınız"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="label">Email Adresi</label>
              <div className="relative">
                <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input pl-12"
                  placeholder="ornek@email.com"
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="label">Telefon</label>
              <div className="relative">
                <Phone size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input pl-12"
                  placeholder="05XX XXX XX XX"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label">Şifre</label>
              <div className="relative">
                <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input pl-12 pr-12"
                  placeholder="En az 6 karakter"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="label">Şifre Tekrar</label>
              <div className="relative">
                <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input pl-12"
                  placeholder="Şifrenizi tekrar girin"
                  required
                />
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="terms"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="terms" className="text-sm text-neutral-600">
                <Link to="/terms" className="text-primary-600 hover:underline">Kullanım koşullarını</Link> ve{' '}
                <Link to="/privacy" className="text-primary-600 hover:underline">gizlilik politikasını</Link> okudum ve kabul ediyorum.
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !agreed}
              className="btn-primary w-full"
            >
              {loading ? <LoadingSpinner size="sm" /> : 'Kayıt Ol'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 bg-white text-sm text-neutral-500">veya</span>
            </div>
          </div>

          {/* Login Link */}
          <p className="text-center text-neutral-600">
            Zaten hesabınız var mı?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700">
              Giriş Yapın
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register


