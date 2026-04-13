const router = require('express').Router();
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

// PATCH /tasks/:id — any group member can update any field; instructor (course owner) can also update
router.patch('/:id', authenticate, async (req, res) => {
  const taskId = req.params.id;
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { group: { include: { course: true } } },
  });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const { groupId } = task;
  const isGroupInstructor =
    req.user.role === 'INSTRUCTOR' && task.group.course.instructorId === req.user.id;

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: req.user.id } },
  });

  if (!membership && !isGroupInstructor) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { title, description, dueDate, assigneeId, status } = req.body;

  if (assigneeId !== undefined && assigneeId !== null) {
    const assigneeMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: assigneeId } },
    });
    if (!assigneeMembership) {
      return res.status(400).json({ error: 'Assignee must be a member of this group' });
    }
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(status !== undefined && { status }),
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(assigneeId !== undefined && { assigneeId: assigneeId ?? null }),
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
    },
  });
  res.json(updated);
});

// DELETE /tasks/:id — student + must be a group member
router.delete('/:id', authenticate, requireRole('STUDENT'), async (req, res) => {
  const taskId = req.params.id;
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: task.groupId, userId: req.user.id } },
  });
  if (!membership) return res.status(403).json({ error: 'You are not a member of this group' });

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
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!(await canAccessTask(req.user, task))) return res.status(403).json({ error: 'Forbidden' });

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
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (task.group.course.instructorId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const { body } = req.body;
  if (!body) return res.status(400).json({ error: 'body is required' });

  const comment = await prisma.comment.create({
    data: { body, taskId, authorId: req.user.id },
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
