const router = require('express').Router();
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /groups/:id
router.get('/:id', authenticate, async (req, res) => {
  const groupId = req.params.id;
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      course: { include: { instructor: { select: { id: true, name: true, email: true } } } },
      members: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
      _count: { select: { tasks: true } },
    },
  });
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (!(await canAccessGroup(req.user, group))) return res.status(403).json({ error: 'Forbidden' });
  res.json(group);
});

// PATCH /groups/:id — instructor only, must own the course
router.patch('/:id', authenticate, requireRole('INSTRUCTOR'), async (req, res) => {
  const groupId = req.params.id;
  const group = await prisma.group.findUnique({ where: { id: groupId }, include: { course: true } });
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (group.course.instructorId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const { name, projectTitle, projectDesc, deadline } = req.body;
  const updated = await prisma.group.update({
    where: { id: groupId },
    data: {
      ...(name !== undefined && { name }),
      ...(projectTitle !== undefined && { projectTitle }),
      ...(projectDesc !== undefined && { projectDesc }),
      ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
    },
  });
  res.json(updated);
});

// POST /groups/:id/members — instructor only, must own the course
router.post('/:id/members', authenticate, requireRole('INSTRUCTOR'), async (req, res) => {
  const groupId = req.params.id;
  const group = await prisma.group.findUnique({ where: { id: groupId }, include: { course: true } });
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (group.course.instructorId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const { userId, email } = req.body;
  if (!userId && !email) {
    return res.status(400).json({ error: 'userId or email is required' });
  }

  const student = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : await prisma.user.findUnique({ where: { email } });

  if (!student) return res.status(404).json({ error: 'User not found' });
  if (student.role !== 'STUDENT') {
    return res.status(400).json({ error: 'Only students can be added to groups' });
  }

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: student.id } },
  });
  if (existing) return res.status(409).json({ error: 'Student is already a member of this group' });

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
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (!(await canAccessGroup(req.user, group))) return res.status(403).json({ error: 'Forbidden' });

  const tasks = await prisma.task.findMany({
    where: { groupId },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  res.json(tasks);
});

// POST /groups/:id/tasks — group members (students) or course instructor
router.post('/:id/tasks', authenticate, async (req, res) => {
  const groupId = req.params.id;
  const group = await prisma.group.findUnique({ where: { id: groupId }, include: { course: true } });
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const isGroupInstructor = req.user.role === 'INSTRUCTOR' && group.course.instructorId === req.user.id;

  if (!isGroupInstructor) {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.user.id } },
    });
    if (!membership) return res.status(403).json({ error: 'You are not a member of this group' });
  }

  const { title, description, status, dueDate, assigneeId } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  if (assigneeId) {
    const assigneeMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: assigneeId } },
    });
    if (!assigneeMembership) {
      return res.status(400).json({ error: 'Assignee must be a member of this group' });
    }
  }

  const task = await prisma.task.create({
    data: {
      title,
      description: description ?? null,
      status: status ?? 'TODO',
      dueDate: dueDate ? new Date(dueDate) : null,
      groupId,
      assigneeId: assigneeId ?? null,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
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
