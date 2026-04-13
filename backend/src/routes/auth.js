const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const ERRORS = require('../../../shared/errors.json');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name?.trim() || !email?.trim() || !password || !role) {
    return res.status(400).json({ error: ERRORS.MISSING_FIELDS });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: ERRORS.INVALID_EMAIL });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: ERRORS.WEAK_PASSWORD });
  }
  if (!['STUDENT', 'INSTRUCTOR'].includes(role)) {
    return res.status(400).json({ error: ERRORS.INVALID_ROLE });
  }

  const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existing) {
    return res.status(409).json({ error: ERRORS.EMAIL_TAKEN });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name: name.trim(), email: email.trim().toLowerCase(), passwordHash, role },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '24h',
  });

  res.status(201).json({ token, user });
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim() || !password) {
    return res.status(400).json({ error: ERRORS.MISSING_FIELDS });
  }

  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) {
    return res.status(401).json({ error: ERRORS.INVALID_CREDENTIALS });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return res.status(401).json({ error: ERRORS.INVALID_CREDENTIALS });
  }

  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '24h',
  });

  const { passwordHash: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

module.exports = router;
