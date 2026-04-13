const router = require('express').Router();
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /courses
// Instructor: their courses. Student: courses of groups they belong to.
router.get('/', authenticate, async (req, res) => {
  if (req.user.role === 'INSTRUCTOR') {
    const courses = await prisma.course.findMany({
      where: { instructorId: req.user.id },
      include: { _count: { select: { groups: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(courses);
  }

  // Student: find courses via group memberships
  const memberships = await prisma.groupMember.findMany({
    where: { userId: req.user.id },
    include: {
      group: {
        include: { course: { include: { _count: { select: { groups: true } } } } },
      },
    },
  });
  const seen = new Set();
  const courses = [];
  for (const m of memberships) {
    const c = m.group.course;
    if (!seen.has(c.id)) {
      seen.add(c.id);
      courses.push(c);
    }
  }
  res.json(courses);
});

// POST /courses — instructor only
router.post('/', authenticate, requireRole('INSTRUCTOR'), async (req, res) => {
  const { name, semester, year } = req.body;
  if (!name || !semester || !year) {
    return res.status(400).json({ error: 'name, semester, and year are required' });
  }

  const course = await prisma.course.create({
    data: { name, semester, year: Number(year), instructorId: req.user.id },
  });
  res.status(201).json(course);
});

// GET /courses/:id
router.get('/:id', authenticate, async (req, res) => {
  const courseId = req.params.id;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { instructor: { select: { id: true, name: true, email: true } } },
  });
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (!(await canAccessCourse(req.user, courseId))) return res.status(403).json({ error: 'Forbidden' });
  res.json(course);
});

// GET /courses/:id/groups
router.get('/:id/groups', authenticate, async (req, res) => {
  const courseId = req.params.id;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (!(await canAccessCourse(req.user, courseId))) return res.status(403).json({ error: 'Forbidden' });

  const groups = await prisma.group.findMany({
    where: { courseId },
    include: {
      _count: { select: { members: true, tasks: true } },
      tasks: { select: { status: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  res.json(groups);
});

// POST /courses/:id/groups — instructor only, must own course
router.post('/:id/groups', authenticate, requireRole('INSTRUCTOR'), async (req, res) => {
  const courseId = req.params.id;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (course.instructorId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const { name, projectTitle, projectDesc, deadline } = req.body;
  if (!name || !projectTitle) {
    return res.status(400).json({ error: 'name and projectTitle are required' });
  }

  const group = await prisma.group.create({
    data: {
      name,
      projectTitle,
      projectDesc: projectDesc ?? null,
      deadline: deadline ? new Date(deadline) : null,
      courseId,
    },
  });
  res.status(201).json(group);
});

// Helper: can a user access a course?
async function canAccessCourse(user, courseId) {
  if (user.role === 'INSTRUCTOR') {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    return course?.instructorId === user.id;
  }
  const membership = await prisma.groupMember.findFirst({
    where: { userId: user.id, group: { courseId } },
  });
  return membership !== null;
}

module.exports = router;
