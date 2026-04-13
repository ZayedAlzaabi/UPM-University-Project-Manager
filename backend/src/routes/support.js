const router = require('express').Router();
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

// POST /tasks/:id/support-requests — student, must be group member
router.post('/tasks/:taskId/support-requests', authenticate, requireRole('STUDENT'), async (req, res) => {
  const { taskId } = req.params;
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { group: true },
  });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: task.groupId, userId: req.user.id } },
  });
  if (!membership) return res.status(403).json({ error: 'You are not a member of this group' });

  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  const request = await prisma.supportRequest.create({
    data: { message, taskId, authorId: req.user.id },
    include: {
      author: { select: { id: true, name: true, email: true } },
      replies: { include: { author: { select: { id: true, name: true, email: true } } } },
    },
  });
  res.status(201).json(request);
});

// GET /tasks/:id/support-requests — student (own) or instructor (course owner)
router.get('/tasks/:taskId/support-requests', authenticate, async (req, res) => {
  const { taskId } = req.params;
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { group: { include: { course: true } } },
  });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const isGroupInstructor =
    req.user.role === 'INSTRUCTOR' && task.group.course.instructorId === req.user.id;

  let where = { taskId };
  if (!isGroupInstructor) {
    // Students only see their own requests
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: task.groupId, userId: req.user.id } },
    });
    if (!membership) return res.status(403).json({ error: 'Forbidden' });
    where.authorId = req.user.id;
  }

  const requests = await prisma.supportRequest.findMany({
    where,
    include: {
      author: { select: { id: true, name: true, email: true } },
      replies: {
        include: { author: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(requests);
});

// POST /support-requests/:id/reply — instructor only
router.post('/support-requests/:requestId/reply', authenticate, requireRole('INSTRUCTOR'), async (req, res) => {
  const { requestId } = req.params;
  const request = await prisma.supportRequest.findUnique({
    where: { id: requestId },
    include: { task: { include: { group: { include: { course: true } } } } },
  });
  if (!request) return res.status(404).json({ error: 'Support request not found' });
  if (request.task.group.course.instructorId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { body } = req.body;
  if (!body) return res.status(400).json({ error: 'body is required' });

  const reply = await prisma.supportReply.create({
    data: { body, requestId, authorId: req.user.id },
    include: { author: { select: { id: true, name: true, email: true } } },
  });
  res.status(201).json(reply);
});

// PATCH /support-requests/:id — instructor: mark resolved
router.patch('/support-requests/:requestId', authenticate, requireRole('INSTRUCTOR'), async (req, res) => {
  const { requestId } = req.params;
  const request = await prisma.supportRequest.findUnique({
    where: { id: requestId },
    include: { task: { include: { group: { include: { course: true } } } } },
  });
  if (!request) return res.status(404).json({ error: 'Support request not found' });
  if (request.task.group.course.instructorId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { status } = req.body;
  const updated = await prisma.supportRequest.update({
    where: { id: requestId },
    data: { status },
    include: {
      author: { select: { id: true, name: true, email: true } },
      replies: { include: { author: { select: { id: true, name: true, email: true } } } },
    },
  });
  res.json(updated);
});

// GET /notifications — role-aware
router.get('/notifications', authenticate, async (req, res) => {
  if (req.user.role === 'INSTRUCTOR') {
    // All open support requests from groups in their courses
    const requests = await prisma.supportRequest.findMany({
      where: {
        status: 'OPEN',
        task: { group: { course: { instructorId: req.user.id } } },
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
        task: { select: { id: true, title: true, groupId: true, group: { select: { id: true, name: true } } } },
        replies: { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ supportRequests: requests, comments: [] });
  }

  // Student: support replies on their requests + instructor comments on tasks assigned to them
  const [replies, comments] = await Promise.all([
    prisma.supportReply.findMany({
      where: { request: { authorId: req.user.id } },
      include: {
        author: { select: { id: true, name: true } },
        request: {
          select: {
            id: true,
            message: true,
            taskId: true,
            task: { select: { id: true, title: true, groupId: true, group: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.comment.findMany({
      where: { task: { assigneeId: req.user.id } },
      include: {
        author: { select: { id: true, name: true } },
        task: { select: { id: true, title: true, groupId: true, group: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  res.json({ supportRequests: [], replies, comments });
});

module.exports = router;
