import express from 'express';
import supabase from '../config/supabase.js';
import { protect } from '../middleware/auth.js';
import { uploadDocument, handleUploadError } from '../middleware/upload.js';

const router = express.Router();

// @route   GET /api/messages/conversations
// @desc    Get user's conversations
// @access  Private
router.get('/conversations', protect, async (req, res) => {
  try {
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .contains('participants', [req.user.id])
      .order('last_message_at', { ascending: false });

    if (error) throw error;

    // Get participant details for each conversation
    const conversationsWithParticipants = await Promise.all(
      conversations.map(async (conv) => {
        const { data: participants } = await supabase
          .from('users')
          .select('id, first_name, last_name, avatar, role')
          .in('id', conv.participants);

        const { data: lastMessage } = conv.last_message_id 
          ? await supabase
              .from('messages')
              .select('*')
              .eq('id', conv.last_message_id)
              .single()
          : { data: null };

        return {
          _id: conv.id,
          participants: participants?.map(p => ({
            _id: p.id,
            firstName: p.first_name,
            lastName: p.last_name,
            avatar: p.avatar,
            role: p.role
          })) || [],
          lastMessage: lastMessage ? {
            _id: lastMessage.id,
            content: lastMessage.content,
            type: lastMessage.type
          } : null,
          lastMessageAt: conv.last_message_at,
          unreadCount: conv.unread_count || {}
        };
      })
    );

    res.json({ success: true, conversations: conversationsWithParticipants });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   POST /api/messages/conversations
// @desc    Create or get conversation
// @access  Private
router.post('/conversations', protect, async (req, res) => {
  try {
    const { participantId } = req.body;
    const participants = [req.user.id, participantId].sort();

    // Check if conversation already exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .contains('participants', participants)
      .single();

    if (existing) {
      const { data: participantUsers } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar, role')
        .in('id', existing.participants);

      return res.json({
        success: true,
        conversation: {
          _id: existing.id,
          participants: participantUsers?.map(p => ({
            _id: p.id,
            firstName: p.first_name,
            lastName: p.last_name,
            avatar: p.avatar,
            role: p.role
          })) || []
        }
      });
    }

    // Create new conversation
    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        participants,
        unread_count: { [req.user.id]: 0, [participantId]: 0 }
      })
      .select()
      .single();

    if (error) throw error;

    const { data: participantUsers } = await supabase
      .from('users')
      .select('id, first_name, last_name, avatar, role')
      .in('id', participants);

    res.json({
      success: true,
      conversation: {
        _id: conversation.id,
        participants: participantUsers?.map(p => ({
          _id: p.id,
          firstName: p.first_name,
          lastName: p.last_name,
          avatar: p.avatar,
          role: p.role
        })) || []
      }
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   GET /api/messages/:conversationId
// @desc    Get messages for a conversation
// @access  Private
router.get('/:conversationId', protect, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const { data: conversation } = await supabase
      .from('conversations')
      .select('participants')
      .eq('id', req.params.conversationId)
      .single();

    if (!conversation) {
      return res.status(404).json({ message: 'Konuşma bulunamadı' });
    }

    if (!conversation.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Bu konuşmaya erişim yetkiniz yok' });
    }

    const offset = (page - 1) * limit;
    const { data: messages, error, count } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, first_name, last_name, avatar)
      `, { count: 'exact' })
      .eq('conversation_id', req.params.conversationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Mark messages as read
    await supabase
      .from('messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('conversation_id', req.params.conversationId)
      .neq('sender_id', req.user.id)
      .eq('is_read', false);

    // Reset unread count
    const { data: conv } = await supabase
      .from('conversations')
      .select('unread_count')
      .eq('id', req.params.conversationId)
      .single();

    if (conv) {
      const unreadCount = conv.unread_count || {};
      unreadCount[req.user.id] = 0;
      await supabase
        .from('conversations')
        .update({ unread_count: unreadCount })
        .eq('id', req.params.conversationId);
    }

    res.json({
      success: true,
      messages: messages.map(m => ({
        _id: m.id,
        content: m.content,
        type: m.type,
        fileUrl: m.file_url,
        fileName: m.file_name,
        isRead: m.is_read,
        createdAt: m.created_at,
        sender: m.sender ? {
          _id: m.sender.id,
          firstName: m.sender.first_name,
          lastName: m.sender.last_name,
          avatar: m.sender.avatar
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
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   POST /api/messages/:conversationId
// @desc    Send message
// @access  Private
router.post('/:conversationId', protect, async (req, res) => {
  try {
    const { content, type = 'text' } = req.body;

    const { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', req.params.conversationId)
      .single();

    if (!conversation) {
      return res.status(404).json({ message: 'Konuşma bulunamadı' });
    }

    if (!conversation.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Bu konuşmaya mesaj gönderme yetkiniz yok' });
    }

    // Create message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: req.params.conversationId,
        sender_id: req.user.id,
        content,
        type
      })
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, first_name, last_name, avatar)
      `)
      .single();

    if (error) throw error;

    // Update conversation
    const unreadCount = conversation.unread_count || {};
    conversation.participants.forEach(pid => {
      if (pid !== req.user.id) {
        unreadCount[pid] = (unreadCount[pid] || 0) + 1;
      }
    });

    await supabase
      .from('conversations')
      .update({
        last_message_id: message.id,
        last_message_at: new Date().toISOString(),
        unread_count: unreadCount
      })
      .eq('id', req.params.conversationId);

    // Emit socket event
    const io = req.app.get('io');
    conversation.participants.forEach(pid => {
      if (pid !== req.user.id) {
        io.to(pid).emit('new-message', {
          conversationId: req.params.conversationId,
          message: {
            _id: message.id,
            content: message.content,
            type: message.type,
            createdAt: message.created_at,
            sender: {
              _id: message.sender.id,
              firstName: message.sender.first_name,
              lastName: message.sender.last_name,
              avatar: message.sender.avatar
            }
          }
        });
      }
    });

    res.status(201).json({
      success: true,
      message: {
        _id: message.id,
        content: message.content,
        type: message.type,
        createdAt: message.created_at,
        sender: {
          _id: message.sender.id,
          firstName: message.sender.first_name,
          lastName: message.sender.last_name,
          avatar: message.sender.avatar
        }
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   POST /api/messages/:conversationId/file
// @desc    Send file message
// @access  Private
router.post('/:conversationId/file', protect, uploadDocument, handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Dosya yüklenmedi' });
    }

    const { data: conversation } = await supabase
      .from('conversations')
      .select('participants')
      .eq('id', req.params.conversationId)
      .single();

    if (!conversation || !conversation.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Yetkisiz erişim' });
    }

    const fileUrl = `/uploads/documents/${req.file.filename}`;
    const isImage = req.file.mimetype.startsWith('image/');

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: req.params.conversationId,
        sender_id: req.user.id,
        content: req.file.originalname,
        type: isImage ? 'image' : 'file',
        file_url: fileUrl,
        file_name: req.file.originalname
      })
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, first_name, last_name, avatar)
      `)
      .single();

    if (error) throw error;

    // Update conversation
    await supabase
      .from('conversations')
      .update({
        last_message_id: message.id,
        last_message_at: new Date().toISOString()
      })
      .eq('id', req.params.conversationId);

    res.status(201).json({
      success: true,
      message: {
        _id: message.id,
        content: message.content,
        type: message.type,
        fileUrl: message.file_url,
        fileName: message.file_name,
        createdAt: message.created_at,
        sender: {
          _id: message.sender.id,
          firstName: message.sender.first_name,
          lastName: message.sender.last_name,
          avatar: message.sender.avatar
        }
      }
    });
  } catch (error) {
    console.error('Send file message error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

export default router;
