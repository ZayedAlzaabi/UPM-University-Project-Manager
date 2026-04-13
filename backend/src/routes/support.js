const router = require('express').Router();
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');
const ERRORS = require('../../../shared/errors.json');

const VALID_REQUEST_STATUSES = ['OPEN', 'RESOLVED'];

// POST /tasks/:id/support-requests — student, must be group member
router.post('/tasks/:taskId/support-requests', authenticate, requireRole('STUDENT'), async (req, res) => {
  const { taskId } = req.params;
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { group: true },
  });
  if (!task) return res.status(404).json({ error: ERRORS.TASK_NOT_FOUND });

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: task.groupId, userId: req.user.id } },
  });
  if (!membership) return res.status(403).json({ error: ERRORS.FORBIDDEN });

  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: ERRORS.MESSAGE_REQUIRED });

  const request = await prisma.supportRequest.create({
    data: { message: message.trim(), taskId, authorId: req.user.id },
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
  if (!task) return res.status(404).json({ error: ERRORS.TASK_NOT_FOUND });

  const isGroupInstructor =
    req.user.role === 'INSTRUCTOR' && task.group.course.instructorId === req.user.id;

  let where = { taskId };
  if (!isGroupInstructor) {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: task.groupId, userId: req.user.id } },
    });
    if (!membership) return res.status(403).json({ error: ERRORS.FORBIDDEN });
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
  if (!request) return res.status(404).json({ error: ERRORS.REQUEST_NOT_FOUND });
  if (request.task.group.course.instructorId !== req.user.id) {
    return res.status(403).json({ error: ERRORS.FORBIDDEN });
  }

  const { body } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: ERRORS.BODY_REQUIRED });

  const reply = await prisma.supportReply.create({
    data: { body: body.trim(), requestId, authorId: req.user.id },
    include: { author: { select: { id: true, name: true, email: true } } },
  });
  res.status(201).json(reply);
});

// PATCH /support-requests/:id — instructor: update status
router.patch('/support-requests/:requestId', authenticate, requireRole('INSTRUCTOR'), async (req, res) => {
  const { requestId } = req.params;
  const request = await prisma.supportRequest.findUnique({
    where: { id: requestId },
    include: { task: { include: { group: { include: { course: true } } } } },
  });
  if (!request) return res.status(404).json({ error: ERRORS.REQUEST_NOT_FOUND });
  if (request.task.group.course.instructorId !== req.user.id) {
    return res.status(403).json({ error: ERRORS.FORBIDDEN });
  }

  const { status } = req.body;
  if (status !== undefined && !VALID_REQUEST_STATUSES.includes(status)) {
    return res.status(400).json({ error: ERRORS.INVALID_REQUEST_STATUS });
  }

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
