import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import supabase from '../config/supabase.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, phone } = req.body;

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return res.status(400).json({ message: 'Bu email adresi zaten kayıtlı' });
    }

    // Validate role
    const validRoles = ['patient', 'psychologist'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Geçersiz kullanıcı rolü' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password: hashedPassword,
        first_name: firstName,
        last_name: lastName,
        role: role || 'patient',
        phone
      })
      .select('id, email, first_name, last_name, role, avatar')
      .single();

    if (error) throw error;

    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email ve şifre gerekli' });
    }

    // Check for user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return res.status(401).json({ message: 'Geçersiz email veya şifre' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Geçersiz email veya şifre' });
    }

    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    const token = generateToken(user.id);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Sunucu hatası', error: error.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;

    // Get assigned psychologist info if exists
    let assignedPsychologistData = null;
    if (user.assigned_psychologist) {
      const { data: psychologist } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar')
        .eq('id', user.assigned_psychologist)
        .single();
      
      if (psychologist) {
        assignedPsychologistData = {
          id: psychologist.id,
          firstName: psychologist.first_name,
          lastName: psychologist.last_name,
          avatar: psychologist.avatar
        };
      }
    }

    // Transform to camelCase
    const transformedUser = {
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
      isActive: user.is_active,
      assignedPsychologist: assignedPsychologistData,
      medicalHistory: user.medical_history,
      emergencyContact: user.emergency_contact
    };

    res.json({
      success: true,
      user: transformedUser
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   PUT /api/auth/update-password
// @desc    Update password
// @access  Private
router.put('/update-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const { data: user } = await supabase
      .from('users')
      .select('password')
      .eq('id', req.user.id)
      .single();

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mevcut şifre yanlış' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', req.user.id);

    res.json({ success: true, message: 'Şifre başarıyla güncellendi' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

export default router;
