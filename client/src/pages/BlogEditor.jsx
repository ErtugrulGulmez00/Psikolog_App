import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { blogAPI } from '../services/api'
import { toast } from 'react-hot-toast'
import { Save, Eye, Image, ArrowLeft } from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'

const BlogEditor = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = !!id

  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState([])
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    category: 'other',
    tags: '',
    status: 'draft'
  })

  useEffect(() => {
    fetchCategories()
    if (isEditing) {
      fetchBlog()
    }
  }, [id])

  const fetchCategories = async () => {
    try {
      const res = await blogAPI.getCategories()
      setCategories(res.data.categories)
    } catch (error) {
      console.error('Fetch categories error:', error)
    }
  }

  const fetchBlog = async () => {
    try {
      // We need to get blog by ID, not slug
      // For editing, we'll need to fetch from my-posts
      const res = await blogAPI.getMyPosts()
      const blog = res.data.blogs.find(b => b._id === id)
      
      if (blog) {
        setFormData({
          title: blog.title,
          content: blog.content,
          excerpt: blog.excerpt || '',
          category: blog.category,
          tags: blog.tags?.join(', ') || '',
          status: blog.status
        })
      } else {
        toast.error('Makale bulunamadı')
        navigate('/dashboard')
      }
    } catch (error) {
      console.error('Fetch blog error:', error)
      toast.error('Makale yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Başlık ve içerik gerekli')
      return
    }

    setSaving(true)
    try {
      const data = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
      }

      if (isEditing) {
        await blogAPI.update(id, data)
        toast.success('Makale güncellendi')
      } else {
        await blogAPI.create(data)
        toast.success('Makale oluşturuldu')
      }
      
      navigate('/dashboard')
    } catch (error) {
      toast.error(error.response?.data?.message || 'İşlem başarısız')
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    setFormData(prev => ({ ...prev, status: 'published' }))
    // Trigger save after state update
    setTimeout(() => {
      document.getElementById('blog-form').requestSubmit()
    }, 100)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-neutral-100 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display text-2xl font-bold text-neutral-900">
            {isEditing ? 'Makaleyi Düzenle' : 'Yeni Makale'}
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="btn-secondary"
          >
            <Save size={18} className="mr-2" />
            Taslak Kaydet
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? <LoadingSpinner size="sm" /> : (
              <>
                <Eye size={18} className="mr-2" />
                Yayınla
              </>
            )}
          </button>
        </div>
      </div>

      {/* Form */}
      <form id="blog-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div className="card p-6">
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full text-3xl font-display font-bold text-neutral-900 border-0 focus:outline-none focus:ring-0 placeholder:text-neutral-300"
            placeholder="Makale Başlığı"
            required
          />
        </div>

        {/* Content */}
        <div className="card p-6">
          <label className="label">İçerik</label>
          <textarea
            name="content"
            value={formData.content}
            onChange={handleChange}
            className="input resize-none font-sans"
            rows={20}
            placeholder="Makalenizi buraya yazın... (Markdown desteklenmektedir)"
            required
          />
          <p className="text-xs text-neutral-500 mt-2">
            İpucu: Paragraflar arasında boş satır bırakın
          </p>
        </div>

        {/* Excerpt */}
        <div className="card p-6">
          <label className="label">Özet (SEO için önemli)</label>
          <textarea
            name="excerpt"
            value={formData.excerpt}
            onChange={handleChange}
            className="input resize-none"
            rows={3}
            maxLength={300}
            placeholder="Makalenin kısa özeti (max 300 karakter)"
          />
          <p className="text-xs text-neutral-500 mt-2">
            {formData.excerpt.length}/300 karakter
          </p>
        </div>

        {/* Category & Tags */}
        <div className="card p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="label">Kategori</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="input"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Etiketler</label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                className="input"
                placeholder="psikoloji, stres, anksiyete (virgülle ayırın)"
              />
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="card p-6">
          <label className="label">Durum</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="draft"
                checked={formData.status === 'draft'}
                onChange={handleChange}
                className="w-4 h-4 text-primary-600 border-neutral-300 focus:ring-primary-500"
              />
              <span className="text-neutral-700">Taslak</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="published"
                checked={formData.status === 'published'}
                onChange={handleChange}
                className="w-4 h-4 text-primary-600 border-neutral-300 focus:ring-primary-500"
              />
              <span className="text-neutral-700">Yayınla</span>
            </label>
          </div>
        </div>
      </form>
    </div>
  )
}

export default BlogEditor



