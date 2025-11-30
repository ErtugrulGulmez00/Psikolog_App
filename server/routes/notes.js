import express from 'express';
import supabase from '../config/supabase.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadDocument, handleUploadError } from '../middleware/upload.js';

const router = express.Router();

// @route   POST /api/notes
// @desc    Create note
// @access  Private (Psychologist only)
router.post('/', protect, authorize('psychologist'), async (req, res) => {
  try {
    const { patientId, appointmentId, title, content, type, tags, isPrivate } = req.body;

    const { data: note, error } = await supabase
      .from('notes')
      .insert({
        psychologist_id: req.user.id,
        patient_id: patientId,
        appointment_id: appointmentId || null,
        title,
        content,
        type: type || 'session',
        tags: tags || [],
        is_private: isPrivate !== false
      })
      .select(`
        *,
        patient:users!notes_patient_id_fkey(id, first_name, last_name),
        appointment:appointments(id, date, start_time)
      `)
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      note: {
        _id: note.id,
        title: note.title,
        content: note.content,
        type: note.type,
        tags: note.tags,
        isPrivate: note.is_private,
        sharedWithPatient: note.shared_with_patient,
        createdAt: note.created_at,
        patient: note.patient ? {
          _id: note.patient.id,
          firstName: note.patient.first_name,
          lastName: note.patient.last_name
        } : null,
        appointment: note.appointment
      }
    });
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   GET /api/notes
// @desc    Get notes
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { patientId, type, page = 1, limit = 20 } = req.query;

    let query = supabase
      .from('notes')
      .select(`
        *,
        patient:users!notes_patient_id_fkey(id, first_name, last_name),
        appointment:appointments(id, date, start_time)
      `, { count: 'exact' });

    if (req.user.role === 'psychologist') {
      query = query.eq('psychologist_id', req.user.id);
      if (patientId) query = query.eq('patient_id', patientId);
    } else {
      // Patients can only see notes shared with them
      query = query.eq('patient_id', req.user.id).eq('shared_with_patient', true);
    }

    if (type) query = query.eq('type', type);

    const offset = (page - 1) * limit;
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: notes, error, count } = await query;

    if (error) throw error;

    res.json({
      success: true,
      notes: notes.map(n => ({
        _id: n.id,
        title: n.title,
        content: n.content,
        type: n.type,
        tags: n.tags,
        attachments: n.attachments,
        isPrivate: n.is_private,
        sharedWithPatient: n.shared_with_patient,
        createdAt: n.created_at,
        patient: n.patient ? {
          _id: n.patient.id,
          firstName: n.patient.first_name,
          lastName: n.patient.last_name
        } : null,
        appointment: n.appointment
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   GET /api/notes/:id
// @desc    Get single note
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const { data: note, error } = await supabase
      .from('notes')
      .select(`
        *,
        patient:users!notes_patient_id_fkey(id, first_name, last_name),
        psychologist:users!notes_psychologist_id_fkey(id, first_name, last_name),
        appointment:appointments(*)
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !note) {
      return res.status(404).json({ message: 'Not bulunamadı' });
    }

    // Check authorization
    const isPsychologist = note.psychologist_id === req.user.id;
    const isPatient = note.patient_id === req.user.id && note.shared_with_patient;

    if (!isPsychologist && !isPatient) {
      return res.status(403).json({ message: 'Bu nota erişim yetkiniz yok' });
    }

    res.json({
      success: true,
      note: {
        _id: note.id,
        title: note.title,
        content: note.content,
        type: note.type,
        tags: note.tags,
        attachments: note.attachments,
        isPrivate: note.is_private,
        sharedWithPatient: note.shared_with_patient,
        createdAt: note.created_at,
        patient: note.patient ? {
          _id: note.patient.id,
          firstName: note.patient.first_name,
          lastName: note.patient.last_name
        } : null,
        psychologist: note.psychologist ? {
          _id: note.psychologist.id,
          firstName: note.psychologist.first_name,
          lastName: note.psychologist.last_name
        } : null
      }
    });
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   PUT /api/notes/:id
// @desc    Update note
// @access  Private (Psychologist only)
router.put('/:id', protect, authorize('psychologist'), async (req, res) => {
  try {
    const { data: existing } = await supabase
      .from('notes')
      .select('id')
      .eq('id', req.params.id)
      .eq('psychologist_id', req.user.id)
      .single();

    if (!existing) {
      return res.status(404).json({ message: 'Not bulunamadı' });
    }

    const { title, content, type, tags, isPrivate, sharedWithPatient } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (type !== undefined) updateData.type = type;
    if (tags !== undefined) updateData.tags = tags;
    if (isPrivate !== undefined) updateData.is_private = isPrivate;
    if (sharedWithPatient !== undefined) updateData.shared_with_patient = sharedWithPatient;

    const { data: note, error } = await supabase
      .from('notes')
      .update(updateData)
      .eq('id', req.params.id)
      .select(`
        *,
        patient:users!notes_patient_id_fkey(id, first_name, last_name),
        appointment:appointments(id, date, start_time)
      `)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      note: {
        _id: note.id,
        title: note.title,
        content: note.content,
        type: note.type,
        tags: note.tags,
        isPrivate: note.is_private,
        sharedWithPatient: note.shared_with_patient,
        createdAt: note.created_at,
        patient: note.patient ? {
          _id: note.patient.id,
          firstName: note.patient.first_name,
          lastName: note.patient.last_name
        } : null
      }
    });
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   DELETE /api/notes/:id
// @desc    Delete note
// @access  Private (Psychologist only)
router.delete('/:id', protect, authorize('psychologist'), async (req, res) => {
  try {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', req.params.id)
      .eq('psychologist_id', req.user.id);

    if (error) throw error;

    res.json({ success: true, message: 'Not silindi' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   POST /api/notes/:id/attachment
// @desc    Add attachment to note
// @access  Private (Psychologist only)
router.post('/:id/attachment', protect, authorize('psychologist'), uploadDocument, handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Dosya yüklenmedi' });
    }

    const { data: note } = await supabase
      .from('notes')
      .select('attachments')
      .eq('id', req.params.id)
      .eq('psychologist_id', req.user.id)
      .single();

    if (!note) {
      return res.status(404).json({ message: 'Not bulunamadı' });
    }

    const attachments = note.attachments || [];
    attachments.push({
      fileName: req.file.originalname,
      fileUrl: `/uploads/documents/${req.file.filename}`,
      fileType: req.file.mimetype,
      uploadedAt: new Date().toISOString()
    });

    const { data: updated, error } = await supabase
      .from('notes')
      .update({ attachments })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, note: updated });
  } catch (error) {
    console.error('Add attachment error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

export default router;
