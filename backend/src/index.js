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

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`UPM API running on port ${PORT}`));
