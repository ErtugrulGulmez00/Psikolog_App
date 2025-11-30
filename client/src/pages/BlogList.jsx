import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { blogAPI } from '../services/api'
import { formatDate, getCategoryLabel } from '../utils/helpers'
import { Search, Filter, Eye, Heart, Clock } from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import Avatar from '../components/common/Avatar'
import EmptyState from '../components/common/EmptyState'

const BlogList = () => {
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    category: ''
  })
  const [categories, setCategories] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchBlogs()
  }, [filters])

  const fetchCategories = async () => {
    try {
      const res = await blogAPI.getCategories()
      setCategories(res.data.categories)
    } catch (error) {
      console.error('Fetch categories error:', error)
    }
  }

  const fetchBlogs = async (page = 1) => {
    try {
      setLoading(true)
      const params = { page, limit: 12 }
      if (filters.search) params.search = filters.search
      if (filters.category) params.category = filters.category
      
      const res = await blogAPI.getAll(params)
      setBlogs(res.data.blogs)
      setPagination(res.data.pagination)
    } catch (error) {
      console.error('Fetch blogs error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    fetchBlogs(1)
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 py-16">
        <div className="container-custom">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
            Blog & Makaleler
          </h1>
          <p className="text-primary-100 max-w-2xl">
            Psikoloji, kişisel gelişim ve ruh sağlığı hakkında uzman psikologlarımızın yazıları
          </p>
        </div>
      </div>

      <div className="container-custom py-8">
        {/* Search & Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 mb-8">
          <form onSubmit={handleSearch}>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="Makale ara..."
                  className="input pl-12"
                />
              </div>
              <div className="md:w-48">
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="input"
                >
                  <option value="">Tüm Kategoriler</option>
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-primary">
                Ara
              </button>
            </div>
          </form>
        </div>

        {/* Results */}
        <div className="mb-6">
          <p className="text-neutral-600">
            <span className="font-medium">{pagination.total}</span> makale bulundu
          </p>
        </div>

        {/* Blog Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : blogs.length === 0 ? (
          <EmptyState
            title="Makale bulunamadı"
            description="Arama kriterlerinize uygun makale yok"
          />
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogs.map((blog) => (
                <Link
                  key={blog._id}
                  to={`/blog/${blog.slug}`}
                  className="card-hover group"
                >
                  {/* Cover Image */}
                  {blog.coverImage ? (
                    <div className="aspect-video bg-neutral-100 overflow-hidden">
                      <img
                        src={blog.coverImage}
                        alt={blog.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center">
                      <span className="text-4xl font-display text-primary-300">
                        {blog.title[0]}
                      </span>
                    </div>
                  )}

                  <div className="p-6">
                    {/* Category */}
                    <span className="badge-primary text-xs mb-3">
                      {getCategoryLabel(blog.category)}
                    </span>

                    {/* Title */}
                    <h3 className="font-display text-lg font-semibold text-neutral-900 mb-2 group-hover:text-primary-600 transition-colors line-clamp-2">
                      {blog.title}
                    </h3>

                    {/* Excerpt */}
                    <p className="text-neutral-600 text-sm line-clamp-2 mb-4">
                      {blog.excerpt}
                    </p>

                    {/* Author & Meta */}
                    <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                      <div className="flex items-center gap-2">
                        <Avatar
                          src={blog.author?.avatar}
                          firstName={blog.author?.firstName}
                          lastName={blog.author?.lastName}
                          size="xs"
                        />
                        <span className="text-sm text-neutral-600">
                          {blog.author?.firstName} {blog.author?.lastName}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-neutral-500">
                        <span className="flex items-center gap-1">
                          <Eye size={14} />
                          {blog.views}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart size={14} />
                          {blog.likeCount}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {[...Array(pagination.pages)].map((_, index) => (
                  <button
                    key={index}
                    onClick={() => fetchBlogs(index + 1)}
                    className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                      pagination.page === index + 1
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default BlogList



