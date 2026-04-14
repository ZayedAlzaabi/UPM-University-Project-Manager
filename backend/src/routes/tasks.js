const router = require('express').Router();
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');
const ERRORS = require('../../../shared/errors.json');

const VALID_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];

// PATCH /tasks/:id — any group member can update; instructor (course owner) can also update
router.patch('/:id', authenticate, async (req, res) => {
  const taskId = req.params.id;
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { group: { include: { course: true } } },
  });
  if (!task) return res.status(404).json({ error: ERRORS.TASK_NOT_FOUND });

  const { groupId } = task;
  const isGroupInstructor =
    req.user.role === 'INSTRUCTOR' && task.group.course.instructorId === req.user.id;

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: req.user.id } },
  });

  if (!membership && !isGroupInstructor) {
    return res.status(403).json({ error: ERRORS.FORBIDDEN });
  }

  const { title, description, dueDate, assigneeId, status } = req.body;

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: ERRORS.INVALID_STATUS });
  }

  if (dueDate !== undefined && dueDate !== null && isNaN(Date.parse(dueDate))) {
    return res.status(400).json({ error: 'Due date must be a valid date.' });
  }

  if (assigneeId !== undefined && assigneeId !== null) {
    const assigneeMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: assigneeId } },
    });
    if (!assigneeMembership) {
      return res.status(400).json({ error: ERRORS.ASSIGNEE_NOT_MEMBER });
    }
  }

  const statusChanging = status !== undefined && status !== task.status;

  const updated = await prisma.$transaction(async (tx) => {
    if (statusChanging) {
      await tx.taskStatusHistory.create({
        data: {
          taskId,
          fromStatus: task.status,
          toStatus: status,
          changedById: req.user.id,
        },
      });
    }

    return tx.task.update({
      where: { id: taskId },
      data: {
        ...(status !== undefined && { status }),
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() ?? null }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(assigneeId !== undefined && { assigneeId: assigneeId ?? null }),
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        statusHistory: {
          include: { changedBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  });

  res.json(updated);
});

// DELETE /tasks/:id — student + must be a group member
router.delete('/:id', authenticate, requireRole('STUDENT'), async (req, res) => {
  const taskId = req.params.id;
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return res.status(404).json({ error: ERRORS.TASK_NOT_FOUND });

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: task.groupId, userId: req.user.id } },
  });
  if (!membership) return res.status(403).json({ error: ERRORS.FORBIDDEN });

  await prisma.task.delete({ where: { id: taskId } });
  res.status(204).send();
});

// GET /tasks/:id/comments
router.get('/:id/comments', authenticate, async (req, res) => {
  const taskId = req.params.id;
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { group: { include: { course: true } } },
  });
  if (!task) return res.status(404).json({ error: ERRORS.TASK_NOT_FOUND });
  if (!(await canAccessTask(req.user, task))) return res.status(403).json({ error: ERRORS.FORBIDDEN });

  const comments = await prisma.comment.findMany({
    where: { taskId },
    include: { author: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json(comments);
});

// POST /tasks/:id/comments — instructor only
router.post('/:id/comments', authenticate, requireRole('INSTRUCTOR'), async (req, res) => {
  const taskId = req.params.id;
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { group: { include: { course: true } } },
  });
  if (!task) return res.status(404).json({ error: ERRORS.TASK_NOT_FOUND });
  if (task.group.course.instructorId !== req.user.id) return res.status(403).json({ error: ERRORS.FORBIDDEN });

  const { body } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: ERRORS.BODY_REQUIRED });

  const comment = await prisma.comment.create({
    data: { body: body.trim(), taskId, authorId: req.user.id },
    include: { author: { select: { id: true, name: true, email: true, role: true } } },
  });
  res.status(201).json(comment);
});

// Helper: can a user access a task?
async function canAccessTask(user, task) {
  if (user.role === 'INSTRUCTOR') {
    return task.group.course.instructorId === user.id;
  }
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: task.groupId, userId: user.id } },
  });
  return membership !== null;
}

module.exports = router;
