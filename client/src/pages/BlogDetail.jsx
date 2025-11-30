import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { blogAPI } from '../services/api'
import { formatDate, getCategoryLabel } from '../utils/helpers'
import { toast } from 'react-hot-toast'
import { 
  ArrowLeft, Heart, Eye, Calendar, 
  Share2, Bookmark, MessageCircle 
} from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import Avatar from '../components/common/Avatar'

const BlogDetail = () => {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  
  const [blog, setBlog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)

  useEffect(() => {
    fetchBlog()
  }, [slug])

  useEffect(() => {
    if (blog) {
      fetchComments()
      setLiked(blog.likes?.includes(user?.id || user?._id))
      setLikeCount(blog.likeCount)
    }
  }, [blog, user])

  const fetchBlog = async () => {
    try {
      setLoading(true)
      const res = await blogAPI.getOne(slug)
      setBlog(res.data.blog)
    } catch (error) {
      console.error('Fetch blog error:', error)
      toast.error('Makale yüklenemedi')
      navigate('/blog')
    } finally {
      setLoading(false)
    }
  }

  const fetchComments = async () => {
    try {
      const res = await blogAPI.getComments(blog._id)
      setComments(res.data.comments)
    } catch (error) {
      console.error('Fetch comments error:', error)
    }
  }

  const handleLike = async () => {
    if (!isAuthenticated) {
      toast.error('Beğenmek için giriş yapmalısınız')
      return
    }

    try {
      const res = await blogAPI.like(blog._id)
      setLiked(res.data.liked)
      setLikeCount(res.data.likeCount)
    } catch (error) {
      toast.error('İşlem başarısız')
    }
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) {
      toast.error('Yorum yapmak için giriş yapmalısınız')
      return
    }

    if (!newComment.trim()) return

    setSubmittingComment(true)
    try {
      const res = await blogAPI.addComment(blog._id, { content: newComment.trim() })
      setComments(prev => [res.data.comment, ...prev])
      setNewComment('')
      toast.success('Yorumunuz eklendi')
    } catch (error) {
      toast.error('Yorum eklenemedi')
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: blog.title,
          text: blog.excerpt,
          url
        })
      } catch (error) {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(url)
      toast.success('Bağlantı kopyalandı')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!blog) {
    return null
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-8">
      <article className="container-custom max-w-4xl">
        {/* Back Button */}
        <button
          onClick={() => navigate('/blog')}
          className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-6"
        >
          <ArrowLeft size={20} />
          <span>Blog'a Dön</span>
        </button>

        {/* Header */}
        <header className="mb-8">
          <span className="badge-primary mb-4">
            {getCategoryLabel(blog.category)}
          </span>
          
          <h1 className="font-display text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
            {blog.title}
          </h1>

          {/* Author & Meta */}
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
            <Link 
              to={`/psychologist/${blog.author?.id || blog.author?._id}`}
              className="flex items-center gap-3 hover:opacity-80"
            >
              <Avatar
                src={blog.author?.avatar}
                firstName={blog.author?.firstName}
                lastName={blog.author?.lastName}
                size="md"
              />
              <div>
                <p className="font-medium text-neutral-900">
                  {blog.author?.title && `${blog.author.title} `}
                  {blog.author?.firstName} {blog.author?.lastName}
                </p>
                <p className="text-sm text-neutral-500">Psikolog</p>
              </div>
            </Link>

            <div className="flex items-center gap-4 text-sm text-neutral-500 md:ml-auto">
              <span className="flex items-center gap-1">
                <Calendar size={16} />
                {formatDate(blog.publishedAt)}
              </span>
              <span className="flex items-center gap-1">
                <Eye size={16} />
                {blog.views} görüntüleme
              </span>
            </div>
          </div>

          {/* Cover Image */}
          {blog.coverImage && (
            <div className="aspect-video bg-neutral-100 rounded-2xl overflow-hidden mb-8">
              <img
                src={blog.coverImage}
                alt={blog.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </header>

        {/* Content */}
        <div className="card p-8 mb-8">
          <div 
            className="prose prose-neutral max-w-none"
            dangerouslySetInnerHTML={{ __html: blog.content.replace(/\n/g, '<br/>') }}
          />

          {/* Tags */}
          {blog.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t border-neutral-100">
              {blog.tags.map((tag, index) => (
                <span key={index} className="text-sm bg-neutral-100 text-neutral-600 px-3 py-1 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                liked 
                  ? 'bg-red-50 text-red-600' 
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              <Heart size={20} className={liked ? 'fill-red-600' : ''} />
              <span>{likeCount}</span>
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-600 rounded-xl hover:bg-neutral-200 transition-colors"
            >
              <Share2 size={20} />
              <span>Paylaş</span>
            </button>
          </div>
        </div>

        {/* Comments */}
        <section className="card p-8">
          <h2 className="font-display text-xl font-semibold text-neutral-900 mb-6">
            Yorumlar ({comments.length})
          </h2>

          {/* Comment Form */}
          <form onSubmit={handleComment} className="mb-8">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="input resize-none mb-4"
              rows={3}
              placeholder={isAuthenticated ? "Yorumunuzu yazın..." : "Yorum yapmak için giriş yapın"}
              disabled={!isAuthenticated}
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!isAuthenticated || !newComment.trim() || submittingComment}
                className="btn-primary"
              >
                {submittingComment ? <LoadingSpinner size="sm" /> : 'Yorum Yap'}
              </button>
            </div>
          </form>

          {/* Comments List */}
          <div className="space-y-6">
            {comments.length === 0 ? (
              <p className="text-center text-neutral-500 py-8">
                Henüz yorum yapılmamış. İlk yorumu siz yapın!
              </p>
            ) : (
              comments.map((comment) => (
                <div key={comment._id} className="flex gap-4">
                  <Avatar
                    src={comment.author?.avatar}
                    firstName={comment.author?.firstName}
                    lastName={comment.author?.lastName}
                    size="md"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-neutral-900">
                        {comment.author?.firstName} {comment.author?.lastName}
                      </span>
                      <span className="text-sm text-neutral-500">
                        {formatDate(comment.createdAt, 'dd MMM yyyy')}
                      </span>
                    </div>
                    <p className="text-neutral-600">{comment.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Author Bio */}
        {blog.author?.bio && (
          <section className="card p-8 mt-8">
            <h3 className="font-display text-lg font-semibold text-neutral-900 mb-4">
              Yazar Hakkında
            </h3>
            <div className="flex items-start gap-4">
              <Avatar
                src={blog.author?.avatar}
                firstName={blog.author?.firstName}
                lastName={blog.author?.lastName}
                size="lg"
              />
              <div>
                <Link 
                  to={`/psychologist/${blog.author?.id || blog.author?._id}`}
                  className="font-medium text-neutral-900 hover:text-primary-600"
                >
                  {blog.author?.title && `${blog.author.title} `}
                  {blog.author?.firstName} {blog.author?.lastName}
                </Link>
                <p className="text-neutral-600 mt-2">{blog.author?.bio}</p>
                <Link 
                  to={`/psychologist/${blog.author?.id || blog.author?._id}`}
                  className="inline-block mt-4 text-primary-600 hover:text-primary-700 font-medium"
                >
                  Profili Görüntüle →
                </Link>
              </div>
            </div>
          </section>
        )}
      </article>
    </div>
  )
}

export default BlogDetail


