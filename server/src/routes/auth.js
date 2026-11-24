import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { User } from '../models/User.js';
import { config } from '../config.js';
import { requireAuth, signToken } from '../middleware/auth.js';

const router = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, message: { message: 'Too many attempts, try again later' } });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/register', limiter, async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').toLowerCase().trim();
  const password = String(req.body.password || '');

  if (!name || !EMAIL.test(email)) return res.status(400).json({ message: 'Enter your name and a valid e-mail' });
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
  if (await User.exists({ email })) return res.status(409).json({ message: 'This e-mail is already registered' });

  const user = await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: config.adminEmail && email === config.adminEmail ? 'admin' : 'annotator',
  });
  res.status(201).json({ token: signToken(user), user: user.toPublic() });
});

router.post('/login', limiter, async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  const user = await User.findOne({ email });
  const ok = user && (await bcrypt.compare(String(req.body.password || ''), user.passwordHash));
  if (!ok) return res.status(401).json({ message: 'Wrong e-mail or password' });
  res.json({ token: signToken(user), user: user.toPublic() });
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user.toPublic() }));

export default router;
