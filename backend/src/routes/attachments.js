const router = require('express').Router();
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { uploadToS3, deleteFromS3 } = require('../lib/s3');
const upload = require('../lib/upload');
const ERRORS = require('../../../shared/errors.json');

// POST /tasks/:taskId/attachments — upload file
router.post('/tasks/:taskId/attachments', authenticate, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: ERRORS.FILE_TOO_LARGE });
      }
      if (err.message === 'FILE_TYPE_NOT_ALLOWED') {
        return res.status(400).json({ error: ERRORS.FILE_TYPE_NOT_ALLOWED });
      }
      return next(err);
    }
    next();
  });
}, async (req, res, next) => {
  try {
    const { taskId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: ERRORS.FILE_REQUIRED });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { group: { include: { course: true } } },
    });
    if (!task) return res.status(404).json({ error: ERRORS.TASK_NOT_FOUND });

    const isInstructor = req.user.role === 'INSTRUCTOR' && task.group.course.instructorId === req.user.id;
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: task.groupId, userId: req.user.id } },
    });
    if (!membership && !isInstructor) {
      return res.status(403).json({ error: ERRORS.FORBIDDEN });
    }

    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `attachments/${taskId}/${crypto.randomUUID()}-${safeName}`;
    const fileUrl = await uploadToS3(req.file.buffer, key, req.file.mimetype);

    const attachment = await prisma.attachment.create({
      data: {
        fileName: req.file.originalname,
        fileKey: key,
        fileUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        taskId,
        uploaderId: req.user.id,
      },
      include: { uploader: { select: { id: true, name: true, email: true } } },
    });

    res.status(201).json(attachment);
  } catch (err) {
    next(err);
  }
});

// GET /tasks/:taskId/attachments
router.get('/tasks/:taskId/attachments', authenticate, async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { group: { include: { course: true } } },
    });
    if (!task) return res.status(404).json({ error: ERRORS.TASK_NOT_FOUND });

    const isInstructor = req.user.role === 'INSTRUCTOR' && task.group.course.instructorId === req.user.id;
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: task.groupId, userId: req.user.id } },
    });
    if (!membership && !isInstructor) {
      return res.status(403).json({ error: ERRORS.FORBIDDEN });
    }

    const attachments = await prisma.attachment.findMany({
      where: { taskId },
      include: { uploader: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(attachments);
  } catch (err) {
    next(err);
  }
});

// DELETE /attachments/:id
router.delete('/attachments/:id', authenticate, async (req, res, next) => {
  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id: req.params.id },
      include: { task: { include: { group: { include: { course: true } } } } },
    });
    if (!attachment) return res.status(404).json({ error: ERRORS.ATTACHMENT_NOT_FOUND });

    const isInstructor = req.user.role === 'INSTRUCTOR' && attachment.task.group.course.instructorId === req.user.id;
    const isUploader = attachment.uploaderId === req.user.id;

    if (!isUploader && !isInstructor) {
      return res.status(403).json({ error: ERRORS.FORBIDDEN });
    }

    await deleteFromS3(attachment.fileKey);
    await prisma.attachment.delete({ where: { id: attachment.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
