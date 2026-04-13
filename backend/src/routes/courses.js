const router = require('express').Router();
const prisma = require('../lib/prisma');
const { authenticate, requireRole } = require('../middleware/auth');
const ERRORS = require('../../../shared/errors.json');

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

  if (!name?.trim() || !semester?.trim() || !year) {
    return res.status(400).json({ error: ERRORS.MISSING_FIELDS });
  }

  const parsedYear = Number(year);
  if (!Number.isInteger(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
    return res.status(400).json({ error: 'Year must be a valid number between 2000 and 2100.' });
  }

  const course = await prisma.course.create({
    data: { name: name.trim(), semester: semester.trim(), year: parsedYear, instructorId: req.user.id },
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
  if (!course) return res.status(404).json({ error: ERRORS.COURSE_NOT_FOUND });
  if (!(await canAccessCourse(req.user, courseId))) return res.status(403).json({ error: ERRORS.FORBIDDEN });
  res.json(course);
});

// GET /courses/:id/groups
router.get('/:id/groups', authenticate, async (req, res) => {
  const courseId = req.params.id;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return res.status(404).json({ error: ERRORS.COURSE_NOT_FOUND });
  if (!(await canAccessCourse(req.user, courseId))) return res.status(403).json({ error: ERRORS.FORBIDDEN });

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
  if (!course) return res.status(404).json({ error: ERRORS.COURSE_NOT_FOUND });
  if (course.instructorId !== req.user.id) return res.status(403).json({ error: ERRORS.FORBIDDEN });

  const { name, projectTitle, projectDesc, deadline } = req.body;
  if (!name?.trim() || !projectTitle?.trim()) {
    return res.status(400).json({ error: 'Group name and project title are required.' });
  }

  if (deadline && isNaN(Date.parse(deadline))) {
    return res.status(400).json({ error: 'Deadline must be a valid date.' });
  }

  const group = await prisma.group.create({
    data: {
      name: name.trim(),
      projectTitle: projectTitle.trim(),
      projectDesc: projectDesc?.trim() ?? null,
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
