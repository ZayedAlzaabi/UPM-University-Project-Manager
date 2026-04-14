require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes    = require('./routes/auth');
const courseRoutes  = require('./routes/courses');
const groupRoutes   = require('./routes/groups');
const taskRoutes    = require('./routes/tasks');
const supportRoutes = require('./routes/support');
const attachmentRoutes = require('./routes/attachments');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/', (req, res) => res.json({ status: 'ok' }));

app.use('/auth',    authRoutes);
app.use('/courses', courseRoutes);
app.use('/groups',  groupRoutes);
app.use('/tasks',   taskRoutes);

// Support routes handle both /tasks/:id/support-requests and /support-requests/:id/*
app.use('/', supportRoutes);
// Attachment routes handle /tasks/:id/attachments and /attachments/:id
app.use('/', attachmentRoutes);

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
app.listen(PORT, () => {
  console.log(`UPM API running on port ${PORT}`);
  console.log(`AWS_REGION: ${process.env.AWS_REGION || '(not set)'}`);
  console.log(`AWS_S3_BUCKET: ${process.env.AWS_S3_BUCKET || '(not set)'}`);
  console.log(`AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? '(set)' : '(not set)'}`);
  console.log(`AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? '(set)' : '(not set)'}`);
});
