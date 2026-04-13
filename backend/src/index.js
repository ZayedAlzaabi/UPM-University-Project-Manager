require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes    = require('./routes/auth');
const courseRoutes  = require('./routes/courses');
const groupRoutes   = require('./routes/groups');
const taskRoutes    = require('./routes/tasks');
const supportRoutes = require('./routes/support');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.use('/auth',    authRoutes);
app.use('/courses', courseRoutes);
app.use('/groups',  groupRoutes);
app.use('/tasks',   taskRoutes);

// Support routes handle both /tasks/:id/support-requests and /support-requests/:id/*
app.use('/', supportRoutes);

app.use((req, res) => res.status(404).json({ error: 'The requested resource does not exist.' }));

app.use((err, req, res, next) => {
  console.error(err);

  // Prisma unique constraint violation (e.g. duplicate email)
  if (err.code === 'P2002') {
    return res.status(409).json({ error: `A record with this ${err.meta?.target?.join(', ')} already exists.` });
  }
  // Prisma record not found
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'The requested record was not found.' });
  }
  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }

  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`UPM API running on port ${PORT}`));
