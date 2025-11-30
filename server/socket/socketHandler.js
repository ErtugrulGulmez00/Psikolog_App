import jwt from 'jsonwebtoken';
import supabase from '../config/supabase.js';

export const initializeSocket = (io) => {
  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const { data: user, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, role')
        .eq('id', decoded.id)
        .single();
      
      if (error || !user) {
        return next(new Error('User not found'));
      }

      socket.user = {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      };
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.user.firstName} ${socket.user.lastName}`);

    // Join user's personal room
    socket.join(socket.user.id);

    // Update user's socket ID
    await supabase
      .from('users')
      .update({ socket_id: socket.id })
      .eq('id', socket.user.id);

    // Handle joining a video call room
    socket.on('join-room', ({ roomId, peerId }) => {
      console.log(`User ${socket.user.firstName} joining room: ${roomId}`);
      socket.join(roomId);
      
      // Notify others in the room
      socket.to(roomId).emit('user-joined', {
        peerId: peerId || socket.user.id,
        userId: socket.user.id,
        userName: `${socket.user.firstName} ${socket.user.lastName}`
      });

      // Handle room-specific disconnect
      socket.on('disconnect', () => {
        socket.to(roomId).emit('user-left', { 
          peerId: peerId || socket.user.id, 
          userId: socket.user.id 
        });
      });
    });

    // WebRTC Signaling
    socket.on('offer', ({ roomId, offer, to }) => {
      console.log(`Offer from ${socket.user.id} to ${to} in room ${roomId}`);
      // Send to specific user and also broadcast to room
      if (to) {
        socket.to(to).emit('offer', {
          offer,
          from: socket.user.id
        });
      }
      // Also broadcast to room as fallback
      socket.to(roomId).emit('offer', {
        offer,
        from: socket.user.id
      });
    });

    socket.on('answer', ({ roomId, answer, to }) => {
      console.log(`Answer from ${socket.user.id} to ${to} in room ${roomId}`);
      if (to) {
        socket.to(to).emit('answer', {
          answer,
          from: socket.user.id
        });
      }
      socket.to(roomId).emit('answer', {
        answer,
        from: socket.user.id
      });
    });

    socket.on('ice-candidate', ({ roomId, candidate, to }) => {
      if (to) {
        socket.to(to).emit('ice-candidate', {
          candidate,
          from: socket.user.id
        });
      }
      socket.to(roomId).emit('ice-candidate', {
        candidate,
        from: socket.user.id
      });
    });

    // Video call controls
    socket.on('toggle-video', ({ roomId, enabled }) => {
      socket.to(roomId).emit('user-toggle-video', {
        userId: socket.user.id,
        enabled
      });
    });

    socket.on('toggle-audio', ({ roomId, enabled }) => {
      socket.to(roomId).emit('user-toggle-audio', {
        userId: socket.user.id,
        enabled
      });
    });

    socket.on('end-call', ({ roomId }) => {
      socket.to(roomId).emit('call-ended', {
        userId: socket.user.id
      });
      socket.leave(roomId);
    });

    // Screen sharing
    socket.on('screen-share-started', ({ roomId }) => {
      socket.to(roomId).emit('user-screen-share', {
        userId: socket.user.id,
        sharing: true
      });
    });

    socket.on('screen-share-stopped', ({ roomId }) => {
      socket.to(roomId).emit('user-screen-share', {
        userId: socket.user.id,
        sharing: false
      });
    });

    // Chat messaging
    socket.on('send-message', ({ conversationId, message }) => {
      socket.to(conversationId).emit('new-message', {
        conversationId,
        message
      });
    });

    socket.on('typing', ({ conversationId }) => {
      socket.to(conversationId).emit('user-typing', {
        userId: socket.user.id,
        userName: socket.user.firstName
      });
    });

    socket.on('stop-typing', ({ conversationId }) => {
      socket.to(conversationId).emit('user-stop-typing', {
        userId: socket.user.id
      });
    });

    // Join conversation room
    socket.on('join-conversation', ({ conversationId }) => {
      socket.join(conversationId);
    });

    socket.on('leave-conversation', ({ conversationId }) => {
      socket.leave(conversationId);
    });

    // Notifications
    socket.on('send-notification', ({ userId, notification }) => {
      io.to(userId).emit('notification', notification);
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user.firstName} ${socket.user.lastName}`);
      await supabase
        .from('users')
        .update({ socket_id: null })
        .eq('id', socket.user.id);
    });
  });
};
