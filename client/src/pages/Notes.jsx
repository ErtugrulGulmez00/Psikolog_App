import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { notesAPI, usersAPI } from '../services/api'
import { formatDate } from '../utils/helpers'
import { toast } from 'react-hot-toast'
import { 
  FileText, Plus, Search, Filter, 
  Edit, Trash2, Eye, EyeOff, X 
} from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import Avatar from '../components/common/Avatar'
import Modal from '../components/common/Modal'
import EmptyState from '../components/common/EmptyState'

const Notes = () => {
  const { isPsychologist } = useAuth()
  const [notes, setNotes] = useState([])
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ patientId: '', type: '' })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedNote, setSelectedNote] = useState(null)
  const [formData, setFormData] = useState({
    patientId: '',
    title: '',
    content: '',
    type: 'session',
    tags: [],
    isPrivate: true,
    sharedWithPatient: false
  })
  const [saving, setSaving] = useState(false)
  const [newTag, setNewTag] = useState('')

  const noteTypes = [
    { value: 'session', label: 'Seans Notu' },
    { value: 'diagnosis', label: 'Tanı' },
    { value: 'treatment-plan', label: 'Tedavi Planı' },
    { value: 'progress', label: 'İlerleme' },
    { value: 'general', label: 'Genel' }
  ]

  useEffect(() => {
    fetchNotes()
    if (isPsychologist) {
      fetchPatients()
    }
  }, [filter])

  const fetchNotes = async () => {
    try {
      setLoading(true)
      const params = {}
      if (filter.patientId) params.patientId = filter.patientId
      if (filter.type) params.type = filter.type
      
      const res = await notesAPI.getAll(params)
      setNotes(res.data.notes)
    } catch (error) {
      console.error('Fetch notes error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPatients = async () => {
    try {
      const res = await usersAPI.getMyPatients()
      setPatients(res.data.patients)
    } catch (error) {
      console.error('Fetch patients error:', error)
    }
  }

  const handleOpenModal = (note = null) => {
    if (note) {
      setSelectedNote(note)
      setFormData({
        patientId: note.patient._id,
        title: note.title,
        content: note.content,
        type: note.type,
        tags: note.tags || [],
        isPrivate: note.isPrivate,
        sharedWithPatient: note.sharedWithPatient
      })
    } else {
      setSelectedNote(null)
      setFormData({
        patientId: '',
        title: '',
        content: '',
        type: 'session',
        tags: [],
        isPrivate: true,
        sharedWithPatient: false
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (selectedNote) {
        await notesAPI.update(selectedNote._id, formData)
        toast.success('Not güncellendi')
      } else {
        await notesAPI.create(formData)
        toast.success('Not oluşturuldu')
      }
      setIsModalOpen(false)
      fetchNotes()
    } catch (error) {
      toast.error(error.response?.data?.message || 'İşlem başarısız')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (noteId) => {
    if (!window.confirm('Bu notu silmek istediğinize emin misiniz?')) return

    try {
      await notesAPI.delete(noteId)
      toast.success('Not silindi')
      fetchNotes()
    } catch (error) {
      toast.error('Not silinemedi')
    }
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const removeTag = (index) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }))
  }

  const getTypeLabel = (type) => {
    return noteTypes.find(t => t.value === type)?.label || type
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-neutral-900 mb-4 md:mb-0">
          {isPsychologist ? 'Hasta Notları' : 'Notlarım'}
        </h1>
        
        {isPsychologist && (
          <button onClick={() => handleOpenModal()} className="btn-primary">
            <Plus size={18} className="mr-2" />
            Yeni Not
          </button>
        )}
      </div>

      {/* Filters */}
      {isPsychologist && (
        <div className="card p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <select
                value={filter.patientId}
                onChange={(e) => setFilter(prev => ({ ...prev, patientId: e.target.value }))}
                className="input"
              >
                <option value="">Tüm Hastalar</option>
                {patients.map(patient => (
                  <option key={patient._id} value={patient._id}>
                    {patient.firstName} {patient.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <select
                value={filter.type}
                onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value }))}
                className="input"
              >
                <option value="">Tüm Türler</option>
                {noteTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Notes List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : notes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Not bulunamadı"
          description={isPsychologist ? 'Henüz not eklemediniz' : 'Paylaşılan not bulunmuyor'}
          action={isPsychologist && (
            <button onClick={() => handleOpenModal()} className="btn-primary">
              <Plus size={18} className="mr-2" />
              İlk Notu Ekle
            </button>
          )}
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {notes.map((note) => (
            <div key={note._id} className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={note.patient?.avatar}
                    firstName={note.patient?.firstName}
                    lastName={note.patient?.lastName}
                    size="sm"
                  />
                  <div>
                    <p className="font-medium text-neutral-900">
                      {note.patient?.firstName} {note.patient?.lastName}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {formatDate(note.createdAt)}
                    </p>
                  </div>
                </div>
                <span className="badge-primary text-xs">
                  {getTypeLabel(note.type)}
                </span>
              </div>

              <h3 className="font-semibold text-neutral-900 mb-2">{note.title}</h3>
              <p className="text-neutral-600 text-sm line-clamp-3 mb-4">
                {note.content}
              </p>

              {note.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {note.tags.map((tag, index) => (
                    <span key={index} className="text-xs bg-neutral-100 text-neutral-600 px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                <div className="flex items-center gap-2 text-sm">
                  {note.sharedWithPatient ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <Eye size={14} />
                      Hasta görebilir
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-neutral-500">
                      <EyeOff size={14} />
                      Gizli
                    </span>
                  )}
                </div>

                {isPsychologist && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenModal(note)}
                      className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-600"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(note._id)}
                      className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Note Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedNote ? 'Notu Düzenle' : 'Yeni Not'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="label">Hasta</label>
            <select
              value={formData.patientId}
              onChange={(e) => setFormData(prev => ({ ...prev, patientId: e.target.value }))}
              className="input"
              required
              disabled={!!selectedNote}
            >
              <option value="">Hasta seçin</option>
              {patients.map(patient => (
                <option key={patient._id} value={patient._id}>
                  {patient.firstName} {patient.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Not Türü</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              className="input"
            >
              {noteTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Başlık</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="input"
              placeholder="Not başlığı"
              required
            />
          </div>

          <div>
            <label className="label">İçerik</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              className="input resize-none"
              rows={6}
              placeholder="Not içeriği..."
              required
            />
          </div>

          <div>
            <label className="label">Etiketler</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag, index) => (
                <span key={index} className="badge-primary flex items-center gap-1">
                  {tag}
                  <button type="button" onClick={() => removeTag(index)}>
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="input flex-1"
                placeholder="Yeni etiket..."
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <button type="button" onClick={addTag} className="btn-secondary">
                Ekle
              </button>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.sharedWithPatient}
                onChange={(e) => setFormData(prev => ({ ...prev, sharedWithPatient: e.target.checked }))}
                className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-neutral-700">Hasta ile paylaş</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn-secondary flex-1"
            >
              İptal
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? <LoadingSpinner size="sm" /> : selectedNote ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default Notes



