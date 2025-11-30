import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../config/supabase.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Helper to transform appointment
const transformAppointment = (apt) => ({
  _id: apt.id,
  patient: apt.patient ? {
    _id: apt.patient.id,
    firstName: apt.patient.first_name,
    lastName: apt.patient.last_name,
    avatar: apt.patient.avatar,
    email: apt.patient.email,
    phone: apt.patient.phone
  } : null,
  psychologist: apt.psychologist ? {
    _id: apt.psychologist.id,
    firstName: apt.psychologist.first_name,
    lastName: apt.psychologist.last_name,
    avatar: apt.psychologist.avatar,
    title: apt.psychologist.title,
    sessionPrice: apt.psychologist.session_price
  } : null,
  date: apt.date,
  startTime: apt.start_time,
  endTime: apt.end_time,
  duration: apt.duration,
  status: apt.status,
  type: apt.type,
  notes: apt.notes,
  patientNotes: apt.patient_notes,
  price: apt.price,
  isPaid: apt.is_paid,
  paymentId: apt.payment_id,
  roomId: apt.room_id,
  cancelReason: apt.cancel_reason
});

// @route   POST /api/appointments
// @desc    Create appointment
// @access  Private (Patient)
router.post('/', protect, async (req, res) => {
  try {
    const { psychologistId, date, startTime, notes } = req.body;

    // Get psychologist details
    const { data: psychologist, error: psyError } = await supabase
      .from('users')
      .select('id, session_duration, session_price')
      .eq('id', psychologistId)
      .eq('role', 'psychologist')
      .single();

    if (psyError || !psychologist) {
      return res.status(404).json({ message: 'Psikolog bulunamadı' });
    }

    // Calculate end time
    const duration = psychologist.session_duration || 50;
    const [hours, minutes] = startTime.split(':').map(Number);
    const endDate = new Date(2000, 0, 1, hours, minutes + duration);
    const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

    // Check for conflicts
    const { data: conflicts } = await supabase
      .from('appointments')
      .select('id')
      .eq('psychologist_id', psychologistId)
      .eq('date', date)
      .in('status', ['pending', 'confirmed'])
      .or(`and(start_time.lte.${startTime},end_time.gt.${startTime}),and(start_time.lt.${endTime},end_time.gte.${endTime})`);

    if (conflicts && conflicts.length > 0) {
      return res.status(400).json({ message: 'Bu zaman dilimi dolu' });
    }

    // Create appointment
    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        patient_id: req.user.id,
        psychologist_id: psychologistId,
        date,
        start_time: startTime,
        end_time: endTime,
        duration,
        price: psychologist.session_price,
        patient_notes: notes,
        room_id: uuidv4()
      })
      .select(`
        *,
        patient:users!appointments_patient_id_fkey(id, first_name, last_name, avatar, email),
        psychologist:users!appointments_psychologist_id_fkey(id, first_name, last_name, avatar, title, session_price)
      `)
      .single();

    if (error) throw error;

    // Assign psychologist to patient if not already assigned
    await supabase
      .from('users')
      .update({ assigned_psychologist: psychologistId })
      .eq('id', req.user.id)
      .is('assigned_psychologist', null);

    res.status(201).json({ success: true, appointment: transformAppointment(appointment) });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   GET /api/appointments
// @desc    Get user's appointments
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { status, startDate, endDate, page = 1, limit = 10 } = req.query;

    const userIdField = req.user.role === 'psychologist' ? 'psychologist_id' : 'patient_id';
    
    let query = supabase
      .from('appointments')
      .select(`
        *,
        patient:users!appointments_patient_id_fkey(id, first_name, last_name, avatar, email),
        psychologist:users!appointments_psychologist_id_fkey(id, first_name, last_name, avatar, title, session_price)
      `, { count: 'exact' })
      .eq(userIdField, req.user.id);

    if (status) {
      query = query.eq('status', status);
    }

    if (startDate) {
      query = query.gte('date', startDate);
    }

    if (endDate) {
      query = query.lte('date', endDate);
    }

    const offset = (page - 1) * limit;
    query = query
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data: appointments, error, count } = await query;

    if (error) throw error;

    res.json({
      success: true,
      appointments: appointments.map(transformAppointment),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   GET /api/appointments/:id
// @desc    Get single appointment
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:users!appointments_patient_id_fkey(id, first_name, last_name, avatar, email, phone),
        psychologist:users!appointments_psychologist_id_fkey(id, first_name, last_name, avatar, title, session_price)
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !appointment) {
      return res.status(404).json({ message: 'Randevu bulunamadı' });
    }

    // Check authorization
    const isAuthorized = 
      appointment.patient_id === req.user.id ||
      appointment.psychologist_id === req.user.id;

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Bu randevuya erişim yetkiniz yok' });
    }

    res.json({ success: true, appointment: transformAppointment(appointment) });
  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   PUT /api/appointments/:id/status
