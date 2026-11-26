const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

function makeToken(user) {
  return jwt.sign({ id: user.id, name: user.full_name, email: user.email, role: user.role },
    process.env.JWT_SECRET, { expiresIn: '8h' });
}

router.post('/register', async (req, res, next) => {
  try {
    const { fullName, email, password } = req.body;
    if (!fullName?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: 'Enter your full name, email and password.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must contain at least 8 characters.' });
    const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing.length) return res.status(409).json({ message: 'An account with that email already exists.' });
    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.execute(
      "INSERT INTO users (full_name,email,password_hash,role) VALUES (?,?,?,'student')",
      [fullName.trim(), email.trim().toLowerCase(), hash]
    );
    const user = { id: result.insertId, full_name: fullName.trim(), email: email.trim().toLowerCase(), role: 'student' };
    res.status(201).json({ token: makeToken(user), user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role } });
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Enter your email and password.' });
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) {
      return res.status(401).json({ message: 'Incorrect email or password.' });
    }
    const u = rows[0];
    res.json({ token: makeToken(u), user: { id: u.id, fullName: u.full_name, email: u.email, role: u.role } });
  } catch (err) { next(err); }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const [rows] = await db.execute('SELECT id,full_name,email,role FROM users WHERE id=?', [req.user.id]);
    if (!rows.length) return res.status(401).json({ message: 'Account not found.' });
    const u = rows[0];
    res.json({ user: { id: u.id, fullName: u.full_name, email: u.email, role: u.role } });
  } catch (err) { next(err); }
});

module.exports = router;
