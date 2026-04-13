# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: UPM — University Project Management

Full-stack web app for UAEU Web Applications course (Spring 2026). Supports two roles (Instructor, Student) for managing courses, groups, and tasks.

**Stack:** React 18 + Vite (frontend, not yet implemented) | Node.js + Express (backend) | PostgreSQL + Prisma ORM | JWT + bcrypt auth

---

## Backend Commands

```bash
cd backend
npm install          # install dependencies
npm run dev          # start with nodemon (port 3001)
npm start            # production start

npx prisma migrate dev   # run after DB creation code is added
npx prisma generate      # regenerate Prisma client after schema changes
npx prisma studio        # GUI to inspect DB
```

## Environment Setup

Copy `backend/.env.example` → `backend/.env` and fill in:

```
DATABASE_URL="postgresql://user:password@localhost:5432/upm"
JWT_SECRET="your-secret"
PORT=3001
CLIENT_ORIGIN="http://localhost:5173"
```

---

## Backend Architecture

```
backend/
  prisma/schema.prisma     ← 6 models: User, Course, Group, GroupMember, Task, Comment
  src/
    index.js               ← Express app, CORS, route mounting, global error handler
    lib/prisma.js          ← PrismaClient singleton (safe for nodemon hot-reload)
    middleware/auth.js     ← authenticate (JWT verify) + requireRole(role) guards
    routes/
      auth.js              ← POST /auth/register, POST /auth/login
      courses.js           ← GET|POST /courses, GET /courses/:id, GET|POST /courses/:id/groups
      groups.js            ← GET|PATCH /groups/:id, POST /groups/:id/members, GET|POST /groups/:id/tasks
      tasks.js             ← PATCH|DELETE /tasks/:id, GET|POST /tasks/:id/comments
```

## API Access Control Summary

| Route | Access |
|---|---|
| POST /auth/* | Public |
| POST /courses | INSTRUCTOR only |
| POST /courses/:id/groups | INSTRUCTOR + owns course |
| PATCH /groups/:id | INSTRUCTOR + owns course |
| POST /groups/:id/members | INSTRUCTOR + owns course |
| POST /groups/:id/tasks | STUDENT + group member |
| PATCH /tasks/:id | Group member (status only) or task creator (full edit) |
| DELETE /tasks/:id | STUDENT + task creator |
| POST /tasks/:id/comments | INSTRUCTOR + owns course |

## Data Model

- **User**: id, email (unique), name, password (bcrypt), role (STUDENT|INSTRUCTOR)
- **Course**: name, semester, year → belongs to one Instructor
- **Group**: title, description, deadline → belongs to Course
- **GroupMember**: userId + groupId (unique pair) → joins Users to Groups
- **Task**: title, description, status (TODO|IN_PROGRESS|DONE), dueDate, assigneeId, creatorId → belongs to Group
- **Comment**: content, authorId → belongs to Task (instructors only write)
