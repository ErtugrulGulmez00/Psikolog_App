import express from 'express';
import supabase from '../config/supabase.js';
import { protect, authorize, optionalAuth } from '../middleware/auth.js';
import { uploadImage, handleUploadError } from '../middleware/upload.js';

const router = express.Router();

// Helper function to generate slug
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9ğüşıöç\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

// @route   GET /api/blog/categories/list
// @desc    Get blog categories
// @access  Public
router.get('/categories/list', async (req, res) => {
  const categories = [
    { value: 'anxiety', label: 'Anksiyete' },
    { value: 'depression', label: 'Depresyon' },
    { value: 'relationships', label: 'İlişkiler' },
    { value: 'stress', label: 'Stres' },
    { value: 'self-improvement', label: 'Kişisel Gelişim' },
    { value: 'parenting', label: 'Ebeveynlik' },
    { value: 'trauma', label: 'Travma' },
    { value: 'addiction', label: 'Bağımlılık' },
    { value: 'other', label: 'Diğer' }
  ];

  res.json({ success: true, categories });
});

// @route   POST /api/blog
// @desc    Create blog post
// @access  Private (Psychologist only)
router.post('/', protect, authorize('psychologist'), async (req, res) => {
  try {
    const { title, content, excerpt, category, tags, status } = req.body;

    let slug = generateSlug(title);
    
    // Check for duplicate slug
    const { data: existingBlog } = await supabase
      .from('blogs')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingBlog) {
      slug = `${slug}-${Date.now()}`;
    }

    const { data: blog, error } = await supabase
      .from('blogs')
      .insert({
        author_id: req.user.id,
        title,
        slug,
        content,
        excerpt: excerpt || content.substring(0, 200),
        category: category || 'other',
        tags: tags || [],
        status: status || 'draft',
        published_at: status === 'published' ? new Date().toISOString() : null
      })
      .select(`
        *,
        author:users!blogs_author_id_fkey(id, first_name, last_name, avatar, title)
      `)
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      blog: {
        _id: blog.id,
        title: blog.title,
        slug: blog.slug,
        content: blog.content,
        excerpt: blog.excerpt,
        coverImage: blog.cover_image,
        category: blog.category,
        tags: blog.tags,
        status: blog.status,
        views: blog.views,
        likeCount: blog.like_count,
        publishedAt: blog.published_at,
        author: blog.author ? {
          _id: blog.author.id,
          firstName: blog.author.first_name,
          lastName: blog.author.last_name,
          avatar: blog.author.avatar,
          title: blog.author.title
        } : null
      }
    });
  } catch (error) {
    console.error('Create blog error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   GET /api/blog
// @desc    Get all published blogs
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { category, author, search, page = 1, limit = 10 } = req.query;

    let query = supabase
      .from('blogs')
      .select(`
        id, title, slug, excerpt, cover_image, category, tags, status, views, like_count, published_at, created_at,
        author:users!blogs_author_id_fkey(id, first_name, last_name, avatar, title)
      `, { count: 'exact' })
      .eq('status', 'published');

    if (category) query = query.eq('category', category);
    if (author) query = query.eq('author_id', author);
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    const offset = (page - 1) * limit;
    query = query
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: blogs, error, count } = await query;

    if (error) throw error;

    res.json({
      success: true,
      blogs: blogs.map(b => ({
        _id: b.id,
        title: b.title,
        slug: b.slug,
        excerpt: b.excerpt,
        coverImage: b.cover_image,
        category: b.category,
        tags: b.tags,
        views: b.views,
        likeCount: b.like_count,
        publishedAt: b.published_at,
        author: b.author ? {
          _id: b.author.id,
          firstName: b.author.first_name,
          lastName: b.author.last_name,
          avatar: b.author.avatar,
          title: b.author.title
        } : null
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get blogs error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   GET /api/blog/my-posts
// @desc    Get psychologist's own posts
// @access  Private (Psychologist only)
router.get('/my-posts', protect, authorize('psychologist'), async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let query = supabase
      .from('blogs')
      .select('*', { count: 'exact' })
      .eq('author_id', req.user.id);

    if (status) query = query.eq('status', status);

    const offset = (page - 1) * limit;
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: blogs, error, count } = await query;

    if (error) throw error;

    res.json({
      success: true,
      blogs: blogs.map(b => ({
        _id: b.id,
        title: b.title,
        slug: b.slug,
        excerpt: b.excerpt,
        coverImage: b.cover_image,
        category: b.category,
        tags: b.tags,
        status: b.status,
        views: b.views,
        likeCount: b.like_count,
        createdAt: b.created_at
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get my posts error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   GET /api/blog/:slug
// @desc    Get single blog by slug
// @access  Public
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const { data: blog, error } = await supabase
      .from('blogs')
      .select(`
        *,
        author:users!blogs_author_id_fkey(id, first_name, last_name, avatar, title, bio)
      `)
      .eq('slug', req.params.slug)
      .single();

    if (error || !blog) {
      return res.status(404).json({ message: 'Makale bulunamadı' });
    }

    // Only show published posts publicly
    if (blog.status !== 'published' && 
        (!req.user || blog.author_id !== req.user.id)) {
      return res.status(404).json({ message: 'Makale bulunamadı' });
    }

    // Increment view count
    await supabase
      .from('blogs')
      .update({ views: blog.views + 1 })
      .eq('id', blog.id);

    res.json({
      success: true,
      blog: {
        _id: blog.id,
        title: blog.title,
        slug: blog.slug,
        content: blog.content,
        excerpt: blog.excerpt,
        coverImage: blog.cover_image,
        category: blog.category,
        tags: blog.tags,
        status: blog.status,
        views: blog.views + 1,
        likes: blog.likes,
        likeCount: blog.like_count,
        publishedAt: blog.published_at,
        author: blog.author ? {
          _id: blog.author.id,
          firstName: blog.author.first_name,
          lastName: blog.author.last_name,
          avatar: blog.author.avatar,
          title: blog.author.title,
          bio: blog.author.bio
        } : null
      }
    });
  } catch (error) {
    console.error('Get blog error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   PUT /api/blog/:id
// @desc    Update blog post
// @access  Private (Author only)
router.put('/:id', protect, authorize('psychologist'), async (req, res) => {
  try {
    const { data: existing } = await supabase
      .from('blogs')
      .select('*')
      .eq('id', req.params.id)
      .eq('author_id', req.user.id)
      .single();

    if (!existing) {
      return res.status(404).json({ message: 'Makale bulunamadı' });
    }

    const { title, content, excerpt, category, tags, status } = req.body;

    const updateData = {};
    if (title && title !== existing.title) {
      updateData.title = title;
      updateData.slug = generateSlug(title);
    }
    if (content !== undefined) updateData.content = content;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = tags;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'published' && !existing.published_at) {
        updateData.published_at = new Date().toISOString();
      }
    }

    const { data: blog, error } = await supabase
      .from('blogs')
      .update(updateData)
      .eq('id', req.params.id)
      .select(`
        *,
        author:users!blogs_author_id_fkey(id, first_name, last_name, avatar, title)
      `)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      blog: {
        _id: blog.id,
        title: blog.title,
        slug: blog.slug,
        content: blog.content,
        excerpt: blog.excerpt,
        coverImage: blog.cover_image,
        category: blog.category,
        tags: blog.tags,
        status: blog.status,
        publishedAt: blog.published_at,
        author: blog.author ? {
          _id: blog.author.id,
          firstName: blog.author.first_name,
          lastName: blog.author.last_name,
          avatar: blog.author.avatar,
          title: blog.author.title
        } : null
      }
    });
  } catch (error) {
    console.error('Update blog error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   DELETE /api/blog/:id
// @desc    Delete blog post
// @access  Private (Author only)
router.delete('/:id', protect, authorize('psychologist'), async (req, res) => {
  try {
    // Delete comments first
    await supabase
      .from('comments')
      .delete()
      .eq('blog_id', req.params.id);

    const { error } = await supabase
      .from('blogs')
      .delete()
      .eq('id', req.params.id)
      .eq('author_id', req.user.id);

    if (error) throw error;

    res.json({ success: true, message: 'Makale silindi' });
  } catch (error) {
    console.error('Delete blog error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   POST /api/blog/:id/like
// @desc    Like/Unlike blog post
// @access  Private
router.post('/:id/like', protect, async (req, res) => {
  try {
    const { data: blog } = await supabase
      .from('blogs')
      .select('likes, like_count')
      .eq('id', req.params.id)
      .single();

    if (!blog) {
      return res.status(404).json({ message: 'Makale bulunamadı' });
    }

    const likes = blog.likes || [];
    const userIndex = likes.indexOf(req.user.id);
    let likeCount = blog.like_count || 0;

    if (userIndex > -1) {
      likes.splice(userIndex, 1);
      likeCount = Math.max(0, likeCount - 1);
    } else {
      likes.push(req.user.id);
      likeCount += 1;
    }

    await supabase
      .from('blogs')
      .update({ likes, like_count: likeCount })
      .eq('id', req.params.id);

    res.json({ 
      success: true, 
      liked: userIndex === -1,
      likeCount 
    });
  } catch (error) {
    console.error('Like blog error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   POST /api/blog/:id/cover
// @desc    Upload cover image
// @access  Private (Author only)
router.post('/:id/cover', protect, authorize('psychologist'), uploadImage, handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Dosya yüklenmedi' });
    }

    const coverImage = `/uploads/images/${req.file.filename}`;

    await supabase
      .from('blogs')
      .update({ cover_image: coverImage })
      .eq('id', req.params.id)
      .eq('author_id', req.user.id);

    res.json({ success: true, coverImage });
  } catch (error) {
    console.error('Upload cover error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   GET /api/blog/:id/comments
// @desc    Get comments for a blog
// @access  Public
router.get('/:id/comments', async (req, res) => {
  try {
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        author:users!comments_author_id_fkey(id, first_name, last_name, avatar)
      `)
      .eq('blog_id', req.params.id)
      .eq('is_approved', true)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      comments: comments.map(c => ({
        _id: c.id,
        content: c.content,
        createdAt: c.created_at,
        author: c.author ? {
          _id: c.author.id,
          firstName: c.author.first_name,
          lastName: c.author.last_name,
          avatar: c.author.avatar
        } : null
      }))
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   POST /api/blog/:id/comments
// @desc    Add comment to blog
// @access  Private
router.post('/:id/comments', protect, async (req, res) => {
  try {
    const { content, parentCommentId } = req.body;

    const { data: blog } = await supabase
      .from('blogs')
      .select('id')
      .eq('id', req.params.id)
      .eq('status', 'published')
      .single();

    if (!blog) {
      return res.status(404).json({ message: 'Makale bulunamadı' });
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        blog_id: req.params.id,
        author_id: req.user.id,
        content,
        parent_comment_id: parentCommentId || null
      })
      .select(`
        *,
        author:users!comments_author_id_fkey(id, first_name, last_name, avatar)
      `)
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      comment: {
        _id: comment.id,
        content: comment.content,
        createdAt: comment.created_at,
        author: comment.author ? {
          _id: comment.author.id,
          firstName: comment.author.first_name,
          lastName: comment.author.last_name,
          avatar: comment.author.avatar
        } : null
      }
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

export default router;
