import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { paymentsAPI } from '../services/api'
import { formatDate, formatPrice } from '../utils/helpers'
import { toast } from 'react-hot-toast'
import { 
  CreditCard, TrendingUp, Calendar, 
  Download, RefreshCw, AlertCircle
} from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import EmptyState from '../components/common/EmptyState'
import Modal from '../components/common/Modal'

const Payments = () => {
  const { isPsychologist } = useAuth()
  const [payments, setPayments] = useState([])
  const [earnings, setEarnings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [refundModal, setRefundModal] = useState({ open: false, payment: null })
  const [refundReason, setRefundReason] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchData()
  }, [filter])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const params = filter !== 'all' ? { status: filter } : {}
      const paymentsRes = await paymentsAPI.getAll(params)
      setPayments(paymentsRes.data.payments)

      if (isPsychologist) {
        const earningsRes = await paymentsAPI.getEarnings()
        setEarnings(earningsRes.data)
      }
    } catch (error) {
      console.error('Fetch data error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefund = async () => {
    if (!refundModal.payment) return
    
    setProcessing(true)
    try {
      await paymentsAPI.refund(refundModal.payment._id, { reason: refundReason })
      toast.success('İade talebi oluşturuldu')
      setRefundModal({ open: false, payment: null })
      setRefundReason('')
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'İade işlemi başarısız')
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'badge-warning',
      completed: 'badge-success',
      failed: 'badge-danger',
      refunded: 'badge-secondary',
      cancelled: 'badge-danger'
    }
    const labels = {
      pending: 'Beklemede',
      completed: 'Tamamlandı',
      failed: 'Başarısız',
      refunded: 'İade Edildi',
      cancelled: 'İptal'
    }
    return (
      <span className={styles[status] || 'badge-primary'}>
        {labels[status] || status}
      </span>
    )
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-neutral-900 mb-6">
        {isPsychologist ? 'Kazançlar & Ödemeler' : 'Ödemelerim'}
      </h1>

      {/* Earnings Summary - Psychologist Only */}
      {isPsychologist && earnings && (
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500 mb-1">Toplam Kazanç</p>
                <p className="text-2xl font-bold text-neutral-900">
                  {formatPrice(earnings.summary.totalEarnings)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <TrendingUp size={24} className="text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500 mb-1">Toplam Seans</p>
                <p className="text-2xl font-bold text-neutral-900">
                  {earnings.summary.totalSessions}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <Calendar size={24} className="text-primary-600" />
              </div>
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500 mb-1">Ortalama/Seans</p>
                <p className="text-2xl font-bold text-neutral-900">
                  {formatPrice(
                    earnings.summary.totalSessions > 0 
                      ? earnings.summary.totalEarnings / earnings.summary.totalSessions 
                      : 0
                  )}
                </p>
              </div>
              <div className="w-12 h-12 bg-secondary-100 rounded-xl flex items-center justify-center">
                <CreditCard size={24} className="text-secondary-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Earnings Chart - Psychologist Only */}
      {isPsychologist && earnings?.monthlyEarnings?.length > 0 && (
        <div className="card p-6 mb-8">
          <h2 className="font-display text-lg font-semibold text-neutral-900 mb-4">
            Aylık Kazanç
          </h2>
          <div className="space-y-4">
            {earnings.monthlyEarnings.map((month, index) => {
              const maxEarnings = Math.max(...earnings.monthlyEarnings.map(m => m.earnings))
              const percentage = maxEarnings > 0 ? (month.earnings / maxEarnings) * 100 : 0
              
              return (
                <div key={index} className="flex items-center gap-4">
                  <span className="w-24 text-sm text-neutral-600">
                    {month._id.month}/{month._id.year}
                  </span>
                  <div className="flex-1 bg-neutral-100 rounded-full h-4 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-32 text-right font-medium">
                    {formatPrice(month.earnings)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        {[
          { value: 'all', label: 'Tümü' },
          { value: 'completed', label: 'Tamamlanan' },
          { value: 'pending', label: 'Bekleyen' },
          { value: 'refunded', label: 'İade' }
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

      {/* Payments List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Ödeme bulunamadı"
          description={filter !== 'all' ? 'Bu filtreye uygun ödeme yok' : 'Henüz ödemeniz bulunmuyor'}
        />
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <div key={payment._id} className="card p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-medium text-neutral-900">
                      {isPsychologist 
                        ? `${payment.user?.firstName} ${payment.user?.lastName}`
                        : `${payment.psychologist?.firstName} ${payment.psychologist?.lastName}`
                      }
                    </h3>
                    {getStatusBadge(payment.status)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {formatDate(payment.createdAt)}
                    </span>
                    {payment.appointment && (
                      <span>
                        Randevu: {formatDate(payment.appointment.date, 'dd MMM')} {payment.appointment.startTime}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-xl font-bold text-neutral-900">
                    {formatPrice(payment.amount)}
                  </span>
                  
                  {/* Refund Button - Patient Only */}
                  {!isPsychologist && payment.status === 'completed' && (
                    <button
                      onClick={() => setRefundModal({ open: true, payment })}
                      className="btn-secondary py-2 px-4 text-sm"
                    >
                      <RefreshCw size={16} className="mr-2" />
                      İade Talep Et
                    </button>
                  )}
                </div>
              </div>

              {/* Refund Info */}
              {payment.status === 'refunded' && (
                <div className="mt-4 pt-4 border-t border-neutral-100 flex items-start gap-2 text-sm text-neutral-600">
                  <RefreshCw size={16} className="mt-0.5" />
                  <div>
                    <span>İade tutarı: {formatPrice(payment.refundAmount)}</span>
                    {payment.refundReason && (
                      <p className="text-neutral-500 mt-1">Neden: {payment.refundReason}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Refund Modal */}
      <Modal
        isOpen={refundModal.open}
        onClose={() => {
          setRefundModal({ open: false, payment: null })
          setRefundReason('')
        }}
        title="İade Talebi"
      >
        {refundModal.payment && (
          <div className="space-y-6">
            <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-xl">
              <AlertCircle size={20} className="text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Dikkat!</p>
                <p>
                  İade talebiniz onaylandığında randevunuz iptal edilecektir. 
                  Randevuya 24 saatten az kaldıysa iade yapılamaz.
                </p>
              </div>
            </div>

            <div className="bg-neutral-50 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">İade Tutarı</span>
                <span className="text-xl font-bold text-primary-600">
                  {formatPrice(refundModal.payment.amount)}
                </span>
              </div>
            </div>

            <div>
              <label className="label">İade Nedeni</label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="input resize-none"
                rows={3}
                placeholder="İade nedeninizi belirtin..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRefundModal({ open: false, payment: null })
                  setRefundReason('')
                }}
                className="btn-secondary flex-1"
              >
                Vazgeç
              </button>
              <button
                onClick={handleRefund}
                disabled={processing}
                className="btn-danger flex-1"
              >
                {processing ? <LoadingSpinner size="sm" /> : 'İade Talep Et'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Payments



