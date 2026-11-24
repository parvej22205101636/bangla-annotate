import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { User } from '../models/User.js';

export function signToken(user) {
  return jwt.sign({ sub: String(user._id) }, config.jwtSecret, { expiresIn: '7d' });
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Please log in' });
  try {
    const { sub } = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(sub);
    if (!user) return res.status(401).json({ message: 'Account not found' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Session expired, please log in again' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admins only' });
  next();
}
