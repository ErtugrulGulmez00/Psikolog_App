import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../config/supabase.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/payments/initiate
// @desc    Initiate payment for appointment
// @access  Private
router.post('/initiate', protect, async (req, res) => {
  try {
    const { appointmentId } = req.body;

    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .select(`
        *,
        psychologist:users!appointments_psychologist_id_fkey(id, first_name, last_name, session_price)
      `)
      .eq('id', appointmentId)
      .eq('patient_id', req.user.id)
      .in('status', ['pending', 'confirmed'])
      .eq('is_paid', false)
      .single();

    if (aptError || !appointment) {
      return res.status(404).json({ message: 'Randevu bulunamadı veya zaten ödendi' });
    }

    // Create payment record
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        user_id: req.user.id,
        appointment_id: appointmentId,
        psychologist_id: appointment.psychologist_id,
        amount: appointment.price,
        iyzico_conversation_id: uuidv4()
      })
      .select()
      .single();

    if (error) throw error;

    // In production, you would integrate with Iyzico here
    const paymentFormUrl = `/payment/checkout/${payment.id}`;

    res.json({
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        conversationId: payment.iyzico_conversation_id
      },
      paymentFormUrl
    });
  } catch (error) {
    console.error('Initiate payment error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   POST /api/payments/complete
// @desc    Complete payment (callback from payment provider)
// @access  Private
router.post('/complete', protect, async (req, res) => {
  try {
    const { paymentId, iyzicoPaymentId, cardLastFour, cardType } = req.body;

    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .eq('user_id', req.user.id)
      .eq('status', 'pending')
      .single();

    if (fetchError || !payment) {
      return res.status(404).json({ message: 'Ödeme bulunamadı' });
    }

    // Update payment record
    const { data: updated, error } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        iyzico_payment_id: iyzicoPaymentId || `SIM_${Date.now()}`,
        card_last_four: cardLastFour,
        card_type: cardType,
        invoice_number: `INV-${Date.now()}`
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (error) throw error;

    // Update appointment
    await supabase
      .from('appointments')
      .update({
        is_paid: true,
        payment_id: payment.id,
        status: 'confirmed'
      })
      .eq('id', payment.appointment_id);

    res.json({
      success: true,
      message: 'Ödeme başarılı',
      payment: updated
    });
  } catch (error) {
    console.error('Complete payment error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   GET /api/payments
// @desc    Get user's payments
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let query = supabase
      .from('payments')
      .select(`
        *,
        appointment:appointments(id, date, start_time),
        psychologist:users!payments_psychologist_id_fkey(id, first_name, last_name)
      `, { count: 'exact' })
      .eq('user_id', req.user.id);

    if (status) query = query.eq('status', status);

    const offset = (page - 1) * limit;
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: payments, error, count } = await query;

    if (error) throw error;

    res.json({
      success: true,
      payments: payments.map(p => ({
        _id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        cardLastFour: p.card_last_four,
        invoiceNumber: p.invoice_number,
        refundAmount: p.refund_amount,
        refundReason: p.refund_reason,
        createdAt: p.created_at,
        appointment: p.appointment,
        psychologist: p.psychologist ? {
          _id: p.psychologist.id,
          firstName: p.psychologist.first_name,
          lastName: p.psychologist.last_name
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
    console.error('Get payments error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   GET /api/payments/:id
// @desc    Get single payment
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const { data: payment, error } = await supabase
      .from('payments')
      .select(`
        *,
        appointment:appointments(*),
        psychologist:users!payments_psychologist_id_fkey(id, first_name, last_name),
        user:users!payments_user_id_fkey(id, first_name, last_name)
      `)
      .eq('id', req.params.id)
      .or(`user_id.eq.${req.user.id},psychologist_id.eq.${req.user.id}`)
      .single();

    if (error || !payment) {
      return res.status(404).json({ message: 'Ödeme bulunamadı' });
    }

    res.json({ success: true, payment });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   POST /api/payments/:id/refund
// @desc    Request refund
// @access  Private
router.post('/:id/refund', protect, async (req, res) => {
  try {
    const { reason } = req.body;

    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*, appointment:appointments(*)')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .eq('status', 'completed')
      .single();

    if (fetchError || !payment) {
      return res.status(404).json({ message: 'Ödeme bulunamadı veya iade edilemez' });
    }

    // Check if appointment is still cancellable (24 hours before)
    const appointmentDate = new Date(payment.appointment.date);
    const now = new Date();
    const hoursUntilAppointment = (appointmentDate - now) / (1000 * 60 * 60);

    if (hoursUntilAppointment < 24) {
      return res.status(400).json({ 
        message: 'Randevuya 24 saatten az kaldığı için iade yapılamaz' 
      });
    }

    // Process refund
    const { data: updated, error } = await supabase
      .from('payments')
      .update({
        status: 'refunded',
        refund_amount: payment.amount,
        refund_reason: reason,
        refunded_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    // Cancel appointment
    await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancel_reason: 'Hasta tarafından iptal edildi (iade)',
        cancelled_by: req.user.id
      })
      .eq('id', payment.appointment_id);

    res.json({
      success: true,
      message: 'İade talebi başarılı',
      payment: updated
    });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   GET /api/payments/psychologist/earnings
// @desc    Get psychologist earnings
// @access  Private (Psychologist only)
router.get('/psychologist/earnings', protect, async (req, res) => {
  try {
    if (req.user.role !== 'psychologist') {
      return res.status(403).json({ message: 'Yetkisiz erişim' });
    }

    const { startDate, endDate } = req.query;

    let query = supabase
      .from('payments')
      .select('amount, created_at')
      .eq('psychologist_id', req.user.id)
      .eq('status', 'completed');

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data: payments, error } = await query;

    if (error) throw error;

    const totalEarnings = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalSessions = payments.length;

    // Group by month
    const monthlyEarnings = {};
    payments.forEach(p => {
      const date = new Date(p.created_at);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      if (!monthlyEarnings[key]) {
        monthlyEarnings[key] = { earnings: 0, sessions: 0, year: date.getFullYear(), month: date.getMonth() + 1 };
      }
      monthlyEarnings[key].earnings += Number(p.amount);
      monthlyEarnings[key].sessions += 1;
    });

    const monthlyData = Object.values(monthlyEarnings)
      .sort((a, b) => b.year - a.year || b.month - a.month)
      .slice(0, 12)
      .map(m => ({
        _id: { year: m.year, month: m.month },
        earnings: m.earnings,
        sessions: m.sessions
      }));

    res.json({
      success: true,
      summary: { totalEarnings, totalSessions },
      monthlyEarnings: monthlyData
    });
  } catch (error) {
    console.error('Get earnings error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

export default router;
