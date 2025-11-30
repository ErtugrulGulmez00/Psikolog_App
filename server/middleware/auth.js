import jwt from 'jsonwebtoken';
import supabase from '../config/supabase.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, role, first_name, last_name, avatar')
        .eq('id', decoded.id)
        .single();
      
      if (error || !user) {
        return res.status(401).json({ message: 'Kullanıcı bulunamadı' });
      }
      
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        avatar: user.avatar
      };
      
      next();
    } catch (error) {
      console.error('Auth error:', error);
      return res.status(401).json({ message: 'Yetkisiz erişim, token geçersiz' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Yetkisiz erişim, token bulunamadı' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `${req.user.role} rolü bu işlem için yetkili değil` 
      });
    }
    next();
  };
};

export const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const { data: user } = await supabase
        .from('users')
        .select('id, email, role, first_name, last_name')
        .eq('id', decoded.id)
        .single();
      
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.first_name,
          lastName: user.last_name
        };
      }
    } catch (error) {
      // Token invalid, but continue without user
    }
  }
  next();
};
