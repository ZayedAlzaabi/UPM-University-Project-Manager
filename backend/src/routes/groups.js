const router = require('express').Router();
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');
const ERRORS = require('../../../shared/errors.json');

const VALID_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];

// GET /groups/:id
router.get('/:id', authenticate, async (req, res) => {
  const groupId = req.params.id;
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      course: { include: { instructor: { select: { id: true, name: true, email: true } } } },
      members: { include: { user: { select: { id: true, name: true, email: true, role: true } } }, orderBy: { createdAt: 'asc' } },
      _count: { select: { tasks: true } },
    },
  });
  if (!group) return res.status(404).json({ error: ERRORS.GROUP_NOT_FOUND });
  if (!(await canAccessGroup(req.user, group))) return res.status(403).json({ error: ERRORS.FORBIDDEN });
  res.json(group);
});

// PATCH /groups/:id — instructor only, must own the course
router.patch('/:id', authenticate, requireRole('INSTRUCTOR'), async (req, res) => {
  const groupId = req.params.id;
  const group = await prisma.group.findUnique({ where: { id: groupId }, include: { course: true } });
  if (!group) return res.status(404).json({ error: ERRORS.GROUP_NOT_FOUND });
  if (group.course.instructorId !== req.user.id) return res.status(403).json({ error: ERRORS.FORBIDDEN });

  const { name, projectTitle, projectDesc, deadline } = req.body;

  if (deadline !== undefined && deadline !== null && isNaN(Date.parse(deadline))) {
    return res.status(400).json({ error: 'Deadline must be a valid date.' });
  }

  const updated = await prisma.group.update({
    where: { id: groupId },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(projectTitle !== undefined && { projectTitle: projectTitle.trim() }),
      ...(projectDesc !== undefined && { projectDesc: projectDesc?.trim() ?? null }),
      ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
    },
  });
  res.json(updated);
});

// POST /groups/:id/members — instructor only, must own the course
router.post('/:id/members', authenticate, requireRole('INSTRUCTOR'), async (req, res) => {
  const groupId = req.params.id;
  const group = await prisma.group.findUnique({ where: { id: groupId }, include: { course: true } });
  if (!group) return res.status(404).json({ error: ERRORS.GROUP_NOT_FOUND });
  if (group.course.instructorId !== req.user.id) return res.status(403).json({ error: ERRORS.FORBIDDEN });

  const { userId, email } = req.body;
  if (!userId && !email?.trim()) {
    return res.status(400).json({ error: ERRORS.USER_ID_OR_EMAIL });
  }

  const student = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });

  if (!student) return res.status(404).json({ error: ERRORS.USER_NOT_FOUND });
  if (student.role !== 'STUDENT') {
    return res.status(400).json({ error: ERRORS.NOT_STUDENT });
  }

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: student.id } },
  });
  if (existing) return res.status(409).json({ error: ERRORS.ALREADY_MEMBER });

  const member = await prisma.groupMember.create({
    data: { userId: student.id, groupId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  res.status(201).json(member);
});

// GET /groups/:id/tasks
router.get('/:id/tasks', authenticate, async (req, res) => {
  const groupId = req.params.id;
  const group = await prisma.group.findUnique({ where: { id: groupId }, include: { course: true } });
  if (!group) return res.status(404).json({ error: ERRORS.GROUP_NOT_FOUND });
  if (!(await canAccessGroup(req.user, group))) return res.status(403).json({ error: ERRORS.FORBIDDEN });

  const tasks = await prisma.task.findMany({
    where: { groupId },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      statusHistory: {
        include: { changedBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
      _count: { select: { comments: true, attachments: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  res.json(tasks);
});

// DELETE /groups/:id — instructor only, must own the course
router.delete('/:id', authenticate, requireRole('INSTRUCTOR'), async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const group = await prisma.group.findUnique({ where: { id: groupId }, include: { course: true } });
    if (!group) return res.status(404).json({ error: ERRORS.GROUP_NOT_FOUND });
    if (group.course.instructorId !== req.user.id) return res.status(403).json({ error: ERRORS.FORBIDDEN });

    await prisma.$transaction(async (tx) => {
      const tasks = await tx.task.findMany({ where: { groupId }, select: { id: true } });
      const taskIds = tasks.map((t) => t.id);

      if (taskIds.length > 0) {
        const supportRequests = await tx.supportRequest.findMany({
          where: { taskId: { in: taskIds } },
          select: { id: true },
        });
        const srIds = supportRequests.map((s) => s.id);
        if (srIds.length > 0) {
          await tx.supportReply.deleteMany({ where: { requestId: { in: srIds } } });
          await tx.supportRequest.deleteMany({ where: { id: { in: srIds } } });
        }
        await tx.comment.deleteMany({ where: { taskId: { in: taskIds } } });
        await tx.task.deleteMany({ where: { groupId } }); // cascades: attachments, statusHistory
      }

      await tx.groupMember.deleteMany({ where: { groupId } });
      await tx.group.delete({ where: { id: groupId } });
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /groups/:id/tasks — group members or course instructor
router.post('/:id/tasks', authenticate, async (req, res) => {
  const groupId = req.params.id;
  const group = await prisma.group.findUnique({ where: { id: groupId }, include: { course: true } });
  if (!group) return res.status(404).json({ error: ERRORS.GROUP_NOT_FOUND });

  const isGroupInstructor = req.user.role === 'INSTRUCTOR' && group.course.instructorId === req.user.id;

  if (!isGroupInstructor) {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.user.id } },
    });
    if (!membership) return res.status(403).json({ error: ERRORS.FORBIDDEN });
  }

  const { title, description, status, dueDate, assigneeId } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: ERRORS.TITLE_REQUIRED });

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: ERRORS.INVALID_STATUS });
  }

  if (dueDate !== undefined && dueDate !== null && isNaN(Date.parse(dueDate))) {
    return res.status(400).json({ error: 'Due date must be a valid date.' });
  }

  if (assigneeId) {
    const assigneeMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: assigneeId } },
    });
    if (!assigneeMembership) {
      return res.status(400).json({ error: ERRORS.ASSIGNEE_NOT_MEMBER });
    }
  }

  const task = await prisma.task.create({
    data: {
      title: title.trim(),
      description: description?.trim() ?? null,
      status: status ?? 'TODO',
      dueDate: dueDate ? new Date(dueDate) : null,
      groupId,
      assigneeId: assigneeId ?? null,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      statusHistory: {
        include: { changedBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  res.status(201).json(task);
});

// Helper: can a user access a group?
async function canAccessGroup(user, group) {
  if (user.role === 'INSTRUCTOR') {
    return group.course.instructorId === user.id;
  }
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: user.id } },
  });
  return membership !== null;
}

module.exports = router;