// @desc    Update appointment status
// @access  Private
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status, cancelReason } = req.body;
    
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !appointment) {
      return res.status(404).json({ message: 'Randevu bulunamadı' });
    }

    // Check authorization
    const isPatient = appointment.patient_id === req.user.id;
    const isPsychologist = appointment.psychologist_id === req.user.id;

    if (!isPatient && !isPsychologist) {
      return res.status(403).json({ message: 'Bu randevuyu güncelleme yetkiniz yok' });
    }

    // Validate status transitions
    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['completed', 'cancelled', 'no-show'],
      completed: [],
      cancelled: [],
      'no-show': []
    };

    if (!validTransitions[appointment.status]?.includes(status)) {
      return res.status(400).json({ message: 'Geçersiz durum değişikliği' });
    }

    // Only psychologist can confirm or mark as completed/no-show
    if (['confirmed', 'completed', 'no-show'].includes(status) && !isPsychologist) {
      return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
    }

    const updateData = { status };
    if (status === 'cancelled') {
      updateData.cancel_reason = cancelReason;
      updateData.cancelled_by = req.user.id;
    }

    const { data: updated, error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', req.params.id)
      .select(`
        *,
        patient:users!appointments_patient_id_fkey(id, first_name, last_name, avatar, email),
        psychologist:users!appointments_psychologist_id_fkey(id, first_name, last_name, avatar, title)
      `)
      .single();

    if (error) throw error;

    res.json({ success: true, appointment: transformAppointment(updated) });
  } catch (error) {
    console.error('Update appointment status error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   GET /api/appointments/psychologist/:id/availability
// @desc    Get psychologist availability for a date
// @access  Public
router.get('/psychologist/:id/availability', async (req, res) => {
  try {
    const { date } = req.query;
    
    const { data: psychologist, error: psyError } = await supabase
      .from('users')
      .select('availability, session_duration')
      .eq('id', req.params.id)
      .eq('role', 'psychologist')
      .single();

    if (psyError || !psychologist) {
      return res.status(404).json({ message: 'Psikolog bulunamadı' });
    }

    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();

    // Get psychologist's availability for this day
    const availability = psychologist.availability || [];
    const dayAvailability = availability.find(a => a.day === dayOfWeek);
    
    if (!dayAvailability) {
      return res.json({ success: true, slots: [] });
    }

    // Get existing appointments for this date
    const { data: existingAppointments } = await supabase
      .from('appointments')
      .select('start_time')
      .eq('psychologist_id', req.params.id)
      .eq('date', date)
      .in('status', ['pending', 'confirmed']);

    const bookedTimes = existingAppointments?.map(a => a.start_time) || [];

    // Generate time slots
    const slots = [];
    const duration = psychologist.session_duration || 50;
    const [startHour, startMin] = dayAvailability.startTime.split(':').map(Number);
    const [endHour, endMin] = dayAvailability.endTime.split(':').map(Number);

    let currentTime = new Date(2000, 0, 1, startHour, startMin);
    const endTime = new Date(2000, 0, 1, endHour, endMin);

    while (currentTime < endTime) {
      const timeString = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;
      
      slots.push({
        time: timeString,
        available: !bookedTimes.includes(timeString)
      });

      currentTime = new Date(currentTime.getTime() + duration * 60000);
    }

    res.json({ success: true, slots });
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

export default router;
