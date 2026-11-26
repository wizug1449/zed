require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');
const claimRoutes = require('./routes/claims');
const uploadRoutes = require('./routes/uploads');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('Set JWT_SECRET to a secret of at least 32 characters in server/.env');
  process.exit(1);
}

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '2mb' }));
const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'UCU Lost and Found API' }));
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/uploads', uploadRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === 'ER_NO_SUCH_TABLE' || err.code === 'ECONNREFUSED') {
    return res.status(500).json({ message: 'Database connection failed. Check MySQL and run database/schema.sql.' });
  }
  res.status(500).json({ message: 'An unexpected server error occurred.' });
});

const port = Number(process.env.PORT || 5000);
app.listen(port, () => console.log(`UCU Lost and Found API running at http://localhost:${port}`));
