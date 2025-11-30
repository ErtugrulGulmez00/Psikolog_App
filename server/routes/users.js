import express from 'express';
import supabase from '../config/supabase.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadAvatar, handleUploadError } from '../middleware/upload.js';

const router = express.Router();

// Helper to transform user data to camelCase
const transformUser = (user) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  firstName: user.first_name,
  lastName: user.last_name,
  phone: user.phone,
  avatar: user.avatar,
  title: user.title,
  specializations: user.specializations,
  bio: user.bio,
  experience: user.experience,
  education: user.education,
  certificates: user.certificates,
  sessionPrice: user.session_price,
  sessionDuration: user.session_duration,
  availability: user.availability,
  rating: user.rating,
  reviewCount: user.review_count,
  isVerified: user.is_verified,
  isActive: user.is_active
});

// @route   GET /api/users/psychologists
// @desc    Get all psychologists
// @access  Public
router.get('/psychologists', async (req, res) => {
  try {
    const { 
      specialization, 
      minPrice, 
      maxPrice, 
      search,
      page = 1,
      limit = 10 
    } = req.query;

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .eq('role', 'psychologist')
      .eq('is_active', true);

    if (specialization) {
      query = query.contains('specializations', [specialization]);
    }

    if (minPrice) {
      query = query.gte('session_price', Number(minPrice));
    }

    if (maxPrice) {
      query = query.lte('session_price', Number(maxPrice));
    }

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,bio.ilike.%${search}%`);
    }

    const offset = (page - 1) * limit;
    query = query
      .order('rating', { ascending: false })
      .order('review_count', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: psychologists, error, count } = await query;

    if (error) throw error;

    res.json({
      success: true,
      psychologists: psychologists.map(transformUser),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get psychologists error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   GET /api/users/psychologist/:id
// @desc    Get single psychologist
// @access  Public
router.get('/psychologist/:id', async (req, res) => {
  try {
    const { data: psychologist, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .eq('role', 'psychologist')
      .single();

    if (error || !psychologist) {
      return res.status(404).json({ message: 'Psikolog bulunamadı' });
    }

    res.json({ success: true, psychologist: transformUser(psychologist) });
  } catch (error) {
    console.error('Get psychologist error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const allowedFields = {
      firstName: 'first_name',
      lastName: 'last_name',
      phone: 'phone',
      bio: 'bio',
      title: 'title',
      specializations: 'specializations',
      experience: 'experience',
      education: 'education',
      certificates: 'certificates',
      sessionPrice: 'session_price',
      sessionDuration: 'session_duration',
      availability: 'availability',
      medicalHistory: 'medical_history',
      emergencyContact: 'emergency_contact'
    };

    const updateData = {};
    Object.keys(allowedFields).forEach(key => {
      if (req.body[key] !== undefined) {
        updateData[allowedFields[key]] = req.body[key];
      }
    });

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', req.user.id)
      .select('*')
      .single();

    if (error) throw error;

    res.json({ success: true, user: transformUser(user) });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   POST /api/users/avatar
// @desc    Upload avatar
// @access  Private
router.post('/avatar', protect, uploadAvatar, handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Dosya yüklenmedi' });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    await supabase
      .from('users')
      .update({ avatar: avatarUrl })
      .eq('id', req.user.id);

    res.json({ success: true, avatar: avatarUrl });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   GET /api/users/my-patients
// @desc    Get psychologist's patients
// @access  Private (Psychologist only)
router.get('/my-patients', protect, authorize('psychologist'), async (req, res) => {
  try {
    const { data: patients, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, phone, avatar, last_login')
      .eq('assigned_psychologist', req.user.id)
      .eq('role', 'patient');

    if (error) throw error;

    res.json({ 
      success: true, 
      patients: patients.map(p => ({
        id: p.id,
        firstName: p.first_name,
        lastName: p.last_name,
        email: p.email,
        phone: p.phone,
        avatar: p.avatar,
        lastLogin: p.last_login
      }))
    });
  } catch (error) {
    console.error('Get my patients error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   GET /api/users/specializations
// @desc    Get all specializations
// @access  Public
router.get('/specializations', async (req, res) => {
  const specializations = [
    'Anksiyete',
    'Depresyon',
    'İlişki Sorunları',
    'Stres Yönetimi',
    'Travma ve PTSD',
    'Bağımlılık',
    'Yeme Bozuklukları',
    'Obsesif Kompulsif Bozukluk',
    'Panik Atak',
    'Sosyal Fobi',
    'Çift Terapisi',
    'Aile Terapisi',
    'Çocuk ve Ergen',
    'Kariyer Danışmanlığı',
    'Yas ve Kayıp'
  ];
  
  res.json({ success: true, specializations });
});

export default router;
