import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { usersAPI } from '../services/api'
import { formatPrice } from '../utils/helpers'
import { Search, Filter, Star, MapPin, Clock, ChevronDown } from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import Avatar from '../components/common/Avatar'

const PsychologistList = () => {
  const [psychologists, setPsychologists] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    specialization: '',
    minPrice: '',
    maxPrice: ''
  })
  const [specializations, setSpecializations] = useState([])
  const [showFilters, setShowFilters] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0
  })

  useEffect(() => {
    fetchSpecializations()
    fetchPsychologists()
  }, [])

  const fetchSpecializations = async () => {
    try {
      const res = await usersAPI.getSpecializations()
      setSpecializations(res.data.specializations)
    } catch (error) {
      console.error('Fetch specializations error:', error)
    }
  }

  const fetchPsychologists = async (page = 1) => {
    try {
      setLoading(true)
      const params = {
        page,
        limit: 12,
        ...filters
      }
      
      // Remove empty values
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key]
      })
      
      const res = await usersAPI.getPsychologists(params)
      setPsychologists(res.data.psychologists)
      setPagination(res.data.pagination)
    } catch (error) {
      console.error('Fetch psychologists error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    fetchPsychologists(1)
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      specialization: '',
      minPrice: '',
      maxPrice: ''
    })
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 py-16">
        <div className="container-custom">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
            Uzman Psikologlar
          </h1>
          <p className="text-primary-100 max-w-2xl">
            Alanında deneyimli, lisanslı psikologlarımız arasından size en uygun olanı bulun
          </p>
        </div>
      </div>

      <div className="container-custom py-8">
        {/* Search & Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 mb-8">
          <form onSubmit={handleSearch}>
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1 relative">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="İsim veya uzmanlık alanı ile ara..."
                  className="input pl-12"
                />
              </div>
              
              {/* Filter Toggle */}
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="btn-secondary flex items-center gap-2"
              >
                <Filter size={18} />
                Filtreler
                <ChevronDown size={18} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Search Button */}
              <button type="submit" className="btn-primary">
                Ara
              </button>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="mt-6 pt-6 border-t border-neutral-100">
                <div className="grid md:grid-cols-3 gap-4">
                  {/* Specialization */}
                  <div>
                    <label className="label">Uzmanlık Alanı</label>
                    <select
                      value={filters.specialization}
                      onChange={(e) => handleFilterChange('specialization', e.target.value)}
                      className="input"
                    >
                      <option value="">Tümü</option>
                      {specializations.map((spec) => (
                        <option key={spec} value={spec}>{spec}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Price Range */}
                  <div>
                    <label className="label">Min. Fiyat</label>
                    <input
                      type="number"
                      value={filters.minPrice}
                      onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                      placeholder="₺0"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Max. Fiyat</label>
                    <input
                      type="number"
                      value={filters.maxPrice}
                      onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                      placeholder="₺5000"
                      className="input"
                    />
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-sm text-neutral-500 hover:text-neutral-700"
                  >
                    Filtreleri Temizle
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-neutral-600">
            <span className="font-medium">{pagination.total}</span> psikolog bulundu
          </p>
        </div>

        {/* Psychologist Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {psychologists.map((psychologist) => (
                <Link
                  key={psychologist.id}
                  to={`/psychologist/${psychologist.id}`}
                  className="card-hover"
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start gap-4 mb-4">
                      <Avatar
                        src={psychologist.avatar}
                        firstName={psychologist.firstName}
                        lastName={psychologist.lastName}
                        size="lg"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-semibold text-neutral-900 truncate">
                          {psychologist.title && `${psychologist.title} `}
                          {psychologist.firstName} {psychologist.lastName}
                        </h3>
                        {psychologist.rating > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star size={16} className="fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">{psychologist.rating.toFixed(1)}</span>
                            <span className="text-sm text-neutral-500">
                              ({psychologist.reviewCount} değerlendirme)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Specializations */}
                    {psychologist.specializations?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {psychologist.specializations.slice(0, 3).map((spec, index) => (
                          <span key={index} className="badge-primary text-xs">
                            {spec}
                          </span>
                        ))}
                        {psychologist.specializations.length > 3 && (
                          <span className="text-xs text-neutral-500">
                            +{psychologist.specializations.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Bio */}
                    {psychologist.bio && (
                      <p className="text-sm text-neutral-600 line-clamp-2 mb-4">
                        {psychologist.bio}
                      </p>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
                      <div className="flex items-center gap-2 text-sm text-neutral-500">
                        <Clock size={16} />
                        <span>{psychologist.sessionDuration || 50} dk</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-primary-600">
                          {formatPrice(psychologist.sessionPrice)}
                        </span>
                        <span className="text-sm text-neutral-500">/seans</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Empty State */}
            {psychologists.length === 0 && (
              <div className="text-center py-12">
                <p className="text-neutral-500 mb-4">
                  Arama kriterlerinize uygun psikolog bulunamadı
                </p>
                <button onClick={clearFilters} className="btn-secondary">
                  Filtreleri Temizle
                </button>
              </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {[...Array(pagination.pages)].map((_, index) => (
                  <button
                    key={index}
                    onClick={() => fetchPsychologists(index + 1)}
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

export default PsychologistList


